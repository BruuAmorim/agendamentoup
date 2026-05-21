const db = require('../models');
const { query } = require('./database');

const sequelize = db.sequelize;
let dbInitialized = false;

async function initializeDatabase() {
  if (dbInitialized) return;

  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso.');
    dbInitialized = true;

    // Tabelas críticas que precisam existir em todos os ambientes
    const dialect = sequelize.getDialect();
    try {
      await migratePasswordResetTokens(dialect);
    } catch (e) {
      console.warn('⚠️ Erro ao verificar tabela password_reset_tokens:', e.message);
    }
    try {
      await migrateIndexes(dialect);
    } catch (e) {
      console.warn('⚠️ Erro ao criar indexes:', e.message);
    }

    if (dialect === 'sqlite') {
      // Limpar tabela de backup residual de runs anteriores com falha
      await sequelize.query('DROP TABLE IF EXISTS `users_backup`');
      await sequelize.query('PRAGMA foreign_keys = OFF');
      await sequelize.sync();
      await sequelize.query('PRAGMA foreign_keys = ON');
      console.log('✅ Modelos sincronizados (SQLite).');
    } else {
      await sequelize.sync();
      console.log('✅ Modelos sincronizados (PostgreSQL).');
    }

    try {
      await runMigrations(dialect);
      console.log('✅ Tabelas adicionais criadas/verificadas.');
    } catch (error) {
      console.error('❌ ERRO ao criar tabelas adicionais:', error.message);
      console.error('❌ Stack:', error.stack);
      if (error.message.includes('appointments')) {
        throw error;
      }
      console.warn('⚠️  Continuando apesar do erro...');
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

async function runMigrations(dialect) {
  await migrateParentUserId(dialect);
  await migrateModeratorSettings(dialect);
  await migrateSystemConfigPassword(dialect);
  await migrateEmployees(dialect);
  await migrateFuncionarios(dialect);
  await migrateAppointments(dialect);
  await migrateAppointmentEmployeeId(dialect);

  // Recuperação de senha
  await migratePasswordResetTokens(dialect);

  // SaaS multiempresa
  await migratePlans(dialect);
  await migrateNiches(dialect);
  await migrateTenants(dialect);
  await migrateSubscriptions(dialect);
  await seedDefaultPlansAndNiches(dialect);
  await autoCreateTenants(dialect);
  await migrateCompanyServices(dialect);
  await migrateIntegrations(dialect);
  await migrateIndexes(dialect);

  if (dialect === 'sqlite') {
    const finalCheck = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'", []);
    if (finalCheck.rows && finalCheck.rows.length > 0) {
      console.log('✅ Tabela appointments confirmada no banco de dados');
    } else {
      console.error('❌ ERRO CRÍTICO: Tabela appointments não foi criada!');
      throw new Error('Falha ao criar tabela appointments');
    }
  }
}

async function migrateParentUserId(dialect) {
  try {
    if (dialect === 'sqlite') {
      try {
        const tableInfo = await query('PRAGMA table_info(users)', []);
        const hasParentUserId = tableInfo.rows.some(col => col.name === 'parent_user_id');
        if (!hasParentUserId) {
          await query('ALTER TABLE users ADD COLUMN parent_user_id INTEGER', []);
          console.log('✅ Coluna parent_user_id adicionada com sucesso');
        }
      } catch (e) {
        console.warn('⚠️ Erro ao verificar coluna parent_user_id:', e.message);
        try {
          await query('ALTER TABLE users ADD COLUMN parent_user_id INTEGER', []);
        } catch (e2) {
          console.warn('⚠️ Não foi possível adicionar parent_user_id:', e2.message);
        }
      }
    } else {
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
    }
  } catch (e) {
    console.warn('⚠️ Erro ao verificar/criar coluna parent_user_id:', e.message);
  }
}

async function migrateModeratorSettings(dialect) {
  if (dialect === 'sqlite') {
    await query(`
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
    `, []);
    console.log('✅ Tabela moderator_settings criada/verificada (SQLite)');

    try {
      const tableInfo = await query('PRAGMA table_info(moderator_settings)', []);
      const columns = tableInfo.rows.map(col => col.name);
      const columnsToAdd = [
        { name: 'working_hours', sql: `ALTER TABLE moderator_settings ADD COLUMN working_hours TEXT DEFAULT '{"start": "09:00", "end": "18:00"}'` },
        { name: 'working_days', sql: `ALTER TABLE moderator_settings ADD COLUMN working_days TEXT DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'` },
        { name: 'employee_limit', sql: 'ALTER TABLE moderator_settings ADD COLUMN employee_limit INTEGER DEFAULT 10' },
        { name: 'campos_visiveis', sql: `ALTER TABLE moderator_settings ADD COLUMN campos_visiveis TEXT DEFAULT '["nome", "telefone"]'` },
        { name: 'campos_extras', sql: `ALTER TABLE moderator_settings ADD COLUMN campos_extras TEXT DEFAULT '[]'` },
        { name: 'logo', sql: 'ALTER TABLE moderator_settings ADD COLUMN logo TEXT' },
        { name: 'slot_interval', sql: 'ALTER TABLE moderator_settings ADD COLUMN slot_interval INTEGER DEFAULT 30' },
        { name: 'patient_fields', sql: 'ALTER TABLE moderator_settings ADD COLUMN patient_fields TEXT' }
      ];
      for (const col of columnsToAdd) {
        if (!columns.includes(col.name)) {
          await query(col.sql, []);
        }
      }
    } catch (e) {
      console.error('❌ Erro ao verificar/adicionar colunas moderator_settings:', e.message);
      const fallbackColumns = [
        `ALTER TABLE moderator_settings ADD COLUMN working_hours TEXT DEFAULT '{"start": "09:00", "end": "18:00"}'`,
        `ALTER TABLE moderator_settings ADD COLUMN working_days TEXT DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'`,
        'ALTER TABLE moderator_settings ADD COLUMN employee_limit INTEGER DEFAULT 10',
        `ALTER TABLE moderator_settings ADD COLUMN campos_visiveis TEXT DEFAULT '["nome", "telefone"]'`,
        `ALTER TABLE moderator_settings ADD COLUMN campos_extras TEXT DEFAULT '[]'`,
        'ALTER TABLE moderator_settings ADD COLUMN logo TEXT',
        'ALTER TABLE moderator_settings ADD COLUMN slot_interval INTEGER DEFAULT 30',
        'ALTER TABLE moderator_settings ADD COLUMN patient_fields TEXT'
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
    await query(`
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
    `, []);
    await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}'::jsonb`, []);
    await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb`, []);
    await query('ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS employee_limit INTEGER DEFAULT 10', []);
    await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS campos_visiveis JSONB DEFAULT '["nome", "telefone"]'::jsonb`, []);
    await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS campos_extras JSONB DEFAULT '[]'::jsonb`, []);
    await query('ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS logo TEXT', []);
    await query('ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS slot_interval INTEGER DEFAULT 30', []);
    await query('ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS patient_fields JSONB DEFAULT NULL', []);
  }
}

async function migrateSystemConfigPassword(dialect) {
  if (dialect === 'sqlite') {
    await query(`
      CREATE TABLE IF NOT EXISTS system_config_password (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `, []);
    console.log('✅ Tabela system_config_password criada/verificada (SQLite)');
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS system_config_password (
        id SERIAL PRIMARY KEY,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `, []);
    console.log('✅ Tabela system_config_password criada/verificada (PostgreSQL)');
  }
}

async function migrateEmployees(dialect) {
  if (dialect === 'sqlite') {
    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        moderator_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, moderator_id)
      )
    `, []);
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        moderator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, moderator_id)
      )
    `, []);
  }
}

