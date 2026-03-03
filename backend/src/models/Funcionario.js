const { query } = require('../config/database');
const { sequelize } = require('../config/database');

class Funcionario {
  constructor(row) {
    this.id = row.id;
    this.empresa_id = row.empresa_id;
    this.nome = row.nome;
    this.funcao = row.funcao;
    this.lunch_start = row.lunch_start || null;
    this.lunch_end = row.lunch_end || null;
    // Garantir booleano consistente para ativo:
    // - Se vier null/undefined, considerar TRUE (ativo por padrão)
    // - Se vier 0 (SQLite) ou false (Postgres), considerar FALSE
    // - Qualquer outro valor truthy é TRUE
    if (row.ativo === null || row.ativo === undefined) {
      this.ativo = true;
    } else if (row.ativo === 0 || row.ativo === false) {
      this.ativo = false;
    } else {
      this.ativo = true;
    }
    this.created_at = row.created_at;
    this.updated_at = row.updated_at;
  }

  static async findAllByEmpresa(empresaId, { includeInactive = false } = {}) {
    const dialect = sequelize.getDialect();

    let text;
    let params;

    if (dialect === 'sqlite') {
      // ativo armazenado como INTEGER (0/1)
      text = `
        SELECT id, empresa_id, nome, funcao,
               lunch_start, lunch_end,
               COALESCE(ativo, 1) AS ativo,
               created_at, updated_at
        FROM funcionarios
        WHERE empresa_id = ?
        ${includeInactive ? '' : 'AND (ativo = 1)'}
        ORDER BY nome ASC
      `;
      params = [empresaId];
    } else {
      // Postgres: ativo é BOOLEAN
      text = `
        SELECT id, empresa_id, nome, funcao,
               lunch_start, lunch_end,
               COALESCE(ativo, TRUE) AS ativo,
               created_at, updated_at
        FROM funcionarios
        WHERE empresa_id = $1
        ${includeInactive ? '' : 'AND (ativo = TRUE)'}
        ORDER BY nome ASC
      `;
      params = [empresaId];
    }

    const result = await query(text, params);
    return result.rows.map(r => new Funcionario(r));
  }

  static async findById(id, empresaId) {
    const dialect = sequelize.getDialect();

    let text;
    let params;

    if (dialect === 'sqlite') {
      text = `
        SELECT id, empresa_id, nome, funcao,
               lunch_start, lunch_end,
               COALESCE(ativo, 1) AS ativo,
               created_at, updated_at
        FROM funcionarios
        WHERE id = ? AND empresa_id = ?
        LIMIT 1
      `;
      params = [id, empresaId];
    } else {
      text = `
        SELECT id, empresa_id, nome, funcao,
               lunch_start, lunch_end,
               COALESCE(ativo, TRUE) AS ativo,
               created_at, updated_at
        FROM funcionarios
        WHERE id = $1 AND empresa_id = $2
        LIMIT 1
      `;
      params = [id, empresaId];
    }

    const result = await query(text, params);
    if (!result.rows.length) return null;
    return new Funcionario(result.rows[0]);
  }

