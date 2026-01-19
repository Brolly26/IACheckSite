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
exports.runMobileCheck = runMobileCheck;
exports.calculateMobileScore = calculateMobileScore;
exports.getMobileCheckItems = getMobileCheckItems;
exports.getMobileStatus = getMobileStatus;
exports.getMobileDetails = getMobileDetails;
/**
 * Runs a mobile and responsiveness check on the given URL
 * @param page The Puppeteer page (already navigated)
 * @param url The URL to check
 * @returns Mobile check data
 */
function runMobileCheck(page, url) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Running mobile and responsiveness check...');
        // FIRST: Check viewport meta tag BEFORE changing viewport (more accurate)
        const hasViewportMeta = yield page.evaluate(() => {
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            if (!viewportMeta)
                return false;
            // Also check if viewport has proper content
            const content = viewportMeta.getAttribute('content') || '';
            return content.includes('width=device-width') || content.includes('width=');
        });
        // Save current viewport
        const originalViewport = page.viewport();
        // Set mobile viewport for font/clickable area checks
        yield page.setViewport({
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true
        });
        // Small delay to let CSS recalculate (no reload needed)
        yield new Promise(resolve => setTimeout(resolve, 500));
        // Check font sizes on mobile
        const fontSizeData = yield page.evaluate(() => {
            const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, input, label'));
            let tooSmallCount = 0;
            let totalElements = textElements.length;
            textElements.forEach(el => {
                const fontSize = parseInt(window.getComputedStyle(el).fontSize);
                if (fontSize < 12) {
                    tooSmallCount++;
                }
            });
            const percentTooSmall = totalElements > 0 ? (tooSmallCount / totalElements) * 100 : 0;
            if (percentTooSmall > 20) {
                return 'Pequena';
            }
            else if (percentTooSmall > 5) {
                return 'Média';
            }
            else {
                return 'Adequada';
            }
        });
        // Check if clickable areas are sufficient
        const clickableAreasSufficient = yield page.evaluate(() => {
            const clickableElements = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="submit"], input[type="button"]'));
            let tooSmallCount = 0;
            let totalElements = clickableElements.length;
            clickableElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                // Minimum touch target size should be 44x44 pixels
                if (rect.width < 44 || rect.height < 44) {
                    tooSmallCount++;
                }
            });
            const percentTooSmall = totalElements > 0 ? (tooSmallCount / totalElements) * 100 : 0;
            // If more than 20% of clickable elements are too small, consider it insufficient
            return percentTooSmall <= 20;
        });
        // Restore original viewport
        if (originalViewport) {
            yield page.setViewport(originalViewport);
        }
        return {
            hasViewportMeta,
            fontSizeOnMobile: fontSizeData,
            clickableAreasSufficient
        };
    });
}
/**
 * Calculates the mobile score based on the collected data
 * @param data The site data
 * @returns The mobile score (0-100)
 */
function calculateMobileScore(data) {
    let score = 100;
    // Viewport meta tag
    if (!data.hasViewportMeta) {
        score -= 40; // Major penalty for no viewport meta tag
    }
    // Font size on mobile
    if (data.fontSizeOnMobile === 'Pequena') {
        score -= 30;
    }
    else if (data.fontSizeOnMobile === 'Média') {
        score -= 15;
    }
    // Clickable areas
    if (!data.clickableAreasSufficient) {
        score -= 30;
    }
    return Math.max(0, Math.min(100, score));
}
/**
 * Gets the mobile check items
 * @param data The site data
 * @returns Array of check items
 */
function getMobileCheckItems(data) {
    return [
        {
            name: 'Viewport Meta Tag',
            passed: data.hasViewportMeta,
            details: data.hasViewportMeta ?
                'O site utiliza a meta tag viewport corretamente.' :
                'O site não utiliza a meta tag viewport, essencial para responsividade.'
        },
        {
            name: 'Tamanho de Fonte em Mobile',
            passed: data.fontSizeOnMobile !== 'Pequena',
            details: data.fontSizeOnMobile === 'Adequada' ?
                'As fontes têm tamanho adequado para leitura em dispositivos móveis.' :
                data.fontSizeOnMobile === 'Média' ?
                    'Algumas fontes podem ser pequenas demais para leitura confortável em dispositivos móveis.' :
                    'Muitas fontes são pequenas demais para leitura confortável em dispositivos móveis.'
        },
        {
            name: 'Áreas Clicáveis',
            passed: data.clickableAreasSufficient,
            details: data.clickableAreasSufficient ?
                'Botões e links têm áreas clicáveis adequadas para uso em dispositivos móveis.' :
                'Muitos botões e links têm áreas clicáveis pequenas demais para uso confortável em dispositivos móveis.'
        }
    ];
}
/**
 * Gets the mobile status based on the score
 * @param score The mobile score
 * @returns The mobile status
 */
function getMobileStatus(score) {
    if (score >= 90)
        return 'Excelente';
    if (score >= 70)
        return 'Bom';
    if (score >= 40)
        return 'Atenção';
    return 'Crítico';
}
/**
 * Gets the mobile details based on the score
 * @param data The site data
 * @param score The mobile score
 * @returns The mobile details
 */
function getMobileDetails(data, score) {
    if (score >= 90) {
        return 'Excelente experiência mobile. O site é totalmente responsivo e otimizado para dispositivos móveis.';
    }
    else if (score >= 70) {
        return 'Boa experiência mobile. O site é responsivo, mas tem pequenas melhorias a serem feitas.';
    }
    else if (score >= 40) {
        return 'Experiência mobile média. O site tem problemas de responsividade que afetam a usabilidade.';
    }
    else {
        return 'Experiência mobile crítica. O site não está otimizado para dispositivos móveis.';
    }
}
