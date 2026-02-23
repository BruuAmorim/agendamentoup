const { query } = require('./backend/src/config/database');
const { sequelize } = require('./backend/src/config/database');

/**
 * Script para corrigir a tabela system_config_password no PostgreSQL
 * Adiciona a coluna user_id se não existir
 */
async function fixPostgresConfigPassword() {
  try {
    console.log('🔄 Verificando e corrigindo tabela system_config_password no PostgreSQL...');

    const dialect = sequelize.getDialect();
    console.log('🔍 Dialect detectado:', dialect);

    if (dialect !== 'postgres' && dialect !== 'postgresql') {
      console.log('ℹ️ Este script é apenas para PostgreSQL. Dialect atual:', dialect);
      return;
    }

    // Verificar se a tabela existe
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'system_config_password'
    `, []);

    const tableExists = tableCheck.rows && tableCheck.rows.length > 0;

    if (!tableExists) {
      console.log('📝 Criando tabela system_config_password...');
      await query(`
        CREATE TABLE system_config_password (
          id SERIAL PRIMARY KEY,
          password_hash VARCHAR(255) NOT NULL,
          user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
      console.log('✅ Tabela system_config_password criada');
    } else {
      console.log('ℹ️ Tabela system_config_password já existe');
    }

    // Verificar se a coluna user_id existe
    const columnCheck = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'system_config_password'
        AND column_name = 'user_id'
    `, []);

    if (columnCheck.rows.length === 0) {
      console.log('📝 Adicionando coluna user_id...');
      
      // Primeiro, verificar se há dados na tabela
      const dataCheck = await query('SELECT COUNT(*) as count FROM system_config_password', []);
      const hasData = dataCheck.rows[0] && parseInt(dataCheck.rows[0].count) > 0;

      if (hasData) {
        console.log('⚠️ Tabela contém dados. Adicionando coluna com valor NULL inicialmente...');
        await query(`
          ALTER TABLE system_config_password 
          ADD COLUMN user_id INTEGER
        `, []);
        
        // Adicionar constraint UNIQUE e foreign key depois
        console.log('📝 Adicionando constraint UNIQUE...');
        await query(`
          ALTER TABLE system_config_password 
          ADD CONSTRAINT system_config_password_user_id_unique UNIQUE (user_id)
        `, []).catch(err => {
          if (err.message.includes('already exists')) {
            console.log('ℹ️ Constraint UNIQUE já existe');
          } else {
            throw err;
          }
        });

        console.log('📝 Adicionando foreign key...');
        await query(`
          ALTER TABLE system_config_password 
          ADD CONSTRAINT system_config_password_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `, []).catch(err => {
          if (err.message.includes('already exists')) {
            console.log('ℹ️ Foreign key já existe');
          } else {
            throw err;
          }
        });
      } else {
        // Se não há dados, adicionar tudo de uma vez
        await query(`
          ALTER TABLE system_config_password 
          ADD COLUMN user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE
        `, []);
      }
      
      console.log('✅ Coluna user_id adicionada');
    } else {
      console.log('ℹ️ Coluna user_id já existe');
    }

    // Verificar estrutura final da tabela
    const finalCheck = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'system_config_password'
      ORDER BY ordinal_position
    `, []);

    console.log('\n📋 Estrutura final da tabela:');
    finalCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

    console.log('\n✅ Correção concluída com sucesso!');
    console.log('🎉 A tabela system_config_password está pronta para uso.');

  } catch (error) {
    console.error('❌ Erro durante correção:', error);
    console.error('❌ Mensagem:', error.message);
    console.error('❌ Stack:', error.stack);
    throw error;
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  fixPostgresConfigPassword()
    .then(() => {
      console.log('✅ Script de correção finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = fixPostgresConfigPassword;









