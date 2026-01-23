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
const node_fetch_1 = __importDefault(require("node-fetch"));
// Default options
const defaultOptions = {
    agencyName: '',
    agencyLogo: '',
    agencyWebsite: '',
    primaryColor: '#2563eb',
    siteUrl: ''
};
/**
 * Generates a PDF report from the analysis result
 * @param result The analysis result
 * @param options White-label customization options
 * @returns A readable stream of the PDF
 */
function generatePdfReport(result_1) {
    return __awaiter(this, arguments, void 0, function* (result, options = {}) {
        // Merge with defaults
        const opts = Object.assign(Object.assign({}, defaultOptions), options);
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
        // NOVA ORDEM: Análise simples primeiro, dados técnicos como apêndice
        // 1. Header com logo e título
        yield addHeader(doc, opts);
        // 2. Análise da IA (linguagem simples para dono de negócio)
        addAiAnalysis(doc, result);
        // 3. Visão geral com pontuações visuais
        addScoreOverview(doc, result, opts);
        // 4. Apêndice técnico (dados detalhados)
        addTechnicalAppendix(doc, result);
        // 5. Footer em todas as páginas
        addFooter(doc, opts);
        // Finalize the PDF and end the stream
        doc.end();
        return passThrough;
    });
}
/**
 * Adds the header to the PDF with optional white-label branding
 * @param doc The PDF document
 * @param opts White-label options
 */
function addHeader(doc, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const startY = doc.y;
        // Add agency logo if provided
        if (opts.agencyLogo) {
            try {
                let logoBuffer;
                if (opts.agencyLogo.startsWith('data:')) {
                    // Base64 image
                    const base64Data = opts.agencyLogo.split(',')[1];
                    logoBuffer = Buffer.from(base64Data, 'base64');
                }
                else if (opts.agencyLogo.startsWith('http')) {
                    // URL - fetch the image
                    const response = yield (0, node_fetch_1.default)(opts.agencyLogo);
                    const arrayBuffer = yield response.arrayBuffer();
                    logoBuffer = Buffer.from(arrayBuffer);
                }
                else {
                    logoBuffer = Buffer.from(opts.agencyLogo, 'base64');
                }
                // Add logo centered at top
                doc.image(logoBuffer, (doc.page.width - 120) / 2, startY, {
                    width: 120,
                    align: 'center'
                });
                doc.y = startY + 70;
            }
            catch (error) {
                console.warn('Could not load agency logo:', error);
            }
        }
        // Agency name or default title
        const title = opts.agencyName || 'Relatório de Análise Técnica';
        doc.fontSize(24)
            .fillColor(opts.primaryColor || '#333333')
            .text(title, { align: 'center' })
            .moveDown(0.3);
        // Subtitle
        doc.fontSize(14)
            .fillColor('#666666')
            .text('Diagnóstico Completo de Website', { align: 'center' })
            .moveDown(0.5);
        // Site URL if provided
        if (opts.siteUrl) {
            doc.fontSize(12)
                .fillColor('#999999')
                .text(opts.siteUrl, { align: 'center' })
                .moveDown(0.3);
        }
        // Date
        doc.fontSize(10)
            .fillColor('#999999')
            .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { align: 'center' })
            .moveDown(2);
        // Separator line
        doc.strokeColor('#e0e0e0')
            .lineWidth(1)
            .moveTo(50, doc.y)
            .lineTo(doc.page.width - 50, doc.y)
            .stroke();
        doc.moveDown(1);
    });
}
/**
 * Draws a score bar (visual progress bar)
 * @param doc The PDF document
 * @param x X position
 * @param y Y position
 * @param width Total width
 * @param height Bar height
 * @param score Score 0-100
 */
function drawScoreBar(doc, x, y, width, height, score) {
    // Background bar (gray)
    doc.roundedRect(x, y, width, height, 3)
        .fillColor('#e0e0e0')
        .fill();
    // Score bar (colored based on score)
    const scoreWidth = (score / 100) * width;
    if (scoreWidth > 0) {
        doc.roundedRect(x, y, scoreWidth, height, 3)
            .fillColor(getScoreColor(score))
            .fill();
    }
}
/**
 * Adds the visual score overview with progress bars
 * @param doc The PDF document
 * @param result The analysis result
 * @param opts White-label options
 */
