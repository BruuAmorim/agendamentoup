/**
 * SETUP: Criar tabela moderator_settings
 * Execute este script para corrigir o erro 500 nas configurações do moderador
 */

const { query, connectDB } = require('./backend/src/models');

async function setupModeratorTable() {
  try {
    console.log('🔧 Iniciando setup da tabela moderator_settings...\n');

    // 1. Conectar ao banco
    await connectDB();
    console.log('✅ Conexão com banco estabelecida\n');

    // 2. Verificar se tabela já existe
    console.log('🔍 Verificando se tabela já existe...');
    const checkTable = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'moderator_settings'
    `);

    if (checkTable.rows.length > 0) {
      console.log('✅ Tabela moderator_settings já existe!');
      console.log('🔄 Verificando estrutura...\n');

      // Verificar estrutura da tabela
      const columns = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'moderator_settings'
        ORDER BY ordinal_position
      `);

      console.log('📋 Estrutura atual da tabela:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });

      return;
    }

    // 3. Criar tabela moderator_settings
    console.log('📋 Criando tabela moderator_settings...');
    await query(`
      CREATE TABLE moderator_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        company_name VARCHAR(255),
        services JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabela criada com sucesso!');

    // 4. Criar constraint UNIQUE em user_id
    console.log('🔗 Adicionando constraint UNIQUE em user_id...');
    await query(`
      ALTER TABLE moderator_settings
      ADD CONSTRAINT moderator_settings_user_id_unique UNIQUE (user_id)
    `);

    console.log('✅ Constraint UNIQUE adicionada!');

    // 5. Criar índice para melhor performance
    console.log('📊 Criando índice em user_id...');
    await query(`
      CREATE INDEX idx_moderator_settings_user_id ON moderator_settings(user_id)
    `);

    console.log('✅ Índice criado!');

    // 6. Verificar se coluna service_type existe na tabela appointments
    console.log('🔍 Verificando tabela appointments...');
    const serviceTypeCheck = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      AND column_name = 'service_type'
    `);

    if (serviceTypeCheck.rows.length === 0) {
      console.log('📋 Adicionando coluna service_type em appointments...');
      await query(`
        ALTER TABLE appointments ADD COLUMN service_type VARCHAR(100)
      `);

      await query(`
        CREATE INDEX idx_appointments_service_type ON appointments(service_type)
      `);

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


