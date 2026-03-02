const { query } = require('../config/database');
const { sequelize } = require('../config/database');

class Funcionario {
  constructor(row) {
    this.id = row.id;
    this.empresa_id = row.empresa_id;
    this.nome = row.nome;
    this.funcao = row.funcao;
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

  static async create({ empresa_id, nome, funcao, ativo = true }) {
    const dialect = sequelize.getDialect();

    const insertFuncionario = async () => {
      const text = dialect === 'sqlite'
        ? `
          INSERT INTO funcionarios (empresa_id, nome, funcao, ativo)
          VALUES (?, ?, ?, ?)
          RETURNING id, empresa_id, nome, funcao, ativo, created_at, updated_at
        `
        : `
          INSERT INTO funcionarios (empresa_id, nome, funcao, ativo)
          VALUES ($1, $2, $3, $4)
          RETURNING id, empresa_id, nome, funcao, ativo, created_at, updated_at
        `;
      const params = dialect === 'sqlite'
        ? [empresa_id, nome, funcao || null, ativo ? 1 : 0]
        : [empresa_id, nome, funcao || null, ativo];

      const result = await query(text, params);
      return new Funcionario(result.rows[0]);
    };

    try {
      // Tenta inserir diretamente
      return await insertFuncionario();
    } catch (error) {
      // Se a tabela ainda não existir (produção antiga), criar e tentar novamente
      const msg = error.message || '';
      if (msg.includes('no such table') || msg.includes('does not exist') || msg.includes('relation \"funcionarios\"') ) {
        console.warn('⚠️ Tabela funcionarios não existe, criando automaticamente...');

        if (dialect === 'sqlite') {
          const createFuncionarios = `
            CREATE TABLE IF NOT EXISTS funcionarios (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              empresa_id INTEGER NOT NULL,
              nome TEXT NOT NULL,
              funcao TEXT,
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

    const dialect = sequelize.getDialect();
    const text = dialect === 'sqlite'
      ? `
        UPDATE funcionarios
        SET nome = ?, funcao = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
        RETURNING id, empresa_id, nome, funcao, ativo, created_at, updated_at
      `
      : `
        UPDATE funcionarios
        SET nome = $1, funcao = $2, ativo = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND empresa_id = $5
        RETURNING id, empresa_id, nome, funcao, ativo, created_at, updated_at
      `;

    const params = dialect === 'sqlite'
      ? [nome, funcao || null, ativo ? 1 : 0, id, empresaId]
      : [nome, funcao || null, ativo, id, empresaId];

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
      ativo: !!this.ativo,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Funcionario;

