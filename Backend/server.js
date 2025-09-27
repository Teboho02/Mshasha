import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import routes
import categoriesRoutes from './src/routes/categories.js';
import portfolioRoutes from './src/routes/portfolio.js';
import featuredVideoRoutes from './src/routes/featuredVideo.js';
import homePortfolioRoutes from './src/routes/homePortfolio.js';
import statsRoutes from './src/routes/stats.js';
import healthRoutes from './src/routes/health.js';

// Import middleware
import { globalErrorHandler, notFoundHandler } from './src/middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Frontend path configuration
const FRONTEND_PATH = process.env.FRONTEND_PATH || path.join(__dirname, '../MshashaZwinepe/dist');

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes (MUST come before static file serving)
app.use('/api/categories', categoriesRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/featured-video', featuredVideoRoutes);
app.use('/api/home-portfolio', homePortfolioRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/health', healthRoutes);

// Root API route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Mshasha Zwinepe Photography API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Check if frontend build exists
if (fs.existsSync(FRONTEND_PATH)) {
  console.log(`✅ Frontend found at: ${FRONTEND_PATH}`);
  
  // Serve all static files including HTML files
  app.use(express.static(FRONTEND_PATH, {
    maxAge: NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Don't cache HTML files
      if (path.extname(filePath) === '.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  
} else {
  console.warn(`❌ Frontend build directory not found: ${FRONTEND_PATH}`);
}

// Error handling middleware (MUST be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend: ${fs.existsSync(FRONTEND_PATH) ? '✅ Available' : '❌ Not found'}`);
  console.log(`📁 Frontend path: ${FRONTEND_PATH}`);
  
  // Log available HTML files
  if (fs.existsSync(FRONTEND_PATH)) {
    const htmlFiles = fs.readdirSync(FRONTEND_PATH).filter(file => file.endsWith('.html'));
    console.log(`📄 Available HTML files:`, htmlFiles);
  }
});

export default app;