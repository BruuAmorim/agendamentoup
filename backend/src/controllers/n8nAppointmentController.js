const Appointment = require('../models/Appointment');

/**
 * Controller de Integração n8n para Agendamentos
 * - Autenticado via API Key (middleware)
 * - Sem dependência de sessão/JWT
 */
class N8nAppointmentController {
  static normalizeDate(date) {
    return Appointment.normalizeDate(date);
  }

  static normalizeTime(time) {
    return Appointment.normalizeTime(time);
  }

  // GET /api/n8n/appointments?date=YYYY-MM-DD&status=pending
  static async list(req, res) {
    try {
      const { date, status, customer_name, start_date, end_date } = req.query;
      const filters = {};
      if (customer_name) filters.customer_name = customer_name;
      if (status) filters.status = status;
      if (date) filters.date = this.normalizeDate(date);
      if (start_date && end_date) {
        filters.start_date = this.normalizeDate(start_date);
        filters.end_date = this.normalizeDate(end_date);
      }

      const appointments = await Appointment.find(filters);
      return res.json({
        success: true,
        data: appointments.map(a => a.toJSON())
      });
    } catch (error) {
      console.error('n8n list appointments error:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // POST /api/n8n/appointments
  static async create(req, res) {
    try {
      const body = req.body || {};
      const payload = {
        ...body,
        appointment_date: this.normalizeDate(body.appointment_date),
        appointment_time: this.normalizeTime(body.appointment_time)
      };

      const appointment = await Appointment.create(payload);
      return res.status(201).json({
        success: true,
        message: 'Agendamento criado com sucesso',
        data: appointment.toJSON()
      });
    } catch (error) {
      console.error('n8n create appointment error:', error);
      const isValidation = String(error.message || '').includes('Dados inválidos') ||
        String(error.message || '').includes('Horário indisponível');
      return res.status(isValidation ? 400 : 500).json({
        success: false,
        error: isValidation ? 'Dados inválidos' : 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // PUT /api/n8n/appointments/:id
  static async update(req, res) {
    try {
      const { id } = req.params;
      const body = req.body || {};

      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado'
        });
      }

      const payload = { ...body };
      if (payload.appointment_date) payload.appointment_date = this.normalizeDate(payload.appointment_date);
      if (payload.appointment_time) payload.appointment_time = this.normalizeTime(payload.appointment_time);

      const updated = await appointment.update(payload);
      return res.json({
        success: true,
        message: 'Agendamento atualizado com sucesso',
        data: updated.toJSON()
      });
    } catch (error) {
      console.error('n8n update appointment error:', error);
      const isValidation = String(error.message || '').includes('Dados inválidos') ||
        String(error.message || '').includes('Novo horário indisponível');
      return res.status(isValidation ? 400 : 500).json({
        success: false,
        error: isValidation ? 'Dados inválidos' : 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // DELETE /api/n8n/appointments
  static async remove(req, res) {
    try {
      const { protocol } = req.body;

      if (!protocol) {
        return res.status(400).json({
          success: false,
          error: 'Protocolo é obrigatório'
        });
      }

      const appointment = await Appointment.findByProtocol(protocol);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado'
        });
      }

      await appointment.delete();
      return res.json({
        success: true,
        message: 'Agendamento deletado com sucesso'
      });
    } catch (error) {
      console.error('n8n delete appointment error:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
}

module.exports = N8nAppointmentController;








