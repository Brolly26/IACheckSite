"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTechnicalSeoCheck = runTechnicalSeoCheck;
exports.calculateTechnicalSeoScore = calculateTechnicalSeoScore;
exports.getTechnicalSeoCheckItems = getTechnicalSeoCheckItems;
exports.getTechnicalSeoStatus = getTechnicalSeoStatus;
exports.getTechnicalSeoDetails = getTechnicalSeoDetails;
/**
 * Runs a technical SEO check on the given URL
 * @param page The Puppeteer page
 * @param url The URL to check
 * @returns Technical SEO check data
 */
function runTechnicalSeoCheck(page, url) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Running technical SEO check...');
        // Navigate to the URL
        yield page.goto(url, { waitUntil: 'networkidle2' });
        // Check meta tags and structured data
        const seoData = yield page.evaluate(() => {
            // Check meta tags
            const metaTags = {
                title: document.title.length > 0,
                description: !!document.querySelector('meta[name="description"]'),
                canonical: !!document.querySelector('link[rel="canonical"]'),
                ogImage: !!document.querySelector('meta[property="og:image"]')
            };
            // Check for structured data
            const hasStructuredData = !!document.querySelector('script[type="application/ld+json"]') ||
                !!document.querySelector('[itemscope]') ||
                !!document.querySelector('[itemtype]');
            return {
                metaTags,
                hasStructuredData
            };
        });
        return seoData;
    });
}
/**
 * Calculates the technical SEO score based on the collected data
 * @param data The site data
 * @returns The technical SEO score (0-100)
 */
function calculateTechnicalSeoScore(data) {
    let score = 100;
    // Meta tags
    if (!data.metaTags.title)
        score -= 20;
    if (!data.metaTags.description)
        score -= 15;
    if (!data.metaTags.canonical)
        score -= 10;
    if (!data.metaTags.ogImage)
        score -= 10;
    // Structured data
    if (!data.hasStructuredData)
        score -= 15;
    // Robots.txt and sitemap.xml
    if (!data.hasRobotsTxt)
        score -= 15;
    if (!data.hasSitemapXml)
        score -= 15;
    return Math.max(0, Math.min(100, score));
}
/**
 * Gets the technical SEO check items
 * @param data The site data
 * @returns Array of check items
 */
function getTechnicalSeoCheckItems(data) {
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
function getTechnicalSeoStatus(score) {
    if (score >= 90)
        return 'Excelente';
    if (score >= 70)
        return 'Bom';
    if (score >= 40)
        return 'Atenção';
    return 'Crítico';
}
/**
 * Gets the technical SEO details based on the score
 * @param data The site data
 * @param score The technical SEO score
 * @returns The technical SEO details
 */
function getTechnicalSeoDetails(data, score) {
    if (score >= 90) {
        return 'Excelente implementação técnica de SEO. O site possui todas as meta tags essenciais, dados estruturados e arquivos de suporte para motores de busca.';
    }
    else if (score >= 70) {
        return 'Boa implementação técnica de SEO. O site possui a maioria das meta tags e elementos técnicos importantes.';
    }
    else if (score >= 40) {
        return 'Implementação técnica de SEO com problemas. Faltam elementos importantes como meta tags essenciais ou arquivos de suporte.';
    }
    else {
        return 'Implementação técnica de SEO crítica. A maioria dos elementos técnicos de SEO está ausente.';
    }
}
