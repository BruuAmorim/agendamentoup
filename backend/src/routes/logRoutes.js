/**
 * Rotas de Logs do Sistema
 * Apenas admin_master pode acessar
 */

const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { verifyToken, requireAdminMaster } = require('../middleware/auth');

// Todas as rotas requerem autenticação e role admin_master
router.use(verifyToken);
router.use(requireAdminMaster);

/**
 * @api {get} /api/logs Listar logs
 * @apiName GetLogs
 * @apiGroup Logs
 * @apiDescription Lista logs do sistema com filtros e paginação (apenas admin_master)
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {Number} [page=1] Número da página
 * @apiParam {Number} [limit=50] Itens por página
 * @apiParam {String} [action] Filtrar por ação
 * @apiParam {String} [entity_type] Filtrar por tipo de entidade
 * @apiParam {Number} [user_id] Filtrar por ID do usuário
 * @apiParam {String} [start_date] Data inicial (YYYY-MM-DD)
 * @apiParam {String} [end_date] Data final (YYYY-MM-DD)
 * @apiParam {String} [search] Buscar em descrição, nome ou email
 */
router.get('/', logController.getLogs);

/**
 * @api {get} /api/logs/stats Estatísticas de logs
 * @apiName GetLogStats
 * @apiGroup Logs
 * @apiDescription Retorna estatísticas dos logs (apenas admin_master)
 */
router.get('/stats', logController.getLogStats);

/**
 * @api {get} /api/logs/:id Buscar log específico
 * @apiName GetLogById
 * @apiGroup Logs
 * @apiDescription Busca um log específico por ID (apenas admin_master)
 */
router.get('/:id', logController.getLogById);

module.exports = router;









