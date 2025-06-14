import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeRoutes } from './routes/analyze';

// Load environment variables
dotenv.config();

// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required in .env file');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = ['https://ia-check-site-rvrt.vercel.app', 'https://ia-check-site-rvrt-1xbv5bzhk-brolly26s-projects.vercel.app']; // Liste os domínios que podem acessar

app.use(cors({
  origin: '*'
}));

app.options('*', cors());

// Middlewares
app.use(express.json());

// Routes
app.use('/api', analyzeRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: https://iachecksite.onrender.com/health`);
  console.log(`API endpoint: https://iachecksite.onrender.com/api/analyze`);
});

export default app;
