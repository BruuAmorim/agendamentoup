const axios = require('axios');
const { query } = require('../config/database');

async function getConfig(empresaId) {
  const res = await query('SELECT * FROM ai_assistant_config WHERE empresa_id = $1', [empresaId]);
  return res.rows?.[0] || null;
}

async function isWithinServiceHours(config) {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = days[now.getDay()];

  let serviceDays = config.service_days;
  if (typeof serviceDays === 'string') {
    try { serviceDays = JSON.parse(serviceDays); } catch { serviceDays = []; }
  }

  if (!serviceDays.includes(todayKey)) return false;

  const [startH, startM] = (config.service_hours_start || '08:00').split(':').map(Number);
  const [endH, endM] = (config.service_hours_end || '18:00').split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  return nowMins >= startMins && nowMins < endMins;
}

async function buildSystemPrompt(empresaId, config) {
  if (config.system_prompt) return config.system_prompt;

  const settingsRes = await query(
    'SELECT company_name, services FROM moderator_settings WHERE user_id = $1',
    [empresaId]
  );
  const settings = settingsRes.rows?.[0];
  const companyName = settings?.company_name || 'nossa empresa';

  let services = [];
  try {
    const raw = settings?.services;
    services = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
  } catch {}

  const serviceList = services.length
    ? services.map(s => `- ${s.name || s}${s.duration ? ` (${s.duration} min)` : ''}${s.price ? `, R$ ${s.price}` : ''}`).join('\n')
    : '(consulte a recepção para detalhes)';

  return `Você é ${config.assistant_name || 'o assistente virtual'} de ${companyName}.

SUAS RESPONSABILIDADES:
- Responder perguntas sobre serviços, horários e agendamentos
- Ajudar clientes a marcar, confirmar, remarcar ou cancelar consultas
- Ser cordial, objetivo e humanizado

SERVIÇOS DISPONÍVEIS:
${serviceList}

REGRAS IMPORTANTES:
- NUNCA invente horários, serviços ou preços
- NUNCA confirme agendamentos sem verificar disponibilidade real
- Para agendar: solicite nome completo, telefone e serviço desejado
- Se o cliente quiser falar com um humano, diga que irá transferir o atendimento
- Responda sempre em português brasileiro

Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}.`;
}

async function callOpenAI(config, systemPrompt, userMessage) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: config.ai_model || 'gpt-4o-mini',
      temperature: parseFloat(config.temperature) || 0.7,
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${config.api_key_encrypted}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );
  return response.data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(config, systemPrompt, userMessage) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: config.ai_model || 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    },
    {
      headers: {
        'x-api-key': config.api_key_encrypted,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );
  return response.data.content?.[0]?.text || '';
}

async function processMessage(empresaId, fromNumber, messageText) {
  const config = await getConfig(empresaId);

  if (!config || !config.is_active) return null;
  if (!config.api_key_encrypted) return null;

  const transferKeyword = config.human_transfer_keyword || 'falar com atendente';
  if (messageText.toLowerCase().includes(transferKeyword.toLowerCase())) {
    return {
      response: 'Entendido! Vou transferir você para um de nossos atendentes. Por favor, aguarde um momento.',
      isTransfer: true
    };
  }

  const inService = await isWithinServiceHours(config);
  if (!inService) {
    return {
      response: config.away_message || 'No momento não estou disponível. Retorno em breve!',
      isAway: true
    };
  }

  const systemPrompt = await buildSystemPrompt(empresaId, config);

  let aiResponse = '';
  try {
    const provider = config.ai_provider || 'openai';
    if (provider === 'anthropic') {
      aiResponse = await callAnthropic(config, systemPrompt, messageText);
    } else {
      aiResponse = await callOpenAI(config, systemPrompt, messageText);
    }
  } catch (err) {
    console.error('[AI] Erro ao chamar API:', err.response?.data || err.message);
    return null;
  }

  if (config.response_delay_seconds > 0) {
    await new Promise(r => setTimeout(r, config.response_delay_seconds * 1000));
  }

  return { response: aiResponse, isTransfer: false, isAway: false };
}

async function testMessage(empresaId, testInput) {
  const config = await getConfig(empresaId);
  if (!config) throw new Error('Assistente IA não configurado');
  if (!config.api_key_encrypted) throw new Error('API Key não configurada');

  const systemPrompt = await buildSystemPrompt(empresaId, config);
  const provider = config.ai_provider || 'openai';

  if (provider === 'anthropic') {
    return callAnthropic(config, systemPrompt, testInput);
  }
  return callOpenAI(config, systemPrompt, testInput);
}

module.exports = { getConfig, processMessage, testMessage, buildSystemPrompt };
