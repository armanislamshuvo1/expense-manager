import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRouter from './routes/index.js';
import ErrorLog from './models/ErrorLog.js';

// Startup environment security checks
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is missing in production!');
    process.exit(1);
  } else {
    console.warn('[Security Warning] JWT_SECRET is not defined. Defaulting to development fallback.');
  }
}

// Connect to Database
connectDB();

const app = express();

// Trust proxy for rate limiting behind reverse proxies (like Render)
app.set('trust proxy', 1);

// Middlewares
const clientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim())
  : [];

const allowedOrigins = [
  ...clientUrls,
  'https://nexuswealthmanager.xyz',
  'https://www.nexuswealthmanager.xyz',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /nexuswealthmanager\.xyz$/.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use('/api', apiLimiter);

// Master Routes Mounting
app.use('/api', apiRouter);

// Root Status check
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'NexusWealth API is running.' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy.' });
});

// Global Error Handler
app.use(async (err, req, res, next) => {
  console.error('[Global Error]', err.stack || err.message || err);

  try {
    await ErrorLog.create({
      level: 'error',
      source: 'express_middleware',
      message: err.message || 'Unknown error',
      stack: err.stack,
      statusCode: err.status || 500,
      path: req.originalUrl,
      method: req.method,
      meta: {
        userId: req.user?.id,
        ip: req.ip
      }
    });
  } catch (logErr) {
    console.error('Failed to persist ErrorLog to database:', logErr.message);
  }

  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && !err.status ? 'Internal Server Error' : (err.message || 'Server Error')
  });
});

// Process-level unhandled exception and rejection handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection at]:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
