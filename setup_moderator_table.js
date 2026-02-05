/**
 * SETUP: Criar tabela moderator_settings
 * Execute este script para corrigir o erro 500 nas configurações do moderador
 */

const { query, sequelize } = require('./backend/src/config/database');

async function setupModeratorTable() {
  try {
    console.log('🔧 Iniciando setup da tabela moderator_settings...\n');

    const dialect = sequelize.getDialect();

    // 1. Verificar se tabela já existe
    console.log('🔍 Verificando se tabela já existe...');
    let checkTable;
    if (dialect === 'sqlite') {
      checkTable = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='moderator_settings'", []);
    } else {
      checkTable = await query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'moderator_settings'
      `);
    }

    const tableExists = checkTable.rows.length > 0;
    if (tableExists) {
      console.log('✅ Tabela moderator_settings já existe!');
      console.log('🔄 Verificando estrutura...\n');
    }

    if (!tableExists) {
      // 2. Criar tabela moderator_settings
      console.log('📋 Criando tabela moderator_settings...');
      if (dialect === 'sqlite') {
        await query(`
          CREATE TABLE moderator_settings (
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
        `);
      } else {
        await query(`
          CREATE TABLE moderator_settings (
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
        `);
      }

      console.log('✅ Tabela criada com sucesso!');

      // 3. Criar índice para melhor performance
      console.log('📊 Criando índice em user_id...');
      await query(`CREATE INDEX IF NOT EXISTS idx_moderator_settings_user_id ON moderator_settings(user_id)`);
      console.log('✅ Índice criado!');
    }

    // 4. Garantir colunas necessárias (migração)
    console.log('🧱 Garantindo colunas necessárias...');
    if (dialect === 'sqlite') {
      const tableInfo = await query('PRAGMA table_info(moderator_settings)', []);
      const columns = tableInfo.rows.map(col => col.name);
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
          await query(col.sql, []);
          console.log(`✅ Coluna ${col.name} adicionada`);
        }
      }
    } else {
      await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}'::jsonb`);
      await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb`);
      await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS employee_limit INTEGER DEFAULT 10`);
      await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS campos_visiveis JSONB DEFAULT '["nome", "telefone"]'::jsonb`);
      await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS campos_extras JSONB DEFAULT '[]'::jsonb`);
      await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS logo TEXT`);
      await query(`ALTER TABLE moderator_settings ADD COLUMN IF NOT EXISTS slot_interval INTEGER DEFAULT 30`);
    }

    // 5. Verificar se coluna service_type existe na tabela appointments
    console.log('🔍 Verificando tabela appointments...');
    let serviceTypeCheck;
    if (dialect === 'sqlite') {
      serviceTypeCheck = await query("PRAGMA table_info(appointments)", []);
    } else {
      serviceTypeCheck = await query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'service_type'
      `);
    }

    const hasServiceType = dialect === 'sqlite'
      ? serviceTypeCheck.rows.some(col => col.name === 'service_type')
      : serviceTypeCheck.rows.length > 0;

    if (!hasServiceType) {
      console.log('📋 Adicionando coluna service_type em appointments...');
      await query(`
        ALTER TABLE appointments ADD COLUMN service_type VARCHAR(100)
      `);

      await query(`CREATE INDEX IF NOT EXISTS idx_appointments_service_type ON appointments(service_type)`);

      console.log('✅ Coluna service_type adicionada!');
    } else {
      console.log('✅ Coluna service_type já existe');
    }

    // 7. Verificar resultado final
    console.log('\n📋 Verificação final:');
    const finalCheck = await query(`
      SELECT
        'moderator_settings' as table_name,
        COUNT(*) as total_records
      FROM moderator_settings
    `);

    console.log(`📊 Tabela criada: ${finalCheck.rows[0].table_name}`);
    console.log(`📊 Registros iniciais: ${finalCheck.rows[0].total_records}`);

    console.log('\n🎉 SETUP CONCLUÍDO COM SUCESSO!');
    console.log('🚀 Agora você pode salvar as configurações do moderador.');

  } catch (error) {
    console.error('❌ ERRO durante o setup:', error);
    console.error('📋 Detalhes do erro:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });

    console.log('\n💡 POSSÍVEIS SOLUÇÕES:');
    console.log('1. Verifique se o banco PostgreSQL está rodando');
    console.log('2. Verifique as credenciais no arquivo de configuração');
    console.log('3. Verifique se o usuário tem permissões para criar tabelas');

    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  setupModeratorTable().then(() => {
    console.log('\n🏁 Script finalizado.');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { setupModeratorTable };


