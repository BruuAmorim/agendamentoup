const { User } = require('../models');
const LogService = require('../services/logService');
const ApiKeyService = require('../services/apiKeyService');

/**
 * Controller de Gerenciamento de Usuários
 */
class UserController {

  /**
   * Listar todos os usuários (apenas admin_master)
   */
  static async getAllUsers(req, res) {
    try {
      const users = await User.findAll({
        attributes: [
          'id',
          'name',
          'email',
          'role',
          'isActive',
          'createdAt',
          'updatedAt',
          // campos de API Key (para admin enxergar status das empresas)
          'api_key_prefix',
          'api_key_hash',
          'api_key_created_at',
          'api_key_last_regenerated'
        ],
        order: [['createdAt', 'DESC']]
      });

      // Mapear para não expor o hash completo na API
      const safeUsers = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // informações de API Key apenas para visualização/admin
        hasApiKey: !!user.api_key_hash,
        apiKeyPrefix: user.api_key_prefix || null,
        apiKeyCreatedAt: user.api_key_created_at || null,
        apiKeyLastRegenerated: user.api_key_last_regenerated || null
      }));

      res.json({
        success: true,
        users: safeUsers
      });

    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao listar usuários'
      });
    }
  }

  /**
   * Obter usuário por ID
   */
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt', 'updatedAt']
      });

      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Usuário não existe'
        });
      }

      res.json({
        success: true,
        user: user
      });

    } catch (error) {
      console.error('Erro ao obter usuário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao obter usuário'
      });
    }
  }

  /**
   * Criar novo usuário
   */
  static async createUser(req, res) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          error: 'Dados inválidos',
          message: 'Nome, email e senha são obrigatórios'
        });
      }

      if (role && !['admin_master', 'moderator', 'user'].includes(role)) {
        return res.status(400).json({
          error: 'Role inválido',
          message: 'Role deve ser admin_master, moderator ou user'
        });
      }

      const existingUser = await User.findOne({
        where: { email: email.toLowerCase().trim() },
        attributes: ['id']
      });
      if (existingUser) {
        return res.status(409).json({
          error: 'Email já cadastrado',
          message: 'Já existe um usuário com este email'
        });
      }

      const validRoles = ['admin_master', 'moderator', 'user'];
      const userRole = role && validRoles.includes(role) ? role : 'user';

      const newUser = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: userRole
      });

      if (userRole === 'moderator') {
        try {
          await ApiKeyService.generateAndSaveApiKey(newUser.id);
        } catch (apiKeyError) {
          console.error('Erro ao gerar API Key para nova empresa:', apiKeyError.message);
        }
      }

      // Retornar usuário criado (sem senha)
      const userResponse = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      };

      // Registrar log
      if (req.user) {
        await LogService.logUserCreation(req.user, newUser, req);
      }

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        user: userResponse
      });

    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      
      // Tratar erro de email duplicado
      if (error.name === 'SequelizeUniqueConstraintError' || 
          (error.parent && error.parent.code === '23505')) {
        return res.status(409).json({
          success: false,
          error: 'Email já cadastrado',
          message: 'Já existe um usuário com este email. Por favor, use outro email.'
        });
      }
      
      // Tratar outros erros de validação do Sequelize
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        return res.status(400).json({
          success: false,
          error: 'Erro de validação',
          message: messages
        });
      }
      
      console.error('❌ Stack:', error.stack);
      console.error('❌ Mensagem:', error.message);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao criar usuário. Tente novamente.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Atualizar usuário
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, password, role, isActive } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Usuário não existe'
        });
      }

      // Validações
      if (role && !['admin_master', 'moderator', 'user'].includes(role)) {
        return res.status(400).json({
          error: 'Role inválido',
          message: 'Role deve ser admin_master, moderator ou user'
        });
      }

      // Verificar se email já existe (se foi alterado)
      if (email && email.toLowerCase().trim() !== user.email) {
        const existingUser = await User.findOne({
          where: { email: email.toLowerCase().trim() }
        });
        if (existingUser) {
          return res.status(409).json({
            error: 'Email já cadastrado',
            message: 'Já existe um usuário com este email'
          });
        }
      }

      // Preparar dados para atualização
      const updateData = {};
      if (name) updateData.name = name.trim();
      if (email) updateData.email = email.toLowerCase().trim();
      if (password) updateData.password = password; // Será hashado pelo hook
      if (role) updateData.role = role;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
      
      // Se for empresa/moderador e tiver employee_limit, atualizar nas configurações
      if ((role === 'moderator') && req.body.employee_limit !== undefined) {
        const { query } = require('../config/database');
        const employeeLimit = parseInt(req.body.employee_limit);
        if (!isNaN(employeeLimit) && employeeLimit > 0) {
          const updateSettingsQuery = `
            UPDATE moderator_settings 
            SET employee_limit = $1 
            WHERE user_id = $2
          `;
          await query(updateSettingsQuery, [employeeLimit, id]);
        }
      }

      // Salvar dados antigos para log
      const oldData = {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      };

      // Atualizar usuário
      await user.update(updateData);
      await user.reload();

      // Registrar log
      if (req.user) {
        const changes = {};
        Object.keys(updateData).forEach(key => {
          if (oldData[key] !== user[key]) {
            changes[key] = { from: oldData[key], to: user[key] };
          }
        });
        await LogService.logUserUpdate(req.user, user, changes, req);
      }

      // Retornar usuário atualizado
      const userResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        user: userResponse
      });

    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao atualizar usuário'
      });
    }
  }

  /**
   * Deletar usuário (exclusão permanente do banco)
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: ['id', 'name', 'email', 'role', 'isActive']
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado', message: 'Usuário não existe' });
      }

      if (user.role === 'admin_master' && req.user && req.user.id === parseInt(id)) {
        return res.status(400).json({
          error: 'Operação não permitida',
          message: 'Não é possível excluir sua própria conta de administrador'
        });
      }

      if (user.role === 'moderator') {
        try {
          const { query } = require('../config/database');
          await query('DELETE FROM employees WHERE moderator_id = $1', [id]);
        } catch (e) {
          if (e.message && !e.message.includes('no such table')) {
            console.warn('Erro ao remover funcionários:', e.message);
          }
        }
      }

      try {
        const { query } = require('../config/database');
        await query('DELETE FROM employees WHERE user_id = $1', [id]);
      } catch (e) {
        if (e.message && !e.message.includes('no such table')) {
          console.warn('Erro ao remover vínculos:', e.message);
        }
      }

      const deletedUserData = { id: user.id, name: user.name, email: user.email, role: user.role };

      await user.destroy({ force: true });

      // Registrar log
      if (req.user) {
        await LogService.logUserDeletion(req.user, deletedUserData, req);
      }

      res.json({
        success: true,
        message: 'Usuário excluído permanentemente com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar usuário:', error.message);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao deletar usuário',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Desativar usuário (soft delete)
   */
  static async deactivateUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Usuário não existe'
        });
      }

      // Impedir que admin_master seja desativado por si mesmo
      if (user.role === 'admin_master' && req.user.id === parseInt(id)) {
        return res.status(400).json({
          error: 'Operação não permitida',
          message: 'Não é possível desativar sua própria conta de administrador'
        });
      }

      // Soft delete - desativar usuário
      await user.update({ isActive: false });
      await user.reload();

      // Registrar log
      if (req.user) {
        await LogService.logUserUpdate(req.user, user, { isActive: { from: true, to: false } }, req);
      }

      res.json({
        success: true,
        message: 'Usuário desativado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao desativar usuário'
      });
    }
  }

  /**
   * Reativar usuário
   */
  static async reactivateUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Usuário não existe'
        });
      }

      await user.update({ isActive: true });

      res.json({
        success: true,
        message: 'Usuário reativado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao reativar usuário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao reativar usuário'
      });
    }
  }

  /**
   * GET /api/users/:id/employees
   * Lista funcionários de um moderador (admin)
   */
  static async getModeratorEmployees(req, res) {
    try {
      const { id } = req.params;
      const moderator = await User.findByPk(id);
      
      if (!moderator || moderator.role !== 'moderator') {
        return res.status(400).json({
          error: 'Usuário inválido',
          message: 'O usuário especificado não é um moderador'
        });
      }

      const { query } = require('../config/database');
      
      // Verificar se a tabela employees existe
      try {
        const employeesQuery = `
          SELECT u.id, u.name, u.email, u.isActive, e.created_at
          FROM employees e
          JOIN users u ON e.user_id = u.id
          WHERE e.moderator_id = $1
          ORDER BY u.name ASC
        `;
        const result = await query(employeesQuery, [id]);

        res.json({
          success: true,
          data: result.rows || []
        });
      } catch (tableError) {
        // Se a tabela não existe, retornar array vazio
        if (tableError.message && tableError.message.includes('no such table')) {
          console.warn('⚠️ Tabela employees não existe ainda, retornando array vazio');
          return res.json({
            success: true,
            data: []
          });
        }
        throw tableError;
      }
    } catch (error) {
      console.error('Erro ao buscar funcionários do moderador:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar funcionários',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * POST /api/users/:id/employees
   * Adiciona funcionário a um moderador (admin)
   */
  static async addModeratorEmployee(req, res) {
    try {
      const { id } = req.params; // ID do moderador
      const { user_id } = req.body;


      const moderator = await User.findByPk(id);
      if (!moderator || (moderator.role !== 'moderator')) {
        return res.status(400).json({
          error: 'Usuário inválido',
          message: 'O usuário especificado não é uma empresa'
        });
      }

      if (!user_id) {
        return res.status(400).json({
          error: 'Dados inválidos',
          message: 'ID do usuário é obrigatório'
        });
      }

      const employee = await User.findByPk(user_id);
      if (!employee || employee.role !== 'user') {
        return res.status(400).json({
          error: 'Tipo inválido',
          message: 'Apenas usuários comuns podem ser funcionários'
        });
      }

      // Verificar limite
      const { query } = require('../config/database');
      let employeeLimit = 10;
      try {
        const settingsQuery = 'SELECT employee_limit FROM moderator_settings WHERE user_id = $1';
        const settingsResult = await query(settingsQuery, [id]);
        employeeLimit = settingsResult.rows[0]?.employee_limit || 10;
      } catch (e) {
        console.warn('⚠️ Erro ao buscar limite, usando padrão 10:', e.message);
      }

      let currentCount = 0;
      try {
        const countQuery = 'SELECT COUNT(*) as count FROM employees WHERE moderator_id = $1';
        const countResult = await query(countQuery, [id]);
        currentCount = parseInt(countResult.rows[0]?.count || 0);
      } catch (e) {
        if (e.message && e.message.includes('no such table')) {
          console.warn('⚠️ Tabela employees não existe, criando...');
          // Tabela será criada no próximo sync
          currentCount = 0;
        } else {
          throw e;
        }
      }

      if (currentCount >= employeeLimit) {
        return res.status(400).json({
          error: 'Limite atingido',
          message: `O moderador atingiu o limite de ${employeeLimit} funcionários.`
        });
      }

      // Verificar se já está vinculado
      try {
        const checkQuery = 'SELECT id FROM employees WHERE user_id = $1 AND moderator_id = $2';
        const checkResult = await query(checkQuery, [user_id, id]);
        
        if (checkResult.rows.length > 0) {
          return res.status(409).json({
            error: 'Já vinculado',
            message: 'Este usuário já é funcionário deste moderador'
          });
        }
      } catch (e) {
        if (e.message && e.message.includes('no such table')) {
          // Tabela não existe, continuar para criar
        } else {
          throw e;
        }
      }

      // Adicionar funcionário
      try {
        await query('INSERT INTO employees (user_id, moderator_id) VALUES ($1, $2)', [user_id, id]);
        res.json({ success: true, message: 'Funcionário adicionado com sucesso' });
      } catch (insertError) {
        console.error('Erro ao inserir funcionário:', insertError.message);
        
        if (insertError.message && insertError.message.includes('no such table')) {
          return res.status(500).json({
            error: 'Tabela não existe',
            message: 'A tabela de funcionários ainda não foi criada. Aguarde alguns segundos e tente novamente.'
          });
        }
        
        if (insertError.message && insertError.message.includes('UNIQUE constraint')) {
          return res.status(409).json({
            error: 'Já vinculado',
            message: 'Este usuário já é funcionário deste moderador'
          });
        }
        
        throw insertError;
      }
    } catch (error) {
      console.error('Erro ao adicionar funcionário:', error.message);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao adicionar funcionário',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * DELETE /api/users/:id/employees/:employeeId
   * Remove funcionário de um moderador (admin)
   */
  static async removeModeratorEmployee(req, res) {
    try {
      const { id, employeeId } = req.params; // id = moderador, employeeId = funcionário


      const { query } = require('../config/database');
      
      try {
        const deleteQuery = 'DELETE FROM employees WHERE user_id = $1 AND moderator_id = $2';
        await query(deleteQuery, [employeeId, id]);

        res.json({
          success: true,
          message: 'Funcionário removido com sucesso'
        });
      } catch (tableError) {
        if (tableError.message && tableError.message.includes('no such table')) {
          return res.status(404).json({
            error: 'Tabela não existe',
            message: 'A tabela de funcionários ainda não foi criada.'
          });
        }
        throw tableError;
      }
    } catch (error) {
      console.error('Erro ao remover funcionário:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao remover funcionário',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = UserController;
