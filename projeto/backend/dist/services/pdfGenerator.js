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
exports.generatePdfReport = generatePdfReport;
const pdfkit_1 = __importDefault(require("pdfkit"));
const stream_1 = require("stream");
/**
 * Generates a PDF report from the analysis result
 * @param result The analysis result
 * @returns A readable stream of the PDF
 */
function generatePdfReport(result) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validation: Check if result structure is valid
        if (!result) {
            throw new Error('Analysis result is required');
        }
        const requiredFields = ['seo', 'accessibility', 'performance', 'security',
            'mobile', 'analytics', 'technicalSeo', 'httpHeaders', 'aiAnalysis'];
        for (const field of requiredFields) {
            if (!result[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        // Validation: Check if scores are valid numbers
        const scoreFields = ['seo', 'accessibility', 'performance', 'security',
            'mobile', 'analytics', 'technicalSeo', 'httpHeaders'];
        for (const field of scoreFields) {
            const fieldData = result[field];
            if (typeof (fieldData === null || fieldData === void 0 ? void 0 : fieldData.score) !== 'number' || isNaN(fieldData.score)) {
                throw new Error(`Invalid score for ${field}. Expected a number.`);
            }
        }
        // Create a document
        const doc = new pdfkit_1.default({
            margin: 50,
            size: 'A4'
        });
        // Create a pass-through stream
        const passThrough = new stream_1.PassThrough();
        // Pipe the PDF into the pass-through stream
        doc.pipe(passThrough);
        // Add content to the PDF
        addHeader(doc);
        addSummary(doc, result);
        addBasicReports(doc, result);
        addSecurityReport(doc, result);
        addMobileReport(doc, result);
        addAnalyticsReport(doc, result);
        addTechnicalSeoReport(doc, result);
        addHttpHeadersReport(doc, result);
        addAiAnalysis(doc, result);
        addFooter(doc);
        // Finalize the PDF and end the stream
        doc.end();
        return passThrough;
    });
}
/**
 * Adds the header to the PDF
 * @param doc The PDF document
 */
