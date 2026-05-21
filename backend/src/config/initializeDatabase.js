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

    if (process.env.NODE_ENV === 'development') {
      const dialect = sequelize.getDialect();
      if (dialect === 'sqlite') {
        await sequelize.sync({ alter: true });
        console.log('✅ Modelos sincronizados (SQLite - alter).');
      } else {
        await sequelize.sync();
        console.log('✅ Modelos sincronizados (sem alter).');
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
        { name: 'slot_interval', sql: 'ALTER TABLE moderator_settings ADD COLUMN slot_interval INTEGER DEFAULT 30' }
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
      if (!cols.includes('employee_id')) {
        await query('ALTER TABLE appointments ADD COLUMN employee_id INTEGER', []);
        console.log('✅ Coluna employee_id adicionada em appointments (SQLite)');
      }
    } else {
      await query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES funcionarios(id)', []);
      console.log('✅ Coluna employee_id verificada/criada em appointments (PostgreSQL)');
    }
  } catch (e) {
    console.warn('⚠️ Não foi possível verificar/adicionar employee_id em appointments:', e.message);
  }
}

function isDbInitialized() {
  return dbInitialized;
}

module.exports = { initializeDatabase, isDbInitialized };
