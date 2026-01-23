import PDFDocument from 'pdfkit';
import { AnalysisResult } from '../utils/types';
import { Readable, PassThrough } from 'stream';
import fetch from 'node-fetch';

/**
 * White-label options for PDF customization
 */
export interface PdfOptions {
  // Agency branding
  agencyName?: string;
  agencyLogo?: string; // URL or base64 of logo image
  agencyWebsite?: string;

  // Colors (hex)
  primaryColor?: string;

  // URL being analyzed
  siteUrl?: string;
}

// Default options
const defaultOptions: PdfOptions = {
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
export async function generatePdfReport(result: AnalysisResult, options: PdfOptions = {}): Promise<Readable> {
  // Merge with defaults
  const opts = { ...defaultOptions, ...options };
  // Validation: Check if result structure is valid
  if (!result) {
    throw new Error('Analysis result is required');
  }
  
  const requiredFields = ['seo', 'accessibility', 'performance', 'security', 
                          'mobile', 'analytics', 'technicalSeo', 'httpHeaders', 'aiAnalysis'];
  
  for (const field of requiredFields) {
    if (!result[field as keyof AnalysisResult]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validation: Check if scores are valid numbers
  const scoreFields = ['seo', 'accessibility', 'performance', 'security', 
                       'mobile', 'analytics', 'technicalSeo', 'httpHeaders'];
  
  for (const field of scoreFields) {
    const fieldData = result[field as keyof AnalysisResult] as any;
    if (typeof fieldData?.score !== 'number' || isNaN(fieldData.score)) {
      throw new Error(`Invalid score for ${field}. Expected a number.`);
    }
  }
  
  // Create a document
  const doc = new PDFDocument({ 
    margin: 50,
    size: 'A4'
  });
  
  // Create a pass-through stream
  const passThrough = new PassThrough();
  
  // Pipe the PDF into the pass-through stream
  doc.pipe(passThrough);
  
  // Add content to the PDF
  // NOVA ORDEM: Análise simples primeiro, dados técnicos como apêndice

  // 1. Header com logo e título
  await addHeader(doc, opts);

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
}

/**
 * Adds the header to the PDF with optional white-label branding
 * @param doc The PDF document
 * @param opts White-label options
 */
async function addHeader(doc: PDFKit.PDFDocument, opts: PdfOptions): Promise<void> {
  const startY = doc.y;

  // Add agency logo if provided
  if (opts.agencyLogo) {
    try {
      let logoBuffer: Buffer;

      if (opts.agencyLogo.startsWith('data:')) {
        // Base64 image
        const base64Data = opts.agencyLogo.split(',')[1];
        logoBuffer = Buffer.from(base64Data, 'base64');
      } else if (opts.agencyLogo.startsWith('http')) {
        // URL - fetch the image
        const response = await fetch(opts.agencyLogo);
        const arrayBuffer = await response.arrayBuffer();
        logoBuffer = Buffer.from(arrayBuffer);
      } else {
        logoBuffer = Buffer.from(opts.agencyLogo, 'base64');
      }

      // Add logo centered at top
      doc.image(logoBuffer, (doc.page.width - 120) / 2, startY, {
        width: 120,
        align: 'center'
      });
      doc.y = startY + 70;
    } catch (error) {
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
function drawScoreBar(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, score: number): void {
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
function addScoreOverview(doc: PDFKit.PDFDocument, result: AnalysisResult, opts: PdfOptions): void {
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
  const averageScore = Math.round(
    scores.reduce((sum, item) => sum + item.score, 0) / scores.length
  );

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
function ensurePageSpace(doc: PDFKit.PDFDocument, requiredSpace: number = 150): void {
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
function addSectionHeader(doc: PDFKit.PDFDocument, title: string, score: number): void {
  // Ensure we have enough space for the header AND some content (at least 120px)
  ensurePageSpace(doc, 120);

  const y = doc.y;

  // Title on the left
  doc.fontSize(16)
     .fillColor('#333333')
     .text(title, 50, y);

  // Score on the right with color
  doc.fontSize(14)
     .fillColor(getScoreColor(score))
     .text(`${score}/100`, 50, y, { align: 'right', width: doc.page.width - 100 });

  doc.y = y + 25;
}

/**
 * Adds the basic reports to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addBasicReports(doc: PDFKit.PDFDocument, result: AnalysisResult): void {
  ensurePageSpace(doc, 180);

  doc.fontSize(18)
     .fillColor('#333333')
     .text('Relatórios Básicos', 50, doc.y)
     .moveDown(0.5);

  // SEO
  addSectionHeader(doc, 'SEO', result.seo.score);

  doc.fontSize(12)
     .fillColor('#666666')
     .text(result.seo.details, 50)
     .moveDown(0.5);

  if (result.seo.items) {
    result.seo.items.forEach(item => {
      const checkmark = item.passed ? '✓' : '✗';
      const color = item.passed ? '#4CAF50' : '#F44336';

      doc.fontSize(10)
         .fillColor(color)
         .text(`${checkmark} `, 50, doc.y, { continued: true })
         .fillColor('#333333')
         .text(`${item.name}: `, { continued: true })
         .fillColor('#666666')
         .text(item.details || '')
         .moveDown(0.3);
    });
  }

  doc.moveDown(1);

  // Accessibility
  addSectionHeader(doc, 'Acessibilidade', result.accessibility.score);

  doc.fontSize(12)
     .fillColor('#666666')
     .text(result.accessibility.details, 50)
     .moveDown(0.5);

  if (result.accessibility.items) {
    result.accessibility.items.forEach(item => {
      const checkmark = item.passed ? '✓' : '✗';
      const color = item.passed ? '#4CAF50' : '#F44336';

      doc.fontSize(10)
         .fillColor(color)
         .text(`${checkmark} `, 50, doc.y, { continued: true })
         .fillColor('#333333')
         .text(`${item.name}: `, { continued: true })
         .fillColor('#666666')
         .text(item.details || '')
         .moveDown(0.3);
    });
  }

  doc.moveDown(1);

  // Performance
  addSectionHeader(doc, 'Performance', result.performance.score);

  doc.fontSize(12)
     .fillColor('#666666')
     .text(result.performance.details, 50)
     .moveDown(0.5);

  if (result.performance.items) {
    result.performance.items.forEach(item => {
      const checkmark = item.passed ? '✓' : '✗';
      const color = item.passed ? '#4CAF50' : '#F44336';

      doc.fontSize(10)
         .fillColor(color)
         .text(`${checkmark} `, 50, doc.y, { continued: true })
         .fillColor('#333333')
         .text(`${item.name}: `, { continued: true })
         .fillColor('#666666')
         .text(item.details || '')
         .moveDown(0.3);
    });
  }

  doc.moveDown(1);
}

/**
 * Adds the security report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addSecurityReport(doc: PDFKit.PDFDocument, result: AnalysisResult): void {
  ensurePageSpace(doc, 150);
  addSectionHeader(doc, 'Segurança', result.security.score);

  doc.fontSize(12)
     .fillColor('#666666')
     .text(result.security.details, 50)
     .moveDown(0.5);

  result.security.items.forEach(item => {
    const checkmark = item.passed ? '✓' : '✗';
    const color = item.passed ? '#4CAF50' : '#F44336';

    doc.fontSize(10)
       .fillColor(color)
       .text(`${checkmark} `, 50, doc.y, { continued: true })
       .fillColor('#333333')
       .text(`${item.name}: `, { continued: true })
       .fillColor('#666666')
       .text(item.details || '')
       .moveDown(0.3);
  });

  doc.moveDown(1);
}

/**
 * Adds the mobile report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addMobileReport(doc: PDFKit.PDFDocument, result: AnalysisResult): void {
  ensurePageSpace(doc, 150);
  addSectionHeader(doc, 'Mobile e Responsividade', result.mobile.score);

  doc.fontSize(12)
     .fillColor('#666666')
     .text(result.mobile.details, 50)
     .moveDown(0.5);

  result.mobile.items.forEach(item => {
    const checkmark = item.passed ? '✓' : '✗';
    const color = item.passed ? '#4CAF50' : '#F44336';

    doc.fontSize(10)
       .fillColor(color)
       .text(`${checkmark} `, 50, doc.y, { continued: true })
       .fillColor('#333333')
       .text(`${item.name}: `, { continued: true })
       .fillColor('#666666')
       .text(item.details || '')
       .moveDown(0.3);
  });

  doc.moveDown(1);
}

/**
 * Adds the analytics report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addAnalyticsReport(doc: PDFKit.PDFDocument, result: AnalysisResult): void {
  ensurePageSpace(doc, 150);
  addSectionHeader(doc, 'Analytics e Rastreamento', result.analytics.score);

  doc.fontSize(12)
     .fillColor('#666666')
     .text(result.analytics.details, 50)
     .moveDown(0.5);

  result.analytics.items.forEach(item => {
    const checkmark = item.passed ? '✓' : '✗';
    const color = item.passed ? '#4CAF50' : '#F44336';

    doc.fontSize(10)
       .fillColor(color)
       .text(`${checkmark} `, 50, doc.y, { continued: true })
       .fillColor('#333333')
       .text(`${item.name}: `, { continued: true })
       .fillColor('#666666')
       .text(item.details || '')
       .moveDown(0.3);
  });

  doc.moveDown(1);
}

/**
 * Adds the technical SEO report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addTechnicalSeoReport(doc: PDFKit.PDFDocument, result: AnalysisResult): void {
  ensurePageSpace(doc, 150);
  addSectionHeader(doc, 'SEO Técnico', result.technicalSeo.score);

  doc.fontSize(12)
     .fillColor('#666666')
     .text(result.technicalSeo.details, 50)
     .moveDown(0.5);

  result.technicalSeo.items.forEach(item => {
    const checkmark = item.passed ? '✓' : '✗';
    const color = item.passed ? '#4CAF50' : '#F44336';

    doc.fontSize(10)
       .fillColor(color)
       .text(`${checkmark} `, 50, doc.y, { continued: true })
       .fillColor('#333333')
       .text(`${item.name}: `, { continued: true })
       .fillColor('#666666')
       .text(item.details || '')
       .moveDown(0.3);
  });

  doc.moveDown(1);
}

/**
 * Adds the HTTP headers report to the PDF
 * @param doc The PDF document
 * @param result The analysis result
 */
function addHttpHeadersReport(doc: PDFKit.PDFDocument, result: AnalysisResult): void {
  ensurePageSpace(doc, 150);
  addSectionHeader(doc, 'Headers HTTP e Cache', result.httpHeaders.score);

  doc.fontSize(12)
     .fillColor('#666666')
     .text(result.httpHeaders.details, 50)
     .moveDown(0.5);

  result.httpHeaders.items.forEach(item => {
    const checkmark = item.passed ? '✓' : '✗';
    const color = item.passed ? '#4CAF50' : '#F44336';

    doc.fontSize(10)
       .fillColor(color)
       .text(`${checkmark} `, 50, doc.y, { continued: true })
       .fillColor('#333333')
       .text(`${item.name}: `, { continued: true })
       .fillColor('#666666')
       .text(item.details || '')
       .moveDown(0.3);
  });

  doc.moveDown(1);
}

/**
 * Adds the technical appendix section with all detailed reports
 * @param doc The PDF document
 * @param result The analysis result
 */
function addTechnicalAppendix(doc: PDFKit.PDFDocument, result: AnalysisResult): void {
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
function addAiAnalysis(doc: PDFKit.PDFDocument, result: AnalysisResult): void {
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
          ensurePageSpace(doc, 80);
          doc.fontSize(18)
             .fillColor('#333333')
             .text(paragraph.substring(2))
             .moveDown(0.5);
        } else if (paragraph.startsWith('## ')) {
          ensurePageSpace(doc, 70);
          doc.fontSize(16)
             .fillColor('#333333')
             .text(paragraph.substring(3))
             .moveDown(0.5);
        } else if (paragraph.startsWith('### ')) {
          ensurePageSpace(doc, 60);
          doc.fontSize(14)
             .fillColor('#333333')
             .text(paragraph.substring(4))
             .moveDown(0.5);
        } else if (paragraph.startsWith('- ')) {
          // It's a bullet point
          doc.fontSize(12)
             .fillColor('#666666')
             .text(`• ${paragraph.substring(2)}`)
             .moveDown(0.3);
        } else if (paragraph.trim().length > 0) {
          // It's a regular paragraph
          doc.fontSize(12)
             .fillColor('#666666')
             .text(paragraph)
             .moveDown(0.5);
        }
      } catch (error) {
        console.error('Error processing paragraph in AI analysis:', error);
        // Continue with next paragraph
      }
    });
  } catch (error) {
    console.error('Error adding AI analysis to PDF:', error);
    // Continue without AI analysis if there's an error
  }
}

/**
 * Adds the footer to the PDF with white-label support
 * @param doc The PDF document
 * @param opts White-label options
 */
function addFooter(doc: PDFKit.PDFDocument, opts: PdfOptions): void {
  try {
    // Get the current page range
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    // Determine footer text
    const footerText = opts.agencyName
      ? `© ${new Date().getFullYear()} ${opts.agencyName}${opts.agencyWebsite ? ' • ' + opts.agencyWebsite : ''}`
      : `Relatório gerado automaticamente`;

    // Add footer to each page in the range
    for (let i = 0; i < totalPages; i++) {
      const pageNumber = range.start + i;
      doc.switchToPage(pageNumber);

      // Save current position
      const savedY = doc.y;

      // Add page number - use explicit width to prevent page creation
      doc.fontSize(9)
         .fillColor('#999999')
         .text(
           `Página ${pageNumber + 1} de ${totalPages}`,
           50,
           doc.page.height - 45,
           { align: 'center', width: doc.page.width - 100, lineBreak: false }
         );

      // Add footer text (agency name or generic)
      doc.fontSize(8)
         .fillColor('#bbbbbb')
         .text(
           footerText,
           50,
           doc.page.height - 30,
           { align: 'center', width: doc.page.width - 100, lineBreak: false }
         );

      // Restore position
      doc.y = savedY;
    }
  } catch (error) {
    console.error('Error adding footer to PDF:', error);
    // Continue without footer if there's an error
  }
}

/**
 * Gets the color for a score
 * @param score The score
 * @returns The color
 */
function getScoreColor(score: number): string {
  if (score >= 80) return '#4CAF50'; // Green
  if (score >= 50) return '#FF9800'; // Orange
  return '#F44336'; // Red
}

/**
 * Gets the label for a score
 * @param score The score
 * @returns The label
 */
function getScoreLabel(score: number): string {
  if (score >= 80) return 'Bom';
  if (score >= 50) return 'Médio';
  return 'Ruim';
}

/**
 * Gets the color for a status
 * @param status The status
 * @returns The color
 */
function getStatusColor(status: string): string {
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