function addHeader(doc) {
    doc.fontSize(24)
        .fillColor('#333333')
        .text('Relatório de Análise Técnica', { align: 'center' })
        .moveDown(0.5);
    doc.fontSize(12)
        .fillColor('#666666')
        .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { align: 'center' })
        .moveDown(2);
}
/**
 * Adds the summary to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addSummary(doc, result) {
    doc.fontSize(18)
        .fillColor('#333333')
        .text('Resumo da Análise', { underline: true })
        .moveDown(1);
    // Create a table-like structure for scores
    const scores = [
        { name: 'SEO', score: result.seo.score },
        { name: 'Acessibilidade', score: result.accessibility.score },
        { name: 'Performance', score: result.performance.score },
        { name: 'Segurança', score: result.security.score },
        { name: 'Mobile', score: result.mobile.score },
        { name: 'Analytics', score: result.analytics.score },
        { name: 'SEO Técnico', score: result.technicalSeo.score },
        { name: 'Headers HTTP', score: result.httpHeaders.score }
    ];
    // Calculate average score
    const averageScore = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);
    // Add average score
    doc.fontSize(14)
        .fillColor('#333333')
        .text(`Pontuação Média: ${averageScore}/100`, { continued: true })
        .fillColor(getScoreColor(averageScore))
        .text(` (${getScoreLabel(averageScore)})`)
        .moveDown(1);
    // Add individual scores
    scores.forEach(item => {
        doc.fontSize(12)
            .fillColor('#333333')
            .text(`${item.name}: `, { continued: true })
            .fillColor(getScoreColor(item.score))
            .text(`${item.score}/100 (${getScoreLabel(item.score)})`)
            .moveDown(0.5);
    });
    doc.moveDown(2);
}
/**
 * Adds the basic reports to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addBasicReports(doc, result) {
    doc.fontSize(18)
        .fillColor('#333333')
        .text('Relatórios Básicos', { underline: true })
        .moveDown(1);
    // SEO
    doc.fontSize(16)
        .fillColor('#333333')
        .text('SEO', { continued: true })
        .fontSize(12)
        .text(` (${result.seo.score}/100)`, { align: 'right' })
        .moveDown(0.5);
    doc.fontSize(12)
        .fillColor('#666666')
        .text(result.seo.details)
        .moveDown(1);
    if (result.seo.items) {
        result.seo.items.forEach(item => {
            doc.fontSize(10)
                .fillColor(item.passed ? '#4CAF50' : '#F44336')
                .text(`${item.passed ? '✓' : '✗'} ${item.name}`, { continued: true })
                .fillColor('#666666')
                .text(`: ${item.details}`)
                .moveDown(0.5);
        });
    }
    doc.moveDown(1);
    // Accessibility
    doc.fontSize(16)
        .fillColor('#333333')
        .text('Acessibilidade', { continued: true })
        .fontSize(12)
        .text(` (${result.accessibility.score}/100)`, { align: 'right' })
        .moveDown(0.5);
    doc.fontSize(12)
        .fillColor('#666666')
        .text(result.accessibility.details)
        .moveDown(1);
    if (result.accessibility.items) {
        result.accessibility.items.forEach(item => {
            doc.fontSize(10)
                .fillColor(item.passed ? '#4CAF50' : '#F44336')
                .text(`${item.passed ? '✓' : '✗'} ${item.name}`, { continued: true })
                .fillColor('#666666')
                .text(`: ${item.details}`)
                .moveDown(0.5);
        });
    }
    doc.moveDown(1);
    // Performance
    doc.fontSize(16)
        .fillColor('#333333')
        .text('Performance', { continued: true })
        .fontSize(12)
        .text(` (${result.performance.score}/100)`, { align: 'right' })
        .moveDown(0.5);
    doc.fontSize(12)
        .fillColor('#666666')
        .text(result.performance.details)
        .moveDown(1);
    if (result.performance.items) {
        result.performance.items.forEach(item => {
            doc.fontSize(10)
                .fillColor(item.passed ? '#4CAF50' : '#F44336')
                .text(`${item.passed ? '✓' : '✗'} ${item.name}`, { continued: true })
                .fillColor('#666666')
                .text(`: ${item.details}`)
                .moveDown(0.5);
        });
    }
    doc.moveDown(2);
}
/**
 * Adds the security report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addSecurityReport(doc, result) {
    doc.fontSize(18)
        .fillColor('#333333')
        .text('Segurança', { underline: true })
        .moveDown(1);
    doc.fontSize(16)
        .fillColor('#333333')
        .text('Status: ', { continued: true })
        .fillColor(getStatusColor(result.security.status))
        .text(result.security.status)
        .moveDown(0.5);
    doc.fontSize(12)
        .fillColor('#666666')
        .text(result.security.details)
        .moveDown(1);
    result.security.items.forEach(item => {
        doc.fontSize(10)
            .fillColor(item.passed ? '#4CAF50' : '#F44336')
            .text(`${item.passed ? '✓' : '✗'} ${item.name}`, { continued: true })
            .fillColor('#666666')
            .text(`: ${item.details}`)
            .moveDown(0.5);
    });
    doc.moveDown(2);
}
/**
 * Adds the mobile report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addMobileReport(doc, result) {
    doc.fontSize(18)
        .fillColor('#333333')
        .text('Mobile e Responsividade', { underline: true })
        .moveDown(1);
    doc.fontSize(16)
        .fillColor('#333333')
        .text('Status: ', { continued: true })
        .fillColor(getStatusColor(result.mobile.status))
        .text(result.mobile.status)
        .moveDown(0.5);
    doc.fontSize(12)
        .fillColor('#666666')
        .text(result.mobile.details)
        .moveDown(1);
    result.mobile.items.forEach(item => {
        doc.fontSize(10)
            .fillColor(item.passed ? '#4CAF50' : '#F44336')
            .text(`${item.passed ? '✓' : '✗'} ${item.name}`, { continued: true })
            .fillColor('#666666')
            .text(`: ${item.details}`)
            .moveDown(0.5);
    });
    doc.moveDown(2);
}
/**
 * Adds the analytics report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addAnalyticsReport(doc, result) {
    doc.fontSize(18)
        .fillColor('#333333')
        .text('Analytics e Rastreamento', { underline: true })
        .moveDown(1);
    doc.fontSize(16)
        .fillColor('#333333')
        .text('Status: ', { continued: true })
        .fillColor(getStatusColor(result.analytics.status))
        .text(result.analytics.status)
        .moveDown(0.5);
    doc.fontSize(12)
        .fillColor('#666666')
        .text(result.analytics.details)
        .moveDown(1);
    result.analytics.items.forEach(item => {
        doc.fontSize(10)
            .fillColor(item.passed ? '#4CAF50' : '#F44336')
            .text(`${item.passed ? '✓' : '✗'} ${item.name}`, { continued: true })
            .fillColor('#666666')
            .text(`: ${item.details}`)
            .moveDown(0.5);
    });
    doc.moveDown(2);
}
/**
 * Adds the technical SEO report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addTechnicalSeoReport(doc, result) {
    doc.fontSize(18)
        .fillColor('#333333')
        .text('SEO Técnico', { underline: true })
        .moveDown(1);
    doc.fontSize(16)
        .fillColor('#333333')
        .text('Status: ', { continued: true })
        .fillColor(getStatusColor(result.technicalSeo.status))
        .text(result.technicalSeo.status)
        .moveDown(0.5);
    doc.fontSize(12)
        .fillColor('#666666')
        .text(result.technicalSeo.details)
        .moveDown(1);
    result.technicalSeo.items.forEach(item => {
        doc.fontSize(10)
            .fillColor(item.passed ? '#4CAF50' : '#F44336')
            .text(`${item.passed ? '✓' : '✗'} ${item.name}`, { continued: true })
            .fillColor('#666666')
            .text(`: ${item.details}`)
            .moveDown(0.5);
    });
    doc.moveDown(2);
}
/**
 * Adds the HTTP headers report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addHttpHeadersReport(doc, result) {
    doc.fontSize(18)
        .fillColor('#333333')
        .text('Headers HTTP e Cache', { underline: true })
        .moveDown(1);
    doc.fontSize(16)
        .fillColor('#333333')
        .text('Status: ', { continued: true })
        .fillColor(getStatusColor(result.httpHeaders.status))
        .text(result.httpHeaders.status)
        .moveDown(0.5);
    doc.fontSize(12)
        .fillColor('#666666')
        .text(result.httpHeaders.details)
        .moveDown(1);
    result.httpHeaders.items.forEach(item => {
        doc.fontSize(10)
            .fillColor(item.passed ? '#4CAF50' : '#F44336')
            .text(`${item.passed ? '✓' : '✗'} ${item.name}`, { continued: true })
            .fillColor('#666666')
            .text(`: ${item.details}`)
            .moveDown(0.5);
    });
    doc.moveDown(2);
}
/**
 * Adds the AI analysis to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addAiAnalysis(doc, result) {
    try {
        doc.addPage();
        doc.fontSize(18)
            .fillColor('#333333')
            .text('Análise Detalhada por IA', { underline: true })
            .moveDown(1);
        // Check if AI analysis is available
        if (!result.aiAnalysis || result.aiAnalysis.includes('Ocorreu um erro')) {
            doc.fontSize(12)
                .fillColor('#666666')
                .text('A análise detalhada por IA não está disponível neste momento.')
                .moveDown(1);
            return;
        }
        // Split the AI analysis into paragraphs
        const paragraphs = result.aiAnalysis.split('\n');
        // Process each paragraph
        paragraphs.forEach(paragraph => {
            try {
                // Check if it's a heading
                if (paragraph.startsWith('# ')) {
                    doc.fontSize(18)
                        .fillColor('#333333')
                        .text(paragraph.substring(2))
                        .moveDown(1);
                }
                else if (paragraph.startsWith('## ')) {
                    doc.fontSize(16)
                        .fillColor('#333333')
                        .text(paragraph.substring(3))
                        .moveDown(1);
                }
                else if (paragraph.startsWith('### ')) {
                    doc.fontSize(14)
                        .fillColor('#333333')
                        .text(paragraph.substring(4))
                        .moveDown(1);
                }
                else if (paragraph.startsWith('- ')) {
                    // It's a bullet point
                    doc.fontSize(12)
                        .fillColor('#666666')
                        .text(`• ${paragraph.substring(2)}`)
                        .moveDown(0.5);
                }
                else if (paragraph.trim().length > 0) {
                    // It's a regular paragraph
                    doc.fontSize(12)
                        .fillColor('#666666')
                        .text(paragraph)
                        .moveDown(1);
                }
            }
            catch (error) {
                console.error('Error processing paragraph in AI analysis:', error);
                // Continue with next paragraph
            }
        });
        doc.moveDown(2);
    }
    catch (error) {
        console.error('Error adding AI analysis to PDF:', error);
        // Continue without AI analysis if there's an error
    }
}
/**
 * Adds the footer to the PDF
 * @param doc The PDF document
 */
