const express = require('express');
const router = express.Router();
const cloudChatService = require('../services/cloudChatService');

// Middleware para validar tokens de webhook
const validateWebhookToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = req.headers['x-webhook-token'] || req.query.token;

  // Para desenvolvimento, permite sem token
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Verificar token se fornecido
  if (token) {
    // Aqui você pode implementar validação de token específica
    console.log('🔐 Validando token do webhook:', token.substring(0, 10) + '...');
  }

  next();
};

// WhatsApp Webhook
router.post('/whatsapp/incoming', validateWebhookToken, async (req, res) => {
  try {
    console.log('📱 Recebido webhook do WhatsApp:');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));

    const { messages, contacts } = req.body;

    if (messages && messages.length > 0) {
      const message = messages[0];
      const phone = message.from;
      const text = message.text?.body || '';

      console.log(`💬 Mensagem recebida de ${phone}: "${text}"`);

      // Aqui você pode integrar com n8n ou processar diretamente
      // Por exemplo, enviar para n8n se configurado

      // Resposta de confirmação
      res.status(200).json({
        success: true,
        message: 'Mensagem recebida com sucesso',
        processed: true
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'Webhook recebido (sem mensagens)'
      });
    }
  } catch (error) {
    console.error('❌ Erro no webhook WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no processamento do webhook'
    });
  }
});

// WhatsApp Webhook Verification (GET)
router.get('/whatsapp/incoming', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔍 Verificação de webhook WhatsApp:', { mode, token: token?.substring(0, 10) + '...' });

  // Em produção, verificar o token
  if (mode === 'subscribe' && token) {
    // Aqui você compara com seu token configurado
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Cloud Chat Webhook
router.post('/cloudchat/incoming', validateWebhookToken, async (req, res) => {
  try {
    console.log('💬 Recebido webhook do Cloud Chat:');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));

    const result = await cloudChatService.processIncomingMessage(req.body);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Mensagem processada com sucesso',
        processed: result.processed,
        response: result.response,
        needs_human: result.needsHuman,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro no processamento da mensagem',
        details: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erro no webhook Cloud Chat:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no processamento do webhook'
    });
  }
});

// Cloud Chat - Enviar Mensagem
router.post('/cloudchat/send', async (req, res) => {
  try {
    const { to, message, chat_id, type = 'text' } = req.body;

    console.log('📤 Enviando mensagem via Cloud Chat:', {
      to,
      type,
      message: message?.substring(0, 50) + '...',
      chat_id
    });

    const result = await cloudChatService.sendMessage(to, message, {
      chat_id,
      type
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao enviar mensagem',
        details: result.error
      });
    }

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem via Cloud Chat:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao enviar mensagem',
      details: error.message
    });
  }
});

// Endpoint genérico para testar integrações
router.post('/test/:service', (req, res) => {
  const { service } = req.params;
  const data = req.body;

  console.log(`🧪 Teste de integração com ${service}:`);
  console.log('📦 Dados recebidos:', JSON.stringify(data, null, 2));

  res.json({
    success: true,
    message: `Teste de integração com ${service} recebido com sucesso`,
    timestamp: new Date().toISOString(),
    service: service,
    data: data
  });
});

// Status das integrações
router.get('/status', (req, res) => {
  // Aqui você pode verificar o status das integrações configuradas
  res.json({
    success: true,
    integrations: {
      whatsapp: {
        configured: false, // Verificar do config
        status: 'unknown'
      },
      cloudchat: {
        configured: false, // Verificar do config
        status: 'unknown'
      },
      n8n: {
        configured: false, // Verificar do config
        status: 'unknown'
      }
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
const cloudChatService = require('../services/cloudChatService');

// Middleware para validar tokens de webhook
const validateWebhookToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = req.headers['x-webhook-token'] || req.query.token;

  // Para desenvolvimento, permite sem token
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Verificar token se fornecido
  if (token) {
    // Aqui você pode implementar validação de token específica
    console.log('🔐 Validando token do webhook:', token.substring(0, 10) + '...');
  }

  next();
};

// WhatsApp Webhook
router.post('/whatsapp/incoming', validateWebhookToken, async (req, res) => {
  try {
    console.log('📱 Recebido webhook do WhatsApp:');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));

    const { messages, contacts } = req.body;

    if (messages && messages.length > 0) {
      const message = messages[0];
      const phone = message.from;
      const text = message.text?.body || '';

      console.log(`💬 Mensagem recebida de ${phone}: "${text}"`);

      // Aqui você pode integrar com n8n ou processar diretamente
      // Por exemplo, enviar para n8n se configurado

      // Resposta de confirmação
      res.status(200).json({
        success: true,
        message: 'Mensagem recebida com sucesso',
        processed: true
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'Webhook recebido (sem mensagens)'
      });
    }
  } catch (error) {
    console.error('❌ Erro no webhook WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no processamento do webhook'
    });
  }
});

// WhatsApp Webhook Verification (GET)
router.get('/whatsapp/incoming', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔍 Verificação de webhook WhatsApp:', { mode, token: token?.substring(0, 10) + '...' });

  // Em produção, verificar o token
  if (mode === 'subscribe' && token) {
    // Aqui você compara com seu token configurado
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Cloud Chat Webhook
router.post('/cloudchat/incoming', validateWebhookToken, async (req, res) => {
  try {
    console.log('💬 Recebido webhook do Cloud Chat:');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));

    const result = await cloudChatService.processIncomingMessage(req.body);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Mensagem processada com sucesso',
        processed: result.processed,
        response: result.response,
        needs_human: result.needsHuman,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro no processamento da mensagem',
        details: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erro no webhook Cloud Chat:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no processamento do webhook'
    });
  }
});

// Cloud Chat - Enviar Mensagem
router.post('/cloudchat/send', async (req, res) => {
  try {
    const { to, message, chat_id, type = 'text' } = req.body;

    console.log('📤 Enviando mensagem via Cloud Chat:', {
      to,
      type,
      message: message?.substring(0, 50) + '...',
      chat_id
    });

    const result = await cloudChatService.sendMessage(to, message, {
      chat_id,
      type
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao enviar mensagem',
        details: result.error
      });
    }

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem via Cloud Chat:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao enviar mensagem',
      details: error.message
    });
  }
});

// Endpoint genérico para testar integrações
router.post('/test/:service', (req, res) => {
  const { service } = req.params;
  const data = req.body;

  console.log(`🧪 Teste de integração com ${service}:`);
  console.log('📦 Dados recebidos:', JSON.stringify(data, null, 2));

  res.json({
    success: true,
    message: `Teste de integração com ${service} recebido com sucesso`,
    timestamp: new Date().toISOString(),
    service: service,
    data: data
  });
});

// Status das integrações
router.get('/status', (req, res) => {
  // Aqui você pode verificar o status das integrações configuradas
  res.json({
    success: true,
    integrations: {
      whatsapp: {
        configured: false, // Verificar do config
        status: 'unknown'
      },
      cloudchat: {
        configured: false, // Verificar do config
        status: 'unknown'
      },
      n8n: {
        configured: false, // Verificar do config
        status: 'unknown'
      }
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

