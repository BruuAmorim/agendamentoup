/**
 * TESTE: Verificação e setup da tabela moderator_settings
 */

const { initializeDatabase, query } = require('./backend/src/models');

async function checkDatabaseSetup() {
  try {
    console.log('🔍 Verificando configuração do banco de dados...\n');

    // Inicializar banco
    await initializeDatabase();
    console.log('✅ Banco inicializado\n');

    // Verificar se tabela moderator_settings existe
    console.log('🔍 Verificando tabela moderator_settings...');
    const tableCheck = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'moderator_settings'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ Tabela moderator_settings NÃO existe');
      console.log('🔧 Executando migração...\n');

      // Executar migração
      const migrationSQL = `
        CREATE TABLE IF NOT EXISTS moderator_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          company_name VARCHAR(255),
          services JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        );

        ALTER TABLE appointments
        ADD COLUMN IF NOT EXISTS service_type VARCHAR(100);

        CREATE INDEX IF NOT EXISTS idx_moderator_settings_user_id ON moderator_settings(user_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_service_type ON appointments(service_type);
      `;

      await query(migrationSQL);
      console.log('✅ Migração executada com sucesso!');
    } else {
      console.log('✅ Tabela moderator_settings já existe');
    }

    // Verificar estrutura da tabela
    console.log('\n📋 Verificando estrutura da tabela...');
    const columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'moderator_settings'
      ORDER BY ordinal_position
    `);

    console.log('Colunas encontradas:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Verificar se há usuários moderadores
    console.log('\n👥 Verificando usuários moderadores...');
    const moderators = await query(`
      SELECT id, name, email, role
      FROM users
      WHERE role = 'moderator' AND "isActive" = true
    `);

    if (moderators.rows.length > 0) {
      console.log('✅ Encontrados moderadores:');
      moderators.rows.forEach(mod => {
        console.log(`  - ${mod.name} (${mod.email}) - ID: ${mod.id}`);
      });
    } else {
      console.log('❌ Nenhum moderador ativo encontrado');
      console.log('💡 Crie um usuário com role "moderator" no painel admin');
    }

    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  checkDatabaseSetup();
}

module.exports = { checkDatabaseSetup };


