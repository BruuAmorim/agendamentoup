const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

/**
 * Serviço profissional para gerenciamento de API Keys
 * Segue padrões SaaS seguros: nunca armazena chave em texto puro
 */
class ApiKeyService {

  /**
   * Gerar nova API Key
   * @returns {string} API Key em texto puro (64 caracteres hex)
   */
  static generateApiKey() {
    // Gerar 32 bytes = 64 caracteres hexadecimais
    const apiKey = crypto.randomBytes(32).toString('hex');
    console.log('🔑 [ApiKeyService] Nova API Key gerada');
    return apiKey;
  }

  /**
   * Criar hash da API Key para armazenamento seguro
   * @param {string} apiKey - API Key em texto puro
   * @returns {Promise<string>} Hash bcrypt da API Key
   */
  static async hashApiKey(apiKey) {
    try {
      // Usar salt rounds 10 conforme especificado
      const hash = await bcrypt.hash(apiKey, 10);
      console.log('🔐 [ApiKeyService] API Key hasheada com sucesso');
      return hash;
    } catch (error) {
      console.error('❌ [ApiKeyService] Erro ao criar hash:', error);
      throw new Error('Erro ao criar hash da API Key');
    }
  }

  /**
   * Verificar se API Key é válida
   * @param {string} apiKey - API Key em texto puro
   * @param {string} hash - Hash armazenado no banco
   * @returns {Promise<boolean>} true se válida
   */
  static async verifyApiKey(apiKey, hash) {
    try {
      return await bcrypt.compare(apiKey, hash);
    } catch (error) {
      console.error('❌ [ApiKeyService] Erro ao verificar API Key:', error);
      return false;
    }
  }

  /**
   * Gerar e salvar API Key para uma empresa
   * @param {number} empresaId - ID da empresa
   * @returns {Promise<{apiKey: string, hash: string}>} API Key e hash
   */
  static async generateAndSaveApiKey(empresaId) {
    try {
      console.log(`🔑 [ApiKeyService] Gerando API Key para empresa ID: ${empresaId}`);

      // Gerar nova API Key
      const apiKey = this.generateApiKey();
      
      // Criar hash
      const hash = await this.hashApiKey(apiKey);

      // Buscar empresa
      const empresa = await User.findByPk(empresaId);
      if (!empresa) {
        throw new Error(`Empresa com ID ${empresaId} não encontrada`);
      }

      // Salvar hash no banco
      const now = new Date();
      await empresa.update({
        api_key_hash: hash,
        api_key_created_at: empresa.api_key_created_at || now,
        api_key_last_regenerated: now
      });

      console.log(`✅ [ApiKeyService] API Key salva para empresa ID: ${empresaId}`);

      return {
        apiKey, // Retornar apenas uma vez
        hash    // Hash salvo no banco
      };
    } catch (error) {
      console.error('❌ [ApiKeyService] Erro ao gerar e salvar API Key:', error);
      throw error;
    }
  }

  /**
   * Regenerar API Key para uma empresa
   * @param {number} empresaId - ID da empresa
   * @returns {Promise<string>} Nova API Key (exibida apenas uma vez)
   */
  static async regenerateApiKey(empresaId) {
    try {
      console.log(`🔄 [ApiKeyService] Regenerando API Key para empresa ID: ${empresaId}`);

      const result = await this.generateAndSaveApiKey(empresaId);
      
      console.log(`✅ [ApiKeyService] API Key regenerada para empresa ID: ${empresaId}`);
      
      return result.apiKey; // Retornar apenas a chave em texto puro
    } catch (error) {
      console.error('❌ [ApiKeyService] Erro ao regenerar API Key:', error);
      throw error;
    }
  }

  /**
   * Buscar empresa por API Key
   * @param {string} apiKey - API Key em texto puro
   * @returns {Promise<User|null>} Empresa encontrada ou null
   */
  static async findEmpresaByApiKey(apiKey) {
    try {
      // Buscar todas as empresas com API Key configurada
      const empresas = await User.findAll({
        where: {
          api_key_hash: { [require('sequelize').Op.ne]: null }
        },
        attributes: ['id', 'api_key_hash', 'name', 'email', 'role']
      });

      // Verificar cada empresa
      for (const empresa of empresas) {
        if (empresa.api_key_hash) {
          const isValid = await this.verifyApiKey(apiKey, empresa.api_key_hash);
          if (isValid) {
            console.log(`✅ [ApiKeyService] Empresa encontrada por API Key: ID ${empresa.id}`);
            return empresa;
          }
        }
      }

      console.log('⚠️ [ApiKeyService] Nenhuma empresa encontrada com a API Key fornecida');
      return null;
    } catch (error) {
      console.error('❌ [ApiKeyService] Erro ao buscar empresa por API Key:', error);
      return null;
    }
  }

  /**
   * Mascarar API Key para exibição
   * @param {string} apiKeyHash - Hash da API Key
   * @returns {string} Versão mascarada (ex: 9f3a8f********a6d2)
   */
  static maskApiKey(apiKeyHash) {
    if (!apiKeyHash || apiKeyHash.length < 12) {
      return '********';
    }
    
    // Extrair parte do hash (remover prefixo bcrypt)
    const hashPart = apiKeyHash.replace(/^\$2[aby]\$\d+\$/, '');
    if (hashPart.length < 12) {
      return '********';
    }
    
    const start = hashPart.substring(0, 8);
    const end = hashPart.substring(hashPart.length - 4);
    return `${start}${'*'.repeat(16)}${end}`;
  }
}

module.exports = ApiKeyService;

