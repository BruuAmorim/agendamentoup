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
   * Retorna se existe senha configurada, mas não retorna a senha
   */
  static async getPasswordStatus(req, res) {
    try {
      console.log('🔍 getPasswordStatus - Verificando status da senha de configurações');

      // Obter dialect do sequelize
      const dialect = sequelize.getDialect();
      
      let result;
      if (dialect === 'sqlite') {
        result = await query('SELECT id, created_at, updated_at FROM system_config_password LIMIT 1', []);
      } else {
        result = await query('SELECT id, created_at, updated_at FROM system_config_password LIMIT 1', []);
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
   * Criar senha de configurações (apenas admin_master)
   */
  static async createPassword(req, res) {
    try {
      console.log('🔐 createPassword - Criando senha de configurações');

      const { password } = req.body;

      if (!password || password.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Senha inválida',
          message: 'A senha deve ter pelo menos 4 caracteres'
        });
      }

      // Obter dialect do sequelize
      const dialect = sequelize.getDialect();
      
      // Verificar se já existe senha
      let checkResult;
      if (dialect === 'sqlite') {
        checkResult = await query('SELECT id FROM system_config_password LIMIT 1', []);
      } else {
        checkResult = await query('SELECT id FROM system_config_password LIMIT 1', []);
      }

      if (checkResult.rows && checkResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Senha já existe',
          message: 'Já existe uma senha configurada. Use PUT para alterá-la.'
        });
      }

      // Criptografar senha
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Inserir senha
      if (dialect === 'sqlite') {
        await query('INSERT INTO system_config_password (password_hash) VALUES (?)', [passwordHash]);
      } else {
        await query('INSERT INTO system_config_password (password_hash) VALUES ($1)', [passwordHash]);
      }

      console.log('✅ Senha de configurações criada com sucesso');

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
   * Atualizar senha de configurações (apenas admin_master)
   */
  static async updatePassword(req, res) {
    try {
      console.log('🔐 updatePassword - Atualizando senha de configurações');

      const { password, currentPassword } = req.body;

      if (!password || password.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Senha inválida',
          message: 'A senha deve ter pelo menos 4 caracteres'
        });
      }

      // Obter dialect do sequelize
      const dialect = sequelize.getDialect();
      
      // Verificar se existe senha atual
      let checkResult;
      if (dialect === 'sqlite') {
        checkResult = await query('SELECT id, password_hash FROM system_config_password LIMIT 1', []);
      } else {
        checkResult = await query('SELECT id, password_hash FROM system_config_password LIMIT 1', []);
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
          await query('UPDATE system_config_password SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [passwordHash, checkResult.rows[0].id]);
        } else {
          await query('UPDATE system_config_password SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', 
            [passwordHash, checkResult.rows[0].id]);
        }
        console.log('✅ Senha de configurações atualizada com sucesso');
      } else {
        // Criar nova senha
        if (dialect === 'sqlite') {
          await query('INSERT INTO system_config_password (password_hash) VALUES (?)', [passwordHash]);
        } else {
          await query('INSERT INTO system_config_password (password_hash) VALUES ($1)', [passwordHash]);
        }
        console.log('✅ Senha de configurações criada com sucesso');
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

