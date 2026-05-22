const axios = require('axios');
const { query } = require('../config/database');

const BASE_URL = () => process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const API_KEY  = () => process.env.EVOLUTION_API_KEY;

function isConfigured() {
  return !!(BASE_URL() && API_KEY());
}

function instanceName(empresaId) {
  return `empresa_${empresaId}`;
}

function headers() {
  return { apikey: API_KEY(), 'Content-Type': 'application/json' };
}

async function evolutionGet(path) {
  const res = await axios.get(`${BASE_URL()}${path}`, { headers: headers(), timeout: 10000 });
  return res.data;
}

async function evolutionPost(path, body = {}) {
  const res = await axios.post(`${BASE_URL()}${path}`, body, { headers: headers(), timeout: 15000 });
  return res.data;
}

async function evolutionDelete(path) {
  const res = await axios.delete(`${BASE_URL()}${path}`, { headers: headers(), timeout: 10000 });
  return res.data;
}

async function upsertSession(empresaId, fields) {
  const dialect = require('../config/database').sequelize?.getDialect?.() || 'sqlite';
  const existing = await query('SELECT id FROM whatsapp_sessions WHERE empresa_id = $1', [empresaId]);
  const now = new Date().toISOString();

  if (existing.rows && existing.rows.length > 0) {
    const sets = Object.keys(fields).map((k, i) => `${k} = $${i + 2}`).join(', ');
    await query(
      `UPDATE whatsapp_sessions SET ${sets}, updated_at = $${Object.keys(fields).length + 2} WHERE empresa_id = $1`,
      [empresaId, ...Object.values(fields), now]
    );
  } else {
    const cols = ['empresa_id', 'instance_name', ...Object.keys(fields), 'created_at', 'updated_at'];
    const vals = [empresaId, instanceName(empresaId), ...Object.values(fields), now, now];
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    await query(
      `INSERT INTO whatsapp_sessions (${cols.join(', ')}) VALUES (${placeholders})`,
      vals
    );
  }
}

async function getSession(empresaId) {
  const res = await query('SELECT * FROM whatsapp_sessions WHERE empresa_id = $1', [empresaId]);
  return res.rows?.[0] || null;
}

async function createInstance(empresaId, backendUrl) {
  if (!isConfigured()) throw new Error('Evolution API não configurada. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY no .env');

  const name = instanceName(empresaId);
  const webhookUrl = backendUrl
    ? `${backendUrl}/api/whatsapp/webhook/${empresaId}`
    : null;

  try {
    const payload = {
      instanceName: name,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      ...(webhookUrl && {
        webhook: {
          url: webhookUrl,
          byEvents: true,
          base64: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']
        }
      })
    };

    const data = await evolutionPost('/instance/create', payload);

    await upsertSession(empresaId, {
      status: 'connecting',
      qr_code: data.qrcode?.base64 || null
    });

    return { success: true, instanceName: name, qrCode: data.qrcode?.base64 || null };
  } catch (err) {
    if (err.response?.status === 409 || err.response?.data?.message?.includes('already')) {
      return connectInstance(empresaId);
    }
    throw err;
  }
}

async function connectInstance(empresaId) {
  const name = instanceName(empresaId);
  try {
    const data = await evolutionGet(`/instance/connect/${name}`);
    const qr = data.base64 || data.qrcode?.base64 || null;
    await upsertSession(empresaId, { status: 'connecting', qr_code: qr });
    return { success: true, instanceName: name, qrCode: qr };
  } catch (err) {
    throw new Error(`Falha ao reconectar instância: ${err.response?.data?.message || err.message}`);
  }
}

async function getStatus(empresaId) {
  if (!isConfigured()) {
    const session = await getSession(empresaId);
    return { configured: false, status: session?.status || 'disconnected', session };
  }

  const name = instanceName(empresaId);
  try {
    const data = await evolutionGet(`/instance/connectionState/${name}`);
    const status = mapStatus(data.instance?.state || data.state);
    await upsertSession(empresaId, { status, last_activity: new Date().toISOString() });
    const session = await getSession(empresaId);
    return { configured: true, status, session };
  } catch (err) {
    if (err.response?.status === 404) {
      return { configured: true, status: 'disconnected', session: await getSession(empresaId) };
    }
    throw err;
  }
}

async function getQRCode(empresaId) {
  if (!isConfigured()) throw new Error('Evolution API não configurada');

  const name = instanceName(empresaId);
  try {
    const data = await evolutionGet(`/instance/connect/${name}`);
    const qr = data.base64 || data.qrcode?.base64 || null;
    if (qr) {
      await upsertSession(empresaId, { qr_code: qr, status: 'connecting' });
    }
    return qr;
  } catch (err) {
    const session = await getSession(empresaId);
    return session?.qr_code || null;
  }
}

async function disconnect(empresaId) {
  const name = instanceName(empresaId);

  if (isConfigured()) {
    try {
      await evolutionDelete(`/instance/delete/${name}`);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.warn('[WhatsApp] Erro ao deletar instância na Evolution API:', err.message);
      }
    }
  }

  await query(
    `UPDATE whatsapp_sessions SET status = $1, phone_number = NULL, profile_name = NULL, qr_code = NULL, connected_at = NULL, updated_at = $2 WHERE empresa_id = $3`,
    ['disconnected', new Date().toISOString(), empresaId]
  );

  return { success: true };
}

async function sendText(empresaId, phone, text) {
  if (!isConfigured()) throw new Error('Evolution API não configurada');
  const name = instanceName(empresaId);
  const number = phone.replace(/\D/g, '');
  return evolutionPost(`/message/sendText/${name}`, { number, text });
}

async function processWebhookEvent(empresaId, event, data) {
  const now = new Date().toISOString();

  if (event === 'CONNECTION_UPDATE') {
    const state = data.state || data.instance?.state;
    const status = mapStatus(state);
    const fields = { status, last_activity: now };

    if (status === 'connected') {
      fields.connected_at = now;
      if (data.instance?.profileName) fields.profile_name = data.instance.profileName;
      if (data.instance?.wuid) fields.phone_number = data.instance.wuid.split('@')[0];
    } else if (status === 'disconnected') {
      fields.qr_code = null;
    }

    await upsertSession(empresaId, fields);
  }

  if (event === 'QRCODE_UPDATED') {
    const qr = data.qrcode?.base64 || data.base64 || null;
    if (qr) await upsertSession(empresaId, { qr_code: qr, status: 'connecting' });
  }

  if (event === 'MESSAGES_UPSERT') {
    const messages = Array.isArray(data.messages) ? data.messages : [data];
    for (const msg of messages) {
      if (!msg.key?.fromMe) {
        const from = msg.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
        const content = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || '[mídia]';

        await query(
          `INSERT INTO whatsapp_message_logs (empresa_id, message_id, from_number, content, direction, status, created_at)
           VALUES ($1, $2, $3, $4, 'inbound', 'received', $5)`,
          [empresaId, msg.key?.id || null, from, content, now]
        );
      }
    }
  }
}

function mapStatus(state) {
  if (!state) return 'disconnected';
  const s = state.toLowerCase();
  if (s === 'open') return 'connected';
  if (s === 'connecting' || s === 'qr') return 'connecting';
  if (s === 'close' || s === 'closed') return 'disconnected';
  return 'disconnected';
}

module.exports = {
  isConfigured,
  instanceName,
  getSession,
  createInstance,
  connectInstance,
  getStatus,
  getQRCode,
  disconnect,
  sendText,
  processWebhookEvent
};
