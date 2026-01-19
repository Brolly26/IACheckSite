import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeRoutes } from './routes/analyze';

// Load environment variables
dotenv.config();

// Check for OpenAI API key (optional - system will work without it)
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not found. AI analysis will use fallback mode.');
  console.warn('   The system will still work, but analysis will be generated without OpenAI.');
} else {
  console.log('✅ OpenAI API key found. AI analysis enabled.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - restrict to frontend domains
const allowedOrigins = [
  'https://ia-check-site-rvrt.vercel.app',
  'https://ia-check-site-rvrt-1xbv5bzhk-brolly26s-projects.vercel.app',
  process.env.FRONTEND_URL // Allow custom frontend URL from env
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc) or from allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`CORS blocked origin: ${origin}`);
          callback(null, false);
        }
      }
    : '*', // Development allows all origins
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
