const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware para verificar token JWT
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return res.status(401).json({
        error: 'Token de acesso não fornecido',
        message: 'É necessário estar autenticado para acessar este recurso'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    return res.status(403).json({
      error: 'Token inválido',
      message: 'Token de acesso inválido ou expirado'
    });
  }
};

/**
 * Middleware para verificar roles específicas
 * @param {string[]} allowedRoles - Array de roles permitidos
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        message: 'É necessário estar autenticado para acessar este recurso'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: `Esta rota requer um dos seguintes perfis: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware específico para admin_master
 */
const requireAdminMaster = requireRole(['admin_master']);

/**
 * Middleware específico para usuários comuns
 */
const requireUser = requireRole(['user']);

/**
 * Middleware para bloquear acesso a rotas específicas baseado no role
 */
const blockRouteForRole = (blockedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(); // Se não está autenticado, deixa passar (outro middleware pode lidar)
    }

    if (blockedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Seu perfil não tem permissão para acessar esta rota'
      });
    }

    next();
  };
};

/**
 * Middleware para bloquear rotas admin para usuários comuns
 */
const blockAdminRoutesForUsers = blockRouteForRole(['user']);

/**
 * Middleware para bloquear rotas de usuário para admins (opcional)
 */
const blockUserRoutesForAdmins = blockRouteForRole(['admin_master']);

module.exports = {
  verifyToken,
  requireRole,
  requireAdminMaster,
  requireUser,
  blockRouteForRole,
  blockAdminRoutesForUsers,
  blockUserRoutesForAdmins
};












