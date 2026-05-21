const bcrypt = require('bcryptjs');
const { User } = require('../models');
const LogService = require('../services/logService');
const { query } = require('../config/database');

/**
 * Controller de Autenticação
 */
class AuthController {

  /**
   * Login do usuário
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      console.log('🔐 Tentativa de login:', { email });

      // Validações básicas
      if (!email || !password) {
        console.log('❌ Dados incompletos (email/senha ausentes)');
        return res.status(400).json({
          error: 'Dados inválidos',
          message: 'Email e senha são obrigatórios'
        });
      }

      let user;
      try {
        user = await User.findOne({
          where: { email: email.toLowerCase().trim() },
          attributes: ['id', 'name', 'email', 'password', 'role', 'isActive', 'parent_user_id'],
        });
      } catch (dbError) {
        console.error('[auth] Erro ao buscar usuário:', dbError.message);
        return res.status(500).json({
          error: 'Erro interno do servidor',
          message: 'Erro ao buscar usuário',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        });
      }

      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'Credenciais inválidas',
          message: 'Email ou senha incorretos',
        });
      }

      const isPasswordValid = await user.checkPassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Credenciais inválidas',
          message: 'Email ou senha incorretos',
        });
      }

      const token = user.generateToken();

      await LogService.logLogin({ id: user.id, name: user.name, email: user.email }, req);

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          parent_user_id: user.parent_user_id || null,
        },
        token,
      });

    } catch (error) {
      console.error('❌ ERRO NO LOGIN:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao realizar login',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Logout (invalidar token) - opcional, pois tokens JWT são stateless
   * Na prática, o logout é feito removendo o token do lado do cliente
   */
  static async logout(req, res) {
    try {
      // Registrar log de logout
      if (req.user) {
        await LogService.logLogout({
          id: req.user.id,
          name: req.user.name,
          email: req.user.email
        }, req);
      }

      // Como JWT é stateless, o logout é feito apenas no cliente
      // Aqui podemos implementar uma blacklist de tokens se necessário
      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao realizar logout'
      });
    }
  }

  /**
   * Verificar se o token é válido e retornar dados do usuário
   */
  static async verifyToken(req, res) {
    try {
      const user = await User.findOne({
        where: { id: req.user.id, isActive: true },
        attributes: ['id', 'name', 'email', 'role', 'parent_user_id'],
      });

      if (!user) {
        return res.status(401).json({
          error: 'Usuário não encontrado',
          message: 'Usuário associado ao token não existe mais',
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          parent_user_id: user.parent_user_id || null,
        },
      });
    } catch (error) {
      console.error('[auth] Erro na verificação do token:', error.message);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao verificar token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Refresh token - gerar novo token baseado no atual
   */
  static async refreshToken(req, res) {
    try {
      const user = await User.findOne({
        where: { id: req.user.id, isActive: true },
        attributes: ['id', 'name', 'email', 'role', 'parent_user_id'],
      });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado', message: 'Usuário não existe mais' });
      }

      res.json({
        success: true,
        token: user.generateToken(),
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (error) {
      console.error('[auth] Erro ao renovar token:', error.message);
      res.status(500).json({ error: 'Erro interno do servidor', message: 'Erro ao renovar token' });
    }
  }

  /**
   * Obter perfil do usuário atual
   */
  static async getProfile(req, res) {
    try {
      const user = await User.findOne({
        where: { id: req.user.id, isActive: true },
        attributes: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'],
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado', message: 'Perfil não encontrado' });
      }

      res.json({ success: true, user: user.toJSON() });
    } catch (error) {
      console.error('[auth] Erro ao obter perfil:', error.message);
      res.status(500).json({ error: 'Erro interno do servidor', message: 'Erro ao obter perfil' });
    }
  }

  /**
   * Verificar senha de configurações para acessar configurações
   * Usa a senha armazenada na tabela system_config_password
   */
  static async verifyAdminPassword(req, res) {
    try {
      const { password, userId: bodyUserId } = req.body;

      if (!password) {
        return res.status(400).json({ success: false, error: 'Senha não fornecida', message: 'Por favor, informe a senha' });
      }

      const { role, id: userId } = req.user;

      if (role !== 'admin_master' && role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas administradores e moderadores podem acessar as configurações',
        });
      }

      // moderator → usa o próprio ID; admin_master → precisa de userId no body
      const companyUserId = role === 'moderator' ? userId : bodyUserId;

      if (!companyUserId) {
        return res.status(400).json({
          success: false,
          error: 'ID da empresa não fornecido',
          message: 'Informe o userId da empresa para administradores',
        });
      }

      const result = await query(
        'SELECT password_hash FROM system_config_password WHERE user_id = $1',
        [companyUserId]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          success: false,
          error: 'Senha não configurada',
          message: 'A senha de configurações ainda não foi definida para esta empresa.',
        });
      }

      const isValid = await bcrypt.compare(password, result.rows[0].password_hash);

      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Senha incorreta', message: 'Senha incorreta. Tente novamente.' });
      }

      res.json({ success: true, message: 'Senha verificada com sucesso', verified: true });
    } catch (error) {
      console.error('[auth] Erro ao verificar senha de configurações:', error.message);
      res.status(500).json({ success: false, error: 'Erro interno do servidor', message: 'Erro ao verificar senha' });
    }
  }
}

module.exports = AuthController;
