import puppeteer, { Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
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

// ===== CACHE SYSTEM =====
interface CacheEntry {
  result: AnalysisResult;
  timestamp: number;
}

// In-memory cache for analysis results
const analysisCache = new Map<string, CacheEntry>();

// Cache TTL: 30 minutes (in milliseconds)
const CACHE_TTL = 30 * 60 * 1000;

/**
 * Normalizes URL for cache key (removes trailing slash, www, etc.)
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove www. prefix if present
    let hostname = parsed.hostname.replace(/^www\./, '');
    // Create normalized key: protocol + hostname + pathname (no trailing slash)
    let pathname = parsed.pathname.replace(/\/$/, '') || '/';
    return `${parsed.protocol}//${hostname}${pathname}`;
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Gets cached result if valid
 */
function getCachedResult(url: string): AnalysisResult | null {
  const cacheKey = normalizeUrl(url);
  const cached = analysisCache.get(cacheKey);

  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_TTL) {
      const ageMinutes = Math.round(age / 60000);
      console.log(`📦 Cache hit for ${url} (cached ${ageMinutes} min ago)`);
      return cached.result;
    } else {
      // Expired, remove from cache
      console.log(`🗑️ Cache expired for ${url}`);
      analysisCache.delete(cacheKey);
    }
  }

  return null;
}

/**
 * Stores result in cache
 */
function cacheResult(url: string, result: AnalysisResult): void {
  const cacheKey = normalizeUrl(url);
  analysisCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
  console.log(`💾 Cached result for ${url} (cache size: ${analysisCache.size})`);
}

