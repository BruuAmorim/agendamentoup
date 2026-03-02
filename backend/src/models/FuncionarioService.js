const { query } = require('../config/database');
const { sequelize } = require('../config/database');

class FuncionarioService {
  static async getServicesByFuncionario(funcionarioId, empresaId) {
    const { sequelize } = require('../config/database');
    const dialect = sequelize.getDialect();

    try {
      const text = dialect === 'sqlite'
        ? `
          SELECT service_name
          FROM funcionario_services
          WHERE funcionario_id = ?
          ORDER BY service_name ASC
        `
        : `
          SELECT service_name
          FROM funcionario_services
          WHERE funcionario_id = $1
          ORDER BY service_name ASC
        `;
      const params = dialect === 'sqlite' ? [funcionarioId] : [funcionarioId];
      const result = await query(text, params);
      return result.rows.map(r => r.service_name);
    } catch (error) {
      const msg = error.message || '';
      if (msg.includes('no such table') || msg.includes('does not exist') || msg.includes('relation \"funcionario_services\"')) {
        console.warn('⚠️ Tabela funcionario_services não existe ao ler serviços, retornando lista vazia.');
        return [];
      }
      throw error;
    }
  }

  static async setServices(funcionarioId, empresaId, services) {
    // services: array de nomes de serviço (strings)
    if (!Array.isArray(services)) services = [];
    services = services
      .map(s => String(s || '').trim())
      .filter(s => s.length > 0);

    const dialect = sequelize.getDialect();

    const ensureTable = async () => {
      if (dialect === 'sqlite') {
        const createFuncionarioServices = `
          CREATE TABLE IF NOT EXISTS funcionario_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            funcionario_id INTEGER NOT NULL,
            service_name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(funcionario_id, service_name)
          )
        `;
        await query(createFuncionarioServices, []);
      } else {
        const createFuncionarioServices = `
          CREATE TABLE IF NOT EXISTS funcionario_services (
            id SERIAL PRIMARY KEY,
            funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
            service_name TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(funcionario_id, service_name)
          )
        `;
        await query(createFuncionarioServices, []);
      }
    };

    try {
      // Limpar vínculos antigos
      const deleteText = dialect === 'sqlite'
        ? 'DELETE FROM funcionario_services WHERE funcionario_id = ?'
        : 'DELETE FROM funcionario_services WHERE funcionario_id = $1';
      await query(deleteText, dialect === 'sqlite' ? [funcionarioId] : [funcionarioId]);
    } catch (error) {
      const msg = error.message || '';
      if (msg.includes('no such table') || msg.includes('does not exist') || msg.includes('relation \"funcionario_services\"')) {
        console.warn('⚠️ Tabela funcionario_services não existe ao limpar vínculos, criando...');
        await ensureTable();
      } else {
        throw error;
      }
    }

    if (services.length === 0) return;

    // Inserir novos vínculos
    for (const name of services) {
      try {
        const insertText = dialect === 'sqlite'
          ? `
            INSERT OR IGNORE INTO funcionario_services (funcionario_id, service_name)
            VALUES (?, ?)
          `
          : `
            INSERT INTO funcionario_services (funcionario_id, service_name)
            VALUES ($1, $2)
            ON CONFLICT (funcionario_id, service_name) DO NOTHING
          `;
        const params = dialect === 'sqlite'
          ? [funcionarioId, name]
          : [funcionarioId, name];
        await query(insertText, params);
      } catch (error) {
        const msg = error.message || '';
        if (msg.includes('no such table') || msg.includes('does not exist') || msg.includes('relation \"funcionario_services\"')) {
          console.warn('⚠️ Tabela funcionario_services não existe ao inserir vínculo, criando e tentando novamente...');
          await ensureTable();
          // Tentar novamente uma vez
          const insertText = dialect === 'sqlite'
            ? `
              INSERT OR IGNORE INTO funcionario_services (funcionario_id, service_name)
              VALUES (?, ?)
            `
            : `
              INSERT INTO funcionario_services (funcionario_id, service_name)
              VALUES ($1, $2)
              ON CONFLICT (funcionario_id, service_name) DO NOTHING
            `;
          const params = dialect === 'sqlite'
            ? [funcionarioId, name]
            : [funcionarioId, name];
          await query(insertText, params);
        } else {
          throw error;
        }
      }
    }
  }
}

module.exports = FuncionarioService;

