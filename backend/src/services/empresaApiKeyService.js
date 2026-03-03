const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * Serviço profissional para gerenciamento de API Keys de empresas
 * Arquitetura SaaS isolada - cada empresa gerencia sua própria chave
 */
class EmpresaApiKeyService {

  /**
   * Gerar API Key no formato: CLOUDDAGENDA_<empresaId>_<randomString>
   * @param {number} empresaId - ID da empresa
   * @returns {string} API Key completa
   */
  static generateApiKey(empresaId) {
    // Gerar string aleatória de 32 caracteres hexadecimais
    const randomString = crypto.randomBytes(16).toString('hex');
    const apiKey = `CLOUDDAGENDA_${empresaId}_${randomString}`;
    console.log(`🔑 [EmpresaApiKeyService] API Key gerada para empresa ID: ${empresaId}`);
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
      console.log('🔐 [EmpresaApiKeyService] API Key hasheada com sucesso');
      return hash;
    } catch (error) {
      console.error('❌ [EmpresaApiKeyService] Erro ao criar hash:', error);
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
      console.error('❌ [EmpresaApiKeyService] Erro ao verificar API Key:', error);
      return false;
    }
  }

  /**
   * Regenerar API Key para uma empresa
   * @param {number} empresaId - ID da empresa
   * @returns {Promise<{apiKey: string, prefix: string}>} API Key e prefixo
   */
  static async regenerateApiKey(empresaId) {
    try {
      console.log(`🔄 [EmpresaApiKeyService] Regenerando API Key para empresa ID: ${empresaId}`);

      // Buscar empresa no banco
      const empresa = await User.findByPk(empresaId);
      if (!empresa) {
        throw new Error(`Empresa com ID ${empresaId} não encontrada`);
      }

      // Verificar se é realmente uma empresa
      if (empresa.role !== 'empresa' && empresa.role !== 'moderator') {
        throw new Error(`Usuário com ID ${empresaId} não é uma empresa (role: ${empresa.role})`);
      }

      // Gerar nova API Key
      const apiKey = this.generateApiKey(empresaId);
      
      // Extrair prefixo (CLOUDDAGENDA_<empresaId>)
      const prefix = `CLOUDDAGENDA_${empresaId}`;
      
      // Criar hash
      const hash = await this.hashApiKey(apiKey);

      // Atualizar empresa com nova API Key
      const now = new Date();
      const updateData = {
        api_key_hash: hash,
        api_key_prefix: prefix,
        api_key_created_at: empresa.api_key_created_at || now,
        api_key_last_regenerated: now
      };
      
      console.log(`🔍 [EmpresaApiKeyService] Dados para atualizar:`, {
        hasHash: !!updateData.api_key_hash,
        prefix: updateData.api_key_prefix,
        createdAt: updateData.api_key_created_at,
        lastRegenerated: updateData.api_key_last_regenerated
      });
      
      await empresa.update(updateData);
      
      // Recarregar empresa para garantir que os dados foram salvos
      await empresa.reload();
      
      console.log(`✅ [EmpresaApiKeyService] Empresa atualizada. Verificando dados salvos:`, {
        id: empresa.id,
        hasHash: !!empresa.api_key_hash,
        prefix: empresa.api_key_prefix,
        hasPrefix: !!empresa.api_key_prefix
      });

      console.log(`✅ [EmpresaApiKeyService] API Key regenerada para empresa ID: ${empresaId}`);
      
      return {
        apiKey, // Retornar apenas uma vez
        prefix
      };
    } catch (error) {
      console.error('❌ [EmpresaApiKeyService] Erro ao regenerar API Key:', error);
      throw error;
    }
  }

  /**
   * Buscar empresa por API Key (busca direta sem loops)
   * @param {string} apiKey - API Key em texto puro
   * @returns {Promise<User|null>} Empresa encontrada ou null
   */
  static async findEmpresaByApiKey(apiKey) {
    try {
      // Extrair empresa_id do prefixo da chave (CLOUDDAGENDA_<empresaId>_<random>)
      const prefixMatch = apiKey.match(/^CLOUDDAGENDA_(\d+)_/);
      if (!prefixMatch) {
        console.log('⚠️ [EmpresaApiKeyService] Formato de API Key inválido');
        return null;
      }

      const empresaId = parseInt(prefixMatch[1]);
      console.log(`🔍 [EmpresaApiKeyService] Buscando empresa ID: ${empresaId} pelo prefixo`);

      // Buscar empresa diretamente pelo ID e prefixo (busca otimizada)
      const empresa = await User.findOne({
        where: {
          id: empresaId,
          api_key_prefix: `CLOUDDAGENDA_${empresaId}`,
          api_key_hash: { [Op.ne]: null },
          role: { [Op.in]: ['empresa', 'moderator'] }
        },
        attributes: ['id', 'api_key_hash', 'name', 'email', 'role']
      });

      if (!empresa || !empresa.api_key_hash) {
        console.log('⚠️ [EmpresaApiKeyService] Empresa não encontrada ou sem API Key');
        return null;
      }

      // Verificar se a chave corresponde ao hash
      const isValid = await this.verifyApiKey(apiKey, empresa.api_key_hash);
      if (!isValid) {
        console.log('⚠️ [EmpresaApiKeyService] API Key inválida para empresa encontrada');
        return null;
      }

      console.log(`✅ [EmpresaApiKeyService] Empresa encontrada por API Key: ID ${empresa.id}`);
      return empresa;
    } catch (error) {
      console.error('❌ [EmpresaApiKeyService] Erro ao buscar empresa por API Key:', error);
      return null;
    }
  }

  /**
   * Obter informações da API Key de uma empresa (sem expor a chave)
   * @param {number} empresaId - ID da empresa
   * @returns {Promise<{hasApiKey: boolean, prefix: string|null, createdAt: Date|null, lastRegenerated: Date|null}>}
   */
  static async getApiKeyInfo(empresaId) {
    try {
      console.log(`🔍 [EmpresaApiKeyService] Buscando informações da API Key para empresa ID: ${empresaId}`);
      
      const empresa = await User.findByPk(empresaId, {
        attributes: ['id', 'api_key_hash', 'api_key_prefix', 'api_key_created_at', 'api_key_last_regenerated']
      });

      if (!empresa) {
        console.log(`⚠️ [EmpresaApiKeyService] Empresa não encontrada: ${empresaId}`);
        return {
          hasApiKey: false,
          prefix: null,
          createdAt: null,
          lastRegenerated: null
        };
      }

      // CRÍTICO: hasApiKey deve ser true se tiver hash (prefix é opcional mas recomendado)
      // Se tiver hash mas não tiver prefix, ainda considera como tendo API Key
      const hasApiKeyHash = !!empresa.api_key_hash;
      const hasApiKey = hasApiKeyHash; // Simplificado: se tem hash, tem API Key
      
      console.log(`✅ [EmpresaApiKeyService] Informações encontradas:`, {
        empresaId: empresa.id,
        hasApiKeyHash,
        hashValue: empresa.api_key_hash ? empresa.api_key_hash.substring(0, 20) + '...' : null,
        hasApiKeyPrefix: !!empresa.api_key_prefix,
        prefixValue: empresa.api_key_prefix,
        hasApiKey, // Este é o valor que será retornado
        createdAt: empresa.api_key_created_at,
        lastRegenerated: empresa.api_key_last_regenerated
      });

      // Garantir que hasApiKey seja boolean explícito
      const result = {
        hasApiKey: Boolean(hasApiKey),
        prefix: empresa.api_key_prefix || null,
        createdAt: empresa.api_key_created_at,
        lastRegenerated: empresa.api_key_last_regenerated
      };
      
      console.log(`✅ [EmpresaApiKeyService] Retornando resultado:`, result);
      
      return result;
    } catch (error) {
      console.error('❌ [EmpresaApiKeyService] Erro ao obter informações da API Key:', error);
      return {
        hasApiKey: false,
        prefix: null,
        createdAt: null,
        lastRegenerated: null
      };
    }
  }
}

module.exports = EmpresaApiKeyService;

