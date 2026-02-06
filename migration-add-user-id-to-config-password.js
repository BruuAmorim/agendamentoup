const { query } = require('./backend/src/config/database');

/**
 * Script de migração para adicionar coluna user_id na tabela system_config_password
 * Permite que cada empresa tenha sua própria senha de configurações
 */
async function migrateConfigPasswordTable() {
  try {
    console.log('🔄 Iniciando migração da tabela system_config_password...');

    const { sequelize } = require('./backend/src/config/database');
    const dialect = sequelize.getDialect();

    // Verificar se a tabela existe
    let tableExists = false;
    if (dialect === 'sqlite') {
      const tableCheck = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='system_config_password'", []);
      tableExists = tableCheck.rows && tableCheck.rows.length > 0;
    } else {
      const tableCheck = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'system_config_password'
      `, []);
      tableExists = tableCheck.rows && tableCheck.rows.length > 0;
    }

    // Se a tabela não existe, criar
    if (!tableExists) {
      console.log('📝 Criando tabela system_config_password...');
      if (dialect === 'sqlite') {
        await query(`
          CREATE TABLE system_config_password (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, []);
      } else {
        await query(`
          CREATE TABLE system_config_password (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
          )
        `, []);
      }
      console.log('✅ Tabela system_config_password criada');
    }

    if (dialect === 'sqlite') {
      // Para SQLite, verificar se a coluna já existe
      const tableInfo = await query("PRAGMA table_info(system_config_password)", []);
      const existingColumns = tableInfo.rows.map(col => col.name);

      if (!existingColumns.includes('user_id')) {
        console.log('📝 Adicionando coluna user_id...');
        await query("ALTER TABLE system_config_password ADD COLUMN user_id INTEGER", []);
        console.log('✅ Coluna user_id adicionada');
      } else {
        console.log('ℹ️ Coluna user_id já existe');
      }
    } else {
      // Para PostgreSQL
      const columnCheck = await query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'system_config_password'
        AND column_name = 'user_id'
      `, []);

      if (columnCheck.rows.length === 0) {
        console.log('📝 Adicionando coluna user_id...');
        await query("ALTER TABLE system_config_password ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE", []);
        console.log('✅ Coluna user_id adicionada');
      } else {
        console.log('ℹ️ Coluna user_id já existe');
      }
    }

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('🎉 A tabela system_config_password agora suporta senhas por empresa.');

  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    throw error;
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  migrateConfigPasswordTable()
    .then(() => {
      console.log('✅ Script de migração finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = migrateConfigPasswordTable;

