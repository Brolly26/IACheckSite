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
// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is required in .env file');
    process.exit(1);
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: 'https://ia-check-site-rvrt.vercel.app',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
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
