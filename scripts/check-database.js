/**
 * VERIFICAÇÃO RÁPIDA: Banco de dados e tabelas
 */

const { query, connectDB } = require('./backend/src/models');

async function checkDatabase() {
  try {
    console.log('🔍 Verificando conexão com banco de dados...\n');

    await connectDB();
    console.log('✅ Conexão estabelecida\n');

    // Verificar tabelas
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tabelas encontradas:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // Verificar se moderator_settings existe
    const moderatorSettingsExists = tables.rows.some(t => t.table_name === 'moderator_settings');
    console.log(`\n${moderatorSettingsExists ? '✅' : '❌'} Tabela moderator_settings ${moderatorSettingsExists ? 'existe' : 'NÃO existe'}`);

    // Verificar se appointments tem service_type
    const columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      ORDER BY column_name
    `);

    console.log('\n📋 Colunas da tabela appointments:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    const hasServiceType = columns.rows.some(c => c.column_name === 'service_type');
    console.log(`\n${hasServiceType ? '✅' : '❌'} Coluna service_type ${hasServiceType ? 'existe' : 'NÃO existe'}`);

    // Verificar usuários moderadores
    const moderators = await query(`
      SELECT id, name, email, role, "is_active"
      FROM users
      WHERE role = 'moderator'
    `);

    console.log(`\n👥 Usuários moderadores encontrados: ${moderators.rows.length}`);
    moderators.rows.forEach(mod => {
      console.log(`  - ${mod.name} (${mod.email}) - Ativo: ${mod.is_active}`);
    });

    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    console.error('Detalhes:', error.message);
    console.error('Stack:', error.stack);
  }
}

if (require.main === module) {
  checkDatabase();
}

module.exports = { checkDatabase };


