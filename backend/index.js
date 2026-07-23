require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const seedExistingUsers = require('./seedExisting');

// Connect to Database
connectDB().then(() => {
  seedExistingUsers();
});

const app = express();

// Trust proxy for rate limiting behind reverse proxies (like Render)
app.set('trust proxy', 1);

const { apiLimiter } = require('./middleware/rateLimiter');

// Middlewares
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/accounts', require('./routes/accountRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/share', require('./routes/shareRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/sync', require('./routes/syncRoutes'));



// Test trigger for Render auto-deploy
// Root Status check
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'NexusWealth API is running.' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