function addFooter(doc) {
    try {
        // Get the current page range
        const range = doc.bufferedPageRange();
        const totalPages = range.count;
        // Add footer to each page in the range
        for (let i = 0; i < totalPages; i++) {
            const pageNumber = range.start + i;
            doc.switchToPage(pageNumber);
            // Add page number
            doc.fontSize(10)
                .fillColor('#999999')
                .text(`Página ${pageNumber + 1} de ${totalPages}`, 0, doc.page.height - 50, { align: 'center' });
            // Add copyright
            doc.fontSize(10)
                .fillColor('#999999')
                .text(`© ${new Date().getFullYear()} Site Analyzer - Todos os direitos reservados`, 0, doc.page.height - 30, { align: 'center' });
        }
    }
    catch (error) {
        console.error('Error adding footer to PDF:', error);
        // Continue without footer if there's an error
    }
}
/**
 * Gets the color for a score
 * @param score The score
 * @returns The color
 */
function getScoreColor(score) {
    if (score >= 80)
        return '#4CAF50'; // Green
    if (score >= 50)
        return '#FF9800'; // Orange
    return '#F44336'; // Red
}
/**
 * Gets the label for a score
 * @param score The score
 * @returns The label
 */
function getScoreLabel(score) {
    if (score >= 80)
        return 'Bom';
    if (score >= 50)
        return 'Médio';
    return 'Ruim';
}
/**
 * Gets the color for a status
 * @param status The status
 * @returns The color
 */
function getStatusColor(status) {
    switch (status) {
        case 'Seguro':
        case 'Excelente':
        case 'Completo':
        case 'Otimizado':
            return '#4CAF50'; // Green
        case 'Bom':
        case 'Adequado':
            return '#8BC34A'; // Light Green
        case 'Atenção':
        case 'Parcial':
            return '#FF9800'; // Orange
        case 'Crítico':
        case 'Ausente':
        case 'Inadequado':
            return '#F44336'; // Red
        default:
            return '#333333'; // Default
    }
}
