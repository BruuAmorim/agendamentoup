const express = require('express');
const AIAssistantController = require('../controllers/aiAssistantController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', AIAssistantController.getConfig);
router.put('/', AIAssistantController.saveConfig);
router.post('/toggle', AIAssistantController.toggle);
router.post('/test', AIAssistantController.testMessage);

module.exports = router;
