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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSite = analyzeSite;
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
const openai_1 = require("./openai");
const node_fetch_1 = __importDefault(require("node-fetch"));
const reports_1 = require("./reports");
function analyzeSite(url) {
    return __awaiter(this, void 0, void 0, function* () {
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
        let launchOptions;
        if (isProduction) {
            console.log('🚀 Using @sparticuz/chromium for production...');
            launchOptions = {
                args: [...chromium_1.default.args, ...minimalArgs],
                defaultViewport: { width: 1280, height: 720 }, // Smaller viewport
                executablePath: yield chromium_1.default.executablePath(),
                headless: chromium_1.default.headless,
            };
        }
        else if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            console.log('💻 Using custom Chrome path for development...');
            launchOptions = {
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
                args: minimalArgs,
                defaultViewport: { width: 1280, height: 720 },
            };
        }
        else {
            console.log('🔄 Fallback to @sparticuz/chromium...');
            launchOptions = {
                args: [...chromium_1.default.args, ...minimalArgs],
                defaultViewport: { width: 1280, height: 720 },
                executablePath: yield chromium_1.default.executablePath(),
                headless: chromium_1.default.headless,
            };
        }
        console.log(`[${Date.now() - startTime}ms] Launching browser...`);
        const browser = yield puppeteer_core_1.default.launch(launchOptions);
        try {
            const page = yield browser.newPage();
            // Block heavy resources to speed up loading
            yield page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                // Block images, fonts, media to speed up analysis
                if (['image', 'font', 'media'].includes(resourceType)) {
                    req.abort();
                }
                else {
                    req.continue();
                }
            });
            // Set timeout to 30 seconds
            yield page.setDefaultNavigationTimeout(30000);
            // Navigate to the URL
            console.log(`[${Date.now() - startTime}ms] Navigating to ${url}...`);
            const response = yield page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log(`[${Date.now() - startTime}ms] Page loaded, collecting data...`);
            // Capture headers from initial response (reused by reports)
            const responseHeaders = (response === null || response === void 0 ? void 0 : response.headers()) || {};
            // Get REAL load time from browser's Performance API (not server time)
            const performanceTiming = yield page.evaluate(() => {
                const timing = performance.timing;
                // Time from navigation start to DOM content loaded
                const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
                // Time from navigation start to full load
                const fullLoad = timing.loadEventEnd - timing.navigationStart;
                // Use domContentLoaded as primary metric (more reliable)
                // If it's 0 or negative, use performance.now() as fallback
                if (domContentLoaded > 0) {
                    return domContentLoaded / 1000; // Convert to seconds
                }
                else if (fullLoad > 0) {
                    return fullLoad / 1000;
                }
                else {
                    // Fallback: use time since navigation
                    return performance.now() / 1000;
                }
            });
            // Cap at reasonable max (30s) and ensure minimum (0.1s)
            const loadTime = Math.max(0.1, Math.min(30, performanceTiming));
            console.log(`Page load time: ${loadTime.toFixed(2)}s`);
            // Collect site data
            console.log('Collecting site data...');
            const siteData = yield collectSiteData(page, url, loadTime);
            // Run additional checks (reusing page and headers - NO extra navigation)
            console.log('Running additional checks...');
            // Security check - pass headers from initial response
            const securityData = yield (0, reports_1.runSecurityCheck)(page, url, responseHeaders);
            siteData.securityHeaders = securityData.securityHeaders;
            siteData.vulnerableLibraries = securityData.vulnerableLibraries;
            // Mobile check - changes viewport temporarily, restores automatically
            const mobileData = yield (0, reports_1.runMobileCheck)(page, url);
            siteData.hasViewportMeta = mobileData.hasViewportMeta;
            siteData.fontSizeOnMobile = mobileData.fontSizeOnMobile;
            siteData.clickableAreasSufficient = mobileData.clickableAreasSufficient;
            // Analytics check - page already loaded, no navigation needed
            const analyticsData = yield (0, reports_1.runAnalyticsCheck)(page);
            siteData.analyticsTools = analyticsData.analyticsTools;
            siteData.trackingScriptPlacement = analyticsData.trackingScriptPlacement;
            // Technical SEO check - page already loaded, no navigation needed
            const technicalSeoData = yield (0, reports_1.runTechnicalSeoCheck)(page);
            siteData.metaTags = technicalSeoData.metaTags;
            siteData.hasStructuredData = technicalSeoData.hasStructuredData;
            // HTTP headers check - use headers from initial response
            const httpHeadersData = yield (0, reports_1.runHttpHeadersCheck)(responseHeaders);
            siteData.headers = httpHeadersData.headers;
            // Generate scores
            const seoScore = calculateSEOScore(siteData);
            const accessibilityScore = calculateAccessibilityScore(siteData);
            const performanceScore = calculatePerformanceScore(siteData);
            const securityScore = (0, reports_1.calculateSecurityScore)(siteData);
            const mobileScore = (0, reports_1.calculateMobileScore)(siteData);
            const analyticsScore = (0, reports_1.calculateAnalyticsScore)(siteData);
            const technicalSeoScore = (0, reports_1.calculateTechnicalSeoScore)(siteData);
            const httpHeadersScore = (0, reports_1.calculateHttpHeadersScore)(siteData);
            // Generate AI analysis
            console.log(`[${Date.now() - startTime}ms] Generating AI analysis...`);
            const aiAnalysis = yield (0, openai_1.generateAIAnalysis)(siteData);
            console.log(`[${Date.now() - startTime}ms] ✅ Analysis complete!`);
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
                    details: (0, reports_1.getSecurityDetails)(siteData, securityScore),
                    status: (0, reports_1.getSecurityStatus)(securityScore),
                    items: (0, reports_1.getSecurityCheckItems)(siteData)
                },
                mobile: {
                    score: mobileScore,
                    details: (0, reports_1.getMobileDetails)(siteData, mobileScore),
                    status: (0, reports_1.getMobileStatus)(mobileScore),
                    items: (0, reports_1.getMobileCheckItems)(siteData)
                },
                analytics: {
                    score: analyticsScore,
                    details: (0, reports_1.getAnalyticsDetails)(siteData, analyticsScore),
                    status: (0, reports_1.getAnalyticsStatus)(analyticsScore),
                    items: (0, reports_1.getAnalyticsCheckItems)(siteData)
                },
                technicalSeo: {
                    score: technicalSeoScore,
                    details: (0, reports_1.getTechnicalSeoDetails)(siteData, technicalSeoScore),
                    status: (0, reports_1.getTechnicalSeoStatus)(technicalSeoScore),
                    items: (0, reports_1.getTechnicalSeoCheckItems)(siteData)
                },
                httpHeaders: {
                    score: httpHeadersScore,
                    details: (0, reports_1.getHttpHeadersDetails)(siteData, httpHeadersScore),
                    status: (0, reports_1.getHttpHeadersStatus)(httpHeadersScore),
                    items: (0, reports_1.getHttpHeadersCheckItems)(siteData)
                },
                aiAnalysis
            };
        }
        catch (error) {
            console.error('Error during site analysis:', error);
            throw error;
        }
        finally {
            yield browser.close();
        }
    });
}
function collectSiteData(page, url, loadTime) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get page title and meta description
        const title = yield page.title();
        const metaDescription = yield page.$eval('meta[name="description"]', (el) => el.getAttribute('content') || '').catch(() => '');
        // Check if HTTPS is used
        const isHttps = url.startsWith('https://');
        // Count images without alt text
        const imagesWithoutAlt = yield page.$$eval('img:not([alt]), img[alt=""]', (imgs) => imgs.length);
        // Get total size of page (HTML + inline resources)
        const pageMetrics = yield page.evaluate(() => {
            // Get HTML size
            const htmlSize = new Blob([document.documentElement.outerHTML]).size;
            // Try to get resource sizes (may be 0 for cross-origin)
            const resourceEntries = performance.getEntriesByType('resource');
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
        }
        else {
            // Estimate: average script ~50KB, stylesheet ~20KB, image ~100KB
            const estimated = (pageMetrics.estimatedResources.scripts * 50) +
                (pageMetrics.estimatedResources.stylesheets * 20) +
                (pageMetrics.estimatedResources.images * 100);
            totalSizeKB += estimated;
        }
        // Count heading tags
        const h1Count = yield page.$$eval('h1', (h1s) => h1s.length);
        const h2Count = yield page.$$eval('h2', (h2s) => h2s.length);
        const h3Count = yield page.$$eval('h3', (h3s) => h3s.length);
        // Check for robots.txt and sitemap.xml
        const hasRobotsTxt = yield checkResourceExists(`${new URL(url).origin}/robots.txt`);
        const hasSitemapXml = yield checkResourceExists(`${new URL(url).origin}/sitemap.xml`);
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
    });
}
function checkResourceExists(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield (0, node_fetch_1.default)(url);
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    });
}
function calculateSEOScore(data) {
    let score = 100;
    // Title checks
    if (!data.title)
        score -= 15;
    else if (data.title.length < 10 || data.title.length > 60)
        score -= 5;
    // Meta description checks
    if (!data.metaDescription)
        score -= 15;
    else if (data.metaDescription.length < 50 || data.metaDescription.length > 160)
        score -= 5;
    // Heading structure checks
    if (data.h1Count === 0)
        score -= 10;
    if (data.h1Count > 1)
        score -= 5;
    if (data.h2Count === 0)
        score -= 5;
    // SEO essentials
    if (!data.hasRobotsTxt)
        score -= 5;
    if (!data.hasSitemapXml)
        score -= 5;
    // HTTPS
    if (!data.isHttps)
        score -= 10;
    return Math.max(0, Math.min(100, score));
}
function calculateAccessibilityScore(data) {
    let score = 100;
    // Images without alt text
    if (data.imagesWithoutAlt > 0) {
        const penalty = Math.min(30, data.imagesWithoutAlt * 5);
        score -= penalty;
    }
    // Heading structure
    if (data.h1Count === 0)
        score -= 15;
    if (data.h1Count > 1)
        score -= 10;
    // This is a simplified score - a real implementation would check more factors
    return Math.max(0, Math.min(100, score));
}
function calculatePerformanceScore(data) {
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
function getSEOCheckItems(data) {
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
function getAccessibilityCheckItems(data) {
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
function getPerformanceCheckItems(data) {
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
function getSEODetails(data, score) {
    if (score >= 80) {
        return 'Bom SEO. Título e meta description bem configurados.';
    }
    else if (score >= 50) {
        return 'SEO médio. Melhorias necessárias na estrutura de headings e meta tags.';
    }
    else {
        return 'SEO fraco. Faltam elementos essenciais como título adequado, meta description e estrutura de headings.';
    }
}
function getAccessibilityDetails(data, score) {
    if (score >= 80) {
        return 'Boa acessibilidade. Imagens com textos alternativos e estrutura semântica adequada.';
    }
    else if (score >= 50) {
        return 'Acessibilidade média. Algumas imagens sem texto alternativo.';
    }
    else {
        return 'Acessibilidade fraca. Muitas imagens sem texto alternativo e problemas na estrutura semântica.';
    }
}
function getPerformanceDetails(data, score) {
    if (score >= 80) {
        return 'Boa performance. Tempo de carregamento rápido e tamanho total adequado.';
    }
    else if (score >= 50) {
        return 'Performance média. Tempo de carregamento pode ser melhorado.';
    }
    else {
        return 'Performance fraca. Tempo de carregamento lento e tamanho total muito grande.';
    }
}
