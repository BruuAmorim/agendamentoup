const { User } = require('../models/index');
const { Op } = require('sequelize');
const ApiKeyService = require('./apiKeyService');

/**
 * Serviço para criar usuários iniciais (seeds)
 */
class SeedService {

  /**
   * Criar usuários de teste se não existirem
   */
  static async createSeedUsers() {
    try {
      console.log('🔍 Verificando usuários de teste...');

      // Verificar se o admin_master já existe
      const adminExists = await User.findOne({
        where: { email: 'brunadevv@gmail.com' }
      });

      if (!adminExists) {
        await User.create({
          name: 'Administrador Master',
          email: 'brunadevv@gmail.com',
          password: 'admin123',
          role: 'admin_master'
        });
        console.log('✅ Usuário admin_master criado: brunadevv@gmail.com');
      } else {
        console.log('ℹ️ Usuário admin_master já existe: brunadevv@gmail.com');
      }

      // Verificar se o usuário de teste já existe
      const userExists = await User.findOne({
        where: { email: 'usuarioteste@gmail.com' }
      });

      if (!userExists) {
        await User.create({
          name: 'Usuário de Teste',
          email: 'usuarioteste@gmail.com',
          password: 'Mudar@123',
          role: 'user'
        });
        console.log('✅ Usuário de teste criado: usuarioteste@gmail.com');
      } else {
        console.log('ℹ️ Usuário de teste já existe: usuarioteste@gmail.com');
      }

      // Usuário barbearia (para testes locais)
      const barbeariaExists = await User.findOne({
        where: { email: 'barbearia@gmail.com' }
      });

      if (!barbeariaExists) {
        await User.create({
          name: 'Barbearia',
          email: 'barbearia@gmail.com',
          password: 'barbearia123',
          role: 'moderator'
        });
        console.log('✅ Usuário barbearia criado: barbearia@gmail.com / barbearia123');
      } else {
        console.log('ℹ️ Usuário barbearia já existe: barbearia@gmail.com');
      }

      // Gerar API Keys automaticamente para empresas/moderators existentes sem API Key
      try {
        console.log('🔑 Verificando empresas sem API Key...');
        const empresasSemApiKey = await User.findAll({
          where: {
            role: { [Op.in]: ['moderator', 'empresa'] },
            api_key_hash: null
          }
        });

        for (const empresa of empresasSemApiKey) {
          try {
            console.log(`🔑 Gerando API Key para empresa ID: ${empresa.id} - ${empresa.name}`);
            await ApiKeyService.generateAndSaveApiKey(empresa.id);
            console.log(`✅ API Key gerada para empresa ID: ${empresa.id}`);
          } catch (apiKeyError) {
            console.warn(`⚠️ Erro ao gerar API Key para empresa ${empresa.id}:`, apiKeyError.message);
          }
        }

        if (empresasSemApiKey.length > 0) {
          console.log(`✅ API Keys geradas para ${empresasSemApiKey.length} empresa(s)`);
        }
      } catch (seedApiKeyError) {
        console.warn('⚠️ Erro ao gerar API Keys no seed:', seedApiKeyError.message);
        // Não falhar o seed se houver erro
      }

      console.log('🎯 Seed de usuários concluído com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao criar usuários de teste:', error);
      throw error;
    }
  }

  /**
   * Verificar se os usuários de teste existem e criar se necessário
   */
  static async ensureSeedUsers() {
    try {
      await this.createSeedUsers();
    } catch (error) {
      console.error('Erro ao verificar/criar usuários de teste:', error);
      // Não lança erro para não quebrar a inicialização
    }
  }
}

module.exports = SeedService;
