/**
 * Script para executar migração da tabela moderator_settings
 * Execute este script para corrigir o erro 500 no salvamento de configurações
 */

const { query, connectDB } = require('./backend/src/models');

async function runModeratorMigration() {
  try {
    console.log('🚀 Iniciando migração da tabela moderator_settings...\n');

    // Conectar ao banco
    await connectDB();

    console.log('🔍 Verificando se tabela já existe...');

    // Verificar se tabela já existe
    const tableCheck = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'moderator_settings'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('✅ Tabela moderator_settings já existe');
      return;
    }

    console.log('📋 Criando tabela moderator_settings...');

    // Criar tabela moderator_settings
    await query(`
      CREATE TABLE moderator_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        services JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    console.log('📋 Criando índices...');

    // Criar índices
    await query(`
      CREATE INDEX idx_moderator_settings_user_id ON moderator_settings(user_id)
    `);

    // Verificar se coluna service_type existe na tabela appointments
    console.log('🔍 Verificando coluna service_type na tabela appointments...');

    const columnCheck = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      AND column_name = 'service_type'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('📋 Adicionando coluna service_type na tabela appointments...');
      await query(`
        ALTER TABLE appointments ADD COLUMN service_type VARCHAR(100)
      `);

      await query(`
        CREATE INDEX idx_appointments_service_type ON appointments(service_type)
      `);
    } else {
      console.log('✅ Coluna service_type já existe');
    }

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('🎉 Agora você pode salvar as configurações do moderador.');

  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  runModeratorMigration();
}

module.exports = { runModeratorMigration };


