// Serviço de integração com Cloud Chat API
// Documentação: https://new.clouddchat.com/#/docs

class CloudChatService {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  loadConfig() {
    // Em produção, isso viria do banco de dados ou variáveis de ambiente
    // Por enquanto, simulamos com valores padrão
    this.config = {
      apiKey: process.env.CLOUDCHAT_API_KEY || '',
      baseUrl: process.env.CLOUDCHAT_BASE_URL || 'https://api.clouddchat.com',
      instanceId: process.env.CLOUDCHAT_INSTANCE_ID || '',
      webhookToken: process.env.CLOUDCHAT_WEBHOOK_TOKEN || '',
      autoReply: process.env.CLOUDCHAT_AUTO_REPLY === 'true'
    };

    console.log('🔧 Cloud Chat config carregado:', {
      baseUrl: this.config.baseUrl,
      hasApiKey: !!this.config.apiKey,
      hasInstanceId: !!this.config.instanceId
    });
  }

  // Atualizar configuração em tempo real
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('🔄 Configuração Cloud Chat atualizada');
  }

  // Testar conexão com a API
  async testConnection() {
    try {
      console.log('🔍 Testando conexão com Cloud Chat API...');

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Aevum/1.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        console.log('✅ Cloud Chat API conectado com sucesso');
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Falha na conexão com Cloud Chat API:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Enviar mensagem de texto
  async sendMessage(to, message, options = {}) {
    try {
      if (!this.config.apiKey) {
        throw new Error('API Key não configurada');
      }

      console.log(`📤 Enviando mensagem para ${to}: "${message.substring(0, 50)}..."`);

      const payload = {
        to: to,
        message: message,
        type: 'text',
        ...options
      };

      // Adicionar instance_id se configurado
      if (this.config.instanceId) {
        payload.instance_id = this.config.instanceId;
      }

      const response = await fetch(`${this.config.baseUrl}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Aevum/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();

      console.log('✅ Mensagem enviada com sucesso:', result.message_id);
      return {
        success: true,
        messageId: result.message_id,
        status: result.status,
        data: result
      };

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Enviar mensagem com agendamento confirmado
  async sendAppointmentConfirmation(phone, appointment) {
    const message = `✅ *Agendamento Confirmado!*

📅 *Data:* ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${appointment.appointment_time}
👤 *Cliente:* ${appointment.customer_name}
📝 *Serviço:* Consulta
📍 *Local:* Nossa clínica

*Observações:* ${appointment.notes || 'Nenhuma'}

Obrigado por escolher nossos serviços!
Em caso de dúvidas, entre em contato.`;

    return await this.sendMessage(phone, message, {
      priority: 'high',
      tags: ['appointment', 'confirmation']
    });
  }

  // Enviar lembrete de agendamento
  async sendAppointmentReminder(phone, appointment) {
    const message = `🔔 *Lembrete de Agendamento*

Olá ${appointment.customer_name}!

Seu agendamento está próximo:
📅 *Data:* ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${appointment.appointment_time}

Por favor, chegue 15 minutos antes.
Em caso de imprevistos, nos avise.

Até breve! 👋`;

    return await this.sendMessage(phone, message, {
      priority: 'normal',
      tags: ['appointment', 'reminder']
    });
  }

  // Enviar cancelamento de agendamento
  async sendAppointmentCancellation(phone, appointment) {
    const message = `❌ *Agendamento Cancelado*

Olá ${appointment.customer_name},

Seu agendamento foi cancelado:
📅 *Data:* ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${appointment.appointment_time}

Se precisar reagendar, entre em contato conosco.

Atenciosamente,
Equipe Aevum`;

    return await this.sendMessage(phone, message, {
      priority: 'normal',
      tags: ['appointment', 'cancellation']
    });
  }

  // Processar mensagem recebida (webhook)
  async processIncomingMessage(messageData) {
    try {
      const { message, from, chat_id, timestamp } = messageData;

      console.log(`💬 Processando mensagem de ${from}: "${message}"`);

      // Aqui você pode implementar lógica de IA ou regras simples
      const response = await this.generateResponse(message, from);

      // Se auto-reply estiver habilitado, enviar resposta automática
      if (this.config.autoReply && response) {
        await this.sendMessage(from, response, {
          chat_id: chat_id,
          tags: ['auto_reply']
        });
      }

      return {
        success: true,
        processed: true,
        response: response,
        needsHuman: this.needsHumanIntervention(message)
      };

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Gerar resposta automática simples
  async generateResponse(message, from) {
    const msg = message.toLowerCase();

    // Respostas básicas
    if (msg.includes('oi') || msg.includes('olá') || msg.includes('bom dia')) {
      return `Olá! 👋 Sou o assistente do Aevum. Como posso ajudar você hoje?`;
    }

    if (msg.includes('agendar') || msg.includes('marcar') || msg.includes('consulta')) {
      return `Para agendar uma consulta, preciso de algumas informações:

📅 Qual data você gostaria?
🕐 Qual horário?
👤 Seu nome completo?
📞 Seu telefone?

Ou você pode acessar nosso sistema online: [link]`;
    }

    if (msg.includes('horario') || msg.includes('horário') || msg.includes('disponivel')) {
      return `Para verificar horários disponíveis, acesse nosso sistema online ou me informe a data desejada.

📅 Horário comercial: 8h às 18h
📞 Ou ligue para agendar diretamente.`;
    }

    if (msg.includes('obrigado') || msg.includes('valeu')) {
      return `De nada! 😊 Estamos sempre à disposição.`;
    }

    // Se não conseguiu identificar, pede mais informações
    return `Desculpe, não entendi completamente sua mensagem. Você pode ser mais específico?

Por exemplo:
• "Quero agendar uma consulta"
• "Quais horários disponíveis amanhã?"
• "Como funciona o agendamento?"

Ou acesse nosso sistema online para mais opções.`;
  }

  // Verificar se precisa intervenção humana
  needsHumanIntervention(message) {
    const msg = message.toLowerCase();

    // Casos que precisam de atenção humana
    const complexKeywords = [
      'reclamação', 'problema', 'cancelar', 'alterar',
      'urgente', 'emergencia', 'atendente', 'falar com pessoa'
    ];

    return complexKeywords.some(keyword => msg.includes(keyword));
  }

  // Obter status da conta/instância
  async getAccountStatus() {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/account`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Listar conversas recentes
  async getRecentChats(limit = 10) {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/chats?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CloudChatService();
// Documentação: https://new.clouddchat.com/#/docs

class CloudChatService {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  loadConfig() {
    // Em produção, isso viria do banco de dados ou variáveis de ambiente
    // Por enquanto, simulamos com valores padrão
    this.config = {
      apiKey: process.env.CLOUDCHAT_API_KEY || '',
      baseUrl: process.env.CLOUDCHAT_BASE_URL || 'https://api.clouddchat.com',
      instanceId: process.env.CLOUDCHAT_INSTANCE_ID || '',
      webhookToken: process.env.CLOUDCHAT_WEBHOOK_TOKEN || '',
      autoReply: process.env.CLOUDCHAT_AUTO_REPLY === 'true'
    };

    console.log('🔧 Cloud Chat config carregado:', {
      baseUrl: this.config.baseUrl,
      hasApiKey: !!this.config.apiKey,
      hasInstanceId: !!this.config.instanceId
    });
  }

  // Atualizar configuração em tempo real
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('🔄 Configuração Cloud Chat atualizada');
  }

  // Testar conexão com a API
  async testConnection() {
    try {
      console.log('🔍 Testando conexão com Cloud Chat API...');

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Aevum/1.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        console.log('✅ Cloud Chat API conectado com sucesso');
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Falha na conexão com Cloud Chat API:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Enviar mensagem de texto
  async sendMessage(to, message, options = {}) {
    try {
      if (!this.config.apiKey) {
        throw new Error('API Key não configurada');
      }

      console.log(`📤 Enviando mensagem para ${to}: "${message.substring(0, 50)}..."`);

      const payload = {
        to: to,
        message: message,
        type: 'text',
        ...options
      };

      // Adicionar instance_id se configurado
      if (this.config.instanceId) {
        payload.instance_id = this.config.instanceId;
      }

      const response = await fetch(`${this.config.baseUrl}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Aevum/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();

      console.log('✅ Mensagem enviada com sucesso:', result.message_id);
      return {
        success: true,
        messageId: result.message_id,
        status: result.status,
        data: result
      };

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Enviar mensagem com agendamento confirmado
  async sendAppointmentConfirmation(phone, appointment) {
    const message = `✅ *Agendamento Confirmado!*

📅 *Data:* ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${appointment.appointment_time}
👤 *Cliente:* ${appointment.customer_name}
📝 *Serviço:* Consulta
📍 *Local:* Nossa clínica

*Observações:* ${appointment.notes || 'Nenhuma'}

Obrigado por escolher nossos serviços!
Em caso de dúvidas, entre em contato.`;

    return await this.sendMessage(phone, message, {
      priority: 'high',
      tags: ['appointment', 'confirmation']
    });
  }

  // Enviar lembrete de agendamento
  async sendAppointmentReminder(phone, appointment) {
    const message = `🔔 *Lembrete de Agendamento*

Olá ${appointment.customer_name}!

Seu agendamento está próximo:
📅 *Data:* ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${appointment.appointment_time}

Por favor, chegue 15 minutos antes.
Em caso de imprevistos, nos avise.

Até breve! 👋`;

    return await this.sendMessage(phone, message, {
      priority: 'normal',
      tags: ['appointment', 'reminder']
    });
  }

  // Enviar cancelamento de agendamento
  async sendAppointmentCancellation(phone, appointment) {
    const message = `❌ *Agendamento Cancelado*

Olá ${appointment.customer_name},

Seu agendamento foi cancelado:
📅 *Data:* ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${appointment.appointment_time}

Se precisar reagendar, entre em contato conosco.

Atenciosamente,
Equipe Aevum`;

    return await this.sendMessage(phone, message, {
      priority: 'normal',
      tags: ['appointment', 'cancellation']
    });
  }

  // Processar mensagem recebida (webhook)
  async processIncomingMessage(messageData) {
    try {
      const { message, from, chat_id, timestamp } = messageData;

      console.log(`💬 Processando mensagem de ${from}: "${message}"`);

      // Aqui você pode implementar lógica de IA ou regras simples
      const response = await this.generateResponse(message, from);

      // Se auto-reply estiver habilitado, enviar resposta automática
      if (this.config.autoReply && response) {
        await this.sendMessage(from, response, {
          chat_id: chat_id,
          tags: ['auto_reply']
        });
      }

      return {
        success: true,
        processed: true,
        response: response,
        needsHuman: this.needsHumanIntervention(message)
      };

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Gerar resposta automática simples
  async generateResponse(message, from) {
    const msg = message.toLowerCase();

    // Respostas básicas
    if (msg.includes('oi') || msg.includes('olá') || msg.includes('bom dia')) {
      return `Olá! 👋 Sou o assistente do Aevum. Como posso ajudar você hoje?`;
    }

    if (msg.includes('agendar') || msg.includes('marcar') || msg.includes('consulta')) {
      return `Para agendar uma consulta, preciso de algumas informações:

📅 Qual data você gostaria?
🕐 Qual horário?
👤 Seu nome completo?
📞 Seu telefone?

Ou você pode acessar nosso sistema online: [link]`;
    }

    if (msg.includes('horario') || msg.includes('horário') || msg.includes('disponivel')) {
      return `Para verificar horários disponíveis, acesse nosso sistema online ou me informe a data desejada.

📅 Horário comercial: 8h às 18h
📞 Ou ligue para agendar diretamente.`;
    }

    if (msg.includes('obrigado') || msg.includes('valeu')) {
      return `De nada! 😊 Estamos sempre à disposição.`;
    }

    // Se não conseguiu identificar, pede mais informações
    return `Desculpe, não entendi completamente sua mensagem. Você pode ser mais específico?

Por exemplo:
• "Quero agendar uma consulta"
• "Quais horários disponíveis amanhã?"
• "Como funciona o agendamento?"

Ou acesse nosso sistema online para mais opções.`;
  }

  // Verificar se precisa intervenção humana
  needsHumanIntervention(message) {
    const msg = message.toLowerCase();

    // Casos que precisam de atenção humana
    const complexKeywords = [
      'reclamação', 'problema', 'cancelar', 'alterar',
      'urgente', 'emergencia', 'atendente', 'falar com pessoa'
    ];

    return complexKeywords.some(keyword => msg.includes(keyword));
  }

  // Obter status da conta/instância
  async getAccountStatus() {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/account`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Listar conversas recentes
  async getRecentChats(limit = 10) {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/chats?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CloudChatService();




