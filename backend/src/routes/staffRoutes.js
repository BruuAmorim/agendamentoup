const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { verifyToken } = require('../middleware/auth');

// Todas as rotas de funcionários exigem autenticação
router.use(verifyToken);

// Listar funcionários da empresa logada
router.get('/', (req, res) => staffController.list(req, res));

// Criar novo funcionário
router.post('/', (req, res) => staffController.create(req, res));

// Atualizar funcionário
router.put('/:id', (req, res) => staffController.update(req, res));

// Desativar funcionário
router.delete('/:id', (req, res) => staffController.remove(req, res));

// Excluir funcionário (hard delete)
router.delete('/:id/hard', (req, res) => staffController.hardDelete(req, res));

// Obter serviços vinculados a um funcionário
router.get('/:id/services', (req, res) => staffController.getServices(req, res));

// Definir serviços de um funcionário
router.post('/:id/services', (req, res) => staffController.setServices(req, res));

module.exports = router;

