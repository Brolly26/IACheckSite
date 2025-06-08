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
exports.runHttpHeadersCheck = runHttpHeadersCheck;
exports.calculateHttpHeadersScore = calculateHttpHeadersScore;
exports.getHttpHeadersCheckItems = getHttpHeadersCheckItems;
exports.getHttpHeadersStatus = getHttpHeadersStatus;
exports.getHttpHeadersDetails = getHttpHeadersDetails;
/**
 * Runs an HTTP headers and cache check on the given URL
 * @param page The Puppeteer page
 * @param url The URL to check
 * @returns HTTP headers check data
 */
function runHttpHeadersCheck(page, url) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Running HTTP headers and cache check...');
        // Navigate to the URL and get headers
        const response = yield page.goto(url, { waitUntil: 'networkidle2' });
        const headers = (response === null || response === void 0 ? void 0 : response.headers()) || {};
        return {
            headers: {
                cacheControl: headers['cache-control'] || '',
                etag: headers['etag'] || '',
                expires: headers['expires'] || ''
            }
        };
    });
}
/**
 * Calculates the HTTP headers score based on the collected data
 * @param data The site data
 * @returns The HTTP headers score (0-100)
 */
function calculateHttpHeadersScore(data) {
    let score = 100;
    // Check cache-control header
    if (!data.headers.cacheControl) {
        score -= 40; // Major penalty for no cache-control
    }
    else {
        // Check for common cache-control directives
        const cacheControl = data.headers.cacheControl.toLowerCase();
        // Check for max-age directive
        if (!cacheControl.includes('max-age=')) {
            score -= 20;
        }
        else {
            // Extract max-age value
            const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
            if (maxAgeMatch) {
                const maxAge = parseInt(maxAgeMatch[1]);
                // Penalize for very short or very long max-age
                if (maxAge < 3600) { // Less than 1 hour
                    score -= 10;
                }
                else if (maxAge > 31536000) { // More than 1 year
                    score -= 5;
                }
            }
        }
        // Check for public/private directive
        if (!cacheControl.includes('public') && !cacheControl.includes('private')) {
            score -= 10;
        }
        // Check for no-cache or no-store (which might be appropriate in some cases)
        if (cacheControl.includes('no-store')) {
            score -= 5; // Small penalty for no-store
        }
    }
    // Check ETag header
    if (!data.headers.etag) {
        score -= 20;
    }
    // Check Expires header
    if (!data.headers.expires) {
        score -= 10;
    }
    else {
        try {
            const expiresDate = new Date(data.headers.expires);
            const now = new Date();
            // Check if expires date is in the past
            if (expiresDate < now) {
                score -= 10;
            }
        }
        catch (error) {
            // Invalid date format
            score -= 10;
        }
    }
    return Math.max(0, Math.min(100, score));
}
/**
 * Gets the HTTP headers check items
 * @param data The site data
 * @returns Array of check items
 */
function getHttpHeadersCheckItems(data) {
    // Parse cache-control directives
    const cacheControl = data.headers.cacheControl.toLowerCase();
    const hasMaxAge = cacheControl.includes('max-age=');
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;
    const hasPublicPrivate = cacheControl.includes('public') || cacheControl.includes('private');
    const hasNoStore = cacheControl.includes('no-store');
    const hasNoCache = cacheControl.includes('no-cache');
    return [
        {
            name: 'Cache-Control',
            passed: !!data.headers.cacheControl,
            details: data.headers.cacheControl ?
                `Cache-Control configurado: ${data.headers.cacheControl}` :
                'Cache-Control não configurado, o que pode afetar a performance.'
        },
        {
            name: 'Max-Age',
            passed: hasMaxAge,
            details: hasMaxAge ?
                `Max-Age configurado para ${maxAge} segundos (${Math.round(maxAge / 3600)} horas).` :
                'Diretiva Max-Age não configurada no Cache-Control.'
        },
        {
            name: 'Public/Private',
            passed: hasPublicPrivate,
            details: hasPublicPrivate ?
                `Cache configurado como ${cacheControl.includes('public') ? 'público' : 'privado'}.` :
                'Diretivas Public/Private não configuradas no Cache-Control.'
        },
        {
            name: 'ETag',
            passed: !!data.headers.etag,
            details: data.headers.etag ?
                'ETag configurado para validação de cache.' :
                'ETag não configurado, o que pode aumentar o tráfego desnecessário.'
        },
        {
            name: 'Expires',
            passed: !!data.headers.expires,
            details: data.headers.expires ?
                `Header Expires configurado para: ${data.headers.expires}` :
                'Header Expires não configurado.'
        }
    ];
}
/**
 * Gets the HTTP headers status based on the score
 * @param score The HTTP headers score
 * @returns The HTTP headers status
 */
function getHttpHeadersStatus(score) {
    if (score >= 80)
        return 'Otimizado';
    if (score >= 50)
        return 'Adequado';
    return 'Inadequado';
}
/**
 * Gets the HTTP headers details based on the score
 * @param data The site data
 * @param score The HTTP headers score
 * @returns The HTTP headers details
 */
function getHttpHeadersDetails(data, score) {
    if (score >= 80) {
        return 'Headers HTTP e cache otimizados. O site utiliza corretamente Cache-Control, ETag e outros headers para melhorar a performance.';
    }
    else if (score >= 50) {
        return 'Headers HTTP e cache adequados. Algumas configurações de cache estão presentes, mas há espaço para otimização.';
    }
    else {
        return 'Headers HTTP e cache inadequados. O site não utiliza corretamente os headers de cache, o que pode afetar a performance e o SEO.';
    }
}
