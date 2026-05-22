const express = require('express');
const ExternalIntegrationController = require('../controllers/externalIntegrationController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', ExternalIntegrationController.list);
router.post('/', ExternalIntegrationController.create);
router.put('/:id', ExternalIntegrationController.update);
router.delete('/:id', ExternalIntegrationController.remove);
router.post('/:id/test', ExternalIntegrationController.test);

module.exports = router;