/**
 * Clears expired entries from cache (runs periodically)
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of analysisCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) {
      analysisCache.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`🧹 Cleaned ${removed} expired cache entries`);
  }
}

// Clean cache every 10 minutes
setInterval(cleanExpiredCache, 10 * 60 * 1000);

// ===== END CACHE SYSTEM =====

export async function analyzeSite(url: string): Promise<AnalysisResult> {
  // Check cache first
  const cachedResult = getCachedResult(url);
  if (cachedResult) {
    return cachedResult;
  }
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting analysis for: ${url}`);

  // Configure browser launch options - optimized for speed
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

  // Optimization flags for Chromium (safe for Render)
  const minimalArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
  ];

  let launchOptions: any;

  if (isProduction) {
    console.log('🚀 Using @sparticuz/chromium for production...');
    launchOptions = {
      args: [...chromium.args, ...minimalArgs],
      defaultViewport: { width: 1280, height: 720 }, // Smaller viewport
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    };
  } else if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log('💻 Using custom Chrome path for development...');
    launchOptions = {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: minimalArgs,
      defaultViewport: { width: 1280, height: 720 },
    };
  } else {
    console.log('🔄 Fallback to @sparticuz/chromium...');
    launchOptions = {
      args: [...chromium.args, ...minimalArgs],
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    };
  }

  console.log(`[${Date.now() - startTime}ms] Launching browser...`);
  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();

    // Block heavy resources to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block images, fonts, media to speed up analysis
      if (['image', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Set timeout to 30 seconds
    await page.setDefaultNavigationTimeout(30000);

    // Navigate to the URL
    console.log(`[${Date.now() - startTime}ms] Navigating to ${url}...`);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log(`[${Date.now() - startTime}ms] Page loaded, collecting data...`);

    // Capture headers from initial response (reused by reports)
    const responseHeaders = response?.headers() || {};

    // Get REAL load time from browser's Performance API (not server time)
    const performanceTiming = await page.evaluate(() => {
      const timing = performance.timing;
      // Time from navigation start to DOM content loaded
      const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
      // Time from navigation start to full load
      const fullLoad = timing.loadEventEnd - timing.navigationStart;

      // Use domContentLoaded as primary metric (more reliable)
      // If it's 0 or negative, use performance.now() as fallback
      if (domContentLoaded > 0) {
        return domContentLoaded / 1000; // Convert to seconds
      } else if (fullLoad > 0) {
        return fullLoad / 1000;
      } else {
        // Fallback: use time since navigation
        return performance.now() / 1000;
      }
    });

    // Cap at reasonable max (30s) and ensure minimum (0.1s)
    const loadTime = Math.max(0.1, Math.min(30, performanceTiming));
    console.log(`Page load time: ${loadTime.toFixed(2)}s`);

    // Collect site data
    console.log('Collecting site data...');
    const siteData = await collectSiteData(page, url, loadTime);

    // Run additional checks (reusing page and headers - NO extra navigation)
    console.log('Running additional checks...');

    // Security check - pass headers from initial response
    const securityData = await runSecurityCheck(page, url, responseHeaders);
    siteData.securityHeaders = securityData.securityHeaders;
    siteData.vulnerableLibraries = securityData.vulnerableLibraries;

    // Mobile check - changes viewport temporarily, restores automatically
    const mobileData = await runMobileCheck(page, url);
    siteData.hasViewportMeta = mobileData.hasViewportMeta;
    siteData.fontSizeOnMobile = mobileData.fontSizeOnMobile;
    siteData.clickableAreasSufficient = mobileData.clickableAreasSufficient;

    // Analytics check - page already loaded, no navigation needed
    const analyticsData = await runAnalyticsCheck(page);
    siteData.analyticsTools = analyticsData.analyticsTools;
    siteData.trackingScriptPlacement = analyticsData.trackingScriptPlacement;

    // Technical SEO check - page already loaded, no navigation needed
    const technicalSeoData = await runTechnicalSeoCheck(page);
    siteData.metaTags = technicalSeoData.metaTags;
    siteData.hasStructuredData = technicalSeoData.hasStructuredData;

    // HTTP headers check - use headers from initial response
    const httpHeadersData = await runHttpHeadersCheck(responseHeaders);
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
    console.log(`[${Date.now() - startTime}ms] Generating AI analysis...`);
    const aiAnalysis = await generateAIAnalysis(siteData);

    console.log(`[${Date.now() - startTime}ms] ✅ Analysis complete!`);

    const result: AnalysisResult = {
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

    // Cache the result before returning
    cacheResult(url, result);

    return result;
  } catch (error) {
    console.error('Error during site analysis:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function collectSiteData(page: Page, url: string, loadTime: number): Promise<SiteData> {
  // Get page title and meta description
  const title = await page.title();
  const metaDescription = await page.$eval('meta[name="description"]', (el: HTMLMetaElement) => el.getAttribute('content') || '').catch(() => '');
  
  // Check if HTTPS is used
  const isHttps = url.startsWith('https://');
  
  // Count images without alt text
  const imagesWithoutAlt = await page.$$eval('img:not([alt]), img[alt=""]', (imgs: HTMLImageElement[]) => imgs.length);
  
  // Get total size of page (HTML + inline resources)
  const pageMetrics = await page.evaluate(() => {
    // Get HTML size
    const htmlSize = new Blob([document.documentElement.outerHTML]).size;

    // Try to get resource sizes (may be 0 for cross-origin)
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    let resourceSize = 0;

    resourceEntries.forEach((resource) => {
      // Use transferSize if available, otherwise encodedBodySize
      const size = resource.transferSize || resource.encodedBodySize || 0;
      resourceSize += size;
    });

    // Count scripts, stylesheets, images for estimation if resource API fails
    const scripts = document.querySelectorAll('script[src]').length;
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]').length;
    const images = document.querySelectorAll('img').length;

    return {
      htmlSize,
      resourceSize,
      estimatedResources: { scripts, stylesheets, images }
    };
  });

  // Calculate total size - use actual if available, otherwise estimate
  let totalSizeKB = Math.round(pageMetrics.htmlSize / 1024);

  if (pageMetrics.resourceSize > 0) {
    totalSizeKB = Math.round((pageMetrics.htmlSize + pageMetrics.resourceSize) / 1024);
  } else {
    // Estimate: average script ~50KB, stylesheet ~20KB, image ~100KB
    const estimated = (pageMetrics.estimatedResources.scripts * 50) +
                      (pageMetrics.estimatedResources.stylesheets * 20) +
                      (pageMetrics.estimatedResources.images * 100);
    totalSizeKB += estimated;
  }
  
  // Count heading tags
  const h1Count = await page.$$eval('h1', (h1s: HTMLHeadingElement[]) => h1s.length);
  const h2Count = await page.$$eval('h2', (h2s: HTMLHeadingElement[]) => h2s.length);
  const h3Count = await page.$$eval('h3', (h3s: HTMLHeadingElement[]) => h3s.length);
  
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
