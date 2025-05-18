import * as puppeteer from 'puppeteer';
import { SiteData, CheckItem } from '../../utils/types';

/**
 * Runs a technical SEO check on the given URL
 * @param page The Puppeteer page
 * @param url The URL to check
 * @returns Technical SEO check data
 */
export async function runTechnicalSeoCheck(page: puppeteer.Page, url: string): Promise<{
  metaTags: SiteData['metaTags'],
  hasStructuredData: boolean
}> {
  console.log('Running technical SEO check...');
  
  // Navigate to the URL
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Check meta tags and structured data
  const seoData = await page.evaluate(() => {
    // Check meta tags
    const metaTags = {
      title: document.title.length > 0,
      description: !!document.querySelector('meta[name="description"]'),
      canonical: !!document.querySelector('link[rel="canonical"]'),
      ogImage: !!document.querySelector('meta[property="og:image"]')
    };
    
    // Check for structured data
    const hasStructuredData = 
      !!document.querySelector('script[type="application/ld+json"]') || 
      !!document.querySelector('[itemscope]') || 
      !!document.querySelector('[itemtype]');
    
    return {
      metaTags,
      hasStructuredData
    };
  });
  
  return seoData;
}

/**
 * Calculates the technical SEO score based on the collected data
 * @param data The site data
 * @returns The technical SEO score (0-100)
 */
export function calculateTechnicalSeoScore(data: SiteData): number {
  let score = 100;
  
  // Meta tags
  if (!data.metaTags.title) score -= 20;
  if (!data.metaTags.description) score -= 15;
  if (!data.metaTags.canonical) score -= 10;
  if (!data.metaTags.ogImage) score -= 10;
  
  // Structured data
  if (!data.hasStructuredData) score -= 15;
  
  // Robots.txt and sitemap.xml
  if (!data.hasRobotsTxt) score -= 15;
  if (!data.hasSitemapXml) score -= 15;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Gets the technical SEO check items
 * @param data The site data
 * @returns Array of check items
 */
export function getTechnicalSeoCheckItems(data: SiteData): CheckItem[] {
  return [
    {
      name: 'Meta Title',
      passed: data.metaTags.title,
      details: data.metaTags.title ? 
        'Meta title presente e configurado.' : 
        'Meta title ausente ou vazio.'
    },
    {
      name: 'Meta Description',
      passed: data.metaTags.description,
      details: data.metaTags.description ? 
        'Meta description presente.' : 
        'Meta description ausente.'
    },
    {
      name: 'Canonical URL',
      passed: data.metaTags.canonical,
      details: data.metaTags.canonical ? 
        'Tag canonical presente, evitando conteúdo duplicado.' : 
        'Tag canonical ausente, o que pode causar problemas de conteúdo duplicado.'
    },
    {
      name: 'Open Graph Image',
      passed: data.metaTags.ogImage,
      details: data.metaTags.ogImage ? 
        'Open Graph Image configurada para compartilhamento em redes sociais.' : 
        'Open Graph Image ausente, prejudicando o compartilhamento em redes sociais.'
    },
    {
      name: 'Dados Estruturados',
      passed: data.hasStructuredData,
      details: data.hasStructuredData ? 
        'Dados estruturados (Schema.org) detectados, melhorando a visibilidade nos resultados de busca.' : 
        'Dados estruturados ausentes, perdendo oportunidades de rich snippets nos resultados de busca.'
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
 * Gets the technical SEO status based on the score
 * @param score The technical SEO score
 * @returns The technical SEO status
 */
export function getTechnicalSeoStatus(score: number): 'Excelente' | 'Bom' | 'Atenção' | 'Crítico' {
  if (score >= 90) return 'Excelente';
  if (score >= 70) return 'Bom';
  if (score >= 40) return 'Atenção';
  return 'Crítico';
}

/**
 * Gets the technical SEO details based on the score
 * @param data The site data
 * @param score The technical SEO score
 * @returns The technical SEO details
 */
export function getTechnicalSeoDetails(data: SiteData, score: number): string {
  if (score >= 90) {
    return 'Excelente implementação técnica de SEO. O site possui todas as meta tags essenciais, dados estruturados e arquivos de suporte para motores de busca.';
  } else if (score >= 70) {
    return 'Boa implementação técnica de SEO. O site possui a maioria das meta tags e elementos técnicos importantes.';
  } else if (score >= 40) {
    return 'Implementação técnica de SEO com problemas. Faltam elementos importantes como meta tags essenciais ou arquivos de suporte.';
  } else {
    return 'Implementação técnica de SEO crítica. A maioria dos elementos técnicos de SEO está ausente.';
  }
}
