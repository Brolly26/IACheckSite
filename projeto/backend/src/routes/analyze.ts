import express from 'express';
import { analyzeSite } from '../services/analyzer';
import { generatePdfReport } from '../services/pdfGenerator';
import cors from 'cors';

const router = express.Router();

router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        message: 'Por favor, forneça uma URL válida.'
      });
    }
    
    // Validate URL format
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch (error) {
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
    const analysisResult = await analyzeSite(url);
    
    console.log(`[${new Date().toISOString()}] Analysis completed for: ${url}`);
    res.json(analysisResult);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error analyzing site:`, error);
    
    // Mensagens de erro mais amigáveis
    let userMessage = 'Ocorreu um erro ao analisar o site. Por favor, tente novamente.';
    
    if (error instanceof Error) {
      if (error.message.includes('Chrome') || error.message.includes('browser')) {
        userMessage = 'Erro de configuração do servidor. Por favor, contate o administrador.';
      } else if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
        userMessage = 'O site demorou muito para responder. Tente novamente ou verifique se a URL está correta.';
      } else if (error.message.includes('net::ERR') || error.message.includes('Failed to navigate')) {
        userMessage = 'Não foi possível acessar o site. Verifique se a URL está correta e se o site está online.';
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to analyze site',
      message: userMessage,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
});

// Route to generate and download a PDF report
router.post('/generate-pdf', async (req, res) => {
  try {
    console.log('Generating PDF report...');
    const analysisResult = req.body;
    
    if (!analysisResult || !analysisResult.seo) {
      return res.status(400).json({ error: 'Invalid analysis result' });
    }
    
    // Generate the PDF
    const pdfStream = await generatePdfReport(analysisResult);
    
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
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to generate PDF',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

export const analyzeRoutes = router;
