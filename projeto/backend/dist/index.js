"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const analyze_1 = require("./routes/analyze");
// Load environment variables
dotenv_1.default.config();
// Check for OpenAI API key (optional - system will work without it)
if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not found. AI analysis will use fallback mode.');
    console.warn('   The system will still work, but analysis will be generated without OpenAI.');
}
else {
    console.log('✅ OpenAI API key found. AI analysis enabled.');
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// CORS configuration - restrict to frontend domains
const allowedOrigins = [
    'https://ia-check-site-rvrt.vercel.app',
    'https://ia-check-site-rvrt-1xbv5bzhk-brolly26s-projects.vercel.app',
    process.env.FRONTEND_URL // Allow custom frontend URL from env
].filter(Boolean); // Remove undefined values
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, etc) or from allowed origins
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                console.warn(`CORS blocked origin: ${origin}`);
                callback(null, false);
            }
        }
        : '*', // Development allows all origins
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', (0, cors_1.default)());
// Middlewares
app.use(express_1.default.json());
// Routes
app.use('/api', analyze_1.analyzeRoutes);
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
exports.default = app;
