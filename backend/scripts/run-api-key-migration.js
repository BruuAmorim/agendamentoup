/**
 * Script para executar migration de API Key diretamente no PostgreSQL
 * Execute: node backend/scripts/run-api-key-migration.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

async function runMigration() {
  let sequelize;
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL não encontrada no .env');
      console.log('💡 Configure DATABASE_URL no arquivo .env');
      process.exit(1);
    }
    
    console.log('🔄 Conectando ao PostgreSQL...');
    sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });
    
    await sequelize.authenticate();
    console.log('✅ Conectado ao PostgreSQL');
    
    console.log('🔄 Executando migration...');
    
    // Executar migration
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS api_key_last_regenerated TIMESTAMP WITH TIME ZONE NULL;
    `);
    
    console.log('✅ Colunas adicionadas');
    
    // Criar índice
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_api_key_hash 
      ON users(api_key_hash) 
      WHERE api_key_hash IS NOT NULL;
    `);
    
    console.log('✅ Índice criado');
    
    // Verificar colunas
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('api_key_hash', 'api_key_created_at', 'api_key_last_regenerated')
      ORDER BY column_name;
    `);
    
    console.log('\n📊 Colunas verificadas:');
    results.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n✅ Migration concluída com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

runMigration();







