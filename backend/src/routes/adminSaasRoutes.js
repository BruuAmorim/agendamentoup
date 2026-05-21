const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminSaasController');
const { verifyToken, requireAdminMaster } = require('../middleware/auth');

// Todas as rotas exigem admin_master
router.use(verifyToken, requireAdminMaster);

// Platform stats
router.get('/stats', ctrl.getPlatformStats);

// Tenants / Empresas
router.get('/tenants', ctrl.listTenants);
router.get('/tenants/:id', ctrl.getTenant);
router.put('/tenants/:id', ctrl.updateTenant);
router.delete('/tenants/:id', ctrl.deleteTenant);
router.post('/tenants/:id/impersonate', ctrl.impersonateTenant);
router.post('/empresas', ctrl.createEmpresa);

// Plans
router.get('/plans', ctrl.listPlans);
router.post('/plans', ctrl.createPlan);
router.put('/plans/:id', ctrl.updatePlan);

// Niches
router.get('/niches', ctrl.listNiches);
router.post('/niches', ctrl.createNiche);
router.put('/niches/:id', ctrl.updateNiche);

module.exports = router;
