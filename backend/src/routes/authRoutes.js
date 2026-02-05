const express = require('express');
const AuthController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rota de login (pública)
router.post('/login', AuthController.login);

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












