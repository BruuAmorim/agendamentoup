const express = require('express');
const WhatsAppController = require('../controllers/whatsappController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/status',     WhatsAppController.getStatus);
router.post('/connect',   WhatsAppController.connect);
router.post('/reconnect', WhatsAppController.reconnect);
router.post('/disconnect',WhatsAppController.disconnect);
router.get('/qr-stream',  WhatsAppController.qrStream);   // SSE
router.get('/messages',   WhatsAppController.getMessages);
router.post('/send',      WhatsAppController.sendMessage);

module.exports = router;
