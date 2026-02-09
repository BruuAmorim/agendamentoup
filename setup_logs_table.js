/**
 * Script para criar a tabela de logs do sistema
 * Execute: node setup_logs_table.js
 */

const { query } = require('./backend/src/config/database');
const { sequelize } = require('./backend/src/config/database');

async function setupLogsTable() {
  try {
    console.log('📝 Criando tabela system_logs...');

    const dialect = sequelize.getDialect();
    
    if (dialect === 'sqlite') {
      // SQLite
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS system_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INTEGER,
          user_id INTEGER NOT NULL,
          user_name VARCHAR(255),
          user_email VARCHAR(255),
          description TEXT NOT NULL,
          details TEXT,
          ip_address VARCHAR(45),
          user_agent VARCHAR(500),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await query(createTableQuery, []);
      
      // Criar índices
      await query('CREATE INDEX IF NOT EXISTS idx_logs_action ON system_logs(action)', []);
      await query('CREATE INDEX IF NOT EXISTS idx_logs_entity_type ON system_logs(entity_type)', []);
      await query('CREATE INDEX IF NOT EXISTS idx_logs_user_id ON system_logs(user_id)', []);
      await query('CREATE INDEX IF NOT EXISTS idx_logs_created_at ON system_logs(created_at)', []);
      
    } else {
      // PostgreSQL
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS system_logs (
          id SERIAL PRIMARY KEY,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INTEGER,
          user_id INTEGER NOT NULL,
          user_name VARCHAR(255),
          user_email VARCHAR(255),
          description TEXT NOT NULL,
          details TEXT,
          ip_address VARCHAR(45),
          user_agent VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await query(createTableQuery, []);
      
      // Criar índices
      await query('CREATE INDEX IF NOT EXISTS idx_logs_action ON system_logs(action)', []);
      await query('CREATE INDEX IF NOT EXISTS idx_logs_entity_type ON system_logs(entity_type)', []);
      await query('CREATE INDEX IF NOT EXISTS idx_logs_user_id ON system_logs(user_id)', []);
      await query('CREATE INDEX IF NOT EXISTS idx_logs_created_at ON system_logs(created_at)', []);
    }

    console.log('✅ Tabela system_logs criada com sucesso!');
    console.log('✅ Índices criados com sucesso!');
    
    // Verificar se a tabela foi criada
    const checkQuery = dialect === 'sqlite' 
      ? "SELECT name FROM sqlite_master WHERE type='table' AND name='system_logs'"
      : "SELECT table_name FROM information_schema.tables WHERE table_name = 'system_logs'";
    
    const result = await query(checkQuery, []);
    if (result.rows.length > 0) {
      console.log('✅ Tabela verificada e pronta para uso!');
    } else {
      console.warn('⚠️ Tabela não encontrada após criação. Verifique manualmente.');
    }

  } catch (error) {
    console.error('❌ Erro ao criar tabela system_logs:', error);
    console.error('❌ Stack:', error.stack);
    process.exit(1);
  }
}

// Executar
setupLogsTable()
  .then(() => {
    console.log('🎉 Setup concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });


