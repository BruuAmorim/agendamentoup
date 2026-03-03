const express = require('express');
const AdminIntegrationController = require('../controllers/adminIntegrationController');
const { verifyToken, requireAdminMaster } = require('../middleware/auth');

const router = express.Router();

// CRÍTICO: Todas as rotas requerem autenticação e role admin_master
router.use(verifyToken);
router.use(requireAdminMaster);

// Rotas de gerenciamento de integrações por empresa (admin master)
router.get('/', AdminIntegrationController.getIntegrations);
router.post('/generate-api-key', AdminIntegrationController.generateApiKey);
router.post('/regenerate-api-key', AdminIntegrationController.generateApiKey); // Alias para compatibilidade

// Nova rota: gerar/regenerar API Key para uma empresa específica (para uso com n8n, etc.)
router.post('/company-api-key', AdminIntegrationController.generateCompanyApiKey);

module.exports = router;

