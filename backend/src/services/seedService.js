const { User } = require('../models/index');

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
