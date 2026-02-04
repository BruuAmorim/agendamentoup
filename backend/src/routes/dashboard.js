/**
 * Rotas do Dashboard - EvAgendamento API
 *
 * Endpoints para métricas e análises do perfil Moderador.
 * Estes dados são utilizados no dashboard de analytics.
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Middleware de autenticação (temporariamente desabilitado)
// const auth = require('../middleware/auth');
// router.use(auth);

/**
 * @api {get} /dashboard/daily-stats Estatísticas diárias
 * @apiName GetDailyStats
 * @apiGroup Dashboard
 * @apiDescription Retorna contagem de agendamentos por dia (últimos 30 dias)
 * @apiSuccess {Object[]} data Array com estatísticas diárias
 * @apiSuccess {String} data.date Data no formato YYYY-MM-DD
 * @apiSuccess {Number} data.count Número de agendamentos
 */
router.get('/daily-stats', dashboardController.getDailyStats);

/**
 * @api {get} /dashboard/top-services Top Serviços
 * @apiName GetTopServices
 * @apiGroup Dashboard
 * @apiDescription Retorna ranking dos serviços mais agendados
 * @apiSuccess {Object[]} data Array com ranking de serviços
 * @apiSuccess {String} data.service Nome do serviço
 * @apiSuccess {Number} data.count Número de agendamentos
 */
router.get('/top-services', dashboardController.getTopServices);

/**
 * @api {get} /dashboard/summary Resumo Geral
 * @apiName GetSummary
 * @apiGroup Dashboard
 * @apiDescription Retorna totais de agendamentos (mês/semana/hoje)
 * @apiSuccess {Object} data Objeto com resumos
 * @apiSuccess {Object} data.monthly Estatísticas mensais
 * @apiSuccess {Object} data.weekly Estatísticas semanais
 * @apiSuccess {Object} data.today Agendamentos de hoje
 */
router.get('/summary', dashboardController.getSummary);

module.exports = router;


