import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Validate required environment variables
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SESSION_SECRET',
  'FRONTEND_ORIGIN'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  logger.error('Please create a .env file with required values. See .env.example for reference.');
  process.exit(1);
}

// Middleware: CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With']
}));

// Middleware: Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware: Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Require HTTPS in production
    httpOnly: true, // Prevent client-side JS from accessing the cookie
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? process.env.BACKEND_DOMAIN : undefined
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/google', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Life Dashboard API running on port ${PORT}`);
  logger.info(`Frontend origin: ${process.env.FRONTEND_ORIGIN}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Session secret: ${process.env.SESSION_SECRET.length} characters`);
});