function addScoreOverview(doc, result, opts) {
    const scores = [
        { name: 'SEO', score: result.seo.score, icon: '🔍' },
        { name: 'Acessibilidade', score: result.accessibility.score, icon: '♿' },
        { name: 'Performance', score: result.performance.score, icon: '⚡' },
        { name: 'Segurança', score: result.security.score, icon: '🔒' },
        { name: 'Mobile', score: result.mobile.score, icon: '📱' },
        { name: 'Analytics', score: result.analytics.score, icon: '📊' },
        { name: 'SEO Técnico', score: result.technicalSeo.score, icon: '⚙️' },
        { name: 'Headers HTTP', score: result.httpHeaders.score, icon: '🌐' }
    ];
    // Calculate average score
    const averageScore = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);
    // Section title
    doc.fontSize(18)
        .fillColor(opts.primaryColor || '#333333')
        .text('Visão Geral', { underline: false })
        .moveDown(1);
    // Average score box
    const boxX = 50;
    const boxWidth = doc.page.width - 100;
    const boxY = doc.y;
    // Draw average score prominently
    doc.roundedRect(boxX, boxY, boxWidth, 60, 8)
        .fillColor('#f8f9fa')
        .fill();
    doc.fontSize(14)
        .fillColor('#666666')
        .text('Pontuação Geral', boxX + 20, boxY + 10);
    doc.fontSize(32)
        .fillColor(getScoreColor(averageScore))
        .text(`${averageScore}`, boxX + 20, boxY + 25, { continued: true })
        .fontSize(16)
        .fillColor('#999999')
        .text('/100');
    // Score bar for average
    drawScoreBar(doc, boxX + 150, boxY + 35, boxWidth - 180, 15, averageScore);
    doc.y = boxY + 75;
    // Individual scores with bars
    const barWidth = 200;
    const labelWidth = 120;
    const startX = 50;
    scores.forEach((item, index) => {
        const y = doc.y;
        // Label
        doc.fontSize(11)
            .fillColor('#333333')
            .text(`${item.name}`, startX, y, { width: labelWidth });
        // Score bar
        drawScoreBar(doc, startX + labelWidth, y + 2, barWidth, 12, item.score);
        // Score value
        doc.fontSize(11)
            .fillColor(getScoreColor(item.score))
            .text(`${item.score}`, startX + labelWidth + barWidth + 10, y);
        doc.y = y + 22;
    });
    doc.moveDown(1);
    // Separator line
    doc.strokeColor('#e0e0e0')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();
    doc.moveDown(1);
}
/**
 * Checks if there's enough space on the current page
 * If not, adds a new page
 * @param doc The PDF document
 * @param requiredSpace Minimum space required in pixels
 */
function ensurePageSpace(doc, requiredSpace = 150) {
    const pageHeight = doc.page.height;
    const bottomMargin = 60; // Space for footer
    const availableSpace = pageHeight - bottomMargin - doc.y;
    if (availableSpace < requiredSpace) {
        doc.addPage();
    }
}
/**
 * Adds a section header with score
 * @param doc The PDF document
 * @param title Section title
 * @param score Score value
 */
function addSectionHeader(doc, title, score) {
    // Ensure we have enough space for the header AND some content (at least 120px)
    ensurePageSpace(doc, 120);
    // Add spacing before section
    doc.moveDown(0.8);
    const y = doc.y;
    // Title on the left
    doc.fontSize(15)
        .fillColor('#333333')
        .text(title, 50, y);
    // Score on the right with color
    doc.fontSize(13)
        .fillColor(getScoreColor(score))
        .text(`${score}/100`, 50, y, { align: 'right', width: doc.page.width - 100 });
    doc.y = y + 30;
}
/**
 * Adds a checklist item with proper spacing
 */
