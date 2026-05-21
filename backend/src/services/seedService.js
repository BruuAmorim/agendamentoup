const { User } = require('../models/index');
const { Op } = require('sequelize');
const ApiKeyService = require('./apiKeyService');

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

class SeedService {

  static async ensureSeedUsers() {
    if (!isDev) return;

    try {
      const adminEmail = process.env.SEED_ADMIN_EMAIL || 'brunadevv@gmail.com';
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

      // Garantir que todo moderador tem um tenant
      try {
        await SeedService.ensureTenantsForModerators();
      } catch (err) {
        console.warn('[seed] Falha ao garantir tenants:', err.message);
      }
    } catch (error) {
      console.error('[seed] Erro ao criar usuários de desenvolvimento:', error.message);
    }
  }

  static async ensureTenantsForModerators() {
    const { Tenant, Plan, Niche } = require('../models');
    const moderators = await User.findAll({ where: { role: 'moderator' } });
    const starterPlan = await Plan.findOne({ where: { slug: 'starter' } });
    const geralNiche  = await Niche.findOne({ where: { slug: 'geral' } });

    for (const mod of moderators) {
      const baseName = mod.name || mod.email.split('@')[0];
      const slug = baseName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50) + '-' + mod.id;

      const [, created] = await Tenant.findOrCreate({
        where: { user_id: mod.id },
        defaults: {
          slug,
          name: baseName,
          niche_id: geralNiche?.id || null,
          plan_id: starterPlan?.id || null,
          status: 'active',
        },
      });

      if (created) console.log(`[seed] Tenant criado para moderador ${mod.email}`);
    }
  }
}

module.exports = SeedService;
