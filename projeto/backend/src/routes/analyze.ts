import express from 'express';
import { analyzeSite } from '../services/analyzer';
import { generatePdfReport } from '../services/pdfGenerator';
import cors from 'cors';

const router = express.Router();

router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const analysisResult = await analyzeSite(url);
    res.json(analysisResult);
  } catch (error) {
    console.error('Error analyzing site:', error);
    res.status(500).json({ 
      error: 'Failed to analyze site',
      message: error instanceof Error ? error.message : 'Unknown error'
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
