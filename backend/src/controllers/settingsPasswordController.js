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
      // Validar role permitida
      const userRole = String(req.user?.role || '').trim().toLowerCase();
      if (!['admin_master', 'moderator'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas administradores e empresas podem gerenciar a senha de configurações'
        });
      }

      // companyId pode vir pela query (?companyId=) ou, se não vier,
      // usamos o próprio usuário autenticado (útil para admin_master em ambiente único)
      let companyId = req.query.companyId;
      const authUser = req.user || null;

      if (!companyId && authUser) {
        companyId = authUser.id;
      }

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

      // Garantir que a tabela exista (sem lógica complexa de migração)
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
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `, []);
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
        message: 'Erro ao verificar status da senha',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * POST /api/settings-password
   * Criar senha de configurações para uma empresa (apenas admin_master)
   */
  static async createPassword(req, res) {
    try {
      const { password, companyId: bodyCompanyId } = req.body;

      // Validar role permitida
      const userRole = String(req.user?.role || '').trim().toLowerCase();
      if (!['admin_master', 'moderator'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas administradores e empresas podem criar a senha de configurações'
        });
      }

      // companyId pode vir no body ou, se não vier, usar o próprio usuário autenticado
      const authUser = req.user || null;
      const companyId = bodyCompanyId || (authUser ? authUser.id : null);

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
      // Aceitar empresa, moderator OU admin_master (para ambientes com único admin/empresa)
      if (!company || !['moderator', 'admin_master'].includes(company.role)) {
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
      const { password, currentPassword, companyId: bodyCompanyId } = req.body;

      // Validar role permitida
      const userRole = String(req.user?.role || '').trim().toLowerCase();
      if (!['admin_master', 'moderator'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas administradores e empresas podem alterar a senha de configurações'
        });
      }

      // companyId pode vir no body ou, se não vir, usar o próprio usuário autenticado
      const authUser = req.user || null;
      const companyId = bodyCompanyId || (authUser ? authUser.id : null);

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
      // Aceitar empresa, moderator OU admin_master (para ambientes com único admin/empresa)
      if (!company || !['moderator', 'admin_master'].includes(company.role)) {
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
        const isAdminMaster = userRole === 'admin_master';

        // Para admin_master permitimos resetar sem informar a senha atual
        if (!currentPassword && !isAdminMaster) {
          return res.status(400).json({
            success: false,
            error: 'Senha atual necessária',
            message: 'Para alterar a senha, é necessário informar a senha atual'
          });
        }

        if (currentPassword) {
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

