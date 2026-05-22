const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

// Map: empresaId → { socket, status, qrBase64, retryCount }
const sessions = new Map();

const SESSIONS_DIR = path.join(__dirname, '../../whatsapp-sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

function sessionDir(empresaId) {
  const dir = path.join(SESSIONS_DIR, String(empresaId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function upsertSession(empresaId, fields) {
  const existing = await query('SELECT id FROM whatsapp_sessions WHERE empresa_id = $1', [empresaId]);
  const now = new Date().toISOString();
  if (existing.rows?.length) {
    const sets = Object.keys(fields).map((k, i) => `${k} = $${i + 2}`).join(', ');
    await query(
      `UPDATE whatsapp_sessions SET ${sets}, updated_at = $${Object.keys(fields).length + 2} WHERE empresa_id = $1`,
      [empresaId, ...Object.values(fields), now]
    );
  } else {
    const cols = ['empresa_id', 'instance_name', ...Object.keys(fields), 'created_at', 'updated_at'];
    const vals = [empresaId, `empresa_${empresaId}`, ...Object.values(fields), now, now];
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    await query(`INSERT INTO whatsapp_sessions (${cols.join(', ')}) VALUES (${placeholders})`, vals);
  }
}

async function getSession(empresaId) {
  const res = await query('SELECT * FROM whatsapp_sessions WHERE empresa_id = $1', [empresaId]);
  return res.rows?.[0] || null;
}

async function connect(empresaId) {
  // Não criar segunda conexão se já existe socket ativo
  const existing = sessions.get(empresaId);
  if (existing?.socket && existing.status === 'connected') {
    return { status: 'connected' };
  }
  if (existing?.socket && existing.status === 'connecting') {
    return { status: 'connecting' };
  }

  await upsertSession(empresaId, { status: 'connecting', qr_code: null });
  sessions.set(empresaId, { socket: null, status: 'connecting', qrBase64: null, retryCount: 0 });

  _startSocket(empresaId);
  return { status: 'connecting' };
}

async function _startSocket(empresaId) {
  try {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir(empresaId));

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, require('pino')({ level: 'silent' }))
      },
      logger: require('pino')({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Cloudd Agenda', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    const sessionData = sessions.get(empresaId) || {};
    sessionData.socket = sock;
    sessions.set(empresaId, sessionData);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrBase64 = await QRCode.toDataURL(qr);
          const sess = sessions.get(empresaId) || {};
          sess.qrBase64 = qrBase64;
          sess.status = 'connecting';
          sessions.set(empresaId, sess);
          await upsertSession(empresaId, { status: 'connecting', qr_code: qrBase64 });
          emitter.emit(`qr:${empresaId}`, qrBase64);
          emitter.emit(`status:${empresaId}`, { status: 'connecting', qrCode: qrBase64 });
        } catch {}
      }

      if (connection === 'open') {
        const phone = sock.user?.id?.split(':')[0] || sock.user?.id?.split('@')[0] || '';
        const name  = sock.user?.name || '';
        const sess  = sessions.get(empresaId) || {};
        sess.status   = 'connected';
        sess.qrBase64 = null;
        sess.phone    = phone;
        sess.name     = name;
        sessions.set(empresaId, sess);
        await upsertSession(empresaId, {
          status: 'connected',
          phone_number: phone,
          profile_name: name,
          connected_at: new Date().toISOString(),
          qr_code: null
        });
        emitter.emit(`status:${empresaId}`, { status: 'connected', phone, name });
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        const sess = sessions.get(empresaId) || {};
        sess.status = 'disconnected';
        sess.socket = null;
        sessions.set(empresaId, sess);
        await upsertSession(empresaId, { status: 'disconnected', qr_code: null });
        emitter.emit(`status:${empresaId}`, { status: 'disconnected' });

        if (!loggedOut && (sess.retryCount || 0) < 3) {
          sess.retryCount = (sess.retryCount || 0) + 1;
          sessions.set(empresaId, sess);
          setTimeout(() => _startSocket(empresaId), 5000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const from = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
        const text = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || msg.message?.imageMessage?.caption
          || null;

        if (!from || !text) continue;

        try {
          await query(
            `INSERT INTO whatsapp_message_logs (empresa_id, message_id, from_number, content, direction, status, created_at)
             VALUES ($1, $2, $3, $4, 'inbound', 'received', $5)`,
            [empresaId, msg.key.id || null, from, text, new Date().toISOString()]
          );
        } catch {}

        // Processar com IA se configurado
        try {
          const ai = require('./aiAssistantService');
          const result = await ai.processMessage(empresaId, from, text);
          if (result?.response) {
            await sendText(empresaId, from, result.response);
            await query(
              `UPDATE whatsapp_message_logs SET ai_processed = $1, ai_response = $2
               WHERE empresa_id = $3 AND from_number = $4 AND direction = 'inbound'
               ORDER BY created_at DESC LIMIT 1`,
              [true, result.response, empresaId, from]
            );
          }
        } catch {}
      }
    });

  } catch (err) {
    console.error(`[Baileys] Erro ao iniciar socket empresa ${empresaId}:`, err.message);
    await upsertSession(empresaId, { status: 'disconnected' }).catch(() => {});
    emitter.emit(`status:${empresaId}`, { status: 'disconnected', error: err.message });
  }
}

async function disconnect(empresaId) {
  const sess = sessions.get(empresaId);
  if (sess?.socket) {
    try { await sess.socket.logout(); } catch {}
    try { sess.socket.end(undefined); } catch {}
  }
  sessions.delete(empresaId);

  // Limpar arquivos de sessão
  const dir = path.join(SESSIONS_DIR, String(empresaId));
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  await upsertSession(empresaId, {
    status: 'disconnected',
    phone_number: null,
    profile_name: null,
    qr_code: null,
    connected_at: null
  });

  emitter.emit(`status:${empresaId}`, { status: 'disconnected' });
  return { success: true };
}

async function getStatus(empresaId) {
  const inMem = sessions.get(empresaId);
  const dbSession = await getSession(empresaId);
  const status = inMem?.status || dbSession?.status || 'disconnected';
  return { status, session: dbSession, inMemory: !!inMem };
}

function getCurrentQR(empresaId) {
  return sessions.get(empresaId)?.qrBase64 || null;
}

async function sendText(empresaId, phone, text) {
  const sess = sessions.get(empresaId);
  if (!sess?.socket || sess.status !== 'connected') {
    throw new Error('WhatsApp não está conectado');
  }
  const jid = phone.replace(/\D/g, '') + '@s.whatsapp.net';
  await sess.socket.sendMessage(jid, { text });
  await query(
    `INSERT INTO whatsapp_message_logs (empresa_id, to_number, content, direction, status, created_at)
     VALUES ($1, $2, $3, 'outbound', 'sent', $4)`,
    [empresaId, phone, text, new Date().toISOString()]
  );
}

// Reconectar sessões ativas ao reiniciar o servidor
async function restoreActiveSessions() {
  try {
    const res = await query(
      "SELECT empresa_id FROM whatsapp_sessions WHERE status = 'connected'",
      []
    );
    for (const row of res.rows || []) {
      const dir = path.join(SESSIONS_DIR, String(row.empresa_id));
      if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
        console.log(`[Baileys] Restaurando sessão empresa ${row.empresa_id}...`);
        sessions.set(row.empresa_id, { socket: null, status: 'connecting', qrBase64: null, retryCount: 0 });
        _startSocket(row.empresa_id);
      } else {
        await upsertSession(row.empresa_id, { status: 'disconnected' }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[Baileys] Erro ao restaurar sessões:', err.message);
  }
}

module.exports = { connect, disconnect, getStatus, getCurrentQR, sendText, getSession, emitter, restoreActiveSessions };
