const express = require('express');
const router = express.Router();
const SettingsPasswordController = require('../controllers/settingsPasswordController');
const { verifyToken } = require('../middleware/auth');

/**
 * Rotas para gerenciar senha de configurações.
 * Qualquer usuário autenticado do tipo admin_master, empresa ou moderator
 * pode gerenciar a senha da SUA própria empresa. 
 * Regras de permissão adicionais são tratadas no controller.
 */

// Todas as rotas requerem autenticação; o controller valida o role permitido
router.use(verifyToken);

/**
 * @api {get} /api/settings-password Obter status da senha
 * @apiName GetPasswordStatus
 * @apiGroup SettingsPassword
 * @apiDescription Verifica se existe senha configurada (apenas admin_master)
 * @apiHeader {String} Authorization Bearer token
 * @apiSuccess {Boolean} hasPassword Se existe senha configurada
 */
router.get('/', SettingsPasswordController.getPasswordStatus);

/**
 * @api {post} /api/settings-password Criar senha
 * @apiName CreatePassword
 * @apiGroup SettingsPassword
 * @apiDescription Cria senha de configurações (apenas admin_master)
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} password Nova senha (mínimo 4 caracteres)
 * @apiSuccess {String} message Mensagem de sucesso
 */
router.post('/', SettingsPasswordController.createPassword);

/**
 * @api {put} /api/settings-password Atualizar senha
 * @apiName UpdatePassword
 * @apiGroup SettingsPassword
 * @apiDescription Atualiza senha de configurações (apenas admin_master)
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} password Nova senha (mínimo 4 caracteres)
 * @apiParam {String} currentPassword Senha atual (obrigatória se já existe senha)
 * @apiSuccess {String} message Mensagem de sucesso
 */
router.put('/', SettingsPasswordController.updatePassword);

module.exports = router;











