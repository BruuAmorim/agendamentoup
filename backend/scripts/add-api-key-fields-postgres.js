/**
 * Script para adicionar campos de API Key na tabela users (PostgreSQL)
 * Execute: node backend/scripts/add-api-key-fields-postgres.js
 */

const { query } = require('../src/config/database');
const { connectDB } = require('../src/models');

async function addApiKeyFieldsPostgres() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    await connectDB();
    
    console.log('🔄 Iniciando migração: Adicionar campos de API Key (PostgreSQL)...');
    
    // Verificar se colunas já existem
    const checkColumns = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('api_key_hash', 'api_key_created_at', 'api_key_last_regenerated')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('📊 Colunas existentes:', existingColumns);
    
    // Adicionar colunas que não existem
    const columnsToAdd = [];
    
    if (!existingColumns.includes('api_key_hash')) {
      columnsToAdd.push('ADD COLUMN api_key_hash VARCHAR(255) NULL');
    }
    
    if (!existingColumns.includes('api_key_created_at')) {
      columnsToAdd.push('ADD COLUMN api_key_created_at TIMESTAMP WITH TIME ZONE NULL');
    }
    
    if (!existingColumns.includes('api_key_last_regenerated')) {
      columnsToAdd.push('ADD COLUMN api_key_last_regenerated TIMESTAMP WITH TIME ZONE NULL');
    }
    
    if (columnsToAdd.length > 0) {
      const alterTableSQL = `ALTER TABLE users ${columnsToAdd.join(', ')}`;
      console.log('📝 Executando:', alterTableSQL);
      await query(alterTableSQL);
      console.log('✅ Colunas adicionadas com sucesso');
    } else {
      console.log('ℹ️ Todas as colunas já existem');
    }
    
    // Criar índice se não existir
    try {
      await query(`
        CREATE INDEX IF NOT EXISTS idx_users_api_key_hash 
        ON users(api_key_hash) 
        WHERE api_key_hash IS NOT NULL
      `);
      console.log('✅ Índice criado/verificado');
    } catch (indexError) {
      console.warn('⚠️ Erro ao criar índice (pode já existir):', indexError.message);
    }
    
    console.log('✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Executar migração
addApiKeyFieldsPostgres();






