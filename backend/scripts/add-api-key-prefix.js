/**
 * Script para adicionar coluna api_key_prefix na tabela users
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

async function addApiKeyPrefix() {
  let sequelize;
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL não encontrada no .env');
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
    
    console.log('🔄 Adicionando coluna api_key_prefix...');
    
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS api_key_prefix VARCHAR(50) NULL;
    `);
    
    console.log('✅ Coluna api_key_prefix adicionada');
    
    // Verificar
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'api_key_prefix';
    `);
    
    if (results.length > 0) {
      console.log('✅ Coluna verificada:', results[0]);
    }
    
    console.log('✅ Migration concluída com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

addApiKeyPrefix();






