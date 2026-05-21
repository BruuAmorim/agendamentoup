const https = require('https');

const EMAIL_TEMPLATE = (resetLink) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family: Inter, Arial, sans-serif; background: #f4f8fb; margin: 0; padding: 40px 0;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #4f46e5, #0099ff); padding: 40px 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 1.8rem; font-weight: 700;">Cloudd Agenda</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 0.95rem;">Redefinição de Senha</p>
    </div>
    <div style="padding: 40px 32px;">
      <p style="color: #1f2937; font-size: 1rem; margin: 0 0 16px;">Olá,</p>
      <p style="color: #4b5563; font-size: 0.95rem; line-height: 1.6; margin: 0 0 24px;">
        Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
        O link é válido por <strong>30 minutos</strong>.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #0099ff); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 1rem;">
          Redefinir Senha
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 0.8rem; margin: 24px 0 0; line-height: 1.5;">
        Se você não solicitou a redefinição, ignore este email. Sua senha não será alterada.<br><br>
        Ou copie e cole este link no navegador:<br>
        <a href="${resetLink}" style="color: #4f46e5; word-break: break-all;">${resetLink}</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// Resend HTTP API (resend.com) — não precisa de servidor SMTP
async function sendViaResend(toEmail, resetLink) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Cloudd Agenda <onboarding@resend.dev>';

  const payload = JSON.stringify({
    from,
    to: [toEmail],
    subject: 'Redefinição de Senha — Cloudd Agenda',
    html: EMAIL_TEMPLATE(resetLink),
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const data = JSON.parse(body || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[email/resend] Enviado para ${toEmail} — ID: ${data.id}`);
            resolve(data);
          } else {
            reject(new Error(`Resend API error ${res.statusCode}: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// SMTP via nodemailer (lazy require — nodemailer may not be installed in all envs)
async function sendViaSmtp(toEmail, resetLink) {
  const nodemailer = require('nodemailer');
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@clouddagenda.com';
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const info = await transport.sendMail({
    from: `"Cloudd Agenda" <${from}>`,
    to: toEmail,
    subject: 'Redefinição de Senha — Cloudd Agenda',
    html: EMAIL_TEMPLATE(resetLink),
  });

  console.log(`[email/smtp] Enviado para ${toEmail} — ID: ${info.messageId}`);
  return info;
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  // 1. Resend API (prioridade: simples, sem SMTP)
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(toEmail, resetLink);
  }

  // 2. SMTP configurado
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return sendViaSmtp(toEmail, resetLink);
  }

  // 3. Sem provedor configurado: loga no console
  console.warn('\n========================================');
  console.warn('[EMAIL] Nenhum provedor configurado (RESEND_API_KEY ou SMTP_*)');
  console.warn(`   Para: ${toEmail}`);
  console.warn(`   Link: ${resetLink}`);
  console.warn('Configure RESEND_API_KEY nas variáveis de ambiente do Vercel.');
  console.warn('========================================\n');
  return { messageId: 'console-only', preview: resetLink };
}

module.exports = { sendPasswordResetEmail };
