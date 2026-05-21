// server.js (BACKEND - na pasta backend/)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 1. IMPORTAÇÃO DO BANCO (SEQUELIZE) - CAMINHO CORRETO
const db = require('./src/models');

// 2. CONFIGURAÇÕES E ROTAS - CAMINHO CORRETO
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
const PORT = API_CONFIG.port || 3000;

// Desabilitar ETag para evitar respostas 304 sem body
app.set('etag', false);

// 3. MIDDLEWARES GLOBAIS
app.use(helmet({
  // Permitir requisições de integrações externas (n8n, ngrok)
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuração de CORS mais permissiva para integrações externas
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origem (mobile apps, Postman, n8n, etc)
    if (!origin) {
      return callback(null, true);
    }
    
    // Lista de origens permitidas
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://localhost:8080',
      'https://n8n.io',
      'http://localhost:5678', // n8n local
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Rede local (ex.: 192.168.1.175:8080)
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,   // Rede local 10.x
      /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,  // Rede local 172.x (ex.: 172.21.128.1:8080)
      /^https:\/\/.*\.ngrok\.io$/,
      /^https:\/\/.*\.ngrok-free\.app$/,
      /^https:\/\/.*\.ngrok\.app$/,
      /^https:\/\/.*\.firebaseapp\.com$/,
      /^https:\/\/.*\.web\.app$/,
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.vercel\.dev$/
    ];
    
    // Verificar se a origem está na lista ou corresponde a um padrão
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // Em desenvolvimento, permitir todas as origens
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        callback(null, true);
      } else {
        callback(new Error('Não permitido pelo CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control']
};

app.use(cors(corsOptions));

// Evitar cache nas respostas da API
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Configuração do body-parser com limites maiores para integrações
app.use(express.json({ 
  limit: '10mb',
  strict: false // Permitir JSON não estrito para compatibilidade com n8n
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));
app.use(morgan('dev'));

// Rate limiting — ativo por padrão; desabilitado apenas em desenvolvimento explícito
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT || '100', 10),
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
});
app.use('/api/', limiter);

// 4. ROTAS
// Rota raiz para verificar se a API está rodando
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API running',
    service: 'Cloudd Agenda API',
    version: API_CONFIG.info.version,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Cloudd Agenda API está funcionando',
    version: API_CONFIG.info.version,
    timestamp: new Date().toISOString(),
    ngrokUrl: process.env.NGROK_URL || null
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/public/appointments', require('./src/routes/publicAppointmentsRoutes')); // Rotas públicas com API Key
app.use('/api/public/company', require('./src/routes/publicCompanyRoutes')); // Rotas públicas de informações da empresa
app.use('/api/integrations', integrationRoutes);
app.use('/api/admin/integrations', require('./src/routes/adminIntegrationRoutes'));
app.use('/api/empresa/api-key', require('./src/routes/empresaApiKeyRoutes')); // Rotas de API Key de empresas
app.use('/api/n8n', n8nRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings-password', settingsPasswordRoutes);
app.use('/api/logs', logRoutes);

// Rota de fallback para 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.path
  });
});

// 5. TRATAMENTO DE ERROS
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 6. INICIALIZAÇÃO DO SERVIDOR
async function startServer() {
  try {
    await initializeDatabase();

    // Criar usuários de teste se o banco estiver vazio (SQLite local, etc.)
    try {
      const SeedService = require('./src/services/seedService');
      await SeedService.ensureSeedUsers();
    } catch (seedErr) {
      console.warn('⚠️ Seed de usuários:', seedErr.message);
    }

    // Iniciar servidor
    // Escutar em 0.0.0.0 para aceitar conexões de qualquer interface (necessário para n8n/Docker)
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
      console.log('========================================');
      console.log('🚀 Cloudd Agenda API iniciada!');
      console.log('========================================');
      console.log(`📡 Servidor rodando na porta ${PORT}`);
      console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Servidor acessível em: http://0.0.0.0:${PORT}/api`);
      console.log(`📡 Para n8n/Docker, use: http://SEU_IP:${PORT}/api`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Middleware para inicializar banco de dados no Vercel (lazy initialization)
if (process.env.VERCEL) {
  app.use(async (req, res, next) => {
    if (!isDbInitialized()) {
      try {
        await initializeDatabase();
      } catch (error) {
        console.error('❌ Erro ao inicializar banco no Vercel:', error);
        return res.status(500).json({
          error: 'Erro ao conectar com o banco de dados',
          message: error.message
        });
      }
    }
    next();
  });
}

// Exportar o app para uso no Vercel (serverless)
// Se estiver rodando no Vercel, não iniciar o servidor tradicional
if (process.env.VERCEL) {
  // No Vercel, apenas exportar o app
  // A inicialização do banco será feita na primeira requisição
  module.exports = app;
} else {
  // Em ambiente tradicional (local, Render, etc), iniciar o servidor
  startServer();
}