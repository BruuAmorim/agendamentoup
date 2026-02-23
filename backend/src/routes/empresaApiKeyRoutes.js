const express = require('express');
const EmpresaApiKeyController = require('../controllers/empresaApiKeyController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Rotas de gerenciamento de API Key de empresas
 * Todas as rotas requerem autenticação JWT
 */

// POST /api/empresa/api-key/regenerate - Regenerar API Key
router.post('/regenerate', verifyToken, EmpresaApiKeyController.regenerateApiKey);

// GET /api/empresa/api-key/info - Obter informações da API Key (sem expor a chave)
router.get('/info', verifyToken, EmpresaApiKeyController.getApiKeyInfo);

module.exports = router;






