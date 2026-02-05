// server.js (BACKEND - na pasta backend/)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 1. IMPORTAÇÃO DO BANCO (SEQUELIZE) - CAMINHO CORRETO
const db = require('./src/models');  // Agora usa caminho relativo correto
const sequelize = db.sequelize;

// 2. CONFIGURAÇÕES E ROTAS - CAMINHO CORRETO
const { API_CONFIG } = require('./src/config/api');
const appointmentRoutes = require('./src/routes/appointments');
const appointmentController = require('./src/controllers/appointmentController');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const integrationRoutes = require('./src/routes/integrationRoutes');
const n8nRoutes = require('./src/routes/n8nRoutes');
const dashboardRoutes = require('./src/routes/dashboard');
const moderatorRoutes = require('./src/routes/moderator');
const settingsPasswordRoutes = require('./src/routes/settingsPasswordRoutes');

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
      /^https:\/\/.*\.ngrok\.io$/, // Qualquer URL ngrok
      /^https:\/\/.*\.ngrok-free\.app$/, // URLs ngrok free
      /^https:\/\/.*\.ngrok\.app$/, // URLs ngrok alternativas
      /^https:\/\/.*\.firebaseapp\.com$/, // Firebase Hosting
      /^https:\/\/.*\.web\.app$/ // Firebase Hosting (domínio customizado)
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.API_RATE_LIMIT || 100,
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  skip: (req) => {
    // Em desenvolvimento, não limitar para evitar bloqueios locais
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }
});
app.use('/api/', limiter);

