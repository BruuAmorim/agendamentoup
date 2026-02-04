const { Sequelize } = require('sequelize');
const path = require('path');

// O Supabase geralmente fornece a URL completa em DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
const useMemoryStorage = process.env.USE_MEMORY_STORAGE === 'true';

let sequelize;

if (useMemoryStorage) {
  // Modo memória (desenvolvimento) - não persiste dados
  console.log('⚠️  Usando armazenamento em memória (dados não serão persistidos)');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  });
} else if (databaseUrl) {
  // Modo PostgreSQL (produção/Supabase)
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Necessário para conexões externas com o Supabase
      }
    }
  });
} else {
  // Modo SQLite local (desenvolvimento) - persiste dados em arquivo
  const dbPath = path.join(__dirname, '../../../database.sqlite');
  console.log('📦 Usando SQLite local:', dbPath);
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
  });
}

// Função helper para executar queries SQL diretas
async function query(sql, params = []) {
  try {
    const dialect = sequelize.getDialect();
    
    // Para SQLite, adaptar a sintaxe
    if (dialect === 'sqlite') {
      // Converter placeholders PostgreSQL ($1, $2) para SQLite (?)
      let sqliteSql = sql;
      const sqliteParams = [];
      
      // Substituir $1, $2, etc. por ? e coletar parâmetros na ordem
      sqliteSql = sqliteSql.replace(/\$(\d+)/g, (match, index) => {
        const paramIndex = parseInt(index) - 1;
        if (params[paramIndex] !== undefined) {
          sqliteParams.push(params[paramIndex]);
          return '?';
        }
        return match;
      });
      
      // Remover tipos PostgreSQL (::date, ::text, etc.)
      sqliteSql = sqliteSql.replace(/::\w+/g, '');
      
      // Verificar se é SELECT, INSERT, UPDATE ou DELETE
      const sqlUpper = sql.trim().toUpperCase();
      const isSelect = sqlUpper.startsWith('SELECT');
      const isInsert = sqlUpper.startsWith('INSERT');
      const isUpdate = sqlUpper.startsWith('UPDATE');
      const hasReturning = sql.includes('RETURNING');
      
      // Remover RETURNING (não suportado no SQLite)
      if (hasReturning) {
        sqliteSql = sqliteSql.replace(/RETURNING\s+[\w\s,]+/gi, '');
      }
      
      // Executar query
      let results;
      if (isSelect) {
        results = await sequelize.query(sqliteSql, {
          replacements: sqliteParams,
          type: sequelize.QueryTypes.SELECT
        });
        return { rows: Array.isArray(results) ? results : (results ? [results] : []) };
      } else if (sqlUpper.startsWith('PRAGMA')) {
        // PRAGMA queries retornam resultados especiais
        results = await sequelize.query(sqliteSql, {
          replacements: sqliteParams,
          type: sequelize.QueryTypes.SELECT
        });
        return { rows: Array.isArray(results) ? results : (results ? [results] : []) };
      } else {
        // Para INSERT/UPDATE/DELETE, executar
        await sequelize.query(sqliteSql, {
          replacements: sqliteParams,
          type: sequelize.QueryTypes.RAW
        });
        
        // Sempre retornar vazio para INSERT/UPDATE/DELETE
        // O código que chama a query deve fazer SELECT separado se precisar dos dados
        return { rows: [] };
      }
    } else {
      // PostgreSQL - usar diretamente
      const results = await sequelize.query(sql, {
        bind: params,
        type: sequelize.QueryTypes.SELECT
      });
      
      return { rows: Array.isArray(results) ? results : (results ? [results] : []) };
    }
  } catch (error) {
    console.error('Erro ao executar query:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

module.exports = {
  sequelize,
  query
};