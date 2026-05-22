/**
 * Motor de IA interno do Cloudd Agenda.
 * Não usa nenhum provedor externo — detecta intenções em português,
 * mantém estado de conversa por contato e consulta a agenda em tempo real.
 */

const { query } = require('../config/database');

// ── Intenções ────────────────────────────────────────────────────────────────
const INTENTS = {
  greeting:     /\b(oi|ol[aá]|bom\s*dia|boa\s*tarde|boa\s*noite|hey|e\s*a[ií]|tudo\s*bem|tudo\s*bom|salve|boa)\b/i,
  schedule:     /\b(agendar|marcar|consulta|agendamento|quero\s*marcar|quero\s*agendar|hor[aá]rio\s*dispon[ií]vel|disponibilidade|reservar|fazer\s*uma\s*visita|atendimento|hor[aá]rios)\b/i,
  cancel:       /\b(cancelar|cancela|desmarcar|quero\s*cancelar|n[aã]o\s*vou\s*mais)\b/i,
  reschedule:   /\b(remarcar|reagendar|mudar\s*hor[aá]rio|trocar\s*hor[aá]rio|outro\s*hor[aá]rio|mudar\s*data)\b/i,
  services:     /\b(servi[cç]os?|o\s*que\s*voc[eê]s?\s*fazem|tipos?|pre[cç]o|valor|quanto\s*custa|tabela|tratamento|procedimento)\b/i,
  hours:        /\b(hor[aá]rio|quando\s*funciona|que\s*horas|abre|fecha|funcionamento|expediente)\b/i,
  my_appts:     /\b(meu\s*agendamento|minha\s*consulta|tenho\s*agendamento|meu\s*hor[aá]rio|quando\s*[eé]\s*minha|meus\s*agendamentos)\b/i,
  address:      /\b(endere[cç]o|onde\s*fica|localiza[cç][aã]o|como\s*chegar|rua|bairro)\b/i,
  human:        /\b(atendente|humano|pessoa\s*real|falar\s*com\s*algu[eé]m|quero\s*falar|suporte|ajuda\s*humana)\b/i,
  yes:          /^(sim|s|ok|pode|confirmo|certo|correto|tudo\s*bem|isso\s*mesmo|quero|pode\s*ser|combinado|vai|beleza|perfeito|fechado|show|feito|isso|com\s*certeza|claro|com\s*prazer|positivo)$/i,
  no:           /^(n[aã]o|n|nao|errado|incorreto|cancela|desistir|quero\s*n[aã]o|mudei\s*de\s*ideia|desisti)$/i,
};

function detectIntent(text) {
  const t = text.trim();
  for (const [intent, regex] of Object.entries(INTENTS)) {
    if (regex.test(t)) return intent;
  }
  return 'unknown';
}

// ── Helpers de data ─────────────────────────────────────────────────────────
const WEEKDAYS_PT = { domingo:0, segunda:1, terca:2, quarta:3, quinta:4, sexta:5, sabado:6,
  'segunda-feira':1,'terça-feira':2,'quarta-feira':3,'quinta-feira':4,'sexta-feira':5,'sábado':6,'domingo':0 };

function parseDate(text) {
  const t = text.toLowerCase().trim();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (/^hoje$/.test(t)) return fmtDate(today);
  if (/^amanh[aã]$/.test(t)) { const d = new Date(today); d.setDate(d.getDate()+1); return fmtDate(d); }
  if (/^depois\s*de\s*amanh[aã]$/.test(t)) { const d = new Date(today); d.setDate(d.getDate()+2); return fmtDate(d); }

  // "próxima segunda", "semana que vem quinta"
  for (const [name, dow] of Object.entries(WEEKDAYS_PT)) {
    if (t.includes(name)) {
      const d = new Date(today);
      let diff = dow - d.getDay();
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return fmtDate(d);
    }
  }

  // "15/06", "15/06/2025", "15-06"
  const mdy = t.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (mdy) {
    const day = parseInt(mdy[1]), month = parseInt(mdy[2]) - 1;
    let year = mdy[3] ? parseInt(mdy[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime()) && d >= today) return fmtDate(d);
  }

  // "15 de junho", "15 junho"
  const months = { janeiro:0,fevereiro:1,março:2,marco:2,abril:3,maio:4,junho:5,julho:6,agosto:7,setembro:8,outubro:9,novembro:10,dezembro:11 };
  for (const [name, idx] of Object.entries(months)) {
    const m = t.match(new RegExp(`(\\d{1,2})\\s*(?:de)?\\s*${name}`));
    if (m) {
      const d = new Date(now.getFullYear(), idx, parseInt(m[1]));
      if (d < today) d.setFullYear(d.getFullYear()+1);
      return fmtDate(d);
    }
  }
  return null;
}

