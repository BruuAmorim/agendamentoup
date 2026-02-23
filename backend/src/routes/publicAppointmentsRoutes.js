const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const empresaApiKeyMiddleware = require('../middleware/empresaApiKey.middleware');

// Middleware de validação para criação/atualização
const validateAppointment = (req, res, next) => {
  // Pular validação para requisições OPTIONS
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Verificar se o body foi parseado corretamente
  if (!req.body || typeof req.body !== 'object') {
    console.warn('⚠️ Body não parseado ou inválido:', req.body);
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      message: 'O corpo da requisição deve ser um JSON válido',
      received: typeof req.body
    });
  }

  const { customer_name, appointment_date, appointment_time } = req.body;
  const errors = [];

  // Validação mais flexível para integrações externas
  if (req.method === 'POST') {
    // Para POST, todos os campos são obrigatórios
    if (!customer_name || (typeof customer_name === 'string' && customer_name.trim().length < 2)) {
      errors.push('Nome do cliente é obrigatório e deve ter pelo menos 2 caracteres');
    }

    if (!appointment_date) {
      errors.push('Data do agendamento é obrigatória (formato: YYYY-MM-DD)');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment_date)) {
      errors.push('Data do agendamento deve estar no formato YYYY-MM-DD');
    }

    if (!appointment_time) {
      errors.push('Horário do agendamento é obrigatório (formato: HH:MM)');
    } else if (!/^\d{2}:\d{2}$/.test(appointment_time)) {
      errors.push('Horário do agendamento deve estar no formato HH:MM');
    }
  }

  if (errors.length > 0) {
    console.warn('⚠️ Erros de validação:', errors);
    console.warn('⚠️ Dados recebidos:', req.body);
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      message: errors.join(', '),
      received_data: req.body
    });
  }

  next();
};

/**
 * Rotas públicas de agendamentos (autenticadas por API Key)
 * Estas rotas não requerem JWT, apenas API Key no header x-api-key
 * O middleware apiKeyMiddleware extrai automaticamente o empresa_id
 */

// POST /api/public/appointments - Criar agendamento via API Key
router.post('/', validateAppointment, empresaApiKeyMiddleware, appointmentController.createAppointment);

// GET /api/public/appointments/available/:date - Buscar horários disponíveis via API Key
router.get('/available/:date', empresaApiKeyMiddleware, appointmentController.getAvailableSlots);

// PUT /api/public/appointments/:id - Atualizar agendamento via API Key
router.put('/:id', validateAppointment, empresaApiKeyMiddleware, appointmentController.updateAppointment);

// DELETE /api/public/appointments/:id - Deletar agendamento via API Key
router.delete('/:id', empresaApiKeyMiddleware, appointmentController.deleteAppointment);

module.exports = router;


