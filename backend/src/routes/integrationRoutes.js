const express = require('express');
const IntegrationController = require('../controllers/integrationController');
const { verifyToken, requireAdminMaster } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas de integração requerem autenticação e role admin_master
router.use(verifyToken);
router.use(requireAdminMaster);

// Rotas de gerenciamento de integrações
router.get('/', IntegrationController.getIntegration);
router.put('/', IntegrationController.updateIntegration);
router.post('/test', IntegrationController.testWebhook);

module.exports = router;