function parseTime(text) {
  const m = text.match(/(\d{1,2})(?:[hH:](\d{2}))?(?:\s*(?:horas?|h))?/);
  if (!m) return null;
  const h = parseInt(m[1]), min = m[2] ? parseInt(m[2]) : 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function displayDate(isoDate) {
  const [y,m,d] = isoDate.split('-');
  const wd = new Date(isoDate+'T12:00:00');
  const days = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return `${days[wd.getDay()]}, ${d}/${m}/${y}`;
}

// ── Conversa (estado por contato) ───────────────────────────────────────────
async function getConversation(empresaId, phone) {
  const res = await query('SELECT * FROM whatsapp_conversations WHERE empresa_id=$1 AND phone_number=$2', [empresaId, phone]);
  if (!res.rows?.length) return { state:'idle', ctx:{} };
  const row = res.rows[0];
  let ctx = row.context_data;
  if (typeof ctx === 'string') { try { ctx = JSON.parse(ctx); } catch { ctx = {}; } }

  // Reset automático após 6h de inatividade
  const lastMsg = row.last_message_at ? new Date(row.last_message_at) : new Date(0);
  if ((Date.now() - lastMsg.getTime()) > 6 * 3600 * 1000) return { state:'idle', ctx:{} };

  return { state: row.state || 'idle', ctx: ctx || {} };
}

async function saveConversation(empresaId, phone, state, ctx) {
  const now = new Date().toISOString();
  const ctxJson = JSON.stringify(ctx);
  const existing = await query('SELECT id FROM whatsapp_conversations WHERE empresa_id=$1 AND phone_number=$2', [empresaId, phone]);
  if (existing.rows?.length) {
    await query('UPDATE whatsapp_conversations SET state=$1, context_data=$2, last_message_at=$3, updated_at=$3 WHERE empresa_id=$4 AND phone_number=$5',
      [state, ctxJson, now, empresaId, phone]);
  } else {
    await query('INSERT INTO whatsapp_conversations (empresa_id, phone_number, state, context_data, last_message_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$5,$5)',
      [empresaId, phone, state, ctxJson, now]);
  }
}

// ── Dados da empresa ─────────────────────────────────────────────────────────
async function getCompanyData(empresaId) {
  const [settings, services] = await Promise.all([
    query('SELECT company_name, working_hours, working_days FROM moderator_settings WHERE user_id=$1', [empresaId]),
    query('SELECT name, duration_minutes, price FROM company_services WHERE empresa_id=$1 AND active=1 ORDER BY name', [empresaId])
  ]);

  const s = settings.rows?.[0] || {};
  let wh = s.working_hours;
  let wd = s.working_days;
  if (typeof wh === 'string') try { wh = JSON.parse(wh); } catch { wh = { start:'08:00', end:'18:00' }; }
  if (typeof wd === 'string') try { wd = JSON.parse(wd); } catch { wd = ['monday','tuesday','wednesday','thursday','friday']; }

  const svcList = (services.rows || []).map(r => ({
    name: r.name,
    duration: r.duration_minutes,
    price: r.price ? parseFloat(r.price) : null
  }));

  return { companyName: s.company_name || 'Nosso estabelecimento', workingHours: wh || { start:'08:00', end:'18:00' }, workingDays: wd || [], services: svcList };
}

async function getAvailableSlots(empresaId, date) {
  const [appts, settings] = await Promise.all([
    query("SELECT appointment_time, duration_minutes FROM appointments WHERE user_id=$1 AND appointment_date=$2 AND status NOT IN ('cancelled')", [empresaId, date]),
    query('SELECT working_hours, slot_interval FROM moderator_settings WHERE user_id=$1', [empresaId])
  ]);

  const s = settings.rows?.[0] || {};
  let wh = s.working_hours;
  if (typeof wh === 'string') try { wh = JSON.parse(wh); } catch { wh = { start:'08:00', end:'18:00' }; }
  const interval = s.slot_interval || 30;

  const [startH, startM] = (wh?.start || '08:00').split(':').map(Number);
  const [endH, endM]     = (wh?.end   || '18:00').split(':').map(Number);

  const occupied = new Set();
  for (const a of (appts.rows || [])) {
    const [h,m] = (a.appointment_time || '00:00').split(':').map(Number);
    const dur = a.duration_minutes || interval;
    for (let t = h*60+m; t < h*60+m+dur; t += interval) occupied.add(t);
  }

  const slots = [];
  for (let t = startH*60+startM; t < endH*60+endM; t += interval) {
    if (!occupied.has(t)) {
      slots.push(`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`);
    }
  }
  return slots;
}

async function createAppointment(empresaId, ctx) {
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  const protocol = 'AG-' + Math.random().toString(36).slice(2,8).toUpperCase();
  const duration = ctx.serviceDuration || 30;
  const now = new Date().toISOString();

  await query(
    `INSERT INTO appointments (id, protocol, user_id, customer_name, customer_phone, appointment_date, appointment_time, duration_minutes, service_type, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$10)`,
    [id, protocol, empresaId, ctx.name, ctx.phone, ctx.date, ctx.time, duration, ctx.service || null, now]
  );
  return protocol;
}

async function findAppointmentsByPhone(empresaId, phone) {
  const clean = phone.replace(/\D/g,'');
  const res = await query(
    `SELECT protocol, customer_name, appointment_date, appointment_time, service_type, status
     FROM appointments WHERE user_id=$1 AND customer_phone LIKE $2 AND status NOT IN ('cancelled')
     ORDER BY appointment_date, appointment_time LIMIT 5`,
    [empresaId, '%'+clean.slice(-8)+'%']
  );
  return res.rows || [];
}

async function cancelAppointmentByProtocol(empresaId, protocol) {
  const res = await query(
    `UPDATE appointments SET status='cancelled', updated_at=$1 WHERE user_id=$2 AND protocol=$3 AND status NOT IN ('cancelled') RETURNING protocol`,
    [new Date().toISOString(), empresaId, protocol.toUpperCase()]
  );
  return res.rows?.length > 0;
}

// ── Gerador de resposta ──────────────────────────────────────────────────────
async function getAIConfig(empresaId) {
  const res = await query('SELECT * FROM ai_assistant_config WHERE empresa_id=$1', [empresaId]);
  return res.rows?.[0] || null;
}

function formatServiceList(services) {
  if (!services.length) return '_(nenhum serviço cadastrado)_';
  return services.map(s => {
    let line = `• *${s.name}*`;
    if (s.duration) line += ` — ${s.duration} min`;
    if (s.price) line += ` — R$ ${s.price.toFixed(2)}`;
    return line;
  }).join('\n');
}

function formatSlots(slots) {
  if (!slots.length) return null;
  // Agrupar de 4 em 4 para ficar legível
  const rows = [];
  for (let i = 0; i < slots.length; i += 4) rows.push(slots.slice(i,i+4).join('   '));
  return rows.join('\n');
}

// ── Processamento principal ──────────────────────────────────────────────────
async function processMessage(empresaId, fromPhone, text) {
  const config = await getAIConfig(empresaId);
  if (!config || !config.is_active) return null;

  // Só processa se use_builtin_ai = true (ou campo não existe → default true)
  const useBuiltin = config.use_builtin_ai === undefined ? true : !!(config.use_builtin_ai);
  if (!useBuiltin) return null; // delegar ao serviço externo

  const inService = await isWithinServiceHours(config);
  const company = await getCompanyData(empresaId);
  const botName = config.assistant_name || 'Assistente';
  const { state, ctx } = await getConversation(empresaId, fromPhone);

  ctx.phone = fromPhone;

  // ── Palavra-chave para transferência humana ─────────────────────────────
  const transferKw = config.human_transfer_keyword || 'falar com atendente';
  if (text.toLowerCase().includes(transferKw.toLowerCase())) {
    await saveConversation(empresaId, fromPhone, 'idle', {});
    return `Entendido! Vou transferir você para um de nossos atendentes. Por favor, aguarde um momento. 👋`;
  }

  // ── Fora do horário ─────────────────────────────────────────────────────
  if (!inService) {
    return config.away_message || 'No momento não estamos disponíveis. Retornamos em breve!';
  }

  const intent = detectIntent(text);

  // ── Máquina de estados ──────────────────────────────────────────────────
  switch (state) {

    // ─── idle ──────────────────────────────────────────────────────────────
    case 'idle': {
      if (intent === 'greeting') {
        await saveConversation(empresaId, fromPhone, 'idle', {});
        const greet = config.greeting_message || `Olá! Sou o *${botName}*, assistente de *${company.companyName}*. 😊`;
        return `${greet}\n\nComo posso ajudar?\n\n1️⃣ Agendar\n2️⃣ Ver meus agendamentos\n3️⃣ Cancelar agendamento\n4️⃣ Serviços e preços\n5️⃣ Horários de atendimento\n\nDigite o número ou descreva o que precisa.`;
      }
      if (intent === 'schedule' || text === '1') return startScheduling(empresaId, fromPhone, ctx, company, config);
      if (intent === 'my_appts' || text === '2') return handleMyAppointments(empresaId, fromPhone, ctx);
      if (intent === 'cancel' || text === '3') return startCancel(empresaId, fromPhone, ctx);
      if (intent === 'services' || text === '4') {
        return `*Nossos serviços:*\n\n${formatServiceList(company.services)}\n\nPara agendar, é só dizer! 📅`;
      }
      if (intent === 'hours' || text === '5') {
        const daysPT = { monday:'Seg', tuesday:'Ter', wednesday:'Qua', thursday:'Qui', friday:'Sex', saturday:'Sáb', sunday:'Dom' };
        const dias = (company.workingDays || []).map(d => daysPT[d] || d).join(', ');
        return `*Horários de atendimento:*\n📅 Dias: ${dias || 'Consulte-nos'}\n🕐 Horário: ${company.workingHours.start} às ${company.workingHours.end}\n\nPosso ajudar com mais alguma coisa?`;
      }
      if (intent === 'address') {
        return `Para informações sobre nosso endereço, entre em contato diretamente. Posso ajudar com agendamentos! 📅`;
      }
      // Mensagem desconhecida no idle — saudar
      await saveConversation(empresaId, fromPhone, 'idle', {});
      const greet2 = config.greeting_message || `Olá! Sou o *${botName}* de *${company.companyName}*.`;
      return `${greet2}\n\nComo posso ajudar?\n\n1️⃣ Agendar\n2️⃣ Ver meus agendamentos\n3️⃣ Cancelar agendamento\n4️⃣ Serviços e preços\n5️⃣ Horários de atendimento`;
    }

    // ─── scheduling flow ───────────────────────────────────────────────────
    case 'ask_service': {
      const svc = matchService(text, company.services);
      if (svc) {
        ctx.service = svc.name;
        ctx.serviceDuration = svc.duration;
        await saveConversation(empresaId, fromPhone, 'ask_date', ctx);
        return `*${svc.name}* — ótima escolha! ✅\n\nPara qual data você prefere?\nEx: _amanhã_, _segunda_, _15/06_`;
      }
      if (company.services.length > 0) {
        return `Não encontrei esse serviço. Por favor escolha uma das opções:\n\n${formatServiceList(company.services)}`;
      }
      // Sem serviços cadastrados — pular
      ctx.service = text.trim();
      await saveConversation(empresaId, fromPhone, 'ask_date', ctx);
      return `Certo! Para qual data você prefere?\nEx: _amanhã_, _segunda_, _15/06_`;
    }

    case 'ask_date': {
      const date = parseDate(text);
      if (!date) {
        return `Não entendi a data. Tente: _amanhã_, _segunda_, _15/06_ ou _15 de junho_.`;
      }
      const slots = await getAvailableSlots(empresaId, date);
      if (!slots.length) {
        return `Infelizmente não há horários disponíveis em *${displayDate(date)}*. Que tal outra data?`;
      }
      ctx.date = date;
      ctx.availableSlots = slots;
      await saveConversation(empresaId, fromPhone, 'ask_time', ctx);
      return `*${displayDate(date)}* — horários disponíveis:\n\n${formatSlots(slots)}\n\nQual horário prefere?`;
    }

    case 'ask_time': {
      const time = parseTime(text);
      const slots = ctx.availableSlots || [];
      if (!time || !slots.includes(time)) {
        const slotsStr = formatSlots(slots);
        return `Horário não disponível. Por favor escolha um dos horários:\n\n${slotsStr}`;
      }
      ctx.time = time;
      await saveConversation(empresaId, fromPhone, 'ask_name', ctx);
      return `Horário *${time}* reservado! ✅\n\nQual o seu nome completo?`;
    }

    case 'ask_name': {
      if (text.trim().length < 3) return `Por favor informe seu nome completo.`;
      ctx.name = capitalize(text.trim());
      await saveConversation(empresaId, fromPhone, 'confirm_booking', ctx);
      const priceInfo = ctx.service ? `` : '';
      return `*Confirme seu agendamento:*\n\n📋 Serviço: ${ctx.service || 'Consulta'}\n📅 Data: ${displayDate(ctx.date)}\n🕐 Horário: ${ctx.time}\n👤 Nome: ${ctx.name}\n\nConfirma? _(sim/não)_`;
    }

    case 'confirm_booking': {
      if (intent === 'yes') {
        try {
          const protocol = await createAppointment(empresaId, ctx);
          await saveConversation(empresaId, fromPhone, 'idle', {});
          return `✅ *Agendamento confirmado!*\n\n📋 Protocolo: *${protocol}*\n📅 ${displayDate(ctx.date)} às ${ctx.time}\n👤 ${ctx.name}\n\nGuarde o protocolo para cancelamentos. Até lá! 😊`;
        } catch (e) {
          return `Ocorreu um erro ao confirmar. Por favor tente novamente ou entre em contato conosco.`;
        }
      }
      if (intent === 'no') {
        await saveConversation(empresaId, fromPhone, 'idle', {});
        return `Agendamento cancelado. Posso ajudar com mais alguma coisa?`;
      }
      return `Responda *sim* para confirmar ou *não* para cancelar.`;
    }

    // ─── cancel flow ───────────────────────────────────────────────────────
    case 'ask_cancel_protocol': {
      const proto = text.trim().toUpperCase().replace(/[^A-Z0-9\-]/g,'');
      if (proto.length < 4) return `Por favor informe o número do protocolo. Ex: _AG-ABC123_`;
      const cancelled = await cancelAppointmentByProtocol(empresaId, proto);
      await saveConversation(empresaId, fromPhone, 'idle', {});
      if (cancelled) return `✅ Agendamento *${proto}* cancelado com sucesso. Posso ajudar com mais alguma coisa?`;
      return `Não encontrei agendamento ativo com o protocolo *${proto}*. Verifique e tente novamente.`;
    }

    default: {
      await saveConversation(empresaId, fromPhone, 'idle', {});
      return null; // reinicia no próximo loop
    }
  }
}

// ── Helpers de fluxo ─────────────────────────────────────────────────────────
async function startScheduling(empresaId, fromPhone, ctx, company, config) {
  if (company.services.length === 0) {
    // Sem serviços cadastrados — pular direto para data
    await saveConversation(empresaId, fromPhone, 'ask_date', ctx);
    return `Ótimo! Para qual data você prefere?\nEx: _amanhã_, _segunda_, _15/06_`;
  }
  await saveConversation(empresaId, fromPhone, 'ask_service', ctx);
  return `Qual serviço você deseja agendar?\n\n${formatServiceList(company.services)}`;
}

async function handleMyAppointments(empresaId, fromPhone, ctx) {
  const appts = await findAppointmentsByPhone(empresaId, fromPhone);
  await saveConversation(empresaId, fromPhone, 'idle', {});
  if (!appts.length) return `Não encontrei agendamentos ativos para seu número. Posso agendar um para você?`;
  const list = appts.map(a =>
    `📋 *${a.protocol}*\n📅 ${displayDate(a.appointment_date)} às ${a.appointment_time}${a.service_type ? '\n💼 ' + a.service_type : ''}\n👤 ${a.customer_name}`
  ).join('\n\n');
  return `*Seus agendamentos:*\n\n${list}\n\nPara cancelar, envie: _cancelar AG-XXXXXX_`;
}

async function startCancel(empresaId, fromPhone, ctx) {
  await saveConversation(empresaId, fromPhone, 'ask_cancel_protocol', ctx);
  return `Para cancelar, informe o número do protocolo.\nEx: _AG-ABC123_\n\nNão tem o protocolo? Digite _meus agendamentos_ para consultar.`;
}

function matchService(text, services) {
  const t = text.toLowerCase().trim();
  // Correspondência exata pelo número digitado
  const num = parseInt(t);
  if (!isNaN(num) && num >= 1 && num <= services.length) return services[num - 1];
  // Correspondência por nome
  return services.find(s => s.name.toLowerCase().includes(t) || t.includes(s.name.toLowerCase())) || null;
}

function capitalize(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

async function isWithinServiceHours(config) {
  const now = new Date();
  const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const todayKey = dayKeys[now.getDay()];
  let days = config.service_days;
  if (typeof days === 'string') try { days = JSON.parse(days); } catch { days = []; }
  if (!Array.isArray(days) || !days.includes(todayKey)) return false;
  const [sh, sm] = (config.service_hours_start || '08:00').split(':').map(Number);
  const [eh, em] = (config.service_hours_end   || '18:00').split(':').map(Number);
  const mins = now.getHours()*60 + now.getMinutes();
  return mins >= sh*60+sm && mins < eh*60+em;
}

// ── Teste de simulação ───────────────────────────────────────────────────────
async function simulateMessage(empresaId, text) {
  const fakePhone = 'test_' + empresaId;
  return processMessage(empresaId, fakePhone, text);
}

async function resetTestConversation(empresaId) {
  await query('DELETE FROM whatsapp_conversations WHERE empresa_id=$1 AND phone_number=$2', [empresaId, 'test_' + empresaId]);
}

module.exports = { processMessage, simulateMessage, resetTestConversation, isWithinServiceHours };
