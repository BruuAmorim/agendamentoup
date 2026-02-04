const express = require('express');
const N8nAppointmentController = require('../controllers/n8nAppointmentController');
const { verifyIntegrationApiKey } = require('../middleware/apiKeyAuth');

const router = express.Router();

// Todas as rotas n8n exigem API Key
router.use(verifyIntegrationApiKey);

// Agendamentos
router.get('/appointments', N8nAppointmentController.list);
router.post('/appointments', N8nAppointmentController.create);
router.put('/appointments/:id', N8nAppointmentController.update);
router.delete('/appointments', N8nAppointmentController.remove);

module.exports = router;








