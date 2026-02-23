const { query } = require('../config/database');

/**
 * Serviço de Logging do Sistema
 * Registra todas as ações importantes realizadas na plataforma
 */
class LogService {
  /**
   * Registra uma ação no sistema
   * @param {Object} options - Opções do log
   * @param {string} options.action - Tipo de ação (create_user, update_user, etc.)
   * @param {string} options.entity_type - Tipo de entidade (user, appointment, etc.)
   * @param {number} options.entity_id - ID da entidade afetada (opcional)
   * @param {Object} options.user - Usuário que realizou a ação { id, name, email }
   * @param {string} options.description - Descrição da ação
   * @param {Object} options.details - Detalhes adicionais (opcional)
   * @param {Object} options.req - Request object para extrair IP e User-Agent (opcional)
   */
  static async log(options) {
    try {
      const {
        action,
        entity_type,
        entity_id = null,
        user,
        description,
        details = null,
        req = null
      } = options;

      if (!action || !entity_type || !user || !description) {
        console.warn('⚠️ LogService: Parâmetros obrigatórios faltando', { action, entity_type, user, description });
        return;
      }

      // Extrair IP e User-Agent do request se disponível
      let ip_address = null;
      let user_agent = null;
      
      if (req) {
        ip_address = req.ip || 
                    req.headers['x-forwarded-for']?.split(',')[0] || 
                    req.connection?.remoteAddress || 
                    null;
        user_agent = req.headers['user-agent'] || null;
      }

      // Preparar detalhes como JSON string
      let detailsJson = null;
      if (details) {
        try {
          detailsJson = JSON.stringify(details);
        } catch (e) {
          console.warn('⚠️ Erro ao serializar detalhes do log:', e);
        }
      }

      // Inserir log no banco de dados
      const insertQuery = `
        INSERT INTO system_logs 
        (action, entity_type, entity_id, user_id, user_name, user_email, description, details, ip_address, user_agent, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      `;

      await query(insertQuery, [
        action,
        entity_type,
        entity_id,
        user.id,
        user.name || null,
        user.email || null,
        description,
        detailsJson,
        ip_address,
        user_agent
      ]);

      console.log(`📝 Log registrado: ${action} - ${description}`);
    } catch (error) {
      // Não lançar erro para não quebrar o fluxo principal
      // Apenas logar no console
      console.error('❌ Erro ao registrar log:', error);
      console.error('❌ Detalhes do log que falhou:', options);
    }
  }

  /**
   * Métodos auxiliares para ações comuns
   */
  
  static async logUserCreation(user, createdUser, req = null) {
    await this.log({
      action: 'create_user',
      entity_type: 'user',
      entity_id: createdUser.id,
      user,
      description: `Usuário criado: ${createdUser.name} (${createdUser.email}) com role ${createdUser.role}`,
      details: {
        created_user_id: createdUser.id,
        created_user_name: createdUser.name,
        created_user_email: createdUser.email,
        created_user_role: createdUser.role
      },
      req
    });
  }

  static async logUserUpdate(user, updatedUser, changes, req = null) {
    await this.log({
      action: 'update_user',
      entity_type: 'user',
      entity_id: updatedUser.id,
      user,
      description: `Usuário atualizado: ${updatedUser.name} (${updatedUser.email})`,
      details: {
        updated_user_id: updatedUser.id,
        changes: changes
      },
      req
    });
  }

  static async logUserDeletion(user, deletedUser, req = null) {
    await this.log({
      action: 'delete_user',
      entity_type: 'user',
      entity_id: deletedUser.id,
      user,
      description: `Usuário deletado: ${deletedUser.name} (${deletedUser.email})`,
      details: {
        deleted_user_id: deletedUser.id,
        deleted_user_name: deletedUser.name,
        deleted_user_email: deletedUser.email
      },
      req
    });
  }

  static async logPasswordChange(user, targetUser, req = null) {
    await this.log({
      action: 'change_password',
      entity_type: 'user',
      entity_id: targetUser.id,
      user,
      description: `Senha alterada para usuário: ${targetUser.name} (${targetUser.email})`,
      details: {
        target_user_id: targetUser.id,
        target_user_name: targetUser.name,
        target_user_email: targetUser.email
      },
      req
    });
  }

  static async logAppointmentCreation(user, appointment, req = null) {
    await this.log({
      action: 'create_appointment',
      entity_type: 'appointment',
      entity_id: appointment.id,
      user,
      description: `Agendamento criado: ${appointment.customer_name} para ${appointment.appointment_date} às ${appointment.appointment_time}`,
      details: {
        appointment_id: appointment.id,
        customer_name: appointment.customer_name,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        service_type: appointment.service_type
      },
      req
    });
  }

  static async logAppointmentUpdate(user, appointment, changes, req = null) {
    await this.log({
      action: 'update_appointment',
      entity_type: 'appointment',
      entity_id: appointment.id,
      user,
      description: `Agendamento atualizado: ${appointment.customer_name} (ID: ${appointment.id})`,
      details: {
        appointment_id: appointment.id,
        changes: changes
      },
      req
    });
  }

  static async logAppointmentDeletion(user, appointment, req = null) {
    await this.log({
      action: 'delete_appointment',
      entity_type: 'appointment',
      entity_id: appointment.id,
      user,
      description: `Agendamento deletado: ${appointment.customer_name} (ID: ${appointment.id})`,
      details: {
        appointment_id: appointment.id,
        customer_name: appointment.customer_name,
        appointment_date: appointment.appointment_date
      },
      req
    });
  }

  static async logSettingsUpdate(user, settings, req = null) {
    await this.log({
      action: 'update_settings',
      entity_type: 'settings',
      entity_id: user.id,
      user,
      description: `Configurações da empresa atualizadas`,
      details: {
        company_name: settings.company_name,
        services_count: settings.services?.length || 0,
        working_days: settings.working_days,
        working_hours: settings.working_hours
      },
      req
    });
  }

  static async logLogin(user, req = null) {
    await this.log({
      action: 'login',
      entity_type: 'auth',
      entity_id: user.id,
      user,
      description: `Login realizado: ${user.name} (${user.email})`,
      details: {
        user_id: user.id,
        role: user.role
      },
      req
    });
  }

  static async logLogout(user, req = null) {
    await this.log({
      action: 'logout',
      entity_type: 'auth',
      entity_id: user.id,
      user,
      description: `Logout realizado: ${user.name} (${user.email})`,
      details: {
        user_id: user.id
      },
      req
    });
  }
}

module.exports = LogService;