async function migrateFuncionarios(dialect) {
  console.log('📋 Verificando/criando tabela funcionarios...');
  if (dialect === 'sqlite') {
    await query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        funcao TEXT,
        lunch_start TEXT,
        lunch_end TEXT,
        ativo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `, []);
    await query('CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa_ativo ON funcionarios (empresa_id, ativo)', []);

    try {
      const tableInfo = await query('PRAGMA table_info(funcionarios)', []);
      const cols = tableInfo.rows.map(c => c.name);
      if (!cols.includes('lunch_start')) {
        await query('ALTER TABLE funcionarios ADD COLUMN lunch_start TEXT', []);
      }
      if (!cols.includes('lunch_end')) {
        await query('ALTER TABLE funcionarios ADD COLUMN lunch_end TEXT', []);
      }
    } catch (e) {
      console.warn('⚠️ Não foi possível verificar/adicionar colunas de almoço em funcionarios (SQLite):', e.message);
    }

    await query(`
      CREATE TABLE IF NOT EXISTS funcionario_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        funcionario_id INTEGER NOT NULL,
        service_name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(funcionario_id, service_name)
      )
    `, []);
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        funcao VARCHAR(255),
        lunch_start TIME,
        lunch_end TIME,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `, []);
    await query('CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa_ativo ON funcionarios (empresa_id, ativo)', []);

    try {
      await query('ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS lunch_start TIME', []);
      await query('ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS lunch_end TIME', []);
    } catch (e) {
      console.warn('⚠️ Não foi possível verificar/adicionar colunas de almoço em funcionarios (PostgreSQL):', e.message);
    }

    await query(`
      CREATE TABLE IF NOT EXISTS funcionario_services (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
        service_name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(funcionario_id, service_name)
      )
    `, []);
  }
}

