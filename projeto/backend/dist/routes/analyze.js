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
router.post('/analyze', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        // Validate URL format
        try {
            new URL(url);
        }
        catch (error) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        const analysisResult = yield (0, analyzer_1.analyzeSite)(url);
        res.json(analysisResult);
    }
    catch (error) {
        console.error('Error analyzing site:', error);
        res.status(500).json({
            error: 'Failed to analyze site',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Route to generate and download a PDF report
router.post('/generate-pdf', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Generating PDF report...');
        const analysisResult = req.body;
        if (!analysisResult || !analysisResult.seo) {
            return res.status(400).json({ error: 'Invalid analysis result' });
        }
        // Generate the PDF
        const pdfStream = yield (0, pdfGenerator_1.generatePdfReport)(analysisResult);
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