  static async create({ empresa_id, nome, funcao, ativo = true, lunch_start = null, lunch_end = null }) {
    const dialect = sequelize.getDialect();

    const insertFuncionario = async () => {
      const text = dialect === 'sqlite'
        ? `
          INSERT INTO funcionarios (empresa_id, nome, funcao, ativo, lunch_start, lunch_end)
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING id, empresa_id, nome, funcao, lunch_start, lunch_end, ativo, created_at, updated_at
        `
        : `
          INSERT INTO funcionarios (empresa_id, nome, funcao, ativo, lunch_start, lunch_end)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, empresa_id, nome, funcao, lunch_start, lunch_end, ativo, created_at, updated_at
        `;
      const params = dialect === 'sqlite'
        ? [empresa_id, nome, funcao || null, ativo ? 1 : 0, lunch_start || null, lunch_end || null]
        : [empresa_id, nome, funcao || null, ativo, lunch_start || null, lunch_end || null];

      const result = await query(text, params);
      return new Funcionario(result.rows[0]);
    };

    try {
      // Tenta inserir diretamente
      return await insertFuncionario();
    } catch (error) {
      // Se a tabela ainda não existir (produção antiga), criar e tentar novamente
      const msg = error.message || '';
      // 1) Se a coluna de almoço ainda não existir, criar e tentar novamente
      if (msg.includes('lunch_start') || msg.includes('lunch_end')) {
        console.warn('⚠️ Colunas de almoço não encontradas em funcionarios, criando automaticamente...');

        if (dialect === 'sqlite') {
          try {
            const info = await query('PRAGMA table_info(funcionarios)', []);
            const cols = info.rows.map(c => c.name);
            if (!cols.includes('lunch_start')) {
              await query('ALTER TABLE funcionarios ADD COLUMN lunch_start TEXT', []);
            }
            if (!cols.includes('lunch_end')) {
              await query('ALTER TABLE funcionarios ADD COLUMN lunch_end TEXT', []);
            }
          } catch (e) {
            console.warn('⚠️ Erro ao adicionar colunas de almoço em funcionarios (SQLite):', e.message);
          }
        } else {
          try {
            await query('ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS lunch_start TIME', []);
            await query('ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS lunch_end TIME', []);
          } catch (e) {
            console.warn('⚠️ Erro ao adicionar colunas de almoço em funcionarios (PostgreSQL):', e.message);
          }
        }

        // Tentar novamente o insert após criar as colunas
        return await insertFuncionario();
      }

      // 2) Se a tabela ainda não existir (produção antiga), criar e tentar novamente
      if (msg.includes('no such table') || (msg.includes('relation \"funcionarios\"') && msg.includes('does not exist') && !msg.includes('column \"'))) {
        console.warn('⚠️ Tabela funcionarios não existe, criando automaticamente...');

        if (dialect === 'sqlite') {
          const createFuncionarios = `
            CREATE TABLE IF NOT EXISTS funcionarios (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              empresa_id INTEGER NOT NULL,
              nome TEXT NOT NULL,
              funcao TEXT,
              lunch_start TEXT,
              lunch_end TEXT,
              ativo INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `;
          await query(createFuncionarios, []);
        } else {
          const createFuncionarios = `
            CREATE TABLE IF NOT EXISTS funcionarios (
              id SERIAL PRIMARY KEY,
              empresa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              nome VARCHAR(255) NOT NULL,
              funcao VARCHAR(255),
              lunch_start TIME,
              lunch_end TIME,
              ativo BOOLEAN DEFAULT TRUE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
          `;
          await query(createFuncionarios, []);
        }

        // Tentar inserir novamente após criar tabela
        return await insertFuncionario();
      }

      // Se o erro não for de tabela inexistente, propagar
      throw error;
    }
  }

  static async update(id, empresaId, data) {
    const existing = await this.findById(id, empresaId);
    if (!existing) return null;

    const nome = data.nome ?? existing.nome;
    const funcao = data.funcao ?? existing.funcao;
    const ativo = data.ativo !== undefined ? data.ativo : existing.ativo;
    const lunch_start = data.lunch_start !== undefined ? data.lunch_start : existing.lunch_start;
    const lunch_end = data.lunch_end !== undefined ? data.lunch_end : existing.lunch_end;

    const dialect = sequelize.getDialect();
    const text = dialect === 'sqlite'
      ? `
        UPDATE funcionarios
        SET nome = ?, funcao = ?, ativo = ?, lunch_start = ?, lunch_end = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
        RETURNING id, empresa_id, nome, funcao, lunch_start, lunch_end, ativo, created_at, updated_at
      `
      : `
        UPDATE funcionarios
        SET nome = $1, funcao = $2, ativo = $3, lunch_start = $4, lunch_end = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 AND empresa_id = $7
        RETURNING id, empresa_id, nome, funcao, lunch_start, lunch_end, ativo, created_at, updated_at
      `;

    const params = dialect === 'sqlite'
      ? [nome, funcao || null, ativo ? 1 : 0, lunch_start || null, lunch_end || null, id, empresaId]
      : [nome, funcao || null, ativo, lunch_start || null, lunch_end || null, id, empresaId];

    const result = await query(text, params);
    if (!result.rows.length) return null;
    return new Funcionario(result.rows[0]);
  }

  static async softDelete(id, empresaId) {
    const dialect = sequelize.getDialect();
    const text = dialect === 'sqlite'
      ? `
        UPDATE funcionarios
        SET ativo = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
      `
      : `
        UPDATE funcionarios
        SET ativo = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND empresa_id = $2
      `;
    const params = dialect === 'sqlite' ? [id, empresaId] : [id, empresaId];
    await query(text, params);
  }

  static async destroy(id, empresaId) {
    const dialect = sequelize.getDialect();
    const text = dialect === 'sqlite'
      ? `
        DELETE FROM funcionarios
        WHERE id = ? AND empresa_id = ?
      `
      : `
        DELETE FROM funcionarios
        WHERE id = $1 AND empresa_id = $2
      `;
    const params = dialect === 'sqlite' ? [id, empresaId] : [id, empresaId];
    await query(text, params);
  }

  toJSON() {
    return {
      id: this.id,
      empresa_id: this.empresa_id,
      nome: this.nome,
      funcao: this.funcao,
      lunch_start: this.lunch_start,
      lunch_end: this.lunch_end,
      ativo: !!this.ativo,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Funcionario;

