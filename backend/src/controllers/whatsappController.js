const baileys = require('../services/whatsappBaileysService');
const { query } = require('../config/database');

function getEmpresaId(req) {
  const u = req.user;
  if (u.role === 'moderator') return u.id;
  return u.empresa_id || u.parent_user_id;
}

class WhatsAppController {

  static async getStatus(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const result = await baileys.getStatus(empresaId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async connect(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const result = await baileys.connect(empresaId);
      res.json({ success: true, ...result });
    } catch (err) {
      const isServerlessError = err.message?.includes('serverless') || err.message?.includes('Vercel');
      res.status(isServerlessError ? 503 : 500).json({ success: false, error: err.message, serverless: isServerlessError });
    }
  }

  static async reconnect(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      await baileys.disconnect(empresaId);
      const result = await baileys.connect(empresaId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async disconnect(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      await baileys.disconnect(empresaId);
      res.json({ success: true, message: 'WhatsApp desconectado com sucesso' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // SSE — streaming de QR code e status em tempo real
  static async qrStream(req, res) {
    const u = req.user;
    const empresaId = u.role === 'moderator' ? u.id : (u.empresa_id || u.parent_user_id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (event, data) => {
      try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
    };

    // Enviar estado atual imediatamente
    const current = await baileys.getStatus(empresaId);
    send('status', { status: current.status });
    const qr = baileys.getCurrentQR(empresaId);
    if (qr) send('qr', { qrCode: qr });

    // Listener de novos QRs
    const onQR = (qrBase64) => send('qr', { qrCode: qrBase64 });
    const onStatus = (data) => send('status', data);

    baileys.emitter.on(`qr:${empresaId}`, onQR);
    baileys.emitter.on(`status:${empresaId}`, onStatus);

    // Heartbeat a cada 25s para manter a conexão SSE viva
    const heartbeat = setInterval(() => {
      try { res.write(': ping\n\n'); } catch {}
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      baileys.emitter.off(`qr:${empresaId}`, onQR);
      baileys.emitter.off(`status:${empresaId}`, onStatus);
    });
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
      await baileys.sendText(empresaId, phone, message);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = WhatsAppController;
