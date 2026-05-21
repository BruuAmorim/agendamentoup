const express = require('express');
const { query: dbQuery, sequelize } = require('../config/database');
const N8nAppointmentController = require('../controllers/n8nAppointmentController');
const patientsController = require('../controllers/patientsController');
const { verifyIntegrationApiKey } = require('../middleware/apiKeyAuth');

const router = express.Router();

// Todas as rotas n8n exigem API Key
router.use(verifyIntegrationApiKey);

// Agendamentos
router.get('/appointments', N8nAppointmentController.list);
router.post('/appointments', N8nAppointmentController.create);
router.put('/appointments/:id', N8nAppointmentController.update);
router.delete('/appointments', N8nAppointmentController.remove);

// Pacientes
// GET /api/n8n/patients?search=<nome|telefone|cpf>&phone=<whatsapp>
router.get('/patients', patientsController.searchN8n);

// Serviços
// GET /api/n8n/services          → lista todos os serviços ativos
// GET /api/n8n/services?search=x → filtra por nome
router.get('/services', async (req, res) => {
  try {
    const empresaId = req.empresa?.id;
    if (!empresaId) return res.status(403).json({ success: false, message: 'Acesso negado' });

    const isPostgres = sequelize.getDialect() !== 'sqlite';
    const search = String(req.query.search || req.query.termo_busca || '').trim();

    let sql, params;
    if (search.length >= 2) {
      sql = isPostgres
        ? `SELECT id, name, duration_minutes, price FROM company_services
           WHERE empresa_id = $1 AND active = true AND name ILIKE $2
           ORDER BY name ASC`
        : `SELECT id, name, duration_minutes, price FROM company_services
           WHERE empresa_id = ? AND active = 1 AND name LIKE ?
           ORDER BY name ASC`;
      params = [empresaId, `%${search}%`];
    } else {
      sql = isPostgres
        ? `SELECT id, name, duration_minutes, price FROM company_services
           WHERE empresa_id = $1 AND active = true ORDER BY name ASC`
        : `SELECT id, name, duration_minutes, price FROM company_services
           WHERE empresa_id = ? AND active = 1 ORDER BY name ASC`;
      params = [empresaId];
    }

    const result = await dbQuery(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error('[n8n/services]', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;








