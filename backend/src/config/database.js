const { Sequelize } = require('sequelize');
const path = require('path');

// O Supabase geralmente fornece a URL completa em DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
const useMemoryStorage = process.env.USE_MEMORY_STORAGE === 'true';
// Use SQLite local mesmo com DATABASE_URL definido (ex.: npm run start:local)
const useSqliteLocal = process.env.USE_SQLITE_LOCAL === 'true';

let sequelize;

if (useMemoryStorage) {
  // Modo memória (desenvolvimento) - não persiste dados
  console.log('⚠️  Usando armazenamento em memória (dados não serão persistidos)');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  });
} else if (databaseUrl && !useSqliteLocal) {
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

// Função helper para executar queries SQL diretas.
// Normaliza a interface entre SQLite e PostgreSQL retornando sempre { rows: [] }.
async function query(sql, params = []) {
  try {
    const dialect = sequelize.getDialect();
    const sqlUpper = sql.trim().toUpperCase();
    const isReadOnly = sqlUpper.startsWith('SELECT') || sqlUpper.startsWith('PRAGMA') || sqlUpper.startsWith('WITH');
    const hasReturning = /\bRETURNING\b/i.test(sql);

    if (dialect === 'sqlite') {
      // Converter placeholders PostgreSQL ($1, $2, ...) para SQLite (?)
      const sqliteParams = [];
      let sqliteSql = sql.replace(/\$(\d+)/g, (_, idx) => {
        const val = params[parseInt(idx, 10) - 1];
        if (val !== undefined) sqliteParams.push(val);
        return '?';
      });

      // Remover cast de tipo PostgreSQL (::text, ::date, ::jsonb, etc.)
      sqliteSql = sqliteSql.replace(/::\w+/g, '');

      // SQLite não suporta RETURNING — removê-lo
      if (hasReturning) {
        sqliteSql = sqliteSql.replace(/\s+RETURNING\s+[\w\s,*]+/gi, '');
      }

      if (isReadOnly) {
        const results = await sequelize.query(sqliteSql, {
          replacements: sqliteParams,
          type: sequelize.QueryTypes.SELECT,
        });
        return { rows: Array.isArray(results) ? results : [] };
      }

      await sequelize.query(sqliteSql, {
        replacements: sqliteParams,
        type: sequelize.QueryTypes.RAW,
      });
      return { rows: [] };

    } else {
      // PostgreSQL
      if (isReadOnly) {
        const results = await sequelize.query(sql, {
          bind: params,
          type: sequelize.QueryTypes.SELECT,
        });
        return { rows: Array.isArray(results) ? results : [] };
      }

      if (hasReturning) {
        // INSERT/UPDATE/DELETE com RETURNING — retorna linhas afetadas
        const [rows] = await sequelize.query(sql, {
          bind: params,
          type: sequelize.QueryTypes.SELECT,
        });
        return { rows: Array.isArray(rows) ? rows : (rows ? [rows] : []) };
      }

      // Mutação pura sem RETURNING
      await sequelize.query(sql, {
        bind: params,
        type: sequelize.QueryTypes.RAW,
      });
      return { rows: [] };
    }
  } catch (error) {
    console.error('[db] Erro ao executar query:', error.message);
    console.error('[db] SQL:', sql);
    throw error;
  }
}

module.exports = {
  sequelize,
  query
};