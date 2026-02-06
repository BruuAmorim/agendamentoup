const Appointment = require('../models/Appointment');
const WebhookService = require('../services/webhookService');
const LogService = require('../services/logService');

// Controller para operações de agendamento
class AppointmentController {

  // GET /api/appointments - Listar agendamentos com filtros
  async getAppointments(req, res) {
    try {
      const {
        customer_name,
        date,
        status,
        start_date,
        end_date,
        page = 1,
        limit = 50
      } = req.query;

      const filters = {};

      if (customer_name) filters.customer_name = customer_name;
      if (date) filters.date = date;
      if (status) filters.status = status;
      if (start_date && end_date) {
        filters.start_date = start_date;
        filters.end_date = end_date;
      }

      const appointments = await Appointment.find(filters);

      // Paginação
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedAppointments = appointments.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedAppointments.map(apt => apt.toJSON()),
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: appointments.length,
          total_pages: Math.ceil(appointments.length / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // GET /api/appointments/:id - Buscar agendamento específico
  async getAppointmentById(req, res) {
    try {
      const { id } = req.params;

      const appointment = await Appointment.findById(id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado'
        });
      }

      res.json({
        success: true,
        data: appointment.toJSON()
      });

    } catch (error) {
      console.error('Erro ao buscar agendamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // GET /api/appointments/available/:date - Buscar horários disponíveis
  async getAvailableSlots(req, res) {
    try {
      const { date } = req.params;
      const { duration = 60 } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Data é obrigatória'
        });
      }

      // Validar formato da data
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Formato de data inválido. Use YYYY-MM-DD'
        });
      }

      const availableSlots = await Appointment.getAvailableSlots(date, parseInt(duration));

