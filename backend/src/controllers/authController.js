const jwt = require('jsonwebtoken');
const { User } = require('../models');
const LogService = require('../services/logService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

      // Buscar usuário por email (incluindo password para verificação)
      let user;
      try {
        // Tentar buscar usuário com todos os atributos necessários
        // Para SQLite, especificar explicitamente os atributos para evitar problemas
        const userAttributes = ['id', 'name', 'email', 'password', 'role', 'isActive'];
        
        // Tentar adicionar parent_user_id se a coluna existir
        try {
          // Verificar se a coluna parent_user_id existe fazendo uma query de teste
          const { query } = require('../config/database');
          await query('SELECT parent_user_id FROM users LIMIT 1', []);
          userAttributes.push('parent_user_id');
          console.log('✅ Coluna parent_user_id disponível');
        } catch (e) {
          console.log('ℹ️ Coluna parent_user_id não disponível (será null)');
        }
        
        user = await User.findOne({
          where: {
            email: email.toLowerCase().trim()
          },
          attributes: userAttributes
        });
        
        // Se não encontrou, retornar erro
        if (!user) {
          console.log('❌ Usuário não encontrado:', email);
          return res.status(401).json({
            error: 'Credenciais inválidas',
            message: 'Email ou senha incorretos'
          });
        }
        
        // Verificar se está ativo
        if (!user.isActive) {
          console.log('❌ Usuário inativo:', email);
          return res.status(401).json({
            error: 'Credenciais inválidas',
            message: 'Email ou senha incorretos'
          });
        }
      } catch (dbError) {
        console.error('❌ Erro ao buscar usuário no banco:', dbError);
        console.error('❌ Mensagem do erro:', dbError.message);
        console.error('❌ Stack:', dbError.stack);
        return res.status(500).json({
          error: 'Erro interno do servidor',
          message: 'Erro ao buscar usuário',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }

      if (!user) {
        console.log('❌ Usuário não encontrado ou inativo:', email);
        return res.status(401).json({
          error: 'Credenciais inválidas',
          message: 'Email ou senha incorretos'
        });
      }

      console.log('✅ Usuário encontrado:', { id: user.id, role: user.role });

      // Verificar senha
      const isPasswordValid = await user.checkPassword(password);
      if (!isPasswordValid) {
        console.log('❌ Senha incorreta para usuário:', { id: user.id, email: user.email });
        return res.status(401).json({
          error: 'Credenciais inválidas',
          message: 'Email ou senha incorretos'
        });
      }

      console.log('✅ Senha válida! Gerando token...');
      console.log('📋 Dados do usuário antes de gerar token:', {
        id: user.id,
        email: user.email,
        role: user.role,
        roleType: typeof user.role,
        hasGenerateToken: typeof user.generateToken === 'function'
      });

      // Gerar token JWT
      let token;
      try {
        token = user.generateToken();
        console.log('✅ Token gerado com sucesso');
      } catch (tokenError) {
        console.error('❌ Erro ao gerar token:', tokenError);
        throw tokenError;
      }

      console.log('✅ Login bem-sucedido!');
      console.log('📤 Enviando resposta com role:', user.role);

      // Registrar log de login
      await LogService.logLogin({
        id: user.id,
        name: user.name,
        email: user.email
      }, req);

      // Retornar dados do usuário e token
      // GARANTIR que role seja string e exatamente 'admin_master', 'moderator' ou 'user'
      const userRole = String(user.role || 'user').trim();
      
      // Buscar parent_user_id diretamente do objeto user (se a coluna existir)
      let parent_user_id = null;
      try {
        // Tentar acessar parent_user_id diretamente do objeto user
        if (user.parent_user_id !== undefined && user.parent_user_id !== null) {
          parent_user_id = user.parent_user_id;
          console.log('✅ parent_user_id encontrado:', parent_user_id);
        } else {
          console.log('ℹ️ parent_user_id não definido ou null');
        }
      } catch (e) {
        // Coluna não existe ainda, usar null
        console.log('ℹ️ parent_user_id não acessível (coluna pode não existir):', e.message);
        parent_user_id = null;
      }
      
      console.log('📤 Preparando resposta final...');
      const responseData = {
        success: true,
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: userRole, // Garantir que role seja string
          parent_user_id: parent_user_id
        },
        token: token
      };
      
      console.log('📤 Enviando resposta:', { 
        success: responseData.success,
        userRole: responseData.user.role,
        hasToken: !!responseData.token
      });
      
      res.json(responseData);
      
      console.log('✅ Resposta enviada com role:', userRole);

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
      console.log('🔍 verifyToken - Verificando token para usuário ID:', req.user?.id);
      
      // O middleware verifyToken já validou o token e colocou req.user
      // Buscar usuário - usar findOne com where ao invés de findByPk com where
      const user = await User.findOne({
        where: {
          id: req.user.id,
          isActive: true
        },
        attributes: ['id', 'name', 'email', 'role', 'isActive']
      });

      if (!user) {
        console.log('❌ verifyToken - Usuário não encontrado ou inativo');
        return res.status(401).json({
          error: 'Usuário não encontrado',
          message: 'Usuário associado ao token não existe mais'
        });
      }

      // Tentar buscar parent_user_id separadamente se a coluna existir
      let parent_user_id = null;
      try {
        // Verificar se a coluna parent_user_id existe antes de acessar
        const userWithParent = await User.findOne({
          where: { id: req.user.id },
          attributes: ['parent_user_id']
        });
        if (userWithParent && userWithParent.parent_user_id) {
          parent_user_id = userWithParent.parent_user_id;
        }
      } catch (parentError) {
        // Se a coluna não existir, ignorar o erro
        console.log('⚠️ verifyToken - Coluna parent_user_id não disponível:', parentError.message);
      }

      console.log('✅ verifyToken - Token válido para usuário:', { id: user.id, role: user.role });

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          parent_user_id: parent_user_id
        }
      });

    } catch (error) {
      console.error('❌ Erro na verificação do token:', error);
      console.error('❌ Stack:', error.stack);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao verificar token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Refresh token - gerar novo token baseado no atual
   */
  static async refreshToken(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        where: { isActive: true }
      });

      if (!user) {
        return res.status(401).json({
          error: 'Usuário não encontrado',
          message: 'Usuário não existe mais'
        });
      }

      const newToken = user.generateToken();

      res.json({
        success: true,
        token: newToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Erro ao renovar token:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao renovar token'
      });
    }
  }

  /**
   * Obter perfil do usuário atual
   */
  static async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'],
        where: { isActive: true }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Perfil não encontrado'
        });
      }

      res.json({
        success: true,
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Erro ao obter perfil:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao obter perfil'
      });
    }
  }

  /**
   * Verificar senha de configurações para acessar configurações
   * Usa a senha armazenada na tabela system_config_password
   */
  static async verifyAdminPassword(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Senha não fornecida',
          message: 'Por favor, informe a senha'
        });
      }

      // Verificar se o usuário está autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Não autenticado',
          message: 'É necessário estar autenticado'
        });
      }

      // Verificar se é admin ou empresa
      const userRole = String(req.user.role || '').trim().toLowerCase();
      if (userRole !== 'admin_master' && userRole !== 'empresa' && userRole !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas administradores e empresas podem acessar as configurações'
        });
      }

      // Determinar user_id da empresa
      // Se for empresa/moderator, usar o próprio id; se for admin, usar o user_id do corpo da requisição
      let companyUserId;
      if (userRole === 'empresa' || userRole === 'moderator') {
        companyUserId = req.user.id;
      } else if (userRole === 'admin_master' && req.body.userId) {
        companyUserId = req.body.userId;
      } else {
        return res.status(400).json({
          success: false,
          error: 'ID da empresa não fornecido',
          message: 'É necessário fornecer o ID da empresa (userId) para administradores'
        });
      }

      // Buscar senha de configurações no banco para a empresa específica
      const { query } = require('../config/database');
      const { sequelize } = require('../models');
      const dialect = sequelize.getDialect();

      let result;
      if (dialect === 'sqlite') {
        result = await query('SELECT password_hash FROM system_config_password WHERE user_id = ?', [companyUserId]);
      } else {
        result = await query('SELECT password_hash FROM system_config_password WHERE user_id = $1', [companyUserId]);
      }

      // Verificar se existe senha configurada
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Senha não configurada',
          message: 'A senha de configurações ainda não foi definida para esta empresa. Um administrador deve configurá-la primeiro.'
        });
      }

      // Verificar senha
      const passwordHash = result.rows[0].password_hash;
      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Senha incorreta',
          message: 'Senha incorreta. Tente novamente.'
        });
      }

      // Senha válida - retornar sucesso
      res.json({
        success: true,
        message: 'Senha verificada com sucesso',
        verified: true
      });

    } catch (error) {
      console.error('Erro ao verificar senha de configurações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao verificar senha'
      });
    }
  }
}

module.exports = AuthController;