// 4. ROTAS
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Aevum API está funcionando',
    version: API_CONFIG.info.version,
    timestamp: new Date().toISOString(),
    ngrokUrl: process.env.NGROK_URL || null
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/settings-password', settingsPasswordRoutes);

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
    // Testar conexão com o banco de dados
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso.');

    // Sincronizar modelos (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      const dialect = sequelize.getDialect();
      if (dialect === 'sqlite') {
        await sequelize.sync({ alter: true });
        console.log('✅ Modelos sincronizados (SQLite - alter).');
      } else {
        await sequelize.sync();
        console.log('✅ Modelos sincronizados (sem alter).');
      }
      
      // Criar tabelas adicionais se não existirem
      try {
        const { query } = require('./src/config/database');
        const dialect = sequelize.getDialect();
        
        // Adicionar coluna parent_user_id na tabela users se não existir
        try {
          if (dialect === 'sqlite') {
            // SQLite - verificar se coluna existe usando PRAGMA
            try {
              const tableInfo = await query('PRAGMA table_info(users)', []);
              const hasParentUserId = tableInfo.rows.some(col => col.name === 'parent_user_id');
              
              if (!hasParentUserId) {
                console.log('📝 Adicionando coluna parent_user_id na tabela users (SQLite)...');
                await query('ALTER TABLE users ADD COLUMN parent_user_id INTEGER', []);
                console.log('✅ Coluna parent_user_id adicionada com sucesso');
              } else {
                console.log('✅ Coluna parent_user_id já existe na tabela users');
              }
            } catch (e) {
              console.warn('⚠️ Erro ao verificar coluna parent_user_id:', e.message);
              // Tentar adicionar mesmo assim
              try {
                await query('ALTER TABLE users ADD COLUMN parent_user_id INTEGER', []);
                console.log('✅ Coluna parent_user_id adicionada (tentativa direta)');
              } catch (e2) {
                console.warn('⚠️ Não foi possível adicionar parent_user_id:', e2.message);
              }
            }
          } else {
            // PostgreSQL - usar DO block
            try {
              await query(`
                DO $$ 
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'parent_user_id'
                  ) THEN
                    ALTER TABLE users ADD COLUMN parent_user_id INTEGER;
                  END IF;
                END $$;
              `, []);
              console.log('✅ Coluna parent_user_id verificada/criada (PostgreSQL)');
            } catch (e) {
              console.warn('⚠️ Erro ao adicionar parent_user_id (pode já existir):', e.message);
            }
          }
        } catch (e) {
          console.warn('⚠️ Erro ao verificar/criar coluna parent_user_id:', e.message);
        }
        
        // Criar tabela moderator_settings se não existir
        if (dialect === 'sqlite') {
          const createModeratorSettings = `
            CREATE TABLE IF NOT EXISTS moderator_settings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL UNIQUE,
              company_name TEXT,
              services TEXT DEFAULT '[]',
              working_hours TEXT DEFAULT '{"start": "09:00", "end": "18:00"}',
              working_days TEXT DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]',
              employee_limit INTEGER DEFAULT 10,
              campos_visiveis TEXT DEFAULT '["nome", "telefone"]',
              campos_extras TEXT DEFAULT '[]',
              logo TEXT,
              slot_interval INTEGER DEFAULT 30,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `;
          await query(createModeratorSettings, []);
          console.log('✅ Tabela moderator_settings criada/verificada (SQLite)');
          
          // Verificar e adicionar colunas se não existirem (para migração)
          try {
            const tableInfo = await query('PRAGMA table_info(moderator_settings)', []);
            const columns = tableInfo.rows.map(col => col.name);
            console.log('📋 Colunas existentes na tabela moderator_settings:', columns);
            
            const columnsToAdd = [
              { name: 'working_hours', sql: 'ALTER TABLE moderator_settings ADD COLUMN working_hours TEXT DEFAULT \'{"start": "09:00", "end": "18:00"}\'' },
              { name: 'working_days', sql: 'ALTER TABLE moderator_settings ADD COLUMN working_days TEXT DEFAULT \'["monday", "tuesday", "wednesday", "thursday", "friday"]\'' },
              { name: 'employee_limit', sql: 'ALTER TABLE moderator_settings ADD COLUMN employee_limit INTEGER DEFAULT 10' },
              { name: 'campos_visiveis', sql: 'ALTER TABLE moderator_settings ADD COLUMN campos_visiveis TEXT DEFAULT \'["nome", "telefone"]\'' },
              { name: 'campos_extras', sql: 'ALTER TABLE moderator_settings ADD COLUMN campos_extras TEXT DEFAULT \'[]\'' },
              { name: 'logo', sql: 'ALTER TABLE moderator_settings ADD COLUMN logo TEXT' },
              { name: 'slot_interval', sql: 'ALTER TABLE moderator_settings ADD COLUMN slot_interval INTEGER DEFAULT 30' }
            ];
            
            for (const col of columnsToAdd) {
              if (!columns.includes(col.name)) {
                console.log(`📝 Adicionando coluna ${col.name} na tabela moderator_settings...`);
                await query(col.sql, []);
                console.log(`✅ Coluna ${col.name} adicionada com sucesso`);
              } else {
                console.log(`✅ Coluna ${col.name} já existe`);
              }
            }
          } catch (e) {
            console.error('❌ Erro ao verificar/adicionar colunas:', e.message);
            // Tentar adicionar colunas diretamente (fallback)
            const fallbackColumns = [
              'ALTER TABLE moderator_settings ADD COLUMN working_hours TEXT DEFAULT \'{"start": "09:00", "end": "18:00"}\'',
              'ALTER TABLE moderator_settings ADD COLUMN working_days TEXT DEFAULT \'["monday", "tuesday", "wednesday", "thursday", "friday"]\'',
              'ALTER TABLE moderator_settings ADD COLUMN employee_limit INTEGER DEFAULT 10',
              'ALTER TABLE moderator_settings ADD COLUMN campos_visiveis TEXT DEFAULT \'["nome", "telefone"]\'',
              'ALTER TABLE moderator_settings ADD COLUMN campos_extras TEXT DEFAULT \'[]\'',
              'ALTER TABLE moderator_settings ADD COLUMN logo TEXT',
              'ALTER TABLE moderator_settings ADD COLUMN slot_interval INTEGER DEFAULT 30'
            ];
            
            for (const sql of fallbackColumns) {
              try {
                await query(sql, []);
              } catch (e2) {
                if (!e2.message.includes('duplicate') && !e2.message.includes('already exists')) {
                  console.warn(`⚠️ Não foi possível adicionar coluna: ${e2.message}`);
                }
              }
            }
          }
        } else {
          // PostgreSQL
          const createModeratorSettings = `
            CREATE TABLE IF NOT EXISTS moderator_settings (
              id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
              company_name VARCHAR(255),
              services JSONB DEFAULT '[]'::jsonb,
              working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}'::jsonb,
              working_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb,
              employee_limit INTEGER DEFAULT 10,
              campos_visiveis JSONB DEFAULT '["nome", "telefone"]'::jsonb,
              campos_extras JSONB DEFAULT '[]'::jsonb,
              logo TEXT,
              slot_interval INTEGER DEFAULT 30,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
          `;
          await query(createModeratorSettings, []);

          // Garantir colunas adicionais em PostgreSQL
          await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}'::jsonb`, []);
          await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb`, []);
          await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS employee_limit INTEGER DEFAULT 10`, []);
          await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS campos_visiveis JSONB DEFAULT '["nome", "telefone"]'::jsonb`, []);
          await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS campos_extras JSONB DEFAULT '[]'::jsonb`, []);
          await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS logo TEXT`, []);
          await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS slot_interval INTEGER DEFAULT 30`, []);
        }
        
        // Criar tabela system_config_password para senha de configurações
        if (dialect === 'sqlite') {
          const createSystemConfigPassword = `
            CREATE TABLE IF NOT EXISTS system_config_password (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              password_hash TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `;
          await query(createSystemConfigPassword, []);
          console.log('✅ Tabela system_config_password criada/verificada (SQLite)');
        } else {
          // PostgreSQL
          const createSystemConfigPassword = `
            CREATE TABLE IF NOT EXISTS system_config_password (
              id SERIAL PRIMARY KEY,
              password_hash TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
          `;
          await query(createSystemConfigPassword, []);
          console.log('✅ Tabela system_config_password criada/verificada (PostgreSQL)');
        }

        // Criar tabela employees se não existir
        if (dialect === 'sqlite') {
          const createEmployees = `
            CREATE TABLE IF NOT EXISTS employees (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              moderator_id INTEGER NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, moderator_id)
            )
          `;
          await query(createEmployees, []);
        } else {
          // PostgreSQL
          const createEmployees = `
            CREATE TABLE IF NOT EXISTS employees (
              id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              moderator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, moderator_id)
            )
          `;
          await query(createEmployees, []);
        }
        
        // Criar tabela appointments se não existir
        console.log('📋 Verificando/criando tabela appointments...');
        try {
          if (dialect === 'sqlite') {
            // Verificar se a tabela existe
            const tableCheck = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'", []);
            
            if (tableCheck.rows && tableCheck.rows.length === 0) {
              console.log('📝 Criando tabela appointments (SQLite)...');
              const createAppointments = `
                CREATE TABLE appointments (
                  id TEXT PRIMARY KEY,
                  protocol TEXT UNIQUE NOT NULL,
                  customer_name TEXT NOT NULL,
                  customer_email TEXT,
                  customer_phone TEXT,
                  appointment_date TEXT NOT NULL,
                  appointment_time TEXT NOT NULL,
                  duration_minutes INTEGER DEFAULT 60,
                  notes TEXT,
                  status TEXT DEFAULT 'pending',
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  cancelled_at TEXT,
                  cancellation_reason TEXT
                )
              `;
              await query(createAppointments, []);
              console.log('✅ Tabela appointments criada com sucesso (SQLite)');
            } else {
              console.log('✅ Tabela appointments já existe (SQLite)');
            }
          } else {
            // PostgreSQL
            const createAppointments = `
              CREATE TABLE IF NOT EXISTS appointments (
                id UUID PRIMARY KEY,
                protocol VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255),
                customer_phone VARCHAR(20),
                appointment_date DATE NOT NULL,
                appointment_time TIME NOT NULL,
                duration_minutes INTEGER DEFAULT 60,
                notes TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                cancelled_at TIMESTAMP WITH TIME ZONE,
                cancellation_reason TEXT
              )
            `;
            await query(createAppointments, []);
            console.log('✅ Tabela appointments criada/verificada (PostgreSQL)');
            
            // Garantir que a coluna protocol existe (para tabelas antigas)
            try {
              await query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS protocol VARCHAR(50)`, []);
              // Se a coluna foi adicionada, precisamos torná-la UNIQUE e NOT NULL
              // Mas primeiro, gerar protocolos para registros existentes que possam ter NULL
              try {
                await query(`
                  UPDATE appointments 
                  SET protocol = 'AG-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 6))
                  WHERE protocol IS NULL
                `, []);
                // Adicionar constraint UNIQUE se não existir
                try {
                  await query(`
                    DO $$ 
                    BEGIN
                      IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'appointments_protocol_key'
                      ) THEN
                        ALTER TABLE appointments ADD CONSTRAINT appointments_protocol_key UNIQUE (protocol);
                      END IF;
                    END $$;
                  `, []);
                } catch (e) {
                  // Constraint pode já existir
                  if (!e.message.includes('already exists')) {
                    console.warn('⚠️ Erro ao adicionar constraint UNIQUE:', e.message);
                  }
                }
                // Tornar NOT NULL
                try {
                  await query(`ALTER TABLE appointments ALTER COLUMN protocol SET NOT NULL`, []);
                } catch (e) {
                  // Pode falhar se já for NOT NULL
                  if (!e.message.includes('column') || !e.message.includes('is already')) {
                    console.warn('⚠️ Erro ao tornar protocol NOT NULL:', e.message);
                  }
                }
              } catch (e) {
                console.warn('⚠️ Erro ao atualizar protocolos existentes:', e.message);
              }
              console.log('✅ Coluna protocol verificada/criada (PostgreSQL)');
            } catch (e) {
              if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
                console.warn('⚠️ Erro ao verificar/criar coluna protocol:', e.message);
              } else {
                console.log('✅ Coluna protocol já existe (PostgreSQL)');
              }
            }
          }
        } catch (appointmentsError) {
          console.error('❌ Erro ao criar tabela appointments:', appointmentsError);
          console.error('❌ Stack:', appointmentsError.stack);
          // Tentar criar novamente sem IF NOT EXISTS para SQLite
          if (dialect === 'sqlite') {
            try {
              console.log('🔄 Tentando criar tabela appointments novamente...');
              const createAppointments = `
                CREATE TABLE appointments (
                  id TEXT PRIMARY KEY,
                  protocol TEXT UNIQUE NOT NULL,
                  customer_name TEXT NOT NULL,
                  customer_email TEXT,
                  customer_phone TEXT,
                  appointment_date TEXT NOT NULL,
                  appointment_time TEXT NOT NULL,
                  duration_minutes INTEGER DEFAULT 60,
                  notes TEXT,
                  status TEXT DEFAULT 'pending',
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  cancelled_at TEXT,
                  cancellation_reason TEXT
                )
              `;
              await query(createAppointments, []);
              console.log('✅ Tabela appointments criada na segunda tentativa');
            } catch (retryError) {
              console.error('❌ Erro na segunda tentativa:', retryError.message);
              // Se a tabela já existe, ignorar o erro
              if (!retryError.message.includes('already exists') && !retryError.message.includes('duplicate')) {
                throw retryError;
              }
              console.log('✅ Tabela appointments já existe (ignorando erro)');
            }
          }
        }
        
        // Verificar novamente se a tabela appointments foi criada
        if (dialect === 'sqlite') {
          const finalCheck = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'", []);
          if (finalCheck.rows && finalCheck.rows.length > 0) {
            console.log('✅ Tabela appointments confirmada no banco de dados');
          } else {
            console.error('❌ ERRO CRÍTICO: Tabela appointments não foi criada!');
            throw new Error('Falha ao criar tabela appointments');
          }
        }
        
        console.log('✅ Tabelas adicionais criadas/verificadas.');
      } catch (error) {
        console.error('❌ ERRO ao criar tabelas adicionais:', error.message);
        console.error('❌ Stack:', error.stack);
        // Não continuar se a tabela appointments não foi criada
        if (error.message.includes('appointments')) {
          throw error;
        }
        console.warn('⚠️  Continuando apesar do erro...');
      }
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('========================================');
      console.log('🚀 Aevum API iniciada!');
      console.log('========================================');
      console.log(`📡 Servidor rodando na porta ${PORT}`);
      console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Iniciar o servidor
startServer();