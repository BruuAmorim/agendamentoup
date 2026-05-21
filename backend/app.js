const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { API_CONFIG } = require('./src/config/api');
const { initializeDatabase, isDbInitialized } = require('./src/config/initializeDatabase');
const appointmentRoutes = require('./src/routes/appointments');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const integrationRoutes = require('./src/routes/integrationRoutes');
const n8nRoutes = require('./src/routes/n8nRoutes');
const dashboardRoutes = require('./src/routes/dashboard');
const moderatorRoutes = require('./src/routes/moderator');
const staffRoutes = require('./src/routes/staffRoutes');
const settingsPasswordRoutes = require('./src/routes/settingsPasswordRoutes');
const logRoutes = require('./src/routes/logRoutes');

const app = express();

app.set('etag', false);

// ── Helmet ───────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'https://n8n.io',
  'http://localhost:5678',
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
  /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
  /^https:\/\/.*\.ngrok\.io$/,
  /^https:\/\/.*\.ngrok-free\.app$/,
  /^https:\/\/.*\.ngrok\.app$/,
  /^https:\/\/.*\.firebaseapp\.com$/,
  /^https:\/\/.*\.web\.app$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.dev$/
];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    if (allowed || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'x-api-key', 'X-Api-Key']
}));

// ── Body / logging ────────────────────────────────────────────────────────────
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(express.json({ limit: '10mb', strict: false }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT || '100', 10),
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
}));

// ── Lazy DB init (Firebase Functions + Vercel) ────────────────────────────────
app.use(async (req, res, next) => {
  if (!isDbInitialized()) {
    try {
      await initializeDatabase();
    } catch (err) {
      console.error('❌ Erro ao conectar com o banco:', err.message);
      return res.status(500).json({ error: 'Erro ao conectar com o banco de dados' });
    }
  }
  next();
});

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  status: 'ok',
  service: 'Cloudd Agenda API',
  version: API_CONFIG.info.version,
  timestamp: new Date().toISOString()
}));

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  message: 'Cloudd Agenda API está funcionando',
  version: API_CONFIG.info.version,
  timestamp: new Date().toISOString()
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/public/appointments', require('./src/routes/publicAppointmentsRoutes'));
app.use('/api/public/company', require('./src/routes/publicCompanyRoutes'));
app.use('/api/integrations', integrationRoutes);
app.use('/api/admin/integrations', require('./src/routes/adminIntegrationRoutes'));
app.use('/api/empresa/api-key', require('./src/routes/empresaApiKeyRoutes'));
app.use('/api/n8n', n8nRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/patients', require('./src/routes/patientsRoutes'));
app.use('/api/settings-password', settingsPasswordRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/admin/saas', require('./src/routes/adminSaasRoutes'));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada', path: req.path }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