function addChecklistItem(doc, item) {
    const checkmark = item.passed ? '✓' : '✗';
    const color = item.passed ? '#4CAF50' : '#e53935';
    doc.fontSize(10)
        .fillColor(color)
        .text(`${checkmark} `, 60, doc.y, { continued: true })
        .fillColor('#444444')
        .text(`${item.name}: `, { continued: true })
        .fillColor('#666666')
        .text(item.details || '')
        .moveDown(0.5);
}
/**
 * Adds the basic reports to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addBasicReports(doc, result) {
    ensurePageSpace(doc, 180);
    doc.fontSize(18)
        .fillColor('#333333')
        .text('Relatórios Básicos', 50, doc.y)
        .moveDown(0.8);
    // SEO
    addSectionHeader(doc, 'SEO', result.seo.score);
    doc.fontSize(11)
        .fillColor('#555555')
        .text(result.seo.details, 50, doc.y, { lineGap: 2 })
        .moveDown(0.6);
    if (result.seo.items) {
        result.seo.items.forEach(item => addChecklistItem(doc, item));
    }
    doc.moveDown(0.8);
    // Accessibility
    addSectionHeader(doc, 'Acessibilidade', result.accessibility.score);
    doc.fontSize(11)
        .fillColor('#555555')
        .text(result.accessibility.details, 50, doc.y, { lineGap: 2 })
        .moveDown(0.6);
    if (result.accessibility.items) {
        result.accessibility.items.forEach(item => addChecklistItem(doc, item));
    }
    doc.moveDown(0.8);
    // Performance
    addSectionHeader(doc, 'Performance', result.performance.score);
    doc.fontSize(11)
        .fillColor('#555555')
        .text(result.performance.details, 50, doc.y, { lineGap: 2 })
        .moveDown(0.6);
    if (result.performance.items) {
        result.performance.items.forEach(item => addChecklistItem(doc, item));
    }
    doc.moveDown(0.8);
}
/**
 * Adds the security report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addSecurityReport(doc, result) {
    ensurePageSpace(doc, 150);
    addSectionHeader(doc, 'Segurança', result.security.score);
    doc.fontSize(11)
        .fillColor('#555555')
        .text(result.security.details, 50, doc.y, { lineGap: 2 })
        .moveDown(0.6);
    result.security.items.forEach(item => addChecklistItem(doc, item));
    doc.moveDown(0.8);
}
/**
 * Adds the mobile report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addMobileReport(doc, result) {
    ensurePageSpace(doc, 150);
    addSectionHeader(doc, 'Mobile e Responsividade', result.mobile.score);
    doc.fontSize(11)
        .fillColor('#555555')
        .text(result.mobile.details, 50, doc.y, { lineGap: 2 })
        .moveDown(0.6);
    result.mobile.items.forEach(item => addChecklistItem(doc, item));
    doc.moveDown(0.8);
}
/**
 * Adds the analytics report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addAnalyticsReport(doc, result) {
    ensurePageSpace(doc, 150);
    addSectionHeader(doc, 'Analytics e Rastreamento', result.analytics.score);
    doc.fontSize(11)
        .fillColor('#555555')
        .text(result.analytics.details, 50, doc.y, { lineGap: 2 })
        .moveDown(0.6);
    result.analytics.items.forEach(item => addChecklistItem(doc, item));
    doc.moveDown(0.8);
}
/**
 * Adds the technical SEO report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addTechnicalSeoReport(doc, result) {
    ensurePageSpace(doc, 150);
    addSectionHeader(doc, 'SEO Técnico', result.technicalSeo.score);
    doc.fontSize(11)
        .fillColor('#555555')
        .text(result.technicalSeo.details, 50, doc.y, { lineGap: 2 })
        .moveDown(0.6);
    result.technicalSeo.items.forEach(item => addChecklistItem(doc, item));
    doc.moveDown(0.8);
}
/**
 * Adds the HTTP headers report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addHttpHeadersReport(doc, result) {
    ensurePageSpace(doc, 150);
    addSectionHeader(doc, 'Headers HTTP e Cache', result.httpHeaders.score);
    doc.fontSize(11)
        .fillColor('#555555')
        .text(result.httpHeaders.details, 50, doc.y, { lineGap: 2 })
        .moveDown(0.6);
    result.httpHeaders.items.forEach(item => addChecklistItem(doc, item));
    doc.moveDown(0.8);
}
/**
 * Adds the technical appendix section with all detailed reports
 * @param doc The PDF document
 * @param result The analysis result
 */
