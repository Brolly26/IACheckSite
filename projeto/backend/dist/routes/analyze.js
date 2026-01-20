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
exports.analyzeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const analyzer_1 = require("../services/analyzer");
const pdfGenerator_1 = require("../services/pdfGenerator");
const router = express_1.default.Router();
// In-memory rate limit store
const rateLimitStore = new Map();
// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP
/**
 * Gets client IP address from request
 */
function getClientIp(req) {
    // Check for proxy headers (Render, Vercel, etc.)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
        return ips.trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
/**
 * Rate limiter middleware
 */
function rateLimiter(req, res, next) {
    const clientIp = getClientIp(req);
    const now = Date.now();
    // Get or create rate limit entry
    let entry = rateLimitStore.get(clientIp);
    if (!entry || now >= entry.resetTime) {
        // New window
        entry = {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW
        };
        rateLimitStore.set(clientIp, entry);
        next();
        return;
    }
    // Check if limit exceeded
    if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
        console.warn(`⚠️ Rate limit exceeded for IP: ${clientIp}`);
        res.status(429).json({
            error: 'Too Many Requests',
            message: `Limite de requisições excedido. Tente novamente em ${retryAfter} segundos.`,
            retryAfter
        });
        return;
    }
    // Increment counter
    entry.count++;
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
    res.setHeader('X-RateLimit-Remaining', (MAX_REQUESTS_PER_WINDOW - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
    next();
}
// Clean expired rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    let removed = 0;
    for (const [ip, entry] of rateLimitStore.entries()) {
        if (now >= entry.resetTime) {
            rateLimitStore.delete(ip);
            removed++;
        }
    }
    if (removed > 0) {
        console.log(`🧹 Cleaned ${removed} expired rate limit entries`);
    }
}, 5 * 60 * 1000);
// ===== END RATE LIMITING =====
// Apply rate limiter to analyze endpoint
router.post('/analyze', rateLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({
                error: 'URL is required',
                message: 'Por favor, forneça uma URL válida.'
            });
        }
        // Validate URL format
        let urlObj;
        try {
            urlObj = new URL(url);
        }
        catch (error) {
            return res.status(400).json({
                error: 'Invalid URL format',
                message: 'Formato de URL inválido. Use: https://exemplo.com'
            });
        }
        // Validate URL protocol
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return res.status(400).json({
                error: 'Invalid URL protocol',
                message: 'A URL deve começar com http:// ou https://'
            });
        }
        console.log(`[${new Date().toISOString()}] Analyzing site: ${url}`);
        const analysisResult = yield (0, analyzer_1.analyzeSite)(url);
        console.log(`[${new Date().toISOString()}] Analysis completed for: ${url}`);
        res.json(analysisResult);
    }
    catch (error) {
        console.error(`[${new Date().toISOString()}] Error analyzing site:`, error);
        // Mensagens de erro mais amigáveis
        let userMessage = 'Ocorreu um erro ao analisar o site. Por favor, tente novamente.';
        if (error instanceof Error) {
            if (error.message.includes('Chrome') || error.message.includes('browser')) {
                userMessage = 'Erro de configuração do servidor. Por favor, contate o administrador.';
            }
            else if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
                userMessage = 'O site demorou muito para responder. Tente novamente ou verifique se a URL está correta.';
            }
            else if (error.message.includes('net::ERR') || error.message.includes('Failed to navigate')) {
                userMessage = 'Não foi possível acessar o site. Verifique se a URL está correta e se o site está online.';
            }
        }
        res.status(500).json({
            error: 'Failed to analyze site',
            message: userMessage,
            details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
        });
    }
}));
// Route to generate and download a PDF report
router.post('/generate-pdf', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Generating PDF report...');
        const { analysis, whiteLabel } = req.body;
        // Support both old format (direct analysis) and new format (with whiteLabel)
        const analysisResult = analysis || req.body;
        if (!analysisResult || !analysisResult.seo) {
            return res.status(400).json({ error: 'Invalid analysis result' });
        }
        // Build PDF options from white-label settings
        const pdfOptions = {
            agencyName: (whiteLabel === null || whiteLabel === void 0 ? void 0 : whiteLabel.agencyName) || '',
            agencyLogo: (whiteLabel === null || whiteLabel === void 0 ? void 0 : whiteLabel.agencyLogo) || '',
            agencyWebsite: (whiteLabel === null || whiteLabel === void 0 ? void 0 : whiteLabel.agencyWebsite) || '',
            primaryColor: (whiteLabel === null || whiteLabel === void 0 ? void 0 : whiteLabel.primaryColor) || '#2563eb',
            siteUrl: (whiteLabel === null || whiteLabel === void 0 ? void 0 : whiteLabel.siteUrl) || ''
        };
        console.log('PDF options:', {
            hasLogo: !!pdfOptions.agencyLogo,
            agencyName: pdfOptions.agencyName,
            siteUrl: pdfOptions.siteUrl
        });
        // Generate the PDF with options
        const pdfStream = yield (0, pdfGenerator_1.generatePdfReport)(analysisResult, pdfOptions);
        // Set headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=site-analysis-report.pdf');
        // Handle errors
        pdfStream.on('error', (err) => {
            console.error('PDF stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Failed to generate PDF',
                    message: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        });
        // Pipe the PDF stream to the response
        pdfStream.pipe(res);
    }
    catch (error) {
        console.error('Error generating PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to generate PDF',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}));
exports.analyzeRoutes = router;
