const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { sequelize } = require('../models');

/**
 * Controller para gerenciar senha de configurações
 * Apenas Admin Master pode visualizar, criar ou alterar
 */
class SettingsPasswordController {
  /**
   * GET /api/settings-password
   * Obter status da senha (apenas admin_master)
   * Retorna se existe senha configurada para a empresa, mas não retorna a senha
   */
  static async getPasswordStatus(req, res) {
    try {
      const companyId = req.query.companyId;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'ID da empresa não fornecido',
          message: 'É necessário fornecer o ID da empresa (companyId)'
        });
      }

      console.log('🔍 getPasswordStatus - Verificando status da senha de configurações para empresa:', companyId);

      // Obter dialect do sequelize
      const dialect = sequelize.getDialect();
      console.log('🔍 Dialect detectado:', dialect);
      
      // Primeiro, verificar se a tabela existe e se tem a coluna user_id
      let tableExists = false;
      let columnExists = false;
      
      try {
        if (dialect === 'sqlite') {
          const tableCheck = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='system_config_password'", []);
          tableExists = tableCheck.rows && tableCheck.rows.length > 0;
          
          if (tableExists) {
            const tableInfo = await query("PRAGMA table_info(system_config_password)", []);
            const existingColumns = tableInfo.rows.map(col => col.name);
            columnExists = existingColumns.includes('user_id');
          }
        } else {
          // PostgreSQL
          const tableCheck = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'system_config_password'
          `, []);
          tableExists = tableCheck.rows && tableCheck.rows.length > 0;
          
          if (tableExists) {
            const columnCheck = await query(`
              SELECT column_name
              FROM information_schema.columns
              WHERE table_schema = 'public' 
                AND table_name = 'system_config_password'
                AND column_name = 'user_id'
            `, []);
            columnExists = columnCheck.rows && columnCheck.rows.length > 0;
          }
        }
      } catch (checkError) {
        console.warn('⚠️ Erro ao verificar estrutura da tabela:', checkError.message);
      }
      
      // Se a tabela não existe, criar
      if (!tableExists) {
        console.log('📝 Criando tabela system_config_password...');
        if (dialect === 'sqlite') {
          await query(`
            CREATE TABLE IF NOT EXISTS system_config_password (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              password_hash TEXT NOT NULL,
              user_id INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, []);
        } else {
          await query(`
            CREATE TABLE IF NOT EXISTS system_config_password (
              id SERIAL PRIMARY KEY,
              password_hash VARCHAR(255) NOT NULL,
              user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
          `, []);
        }
        console.log('✅ Tabela system_config_password criada');
        columnExists = true; // Se criou a tabela, a coluna já existe
      }
      
      // Se a coluna user_id não existe, adicionar
      if (!columnExists) {
        console.log('📝 Adicionando coluna user_id...');
        if (dialect === 'sqlite') {
          await query('ALTER TABLE system_config_password ADD COLUMN user_id INTEGER', []);
        } else {
          // Para PostgreSQL, verificar se há dados primeiro
          const dataCheck = await query('SELECT COUNT(*) as count FROM system_config_password', []);
          const hasData = dataCheck.rows[0] && parseInt(dataCheck.rows[0].count) > 0;
          
          if (hasData) {
            // Se há dados, adicionar coluna sem constraint primeiro
            await query('ALTER TABLE system_config_password ADD COLUMN user_id INTEGER', []);
            // Depois adicionar constraint UNIQUE
            try {
              await query('ALTER TABLE system_config_password ADD CONSTRAINT system_config_password_user_id_unique UNIQUE (user_id)', []);
            } catch (e) {
              if (!e.message.includes('already exists')) throw e;
            }
            // Adicionar foreign key
            try {
              await query('ALTER TABLE system_config_password ADD CONSTRAINT system_config_password_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE', []);
            } catch (e) {
              if (!e.message.includes('already exists')) throw e;
            }
          } else {
            // Se não há dados, adicionar tudo de uma vez
            await query('ALTER TABLE system_config_password ADD COLUMN user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE', []);
          }
        }
        console.log('✅ Coluna user_id adicionada');
      }
      
      // Agora fazer a query
      let result;
      if (dialect === 'sqlite') {
        result = await query('SELECT id, created_at, updated_at FROM system_config_password WHERE user_id = ?', [companyId]);
      } else {
        result = await query('SELECT id, created_at, updated_at FROM system_config_password WHERE user_id = $1', [companyId]);
      }

      const hasPassword = result.rows && result.rows.length > 0;

      res.json({
        success: true,
        data: {
          hasPassword: hasPassword,
          createdAt: hasPassword ? result.rows[0].created_at : null,
          updatedAt: hasPassword ? result.rows[0].updated_at : null
        }
      });

    } catch (error) {
      console.error('❌ Erro ao obter status da senha:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao verificar status da senha'
      });
    }
  }

  /**
   * POST /api/settings-password
   * Criar senha de configurações para uma empresa (apenas admin_master)
   */
  static async createPassword(req, res) {
    try {
      const { password, companyId } = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'ID da empresa não fornecido',
          message: 'É necessário fornecer o ID da empresa (companyId)'
        });
      }

      if (!password || password.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Senha inválida',
          message: 'A senha deve ter pelo menos 4 caracteres'
        });
      }

      // Verificar se a empresa existe e é do tipo empresa/moderator
      const { User } = require('../models');
      const company = await User.findByPk(companyId);
      if (!company || (company.role !== 'empresa' && company.role !== 'moderator')) {
        return res.status(400).json({
          success: false,
          error: 'Empresa inválida',
          message: 'A empresa especificada não existe ou não é uma empresa válida'
        });
      }

      console.log('🔐 createPassword - Criando senha de configurações para empresa:', companyId);

      // Obter dialect do sequelize
      const dialect = sequelize.getDialect();
      
      // Verificar se já existe senha para esta empresa
      let checkResult;
      if (dialect === 'sqlite') {
        checkResult = await query('SELECT id FROM system_config_password WHERE user_id = ?', [companyId]);
      } else {
        checkResult = await query('SELECT id FROM system_config_password WHERE user_id = $1', [companyId]);
      }

      if (checkResult.rows && checkResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Senha já existe',
          message: 'Já existe uma senha configurada para esta empresa. Use PUT para alterá-la.'
        });
      }

      // Criptografar senha
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Inserir senha
      if (dialect === 'sqlite') {
        await query('INSERT INTO system_config_password (user_id, password_hash) VALUES (?, ?)', [companyId, passwordHash]);
      } else {
        await query('INSERT INTO system_config_password (user_id, password_hash) VALUES ($1, $2)', [companyId, passwordHash]);
      }

      console.log('✅ Senha de configurações criada com sucesso para empresa:', companyId);

      res.json({
        success: true,
        message: 'Senha de configurações criada com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao criar senha:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao criar senha de configurações'
      });
    }
  }

  /**
   * PUT /api/settings-password
   * Atualizar senha de configurações para uma empresa (apenas admin_master)
   */
  static async updatePassword(req, res) {
    try {
      const { password, currentPassword, companyId } = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'ID da empresa não fornecido',
          message: 'É necessário fornecer o ID da empresa (companyId)'
        });
      }

      if (!password || password.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Senha inválida',
          message: 'A senha deve ter pelo menos 4 caracteres'
        });
      }

      // Verificar se a empresa existe e é do tipo empresa/moderator
      const { User } = require('../models');
      const company = await User.findByPk(companyId);
      if (!company || (company.role !== 'empresa' && company.role !== 'moderator')) {
        return res.status(400).json({
          success: false,
          error: 'Empresa inválida',
          message: 'A empresa especificada não existe ou não é uma empresa válida'
        });
      }

      console.log('🔐 updatePassword - Atualizando senha de configurações para empresa:', companyId);

      // Obter dialect do sequelize
      const dialect = sequelize.getDialect();
      
      // Verificar se existe senha atual para esta empresa
      let checkResult;
      if (dialect === 'sqlite') {
        checkResult = await query('SELECT id, password_hash FROM system_config_password WHERE user_id = ?', [companyId]);
      } else {
        checkResult = await query('SELECT id, password_hash FROM system_config_password WHERE user_id = $1', [companyId]);
      }

      // Se existe senha, verificar senha atual
      if (checkResult.rows && checkResult.rows.length > 0) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            error: 'Senha atual necessária',
            message: 'Para alterar a senha, é necessário informar a senha atual'
          });
        }

        const currentHash = checkResult.rows[0].password_hash;
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentHash);

        if (!isCurrentPasswordValid) {
          return res.status(401).json({
            success: false,
            error: 'Senha atual incorreta',
            message: 'A senha atual informada está incorreta'
          });
        }
      }

      // Criptografar nova senha
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Atualizar ou criar senha
      if (checkResult.rows && checkResult.rows.length > 0) {
        // Atualizar senha existente
        if (dialect === 'sqlite') {
          await query('UPDATE system_config_password SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', 
            [passwordHash, companyId]);
        } else {
          await query('UPDATE system_config_password SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', 
            [passwordHash, companyId]);
        }
        console.log('✅ Senha de configurações atualizada com sucesso para empresa:', companyId);
      } else {
        // Criar nova senha
        if (dialect === 'sqlite') {
          await query('INSERT INTO system_config_password (user_id, password_hash) VALUES (?, ?)', [companyId, passwordHash]);
        } else {
          await query('INSERT INTO system_config_password (user_id, password_hash) VALUES ($1, $2)', [companyId, passwordHash]);
        }
        console.log('✅ Senha de configurações criada com sucesso para empresa:', companyId);
      }

      res.json({
        success: true,
        message: 'Senha de configurações atualizada com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao atualizar senha:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao atualizar senha de configurações'
      });
    }
  }
}

module.exports = SettingsPasswordController;

