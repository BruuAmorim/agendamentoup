/**
 * Script para adicionar campos de API Key na tabela users
 * Execute: node backend/scripts/add-api-key-fields.js
 */

const { query, sequelize } = require('../src/config/database');

async function addApiKeyFields() {
  try {
    console.log('🔄 Iniciando migração: Adicionar campos de API Key...');
    
    const dialect = sequelize.getDialect();
    console.log(`📊 Dialect detectado: ${dialect}`);

    if (dialect === 'sqlite') {
      // SQLite - verificar se colunas já existem
      try {
        const tableInfo = await query('PRAGMA table_info(users)', []);
        const existingColumns = tableInfo.rows.map(col => col.name);
        
        if (!existingColumns.includes('api_key_hash')) {
          console.log('➕ Adicionando coluna api_key_hash...');
          await query('ALTER TABLE users ADD COLUMN api_key_hash TEXT', []);
          console.log('✅ Coluna api_key_hash adicionada');
        } else {
          console.log('ℹ️ Coluna api_key_hash já existe');
        }

        if (!existingColumns.includes('api_key_created_at')) {
          console.log('➕ Adicionando coluna api_key_created_at...');
          await query('ALTER TABLE users ADD COLUMN api_key_created_at TEXT', []);
          console.log('✅ Coluna api_key_created_at adicionada');
        } else {
          console.log('ℹ️ Coluna api_key_created_at já existe');
        }

        if (!existingColumns.includes('api_key_last_regenerated')) {
          console.log('➕ Adicionando coluna api_key_last_regenerated...');
          await query('ALTER TABLE users ADD COLUMN api_key_last_regenerated TEXT', []);
          console.log('✅ Coluna api_key_last_regenerated adicionada');
        } else {
          console.log('ℹ️ Coluna api_key_last_regenerated já existe');
        }
      } catch (error) {
        console.error('❌ Erro ao adicionar colunas:', error);
        throw error;
      }
    } else {
      // PostgreSQL
      try {
        console.log('➕ Adicionando colunas de API Key...');
        await query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(255) NULL,
          ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMP WITH TIME ZONE NULL,
          ADD COLUMN IF NOT EXISTS api_key_last_regenerated TIMESTAMP WITH TIME ZONE NULL
        `, []);
        console.log('✅ Colunas adicionadas com sucesso');

        // Criar índice
        try {
          await query(`
            CREATE INDEX IF NOT EXISTS idx_users_api_key_hash 
            ON users(api_key_hash) 
            WHERE api_key_hash IS NOT NULL
          `, []);
          console.log('✅ Índice criado com sucesso');
        } catch (indexError) {
          console.warn('⚠️ Erro ao criar índice (pode já existir):', indexError.message);
        }
      } catch (error) {
        console.error('❌ Erro ao adicionar colunas:', error);
        throw error;
      }
    }

    console.log('✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

// Executar migração
addApiKeyFields();

