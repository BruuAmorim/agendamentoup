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

  // GET /api/n8n/appointments?date=YYYY-MM-DD&status=pending&empresa_id=123
  static async list(req, res) {
    try {
      const { date, status, customer_name, start_date, end_date, empresa_id } = req.query;
      
      // CRÍTICO: empresa_id é obrigatório para integrações n8n
      if (!empresa_id) {
        return res.status(400).json({
          success: false,
          error: 'empresa_id obrigatório',
          message: 'O parâmetro empresa_id é obrigatório para filtrar agendamentos por empresa'
        });
      }
      
      const empresaIdInt = parseInt(empresa_id);
      if (isNaN(empresaIdInt)) {
        return res.status(400).json({
          success: false,
          error: 'empresa_id inválido',
          message: 'empresa_id deve ser um número válido'
        });
      }
      
      const filters = {};
      if (customer_name) filters.customer_name = customer_name;
      if (status) filters.status = status;
      if (date) filters.date = Appointment.normalizeDate(date);
      if (start_date && end_date) {
        filters.start_date = Appointment.normalizeDate(start_date);
        filters.end_date = Appointment.normalizeDate(end_date);
      }

      // CRÍTICO: Filtrar apenas agendamentos da empresa especificada
      const appointments = await Appointment.find(filters, empresaIdInt);
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
  // Body deve conter empresa_id obrigatoriamente
  static async create(req, res) {
    try {
      const body = req.body || {};

      const empresaIdInt = parseInt(body.empresa_id || req.empresa?.id);
      if (isNaN(empresaIdInt)) {
        return res.status(400).json({
          success: false,
          error: 'empresa_id obrigatório',
          message: 'empresa_id não encontrado no body nem na autenticação'
        });
      }
      
      const payload = {
        ...body,
        appointment_date: Appointment.normalizeDate(body.appointment_date),
        appointment_time: Appointment.normalizeTime(body.appointment_time)
      };
      
      // Remover empresa_id do payload (será passado como userId para create)
      delete payload.empresa_id;

      // CRÍTICO: Passar empresa_id como userId para garantir isolamento
      const appointment = await Appointment.create(payload, empresaIdInt);
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
  // Body deve conter empresa_id obrigatoriamente
  static async update(req, res) {
    try {
      const { id } = req.params;
      const body = req.body || {};
      
      const empresaIdInt = parseInt(body.empresa_id || req.empresa?.id);
      if (isNaN(empresaIdInt)) {
        return res.status(400).json({
          success: false,
          error: 'empresa_id obrigatório',
          message: 'empresa_id não encontrado no body nem na autenticação'
        });
      }

      // CRÍTICO: Buscar agendamento apenas se pertencer à empresa especificada
      const appointment = await Appointment.findById(id, empresaIdInt);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado',
          message: 'Agendamento não encontrado ou não pertence à empresa especificada'
        });
      }

      const payload = { ...body };
      // Remover empresa_id do payload (não deve ser atualizado)
      delete payload.empresa_id;
      
      if (payload.appointment_date) payload.appointment_date = Appointment.normalizeDate(payload.appointment_date);
      if (payload.appointment_time) payload.appointment_time = Appointment.normalizeTime(payload.appointment_time);

      // CRÍTICO: Passar empresa_id para validação de conflitos
      const updated = await appointment.update(payload, empresaIdInt);
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
  // Body deve conter empresa_id obrigatoriamente
  static async remove(req, res) {
    try {
      const { protocol, empresa_id } = req.body;

      if (!protocol) {
        return res.status(400).json({
          success: false,
          error: 'Protocolo é obrigatório'
        });
      }

      const empresaIdInt = parseInt(empresa_id || req.empresa?.id);
      if (isNaN(empresaIdInt)) {
        return res.status(400).json({
          success: false,
          error: 'empresa_id obrigatório',
          message: 'empresa_id não encontrado no body nem na autenticação'
        });
      }

      // CRÍTICO: Buscar agendamento apenas se pertencer à empresa especificada
      const appointment = await Appointment.findByProtocol(protocol, empresaIdInt);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado',
          message: 'Agendamento não encontrado ou não pertence à empresa especificada'
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








