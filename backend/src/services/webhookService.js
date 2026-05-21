const crypto = require('crypto');
const axios = require('axios');

class WebhookService {

  static _buildPayload(event, data, empresaId) {
    return {
      event,
      timestamp: new Date().toISOString(),
      idempotency_key: crypto.randomUUID(),
      empresa_id: empresaId || null,
      source: 'Aevum',
      data,
    };
  }

  static _sign(payload) {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) return null;
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  static async _findIntegration(empresaId) {
    try {
      const { Integration } = require('../models');
      if (!Integration || typeof Integration.findOne !== 'function') return null;

      // Preferir configuração específica da empresa; cair para global (empresa_id = null)
      if (empresaId) {
        const specific = await Integration.findOne({
          where: { name: 'n8n', isActive: true, empresa_id: empresaId },
        });
        if (specific?.webhookUrl) return specific;
      }

      return await Integration.findOne({
        where: { name: 'n8n', isActive: true, empresa_id: null },
      });
    } catch (err) {
      console.warn('[WebhookService] Modelo Integration indisponível:', err.message);
      return null;
    }
  }

  static async triggerWebhook(event, data, empresaId) {
    const integration = await this._findIntegration(empresaId);

    if (!integration?.webhookUrl) return;

    const payload = this._buildPayload(event, data, empresaId);
    const signature = this._sign(payload);

    const headers = {
      'Content-Type': 'application/json',
      'X-Aevum-Event': event,
      'X-Idempotency-Key': payload.idempotency_key,
    };
    if (signature) headers['X-Webhook-Signature'] = signature;
    if (empresaId) headers['X-Empresa-Id'] = String(empresaId);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await axios.post(integration.webhookUrl, payload, {
          timeout: 8000,
          headers,
        });
        return;
      } catch (err) {
        const isLastAttempt = attempt === 3;
        const status = err.response?.status;
        const isRetryable = !status || status >= 500 || status === 429;

        if (isLastAttempt || !isRetryable) {
          console.error(`[WebhookService] Falhou definitivamente (${event}, empresa_id=${empresaId}):`, err.message);
          return;
        }

        await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }
  }

  // --- Helpers por evento ---

  static async onAppointmentCreated(appointment) {
    const data = appointment.toJSON ? appointment.toJSON() : appointment;
    return this.triggerWebhook('appointment_created', { appointment: data }, data.user_id || null);
  }

  static async onAppointmentUpdated(appointment) {
    const data = appointment.toJSON ? appointment.toJSON() : appointment;
    return this.triggerWebhook('appointment_updated', { appointment: data }, data.user_id || null);
  }

  static async onAppointmentDeleted(appointmentId, empresaId) {
    return this.triggerWebhook('appointment_deleted', { appointmentId }, empresaId || null);
  }

  static async onAppointmentCancelled(appointment) {
    const data = appointment.toJSON ? appointment.toJSON() : appointment;
    return this.triggerWebhook('appointment_cancelled', { appointment: data }, data.user_id || null);
  }
}

module.exports = WebhookService;
