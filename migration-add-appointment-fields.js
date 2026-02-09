const { query } = require('./backend/src/config/database');

/**
 * Script de migração para adicionar novos campos na tabela appointments
 * - customer_cpf: CPF do cliente
 * - service_type: Tipo de serviço (já pode existir)
 * - extra_fields: Campos extras em formato JSON
 */
async function migrateAppointmentFields() {
  try {
    console.log('🔄 Iniciando migração de campos da tabela appointments...');

    const { sequelize } = require('./backend/src/config/database');
    const dialect = sequelize.getDialect();

    if (dialect === 'sqlite') {
      // Para SQLite, verificar e adicionar colunas se não existirem
      const tableInfo = await query("PRAGMA table_info(appointments)", []);
      const existingColumns = tableInfo.rows.map(col => col.name);

      if (!existingColumns.includes('customer_cpf')) {
        console.log('📝 Adicionando coluna customer_cpf...');
        await query("ALTER TABLE appointments ADD COLUMN customer_cpf TEXT", []);
        console.log('✅ Coluna customer_cpf adicionada');
      } else {
        console.log('ℹ️ Coluna customer_cpf já existe');
      }

      if (!existingColumns.includes('service_type')) {
        console.log('📝 Adicionando coluna service_type...');
        await query("ALTER TABLE appointments ADD COLUMN service_type TEXT", []);
        console.log('✅ Coluna service_type adicionada');
      } else {
        console.log('ℹ️ Coluna service_type já existe');
      }

      if (!existingColumns.includes('extra_fields')) {
        console.log('📝 Adicionando coluna extra_fields...');
        await query("ALTER TABLE appointments ADD COLUMN extra_fields TEXT", []);
        console.log('✅ Coluna extra_fields adicionada');
      } else {
        console.log('ℹ️ Coluna extra_fields já existe');
      }
    } else {
      // Para PostgreSQL
      const columnCheck = await query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name IN ('customer_cpf', 'service_type', 'extra_fields')
      `, []);

      const existingColumns = columnCheck.rows.map(row => row.column_name);

      if (!existingColumns.includes('customer_cpf')) {
        console.log('📝 Adicionando coluna customer_cpf...');
        await query("ALTER TABLE appointments ADD COLUMN customer_cpf VARCHAR(20)", []);
        console.log('✅ Coluna customer_cpf adicionada');
      } else {
        console.log('ℹ️ Coluna customer_cpf já existe');
      }

      if (!existingColumns.includes('service_type')) {
        console.log('📝 Adicionando coluna service_type...');
        await query("ALTER TABLE appointments ADD COLUMN service_type VARCHAR(100)", []);
        console.log('✅ Coluna service_type adicionada');
      } else {
        console.log('ℹ️ Coluna service_type já existe');
      }

      if (!existingColumns.includes('extra_fields')) {
        console.log('📝 Adicionando coluna extra_fields...');
        await query("ALTER TABLE appointments ADD COLUMN extra_fields JSONB", []);
        console.log('✅ Coluna extra_fields adicionada');
      } else {
        console.log('ℹ️ Coluna extra_fields já existe');
      }
    }

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('🎉 Todos os campos necessários estão disponíveis na tabela appointments.');

  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    throw error;
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  migrateAppointmentFields()
    .then(() => {
      console.log('✅ Script de migração finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = migrateAppointmentFields;


