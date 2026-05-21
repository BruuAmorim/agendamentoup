const express = require('express');
const router = express.Router();
const patientsController = require('../controllers/patientsController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/search', patientsController.search);
router.get('/', patientsController.list);
router.post('/', patientsController.create);
router.put('/:id', patientsController.update);
router.delete('/:id', patientsController.remove);

module.exports = router;
