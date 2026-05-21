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
    const randomString = crypto.randomBytes(16).toString('hex');
    return `CLOUDDAGENDA_${empresaId}_${randomString}`;
  }

  /**
   * Criar hash da API Key para armazenamento seguro
   * @param {string} apiKey - API Key em texto puro
   * @returns {Promise<string>} Hash bcrypt da API Key
   */
  static async hashApiKey(apiKey) {
    try {
      return await bcrypt.hash(apiKey, 10);
    } catch (error) {
      console.error('Erro ao criar hash da API Key:', error);
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
    } catch (_) {
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
      const empresa = await User.findByPk(empresaId);
      if (!empresa) throw new Error(`Empresa com ID ${empresaId} não encontrada`);
      if (empresa.role !== 'moderator') throw new Error(`Usuário com ID ${empresaId} não é uma empresa (role: ${empresa.role})`);

      const apiKey = this.generateApiKey(empresaId);
      const prefix = `CLOUDDAGENDA_${empresaId}`;
      const hash = await this.hashApiKey(apiKey);
      const now = new Date();

      await empresa.update({
        api_key_hash: hash,
        api_key_prefix: prefix,
        api_key_created_at: empresa.api_key_created_at || now,
        api_key_last_regenerated: now
      });

      return { apiKey, prefix };
    } catch (error) {
      console.error('Erro ao regenerar API Key:', error);
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
      const prefixMatch = apiKey.match(/^CLOUDDAGENDA_(\d+)_/);
      if (!prefixMatch) return null;

      const empresaId = parseInt(prefixMatch[1]);
      const empresa = await User.findOne({
        where: {
          id: empresaId,
          api_key_prefix: `CLOUDDAGENDA_${empresaId}`,
          api_key_hash: { [Op.ne]: null },
          role: 'moderator'
        },
        attributes: ['id', 'api_key_hash', 'name', 'email', 'role']
      });

      if (!empresa || !empresa.api_key_hash) return null;

      const isValid = await this.verifyApiKey(apiKey, empresa.api_key_hash);
      return isValid ? empresa : null;
    } catch (error) {
      console.error('Erro ao buscar empresa por API Key:', error);
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
      const empresa = await User.findByPk(empresaId, {
        attributes: ['id', 'api_key_hash', 'api_key_prefix', 'api_key_created_at', 'api_key_last_regenerated']
      });

      if (!empresa) {
        return { hasApiKey: false, prefix: null, createdAt: null, lastRegenerated: null };
      }

      return {
        hasApiKey: !!empresa.api_key_hash,
        prefix: empresa.api_key_prefix || null,
        createdAt: empresa.api_key_created_at,
        lastRegenerated: empresa.api_key_last_regenerated
      };
    } catch (error) {
      console.error('Erro ao obter informações da API Key:', error);
      return { hasApiKey: false, prefix: null, createdAt: null, lastRegenerated: null };
    }
  }
}

module.exports = EmpresaApiKeyService;