async function migrateAppointments(dialect) {
  console.log('📋 Verificando/criando tabela appointments...');
  try {
    if (dialect === 'sqlite') {
      const tableCheck = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'", []);
      if (tableCheck.rows && tableCheck.rows.length === 0) {
        console.log('📝 Criando tabela appointments (SQLite)...');
        await query(`
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
            cancellation_reason TEXT,
            employee_id INTEGER
          )
        `, []);
        console.log('✅ Tabela appointments criada com sucesso (SQLite)');
      } else {
        console.log('✅ Tabela appointments já existe (SQLite)');
      }
    } else {
      await query(`
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
          cancellation_reason TEXT,
          employee_id INTEGER REFERENCES funcionarios(id)
        )
      `, []);
      console.log('✅ Tabela appointments criada/verificada (PostgreSQL)');

      try {
        await query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS protocol VARCHAR(50)', []);
        try {
          await query(`
            UPDATE appointments
            SET protocol = 'AG-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 6))
            WHERE protocol IS NULL
          `, []);
          try {
            await query(`
              DO $$
              BEGIN
                IF NOT EXISTS (
                  SELECT 1 FROM pg_constraint WHERE conname = 'appointments_protocol_key'
                ) THEN
                  ALTER TABLE appointments ADD CONSTRAINT appointments_protocol_key UNIQUE (protocol);
                END IF;
              END $$;
            `, []);
          } catch (e) {
            if (!e.message.includes('already exists')) {
              console.warn('⚠️ Erro ao adicionar constraint UNIQUE:', e.message);
            }
          }
          try {
            await query('ALTER TABLE appointments ALTER COLUMN protocol SET NOT NULL', []);
          } catch (e) {
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
    if (dialect === 'sqlite') {
      try {
        console.log('🔄 Tentando criar tabela appointments novamente...');
        await query(`
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
        `, []);
        console.log('✅ Tabela appointments criada na segunda tentativa');
      } catch (retryError) {
        if (!retryError.message.includes('already exists') && !retryError.message.includes('duplicate')) {
          throw retryError;
        }
        console.log('✅ Tabela appointments já existe (ignorando erro)');
      }
    }
  }
}

async function migrateAppointmentEmployeeId(dialect) {
  console.log('📋 Verificando coluna employee_id em appointments...');
  try {
    if (dialect === 'sqlite') {
      const info = await query('PRAGMA table_info(appointments)', []);
      const cols = info.rows.map(c => c.name);

      const missing = [
        { name: 'employee_id',  sql: 'ALTER TABLE appointments ADD COLUMN employee_id INTEGER' },
        { name: 'user_id',      sql: 'ALTER TABLE appointments ADD COLUMN user_id INTEGER' },
        { name: 'customer_cpf', sql: 'ALTER TABLE appointments ADD COLUMN customer_cpf TEXT' },
        { name: 'service_type', sql: 'ALTER TABLE appointments ADD COLUMN service_type TEXT' },
        { name: 'extra_fields', sql: 'ALTER TABLE appointments ADD COLUMN extra_fields TEXT' },
      ];

      for (const col of missing) {
        if (!cols.includes(col.name)) {
          await query(col.sql, []);
          console.log(`✅ Coluna ${col.name} adicionada em appointments`);
        }
      }
    } else {
      await query(`
        ALTER TABLE appointments
          ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES funcionarios(id),
          ADD COLUMN IF NOT EXISTS user_id INTEGER,
          ADD COLUMN IF NOT EXISTS customer_cpf TEXT,
          ADD COLUMN IF NOT EXISTS service_type TEXT,
          ADD COLUMN IF NOT EXISTS extra_fields TEXT
      `, []);
      console.log('✅ Colunas verificadas/criadas em appointments (PostgreSQL)');
    }
  } catch (e) {
    console.warn('⚠️ Não foi possível verificar/adicionar colunas em appointments:', e.message);
  }
}

// ── Recuperação de senha ──────────────────────────────────────────────────────
async function migratePasswordResetTokens(dialect) {
  try {
    if (dialect === 'sqlite') {
      await query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          used INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
    }
    console.log('✅ Tabela password_reset_tokens criada/verificada');
  } catch (e) {
    console.warn('⚠️ Erro ao criar tabela password_reset_tokens:', e.message);
  }
}

// ── SaaS: Plans ──────────────────────────────────────────────────────────────
async function migratePlans(dialect) {
  try {
    if (dialect === 'sqlite') {
      await query(`
        CREATE TABLE IF NOT EXISTS plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          features TEXT DEFAULT '{}',
          limits TEXT DEFAULT '{}',
          price REAL DEFAULT 0,
          billing_cycle TEXT DEFAULT 'monthly',
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS plans (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          features JSONB DEFAULT '{}'::jsonb,
          limits JSONB DEFAULT '{}'::jsonb,
          price DECIMAL(10,2) DEFAULT 0,
          billing_cycle VARCHAR(20) DEFAULT 'monthly',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
    }
    console.log('✅ Tabela plans criada/verificada');
  } catch (e) {
    console.warn('⚠️ Erro ao criar tabela plans:', e.message);
  }
}

// ── SaaS: Niches ─────────────────────────────────────────────────────────────
async function migrateNiches(dialect) {
  try {
    if (dialect === 'sqlite') {
      await query(`
        CREATE TABLE IF NOT EXISTS niches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          description TEXT,
          config TEXT DEFAULT '{}',
          field_templates TEXT DEFAULT '[]',
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS niches (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          config JSONB DEFAULT '{}'::jsonb,
          field_templates JSONB DEFAULT '[]'::jsonb,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
    }
    console.log('✅ Tabela niches criada/verificada');
  } catch (e) {
    console.warn('⚠️ Erro ao criar tabela niches:', e.message);
  }
}

// ── SaaS: Tenants ─────────────────────────────────────────────────────────────
async function migrateTenants(dialect) {
  try {
    if (dialect === 'sqlite') {
      await query(`
        CREATE TABLE IF NOT EXISTS tenants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          niche_id INTEGER,
          plan_id INTEGER,
          status TEXT DEFAULT 'active',
          settings TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
      await query('CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants (user_id)', []);
      await query('CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status)', []);
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS tenants (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          slug VARCHAR(100) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          niche_id INTEGER REFERENCES niches(id) ON DELETE SET NULL,
          plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
          status VARCHAR(20) DEFAULT 'active',
          settings JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
      await query('CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants (user_id)', []);
      await query('CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status)', []);
    }
    console.log('✅ Tabela tenants criada/verificada');
  } catch (e) {
    console.warn('⚠️ Erro ao criar tabela tenants:', e.message);
  }
}

// ── SaaS: Subscriptions ───────────────────────────────────────────────────────
async function migrateSubscriptions(dialect) {
  try {
    if (dialect === 'sqlite') {
      await query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id INTEGER NOT NULL,
          plan_id INTEGER NOT NULL,
          status TEXT DEFAULT 'active',
          starts_at TEXT DEFAULT CURRENT_TIMESTAMP,
          ends_at TEXT,
          billing_data TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
          status VARCHAR(20) DEFAULT 'active',
          starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          ends_at TIMESTAMP WITH TIME ZONE,
          billing_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
    }
    console.log('✅ Tabela subscriptions criada/verificada');
  } catch (e) {
    console.warn('⚠️ Erro ao criar tabela subscriptions:', e.message);
  }
}

// ── SaaS: Seed planos e nichos padrão (via ORM — timestamps automáticos) ─────
async function seedDefaultPlansAndNiches() {
  try {
    const { Plan, Niche } = require('../models');

    const defaultPlans = [
      {
        name: 'Starter', slug: 'starter', price: 0, billing_cycle: 'monthly',
        limits: { max_appointments_per_month: 50, max_staff: 2, max_units: 1, api_access: false, white_label: false },
        features: { agendamentos: true, funcionarios: true, api_key: false, white_label: false },
      },
      {
        name: 'Professional', slug: 'professional', price: 97, billing_cycle: 'monthly',
        limits: { max_appointments_per_month: 500, max_staff: 10, max_units: 3, api_access: true, white_label: false },
        features: { agendamentos: true, funcionarios: true, api_key: true, white_label: false, relatorios: true },
      },
      {
        name: 'Enterprise', slug: 'enterprise', price: 297, billing_cycle: 'monthly',
        limits: { max_appointments_per_month: -1, max_staff: -1, max_units: -1, api_access: true, white_label: true },
        features: { agendamentos: true, funcionarios: true, api_key: true, white_label: true, relatorios: true, suporte_prioritario: true },
      },
    ];

    for (const plan of defaultPlans) {
      await Plan.findOrCreate({ where: { slug: plan.slug }, defaults: plan });
    }

    const defaultNiches = [
      { name: 'Geral', slug: 'geral', description: 'Segmento geral, sem configurações específicas de nicho' },
      { name: 'Saúde e Bem-Estar', slug: 'saude-bem-estar', description: 'Clínicas médicas, odontológicas, estética, barbearias, salões' },
      { name: 'Serviços Profissionais', slug: 'servicos-profissionais', description: 'Advocacia, contabilidade, consultorias' },
      { name: 'Educacional', slug: 'educacional', description: 'Universidades, escolas de idiomas, tutoria, matrículas' },
    ];

    for (const niche of defaultNiches) {
      await Niche.findOrCreate({ where: { slug: niche.slug }, defaults: niche });
    }

    console.log('✅ Planos e nichos padrão verificados/criados');
  } catch (e) {
    console.warn('⚠️ Erro ao criar planos/nichos padrão:', e.message);
  }
}

// ── SaaS: Auto-criar tenant para moderadores existentes (via ORM) ─────────────
async function autoCreateTenants() {
  try {
    const { Tenant, Plan, Niche } = require('../models');

    const starterPlan = await Plan.findOne({ where: { slug: 'starter' } });
    const geralNiche  = await Niche.findOne({ where: { slug: 'geral' } });

    const moderators = await query(
      `SELECT u.id, u.name, u.email FROM users u WHERE u.role = 'moderator'`,
      []
    );

    if (!moderators.rows || moderators.rows.length === 0) return;

    for (const mod of moderators.rows) {
      const baseName = mod.name || mod.email.split('@')[0];
      const slug = toSlug(baseName) + '-' + mod.id;

      const [tenant, created] = await Tenant.findOrCreate({
        where: { user_id: mod.id },
        defaults: {
          slug,
          name: baseName,
          niche_id: geralNiche?.id || null,
          plan_id: starterPlan?.id || null,
          status: 'active',
        },
      });

      if (created) {
        console.log(`✅ Tenant criado para moderador: ${baseName} (user_id: ${mod.id})`);
      }
    }
  } catch (e) {
    console.warn('⚠️ Erro ao criar tenants automáticos:', e.message);
  }
}

function toSlug(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

async function migrateCompanyServices(dialect) {
  try {
    if (dialect === 'sqlite') {
      await query(`
        CREATE TABLE IF NOT EXISTS company_services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          empresa_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          duration_minutes INTEGER NOT NULL DEFAULT 30,
          price REAL,
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS company_services (
          id SERIAL PRIMARY KEY,
          empresa_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          duration_minutes INTEGER NOT NULL DEFAULT 30,
          price NUMERIC(10,2),
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
    }
    console.log('✅ Tabela company_services criada/verificada');
  } catch (e) {
    console.warn('⚠️ Erro ao criar company_services:', e.message);
  }
}

async function migrateIntegrations(dialect) {
  try {
    if (dialect === 'sqlite') {
      await query(`
        CREATE TABLE IF NOT EXISTS integrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL DEFAULT 'n8n',
          empresa_id INTEGER,
          webhookUrl TEXT,
          apiKey TEXT,
          webhookSecret TEXT,
          isActive INTEGER DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, []);

      const info = await query('PRAGMA table_info(integrations)', []);
      const cols = info.rows.map(c => c.name);
      const toAdd = [
        { name: 'empresa_id',     sql: 'ALTER TABLE integrations ADD COLUMN empresa_id INTEGER' },
        { name: 'webhookSecret',  sql: 'ALTER TABLE integrations ADD COLUMN webhookSecret TEXT' },
      ];
      for (const col of toAdd) {
        if (!cols.includes(col.name)) {
          await query(col.sql, []);
          console.log(`[integrations] Coluna ${col.name} adicionada (SQLite)`);
        }
      }
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS integrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL DEFAULT 'n8n',
          empresa_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          "webhookUrl" VARCHAR(500),
          "apiKey" VARCHAR(255),
          "webhookSecret" VARCHAR(255),
          "isActive" BOOLEAN DEFAULT TRUE,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `, []);

      await query('ALTER TABLE integrations ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES users(id) ON DELETE CASCADE', []);
      await query(`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS "webhookSecret" VARCHAR(255)`, []);

      // Remover unicidade antiga em name (se existir) e adicionar composta
      await query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'integrations'::regclass
              AND contype = 'u'
              AND conname = 'integrations_name_key'
          ) THEN
            ALTER TABLE integrations DROP CONSTRAINT integrations_name_key;
          END IF;
        END $$;
      `, []);

      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'integrations_name_empresa_id_unique'
          ) THEN
            ALTER TABLE integrations
              ADD CONSTRAINT integrations_name_empresa_id_unique
              UNIQUE (name, empresa_id);
          END IF;
        END $$;
      `, []);
    }
    console.log('[integrations] Tabela verificada/migrada');
  } catch (e) {
    console.warn('[integrations] Erro na migration:', e.message);
  }
}

async function migrateIndexes(dialect) {
  try {
    if (dialect === 'sqlite') {
      await query(`CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(user_id, appointment_date)`, []);
      await query(`CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)`, []);
      await query(`CREATE INDEX IF NOT EXISTS idx_patients_empresa ON patients(empresa_id)`, []);
      await query(`CREATE INDEX IF NOT EXISTS idx_funcionarios_user ON funcionarios(user_id)`, []);
    } else {
      await query(`CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(user_id, appointment_date)`, []);
      await query(`CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)`, []);
      await query(`CREATE INDEX IF NOT EXISTS idx_patients_empresa ON patients(empresa_id)`, []);
      await query(`CREATE INDEX IF NOT EXISTS idx_funcionarios_user ON funcionarios(user_id)`, []);
    }
    console.log('✅ Indexes verificados/criados');
  } catch (e) {
    console.warn('⚠️ Erro ao criar indexes:', e.message);
  }
}

function isDbInitialized() {
  return dbInitialized;
}

module.exports = { initializeDatabase, isDbInitialized };