function addTechnicalAppendix(doc, result) {
    // Start appendix on new page
    doc.addPage();
    // Appendix title
    doc.fontSize(22)
        .fillColor('#333333')
        .text('Apêndice Técnico', 50, doc.y, { align: 'center', width: doc.page.width - 100 })
        .moveDown(0.3);
    doc.fontSize(11)
        .fillColor('#666666')
        .text('Dados detalhados para sua equipe técnica ou desenvolvedor', 50, doc.y, { align: 'center', width: doc.page.width - 100 })
        .moveDown(1);
    // Separator
    doc.strokeColor('#e0e0e0')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();
    doc.moveDown(1);
    // Add all technical reports
    addBasicReports(doc, result);
    addSecurityReport(doc, result);
    addMobileReport(doc, result);
    addAnalyticsReport(doc, result);
    addTechnicalSeoReport(doc, result);
    addHttpHeadersReport(doc, result);
}
/**
 * Adds the AI analysis to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addAiAnalysis(doc, result) {
    try {
        // Ensure space for AI analysis section header
        ensurePageSpace(doc, 200);
        doc.fontSize(18)
            .fillColor('#333333')
            .text('Análise Detalhada por IA', 50, doc.y)
            .moveDown(0.5);
        // Check if AI analysis is available
        if (!result.aiAnalysis || result.aiAnalysis.includes('Ocorreu um erro')) {
            doc.fontSize(12)
                .fillColor('#666666')
                .text('A análise detalhada por IA não está disponível neste momento.', 50)
                .moveDown(0.5);
            return;
        }
        // Split the AI analysis into paragraphs
        const paragraphs = result.aiAnalysis.split('\n');
        // Process each paragraph
        paragraphs.forEach(paragraph => {
            try {
                // Check page space before adding content
                ensurePageSpace(doc, 50);
                // Check if it's a heading
                if (paragraph.startsWith('# ')) {
                    ensurePageSpace(doc, 100);
                    doc.moveDown(0.8);
                    doc.fontSize(20)
                        .fillColor('#1a1a1a')
                        .text(paragraph.substring(2))
                        .moveDown(0.8);
                }
                else if (paragraph.startsWith('## ')) {
                    ensurePageSpace(doc, 90);
                    doc.moveDown(0.6);
                    doc.fontSize(16)
                        .fillColor('#333333')
                        .text(paragraph.substring(3))
                        .moveDown(0.6);
                }
                else if (paragraph.startsWith('### ')) {
                    ensurePageSpace(doc, 80);
                    doc.moveDown(0.4);
                    doc.fontSize(14)
                        .fillColor('#444444')
                        .text(paragraph.substring(4))
                        .moveDown(0.4);
                }
                else if (paragraph.startsWith('- ')) {
                    // It's a bullet point
                    doc.fontSize(11)
                        .fillColor('#555555')
                        .text(`  • ${paragraph.substring(2)}`, { indent: 15 })
                        .moveDown(0.4);
                }
                else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    // Bold text (problem title)
                    ensurePageSpace(doc, 70);
                    doc.moveDown(0.5);
                    doc.fontSize(13)
                        .fillColor('#d32f2f')
                        .text(paragraph.replace(/\*\*/g, ''))
                        .moveDown(0.3);
                }
                else if (paragraph.trim().length > 0) {
                    // It's a regular paragraph
                    doc.fontSize(11)
                        .fillColor('#555555')
                        .text(paragraph, { lineGap: 3 })
                        .moveDown(0.5);
                }
            }
            catch (error) {
                console.error('Error processing paragraph in AI analysis:', error);
                // Continue with next paragraph
            }
        });
    }
    catch (error) {
        console.error('Error adding AI analysis to PDF:', error);
        // Continue without AI analysis if there's an error
    }
}
/**
 * Adds the footer to the PDF with white-label support
 * @param doc The PDF document
 * @param opts White-label options
 */
function addFooter(doc, opts) {
    try {
        // Flushes pages so bufferedPageRange returns correct count
        const range = doc.bufferedPageRange();
        if (!range || range.count === 0)
            return;
        const totalPages = range.count;
        // Determine footer text
        const footerText = opts.agencyName
            ? `© ${new Date().getFullYear()} ${opts.agencyName}${opts.agencyWebsite ? ' • ' + opts.agencyWebsite : ''}`
            : '';
        // Add footer to each page
        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);
            // Page number at bottom center
            doc.fontSize(9)
                .fillColor('#999999');
            // Calculate center position manually to avoid text() creating pages
            const pageText = `Página ${i + 1} de ${totalPages}`;
            const textWidth = doc.widthOfString(pageText);
            const xPos = (doc.page.width - textWidth) / 2;
            doc.text(pageText, xPos, doc.page.height - 40, {
                lineBreak: false,
                continued: false
            });
            // Footer text (if agency name provided)
            if (footerText) {
                doc.fontSize(8)
                    .fillColor('#bbbbbb');
                const footerWidth = doc.widthOfString(footerText);
                const footerX = (doc.page.width - footerWidth) / 2;
                doc.text(footerText, footerX, doc.page.height - 28, {
                    lineBreak: false,
                    continued: false
                });
            }
        }
    }
    catch (error) {
        console.error('Error adding footer to PDF:', error);
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
