const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Rotas públicas
router.post('/login', loginLimiter, AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Rota de logout (protegida)
router.post('/logout', verifyToken, AuthController.logout);

// Rota para verificar token (protegida)
router.get('/verify', verifyToken, AuthController.verifyToken);

// Rota para renovar token (protegida)
router.post('/refresh', verifyToken, AuthController.refreshToken);

// Rota para obter perfil do usuário atual (protegida)
router.get('/profile', verifyToken, AuthController.getProfile);

// Rota para verificar senha de admin para acessar configurações
router.post('/verify-admin-password', verifyToken, AuthController.verifyAdminPassword);

module.exports = router;












