const express = require('express');
const WhatsAppController = require('../controllers/whatsappController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Webhook da Evolution API — sem JWT (chamado externamente)
router.post('/webhook/:empresaId', WhatsAppController.webhook);

// Rotas autenticadas
router.use(verifyToken);

router.get('/status', WhatsAppController.getStatus);
router.post('/connect', WhatsAppController.connect);
router.post('/reconnect', WhatsAppController.reconnect);
router.get('/qrcode', WhatsAppController.getQRCode);
router.post('/disconnect', WhatsAppController.disconnect);
router.get('/messages', WhatsAppController.getMessages);
router.post('/send', WhatsAppController.sendMessage);

module.exports = router;
