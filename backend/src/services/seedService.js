const { User } = require('../models/index');
const { Op } = require('sequelize');
const ApiKeyService = require('./apiKeyService');

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

class SeedService {

  static async ensureSeedUsers() {
    if (!isDev) return; // Seed apenas em desenvolvimento

    try {
      const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@localhost.dev';
      const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@Dev2024!';
      const moderatorEmail = process.env.SEED_MODERATOR_EMAIL || 'empresa@localhost.dev';
      const moderatorPassword = process.env.SEED_MODERATOR_PASSWORD || 'Empresa@Dev2024!';

      const seeds = [
        { email: adminEmail, password: adminPassword, name: 'Administrador Local', role: 'admin_master' },
        { email: moderatorEmail, password: moderatorPassword, name: 'Empresa Demo', role: 'moderator' },
      ];

      for (const seed of seeds) {
        const exists = await User.findOne({ where: { email: seed.email } });
        if (!exists) {
          await User.create(seed);
          console.log(`[seed] Usuário criado: ${seed.email} (${seed.role})`);
        }
      }

      // Gerar API Keys para moderators sem chave
      const semApiKey = await User.findAll({
        where: { role: 'moderator', api_key_hash: null },
      });

      for (const empresa of semApiKey) {
        try {
          await ApiKeyService.generateAndSaveApiKey(empresa.id);
          console.log(`[seed] API Key gerada para empresa ID ${empresa.id}`);
        } catch (err) {
          console.warn(`[seed] Falha ao gerar API Key para empresa ${empresa.id}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[seed] Erro ao criar usuários de desenvolvimento:', error.message);
    }
  }
}

module.exports = SeedService;
