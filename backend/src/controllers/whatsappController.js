const whatsapp = require('../services/whatsappService');
const ai = require('../services/aiAssistantService');
const { query } = require('../config/database');

function getEmpresaId(req) {
  const user = req.user;
  if (user.role === 'moderator') return user.id;
  return user.empresa_id || user.parent_user_id;
}

function getBackendUrl(req) {
  const host = req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol;
  return process.env.BACKEND_URL || `${proto}://${host}`;
}

class WhatsAppController {

  static async getStatus(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const result = await whatsapp.getStatus(empresaId);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[WhatsApp] getStatus error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async connect(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const backendUrl = getBackendUrl(req);
      const result = await whatsapp.createInstance(empresaId, backendUrl);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[WhatsApp] connect error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async reconnect(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const result = await whatsapp.connectInstance(empresaId);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[WhatsApp] reconnect error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getQRCode(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const qrCode = await whatsapp.getQRCode(empresaId);

      if (!qrCode) {
        const { status } = await whatsapp.getStatus(empresaId);
        return res.json({ success: true, qrCode: null, status });
      }

      res.json({ success: true, qrCode });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async disconnect(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      await whatsapp.disconnect(empresaId);
      res.json({ success: true, message: 'WhatsApp desconectado com sucesso' });
    } catch (err) {
      console.error('[WhatsApp] disconnect error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getMessages(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const result = await query(
        'SELECT * FROM whatsapp_message_logs WHERE empresa_id = $1 ORDER BY created_at DESC LIMIT $2',
        [empresaId, limit]
      );
      res.json({ success: true, messages: result.rows || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async sendMessage(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const { phone, message } = req.body;

      if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'phone e message são obrigatórios' });
      }

      const result = await whatsapp.sendText(empresaId, phone, message);

      await query(
        `INSERT INTO whatsapp_message_logs (empresa_id, to_number, content, direction, status, created_at)
         VALUES ($1, $2, $3, 'outbound', 'sent', $4)`,
        [empresaId, phone, message, new Date().toISOString()]
      );

      res.json({ success: true, result });
    } catch (err) {
      console.error('[WhatsApp] sendMessage error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Webhook recebido da Evolution API — sem autenticação JWT (chamado pelo Evolution)
  static async webhook(req, res) {
    try {
      const empresaId = parseInt(req.params.empresaId);
      if (!empresaId || isNaN(empresaId)) {
        return res.status(400).json({ error: 'empresaId inválido' });
      }

      const event = req.body.event || req.headers['x-evolution-event'];
      const data = req.body.data || req.body;

      await whatsapp.processWebhookEvent(empresaId, event, data);

      // Processar mensagem recebida com IA
      if (event === 'MESSAGES_UPSERT') {
        const messages = Array.isArray(data.messages) ? data.messages : [data];
        for (const msg of messages) {
          if (!msg.key?.fromMe) {
            const fromNumber = msg.key?.remoteJid?.replace('@s.whatsapp.net', '');
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

            if (fromNumber && text) {
              try {
                const aiResult = await ai.processMessage(empresaId, fromNumber, text);
                if (aiResult?.response) {
                  await whatsapp.sendText(empresaId, fromNumber, aiResult.response);

                  await query(
                    `UPDATE whatsapp_message_logs SET ai_processed = $1, ai_response = $2
                     WHERE empresa_id = $3 AND from_number = $4 AND direction = 'inbound'
                     ORDER BY created_at DESC LIMIT 1`,
                    [true, aiResult.response, empresaId, fromNumber]
                  );
                }
              } catch (aiErr) {
                console.warn('[WhatsApp] AI processing failed:', aiErr.message);
              }
            }
          }
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[WhatsApp] webhook error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = WhatsAppController;
