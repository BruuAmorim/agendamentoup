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
  // Modo PostgreSQL (produção — Neon, Supabase, etc.)
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    // Pool conservador para ambientes serverless (Firebase Functions, Vercel)
    // Cada instância tem no máximo 2 conexões; o pooler do Neon gerencia o total
    pool: {
      max: 2,
      min: 0,
      acquire: 10000,
      idle: 5000,
      evict: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      statement_timeout: 10000,
      query_timeout: 10000
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
      let hadPgParams = false;
      let sqliteSql = sql.replace(/\$(\d+)/g, (_, idx) => {
        hadPgParams = true;
        const val = params[parseInt(idx, 10) - 1];
        if (val !== undefined) sqliteParams.push(val);
        return '?';
      });
      // Se o SQL já usava ? (sem $n), aproveitar params originais
      if (!hadPgParams && params.length) sqliteParams.push(...params);

      // Remover cast de tipo PostgreSQL (::text, ::date, ::jsonb, etc.)
      sqliteSql = sqliteSql.replace(/::\w+/g, '');

      if (isReadOnly) {
        const results = await sequelize.query(sqliteSql, {
          replacements: sqliteParams,
          type: sequelize.QueryTypes.SELECT,
        });
        return { rows: Array.isArray(results) ? results : [] };
      }

      if (hasReturning) {
        // SQLite não suporta RETURNING — strip e depois busca a linha pelo last_insert_rowid()
        const strippedSql = sqliteSql.replace(/\s+RETURNING\s+[\s\S]*/gi, '');
        await sequelize.query(strippedSql, {
          replacements: sqliteParams,
          type: sequelize.QueryTypes.RAW,
        });
        // Para INSERTs: buscar a linha recém-inserida
        if (/^\s*INSERT/i.test(strippedSql)) {
          try {
            const [lastRow] = await sequelize.query(
              'SELECT last_insert_rowid() AS last_id',
              { type: sequelize.QueryTypes.SELECT }
            );
            const lastId = lastRow?.last_id;
            if (lastId) {
              const tableMatch = strippedSql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
              if (tableMatch) {
                const fetched = await sequelize.query(
                  `SELECT * FROM \`${tableMatch[1]}\` WHERE id = ?`,
                  { replacements: [lastId], type: sequelize.QueryTypes.SELECT }
                );
                return { rows: fetched || [] };
              }
            }
          } catch (e) {
            console.warn('[db] SQLite RETURNING fallback:', e.message);
          }
        }
        return { rows: [] };
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