      res.json({
        success: true,
        data: {
          date: date,
          available_slots: availableSlots
        }
      });

    } catch (error) {
      console.error('Erro ao buscar horários disponíveis:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // POST /api/appointments - Criar novo agendamento
  async createAppointment(req, res) {
    try {
      // Logs detalhados para debug de integrações externas (n8n)
      console.log('📅 ========================================');
      console.log('📅 createAppointment - Nova requisição');
      console.log('📅 ========================================');
      console.log('📅 Headers:', JSON.stringify(req.headers, null, 2));
      console.log('📅 Body recebido:', JSON.stringify(req.body, null, 2));
      console.log('📅 Content-Type:', req.headers['content-type']);
      console.log('📅 Origin:', req.headers.origin);
      console.log('📅 User-Agent:', req.headers['user-agent']);
      
      const appointmentData = req.body;
      
      // Validar se o body foi parseado corretamente
      if (!appointmentData || typeof appointmentData !== 'object') {
        console.error('❌ Body inválido ou não parseado:', appointmentData);
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'O corpo da requisição deve ser um JSON válido',
          received: typeof appointmentData
        });
      }

      console.log('📅 Dados processados:', appointmentData);
      
      // Identificar empresa do usuário logado (se disponível)
      let companyUserId = null;
      if (req.user) {
        // Se o usuário é empresa, usar seu próprio ID
        if (req.user.role === 'empresa' || req.user.role === 'moderator') {
          companyUserId = req.user.id;
          console.log('📅 Empresa identificada:', companyUserId);
        }
        // Se for funcionário, usar parent_user_id
        else if (req.user.role === 'user' && req.user.parent_user_id) {
          companyUserId = req.user.parent_user_id;
          console.log('📅 Empresa identificada via funcionário:', companyUserId);
        }
      }
      
      console.log('📅 Chamando Appointment.create...');
      
      let appointment;
      try {
        // Passar userId da empresa para validação usar configurações corretas
        appointment = await Appointment.create(appointmentData, companyUserId);
        console.log('✅ Agendamento criado com sucesso!');
      } catch (createError) {
        console.error('❌ Erro ao criar agendamento:', createError);
        
        // Tratar erros específicos
        if (createError.message && createError.message.includes('Horário indisponível')) {
          return res.status(409).json({
            success: false,
            error: 'Horário indisponível',
            message: createError.message
          });
        }
        
        if (createError.message && createError.message.includes('fora do expediente')) {
          return res.status(400).json({
            success: false,
            error: 'Horário fora do expediente',
            message: createError.message
          });
        }
        
        if (createError.message && createError.message.includes('Não atendemos')) {
          return res.status(400).json({
            success: false,
            error: 'Dia não disponível',
            message: createError.message
          });
        }
        
        // Re-lançar outros erros
        throw createError;
      }
      console.log('✅ ID:', appointment.id);
      console.log('✅ Protocolo:', appointment.protocol);
      console.log('✅ Cliente:', appointment.customer_name);
      console.log('✅ Data/Hora:', appointment.appointment_date, appointment.appointment_time);

      // Registrar log
      if (req.user) {
        await LogService.logAppointmentCreation(req.user, appointment.toJSON(), req);
      }

      // Disparar webhook para n8n (assíncrono, não bloqueia a resposta)
      WebhookService.onAppointmentCreated(appointment).catch(err => {
        console.error('⚠️ Erro ao disparar webhook de criação:', err);
      });

      // Retornar resposta padronizada com status 201 Created
      const response = {
        success: true,
        message: 'Agendamento criado com sucesso',
        data: appointment.toJSON()
      };
      
      console.log('📤 Enviando resposta:', JSON.stringify(response, null, 2));
      
      res.status(201).json(response);

    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ Erro ao criar agendamento');
      console.error('❌ ========================================');
      console.error('❌ Erro:', error);
      console.error('❌ Stack:', error.stack);
      console.error('❌ Mensagem:', error.message);
      console.error('❌ Body recebido:', JSON.stringify(req.body, null, 2));

      // Tratar erros de validação com status 400
      if (error.message.includes('Dados inválidos') ||
          error.message.includes('obrigatório') ||
          error.message.includes('inválido') ||
          error.message.includes('fora do expediente') ||
          error.message.includes('Não atendemos')) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: error.message,
          received_data: req.body
        });
      }
      
      // Tratar conflito de horário com status 409
      if (error.message.includes('Horário indisponível') ||
          error.message.includes('conflito')) {
        return res.status(409).json({
          success: false,
          error: 'Horário indisponível',
          message: error.message
        });
      }

      // Erros internos com status 500
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // PUT /api/appointments/:id - Atualizar agendamento
  async updateAppointment(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const appointment = await Appointment.findById(id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado'
        });
      }

      const oldData = appointment.toJSON();
      const updatedAppointment = await appointment.update(updateData);
      const newData = updatedAppointment.toJSON();

      // Registrar log
      if (req.user) {
        const changes = {};
        Object.keys(updateData).forEach(key => {
          if (oldData[key] !== newData[key]) {
            changes[key] = { from: oldData[key], to: newData[key] };
          }
        });
        await LogService.logAppointmentUpdate(req.user, newData, changes, req);
      }

      // Disparar webhook para n8n (assíncrono, não bloqueia a resposta)
      WebhookService.onAppointmentUpdated(updatedAppointment).catch(err => {
        console.error('Erro ao disparar webhook de atualização:', err);
      });

      res.json({
        success: true,
        message: 'Agendamento atualizado com sucesso',
        data: updatedAppointment.toJSON()
      });

    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);

      if (error.message.includes('Dados inválidos') ||
          error.message.includes('Novo horário indisponível')) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // PUT /api/appointments/:id/cancel - Cancelar agendamento
  async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const appointment = await Appointment.findById(id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado'
        });
      }

      if (appointment.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          error: 'Agendamento já está cancelado'
        });
      }

      const cancelledAppointment = await appointment.cancel(reason);

      // Disparar webhook para n8n (assíncrono, não bloqueia a resposta)
      WebhookService.onAppointmentCancelled(cancelledAppointment).catch(err => {
        console.error('Erro ao disparar webhook de cancelamento:', err);
      });

      res.json({
        success: true,
        message: 'Agendamento cancelado com sucesso',
        data: cancelledAppointment.toJSON()
      });

    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // DELETE /api/appointments/:id - Deletar agendamento
  async deleteAppointment(req, res) {
    try {
      const { id } = req.params;

      const appointment = await Appointment.findById(id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado'
        });
      }

      const appointmentData = appointment.toJSON();
      const appointmentId = appointment.id;
      await appointment.delete();

      // Registrar log
      if (req.user) {
        await LogService.logAppointmentDeletion(req.user, appointmentData, req);
      }

      // Disparar webhook para n8n (assíncrono, não bloqueia a resposta)
      WebhookService.onAppointmentDeleted(appointmentId).catch(err => {
        console.error('Erro ao disparar webhook de exclusão:', err);
      });

      res.json({
        success: true,
        message: 'Agendamento deletado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar agendamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // DELETE /api/appointments - Deletar agendamento por protocolo (protocolo no body)
  async deleteAppointmentByProtocolBody(req, res) {
    try {
      const { protocol } = req.body;

      if (!protocol) {
        return res.status(400).json({
          success: false,
          error: 'Protocolo é obrigatório'
        });
      }

      // Limpar o protocolo: remover espaços e converter para maiúsculo
      const cleanProtocol = protocol.trim().toUpperCase();

      console.log('🔍 Buscando agendamento com protocolo:', cleanProtocol);

      const appointment = await Appointment.findByProtocol(cleanProtocol);

      if (!appointment) {
        console.log('❌ Agendamento não encontrado com protocolo:', cleanProtocol);
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado com este protocolo',
          protocol_sent: protocol,
          protocol_cleaned: cleanProtocol
        });
      }

      const appointmentId = appointment.id;
      await appointment.delete();

      // Disparar webhook para n8n (assíncrono, não bloqueia a resposta)
      WebhookService.onAppointmentDeleted(appointmentId).catch(err => {
        console.error('Erro ao disparar webhook de exclusão:', err);
      });

      res.json({
        success: true,
        message: 'Agendamento deletado com sucesso',
        protocol: protocol
      });

    } catch (error) {
      console.error('Erro ao deletar agendamento por protocolo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // PUT /api/appointments - Atualizar agendamento por protocolo (protocolo no body)
  async updateAppointmentByProtocolBody(req, res) {
    try {
      const { protocol, date, time } = req.body;

      if (!protocol) {
        return res.status(400).json({
          success: false,
          error: 'Protocolo é obrigatório'
        });
      }

      // Limpar o protocolo: remover espaços e converter para maiúsculo
      const cleanProtocol = protocol.trim().toUpperCase();

      console.log('🔍 Buscando agendamento com protocolo:', cleanProtocol);

      const appointment = await Appointment.findByProtocol(cleanProtocol);

      if (!appointment) {
        console.log('❌ Agendamento não encontrado com protocolo:', cleanProtocol);
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado com este protocolo',
          protocol_sent: protocol,
          protocol_cleaned: cleanProtocol
        });
      }

      // Preparar os campos para atualização
      const updateData = {};

      // Validar e adicionar data se foi fornecida (não undefined)
      if (date !== undefined) {
        if (date === null) {
          // Se date for null, não atualiza (mantém valor antigo)
          console.log('📅 Data mantida (null enviado)');
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return res.status(400).json({
            success: false,
            error: 'Data deve estar no formato YYYY-MM-DD'
          });
        } else {
          updateData.appointment_date = date;
          console.log('📅 Data será atualizada para:', date);
        }
      }

      // Validar e adicionar hora se foi fornecida (não undefined)
      if (time !== undefined) {
        if (time === null) {
          // Se time for null, não atualiza (mantém valor antigo)
          console.log('⏰ Horário mantido (null enviado)');
        } else if (!/^\d{2}:\d{2}$/.test(time)) {
          return res.status(400).json({
            success: false,
            error: 'Horário deve estar no formato HH:MM'
          });
        } else {
          updateData.appointment_time = time;
          console.log('⏰ Horário será atualizado para:', time);
        }
      }

      // Se nenhum campo foi fornecido para atualização (todos null ou não enviados)
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Pelo menos um campo (date ou time) deve ser fornecido com valor válido para atualização'
        });
      }

      console.log('📝 Atualizando agendamento:', updateData);

      // Atualizar o agendamento
      const updatedAppointment = await appointment.update(updateData);

      // Disparar webhook para n8n (assíncrono, não bloqueia a resposta)
      WebhookService.onAppointmentUpdated(updatedAppointment.id).catch(err => {
        console.error('Erro ao disparar webhook de atualização:', err);
      });

      res.json({
        success: true,
        message: 'Agendamento atualizado com sucesso',
        data: updatedAppointment.toJSON()
      });

    } catch (error) {
      console.error('Erro ao atualizar agendamento por protocolo:', error);

      // Tratar erros específicos de conflito de horário
      if (error.message && error.message.includes('Horário indisponível')) {
        return res.status(409).json({
          success: false,
          error: 'Horário indisponível - conflito com outro agendamento',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // GET /api/appointments/disponibilidade - Consultar horários disponíveis
  async getDisponibilidade(req, res) {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Data é obrigatória (formato: YYYY-MM-DD)'
        });
      }

      // Validar formato da data
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          error: 'Data deve estar no formato YYYY-MM-DD'
        });
      }

      console.log('📅 Consultando disponibilidade para:', date);

      // Definir regras de negócio fixas
      const HORARIO_INICIO = 9;    // 09:00
      const HORARIO_FIM = 18;      // 18:00
      const ALMOÇO_INICIO = 12;    // 12:00
      const ALMOÇO_FIM = 13;       // 13:00
      const DURACAO_AGENDAMENTO = 60; // 1 hora por agendamento

      // Gerar lista de todos os horários possíveis (de hora em hora)
      const horariosPossiveis = [];
      for (let hora = HORARIO_INICIO; hora < HORARIO_FIM; hora++) {
        // Pular horário de almoço (12:00 - 13:00)
        if (hora >= ALMOÇO_INICIO && hora < ALMOÇO_FIM) {
          continue;
        }

        const horarioFormatado = `${hora.toString().padStart(2, '0')}:00`;
        horariosPossiveis.push(horarioFormatado);
      }

      console.log('🕐 Horários possíveis do dia:', horariosPossiveis);

      // Buscar agendamentos existentes nesta data
      const agendamentosExistentes = await Appointment.find({ date: date });

      console.log(`📋 Encontrados ${agendamentosExistentes.length} agendamentos para ${date}`);
      if (agendamentosExistentes.length > 0) {
        console.log('📅 Horários ocupados:', agendamentosExistentes.map(a => a.appointment_time));
      }

      // Filtrar horários ocupados (comparar horário por horário)
      const horariosLivres = horariosPossiveis.filter(horario => {
        // Verificar se há conflito com algum agendamento existente
        const conflito = agendamentosExistentes.some(agendamento => {
          return agendamento.appointment_time === horario;
        });

        return !conflito;
      });

      console.log(`✅ ${horariosLivres.length} horários disponíveis:`, horariosLivres);

      // Retorno simples conforme solicitado
      res.json({
        available_slots: horariosLivres
      });

    } catch (error) {
      console.error('Erro ao consultar disponibilidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // DELETE /api/appointments/protocol/:protocol - Deletar agendamento por protocolo
  async deleteAppointmentByProtocol(req, res) {
    try {
      const { protocol } = req.params;

      const appointment = await Appointment.findByProtocol(protocol);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado com este protocolo'
        });
      }

      const appointmentId = appointment.id;
      await appointment.delete();

      // Disparar webhook para n8n (assíncrono, não bloqueia a resposta)
      WebhookService.onAppointmentDeleted(appointmentId).catch(err => {
        console.error('Erro ao disparar webhook de exclusão:', err);
      });

      res.json({
        success: true,
        message: 'Agendamento deletado com sucesso',
        protocol: protocol
      });

    } catch (error) {
      console.error('Erro ao deletar agendamento por protocolo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // GET /api/appointments/stats/overview - Estatísticas gerais
  async getAppointmentStats(req, res) {
    try {
      const { start_date, end_date } = req.query;

      // Verificar se deve usar armazenamento em memória
      const useMemoryStorage = () => true; // Forçado para desenvolvimento

      let appointments;

      if (useMemoryStorage()) {
        // Usar armazenamento em memória
        const Appointment = require('../models/Appointment');
        appointments = Appointment.find ? await Appointment.find() : [];
      } else {
        // Usar PostgreSQL - implementação original seria aqui
        return res.status(500).json({
          success: false,
          error: 'Modo PostgreSQL não implementado para estatísticas'
        });
      }

      // Filtrar por período se especificado
      let filteredAppointments = appointments;
      if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        filteredAppointments = appointments.filter(apt => {
          const aptDate = new Date(apt.appointment_date);
          return aptDate >= start && aptDate <= end;
        });
      }

      // Calcular estatísticas
      const stats = {
        total_appointments: filteredAppointments.length,
        confirmed_appointments: filteredAppointments.filter(apt => apt.status === 'confirmed').length,
        pending_appointments: filteredAppointments.filter(apt => apt.status === 'pending').length,
        cancelled_appointments: filteredAppointments.filter(apt => apt.status === 'cancelled').length,
        completed_appointments: filteredAppointments.filter(apt => apt.status === 'completed').length
      };

      res.json({
        success: true,
        data: {
          ...stats,
          period: start_date && end_date ? { start_date, end_date } : 'all'
        }
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
}

module.exports = new AppointmentController();



