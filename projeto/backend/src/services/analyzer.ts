import * as puppeteer from 'puppeteer';
import { generateAIAnalysis } from './openai';
import { SiteData, AnalysisResult, CheckItem } from '../utils/types';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import {
  runSecurityCheck, calculateSecurityScore, getSecurityCheckItems, getSecurityStatus, getSecurityDetails,
  runMobileCheck, calculateMobileScore, getMobileCheckItems, getMobileStatus, getMobileDetails,
  runAnalyticsCheck, calculateAnalyticsScore, getAnalyticsCheckItems, getAnalyticsStatus, getAnalyticsDetails,
  runTechnicalSeoCheck, calculateTechnicalSeoScore, getTechnicalSeoCheckItems, getTechnicalSeoStatus, getTechnicalSeoDetails,
  runHttpHeadersCheck, calculateHttpHeadersScore, getHttpHeadersCheckItems, getHttpHeadersStatus, getHttpHeadersDetails
} from './reports';

export async function analyzeSite(url: string): Promise<AnalysisResult> {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set timeout to 30 seconds
    await page.setDefaultNavigationTimeout(30000);
    
    // Navigate to the URL
    console.log(`Navigating to ${url}...`);
    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const loadTime = (Date.now() - startTime) / 1000;
    
    // Collect site data
    console.log('Collecting site data...');
    const siteData = await collectSiteData(page, url, loadTime);
    
    // Run additional checks
    console.log('Running additional checks...');
    
    // Security check
    const securityData = await runSecurityCheck(page, url);
    siteData.securityHeaders = securityData.securityHeaders;
    siteData.vulnerableLibraries = securityData.vulnerableLibraries;
    
    // Mobile check
    const mobileData = await runMobileCheck(page, url);
    siteData.hasViewportMeta = mobileData.hasViewportMeta;
    siteData.fontSizeOnMobile = mobileData.fontSizeOnMobile;
    siteData.clickableAreasSufficient = mobileData.clickableAreasSufficient;
    
    // Analytics check
    const analyticsData = await runAnalyticsCheck(page, url);
    siteData.analyticsTools = analyticsData.analyticsTools;
    siteData.trackingScriptPlacement = analyticsData.trackingScriptPlacement;
    
    // Technical SEO check
    const technicalSeoData = await runTechnicalSeoCheck(page, url);
    siteData.metaTags = technicalSeoData.metaTags;
    siteData.hasStructuredData = technicalSeoData.hasStructuredData;
    
    // HTTP headers check
    const httpHeadersData = await runHttpHeadersCheck(page, url);
    siteData.headers = httpHeadersData.headers;
    
    // Generate scores
    const seoScore = calculateSEOScore(siteData);
    const accessibilityScore = calculateAccessibilityScore(siteData);
    const performanceScore = calculatePerformanceScore(siteData);
    const securityScore = calculateSecurityScore(siteData);
    const mobileScore = calculateMobileScore(siteData);
    const analyticsScore = calculateAnalyticsScore(siteData);
    const technicalSeoScore = calculateTechnicalSeoScore(siteData);
    const httpHeadersScore = calculateHttpHeadersScore(siteData);
    
    // Generate AI analysis
    console.log('Generating AI analysis...');
    const aiAnalysis = await generateAIAnalysis(siteData);
    
    return {
      seo: {
        score: seoScore,
        details: getSEODetails(siteData, seoScore),
        items: getSEOCheckItems(siteData)
      },
      accessibility: {
        score: accessibilityScore,
        details: getAccessibilityDetails(siteData, accessibilityScore),
        items: getAccessibilityCheckItems(siteData)
      },
      performance: {
        score: performanceScore,
        details: getPerformanceDetails(siteData, performanceScore),
        items: getPerformanceCheckItems(siteData)
      },
      security: {
        score: securityScore,
        details: getSecurityDetails(siteData, securityScore),
        status: getSecurityStatus(securityScore),
        items: getSecurityCheckItems(siteData)
      },
      mobile: {
        score: mobileScore,
        details: getMobileDetails(siteData, mobileScore),
        status: getMobileStatus(mobileScore),
        items: getMobileCheckItems(siteData)
      },
      analytics: {
        score: analyticsScore,
        details: getAnalyticsDetails(siteData, analyticsScore),
        status: getAnalyticsStatus(analyticsScore),
        items: getAnalyticsCheckItems(siteData)
      },
      technicalSeo: {
        score: technicalSeoScore,
        details: getTechnicalSeoDetails(siteData, technicalSeoScore),
        status: getTechnicalSeoStatus(technicalSeoScore),
        items: getTechnicalSeoCheckItems(siteData)
      },
      httpHeaders: {
        score: httpHeadersScore,
        details: getHttpHeadersDetails(siteData, httpHeadersScore),
        status: getHttpHeadersStatus(httpHeadersScore),
        items: getHttpHeadersCheckItems(siteData)
      },
      aiAnalysis
    };
  } catch (error) {
    console.error('Error during site analysis:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function collectSiteData(page: puppeteer.Page, url: string, loadTime: number): Promise<SiteData> {
  // Get page title and meta description
  const title = await page.title();
  const metaDescription = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content') || '').catch(() => '');
  
  // Check if HTTPS is used
  const isHttps = url.startsWith('https://');
  
  // Count images without alt text
  const imagesWithoutAlt = await page.$$eval('img:not([alt]), img[alt=""]', (imgs) => imgs.length);
  
  // Get total size of page resources
  const resources = await page.evaluate(() => {
    return performance.getEntriesByType('resource').reduce((total, resource) => {
      return total + (resource as any).transferSize;
    }, 0);
  });
  const totalSizeKB = Math.round(resources / 1024);
  
  // Count heading tags
  const h1Count = await page.$$eval('h1', (h1s) => h1s.length);
  const h2Count = await page.$$eval('h2', (h2s) => h2s.length);
  const h3Count = await page.$$eval('h3', (h3s) => h3s.length);
  
  // Check for robots.txt and sitemap.xml
  const hasRobotsTxt = await checkResourceExists(`${new URL(url).origin}/robots.txt`);
  const hasSitemapXml = await checkResourceExists(`${new URL(url).origin}/sitemap.xml`);
  
  return {
    title,
    metaDescription,
    loadTime,
    isHttps,
    imagesWithoutAlt,
    totalSizeKB,
    h1Count,
    h2Count,
    h3Count,
    hasRobotsTxt,
    hasSitemapXml,
    
    // Initialize security data
    securityHeaders: {
      xContentTypeOptions: false,
      xFrameOptions: false,
      strictTransportSecurity: false,
      contentSecurityPolicy: false
    },
    vulnerableLibraries: [],
    
    // Initialize mobile data
    hasViewportMeta: false,
    fontSizeOnMobile: 'Média',
    clickableAreasSufficient: false,
    
    // Initialize analytics data
    analyticsTools: {
      googleAnalytics: false,
      metaPixel: false,
      linkedInInsightTag: false,
      otherTrackers: []
    },
    trackingScriptPlacement: {
      inHead: [],
      inBody: []
    },
    
    // Initialize technical SEO data
    metaTags: {
      title: false,
      description: false,
      canonical: false,
      ogImage: false
    },
    hasStructuredData: false,
    
    // Initialize HTTP headers data
    headers: {
      cacheControl: '',
      etag: '',
      expires: ''
    }
  };
}

async function checkResourceExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

function calculateSEOScore(data: SiteData): number {
  let score = 100;
  
  // Title checks
  if (!data.title) score -= 15;
  else if (data.title.length < 10 || data.title.length > 60) score -= 5;
  
  // Meta description checks
  if (!data.metaDescription) score -= 15;
  else if (data.metaDescription.length < 50 || data.metaDescription.length > 160) score -= 5;
  
  // Heading structure checks
  if (data.h1Count === 0) score -= 10;
  if (data.h1Count > 1) score -= 5;
  if (data.h2Count === 0) score -= 5;
  
  // SEO essentials
  if (!data.hasRobotsTxt) score -= 5;
  if (!data.hasSitemapXml) score -= 5;
  
  // HTTPS
  if (!data.isHttps) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

function calculateAccessibilityScore(data: SiteData): number {
  let score = 100;
  
  // Images without alt text
  if (data.imagesWithoutAlt > 0) {
    const penalty = Math.min(30, data.imagesWithoutAlt * 5);
    score -= penalty;
  }
  
  // Heading structure
  if (data.h1Count === 0) score -= 15;
  if (data.h1Count > 1) score -= 10;
  
  // This is a simplified score - a real implementation would check more factors
  
  return Math.max(0, Math.min(100, score));
}

function calculatePerformanceScore(data: SiteData): number {
  let score = 100;
  
  // Load time penalties
  if (data.loadTime > 1) {
    const loadTimePenalty = Math.min(50, Math.floor((data.loadTime - 1) * 10));
    score -= loadTimePenalty;
  }
  
  // Page size penalties
  if (data.totalSizeKB > 1000) {
    const sizePenalty = Math.min(30, Math.floor((data.totalSizeKB - 1000) / 100));
    score -= sizePenalty;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Gets the SEO check items
 * @param data The site data
 * @returns Array of check items
 */
function getSEOCheckItems(data: SiteData): CheckItem[] {
  return [
    {
      name: 'Título da Página',
      passed: data.title.length > 0,
      details: data.title.length > 0 ? 
        `Título presente: "${data.title}" (${data.title.length} caracteres)` : 
        'Título ausente ou vazio.'
    },
    {
      name: 'Meta Description',
      passed: data.metaDescription.length > 0,
      details: data.metaDescription.length > 0 ? 
        `Meta description presente (${data.metaDescription.length} caracteres)` : 
        'Meta description ausente.'
    },
    {
      name: 'Estrutura de Headings',
      passed: data.h1Count === 1,
      details: data.h1Count === 1 ? 
        'Estrutura de headings adequada com uma tag H1.' : 
        data.h1Count === 0 ? 
          'Nenhuma tag H1 encontrada.' : 
          `Múltiplas tags H1 encontradas (${data.h1Count}), o que não é recomendado.`
    },
    {
      name: 'HTTPS',
      passed: data.isHttps,
      details: data.isHttps ? 
        'O site utiliza HTTPS, o que é bom para SEO e segurança.' : 
        'O site não utiliza HTTPS, o que pode afetar negativamente o SEO.'
    },
    {
      name: 'Robots.txt',
      passed: data.hasRobotsTxt,
      details: data.hasRobotsTxt ? 
        'Arquivo robots.txt encontrado.' : 
        'Arquivo robots.txt não encontrado.'
    },
    {
      name: 'Sitemap.xml',
      passed: data.hasSitemapXml,
      details: data.hasSitemapXml ? 
        'Arquivo sitemap.xml encontrado.' : 
        'Arquivo sitemap.xml não encontrado.'
    }
  ];
}

/**
 * Gets the accessibility check items
 * @param data The site data
 * @returns Array of check items
 */
function getAccessibilityCheckItems(data: SiteData): CheckItem[] {
  return [
    {
      name: 'Imagens com Alt Text',
      passed: data.imagesWithoutAlt === 0,
      details: data.imagesWithoutAlt === 0 ? 
        'Todas as imagens possuem texto alternativo.' : 
        `${data.imagesWithoutAlt} imagens sem texto alternativo.`
    },
    {
      name: 'Estrutura de Headings',
      passed: data.h1Count === 1,
      details: data.h1Count === 1 ? 
        'Estrutura de headings adequada com uma tag H1.' : 
        data.h1Count === 0 ? 
          'Nenhuma tag H1 encontrada, o que prejudica a acessibilidade.' : 
          `Múltiplas tags H1 encontradas (${data.h1Count}), o que pode confundir leitores de tela.`
    }
  ];
}

/**
 * Gets the performance check items
 * @param data The site data
 * @returns Array of check items
 */
function getPerformanceCheckItems(data: SiteData): CheckItem[] {
  return [
    {
      name: 'Tempo de Carregamento',
      passed: data.loadTime <= 3,
      details: data.loadTime <= 1 ? 
        `Tempo de carregamento excelente: ${data.loadTime.toFixed(2)} segundos.` : 
        data.loadTime <= 3 ? 
          `Tempo de carregamento bom: ${data.loadTime.toFixed(2)} segundos.` : 
          `Tempo de carregamento lento: ${data.loadTime.toFixed(2)} segundos.`
    },
    {
      name: 'Tamanho Total',
      passed: data.totalSizeKB <= 1000,
      details: data.totalSizeKB <= 500 ? 
        `Tamanho total excelente: ${data.totalSizeKB} KB.` : 
        data.totalSizeKB <= 1000 ? 
          `Tamanho total bom: ${data.totalSizeKB} KB.` : 
          `Tamanho total grande: ${data.totalSizeKB} KB.`
    }
  ];
}

function getSEODetails(data: SiteData, score: number): string {
  if (score >= 80) {
    return 'Bom SEO. Título e meta description bem configurados.';
  } else if (score >= 50) {
    return 'SEO médio. Melhorias necessárias na estrutura de headings e meta tags.';
  } else {
    return 'SEO fraco. Faltam elementos essenciais como título adequado, meta description e estrutura de headings.';
  }
}

function getAccessibilityDetails(data: SiteData, score: number): string {
  if (score >= 80) {
    return 'Boa acessibilidade. Imagens com textos alternativos e estrutura semântica adequada.';
  } else if (score >= 50) {
    return 'Acessibilidade média. Algumas imagens sem texto alternativo.';
  } else {
    return 'Acessibilidade fraca. Muitas imagens sem texto alternativo e problemas na estrutura semântica.';
  }
}

function getPerformanceDetails(data: SiteData, score: number): string {
  if (score >= 80) {
    return 'Boa performance. Tempo de carregamento rápido e tamanho total adequado.';
  } else if (score >= 50) {
    return 'Performance média. Tempo de carregamento pode ser melhorado.';
  } else {
    return 'Performance fraca. Tempo de carregamento lento e tamanho total muito grande.';
  }
}
