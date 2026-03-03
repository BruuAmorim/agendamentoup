const Funcionario = require('../models/Funcionario');
const FuncionarioService = require('../models/FuncionarioService');

class StaffController {
  /**
   * Resolve empresa_id a partir do token (igual padrão usado em AppointmentController)
   */
  resolveEmpresaId(req) {
    if (!req.user) return null;
    return req.user.empresa_id ?? (
      (req.user.role === 'moderator' || req.user.role === 'empresa') ? req.user.id : null
    );
  }

  async list(req, res) {
    try {
      const empresaId = this.resolveEmpresaId(req);
      if (!empresaId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas empresas podem listar funcionários'
        });
      }

      const funcionarios = await Funcionario.findAllByEmpresa(empresaId, { includeInactive: true });
      res.json({
        success: true,
        data: funcionarios.map(f => f.toJSON())
      });
    } catch (error) {
      console.error('Erro ao listar funcionários:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao listar funcionários',
        message: error.message || 'Erro interno ao listar funcionários',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const empresaId = this.resolveEmpresaId(req);
      if (!empresaId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas empresas podem criar funcionários'
        });
      }

      const { nome, funcao, ativo = true, lunch_start = null, lunch_end = null } = req.body || {};
      if (!nome || String(nome).trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Nome do funcionário é obrigatório e deve ter pelo menos 2 caracteres'
        });
      }

      const funcionario = await Funcionario.create({
        empresa_id: empresaId,
        nome: String(nome).trim(),
        funcao: funcao ? String(funcao).trim() : null,
        ativo: !!ativo,
        lunch_start: lunch_start || null,
        lunch_end: lunch_end || null
      });

      res.json({
        success: true,
        data: funcionario.toJSON()
      });
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao criar funcionário',
        message: error.message || 'Erro interno ao criar funcionário',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const empresaId = this.resolveEmpresaId(req);
      if (!empresaId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas empresas podem editar funcionários'
        });
      }

      const { id } = req.params;
      const data = req.body || {};

      const updated = await Funcionario.update(id, empresaId, {
        nome: data.nome,
        funcao: data.funcao,
        ativo: data.ativo,
        lunch_start: data.lunch_start || null,
        lunch_end: data.lunch_end || null
      });
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Não encontrado',
          message: 'Funcionário não encontrado'
        });
      }

      res.json({
        success: true,
        data: updated.toJSON()
      });
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao atualizar funcionário',
        message: error.message || 'Erro interno ao atualizar funcionário',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async remove(req, res) {
    try {
      const empresaId = this.resolveEmpresaId(req);
      if (!empresaId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas empresas podem remover funcionários'
        });
      }

      const { id } = req.params;
      await Funcionario.softDelete(id, empresaId);

      res.json({
        success: true,
        message: 'Funcionário desativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover funcionário:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao remover funcionário',
        message: error.message || 'Erro interno ao remover funcionário',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Exclusão permanente do funcionário (hard delete)
  async hardDelete(req, res) {
    try {
      const empresaId = this.resolveEmpresaId(req);
      if (!empresaId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas empresas podem remover funcionários'
        });
      }

      const { id } = req.params;
      await Funcionario.destroy(id, empresaId);

      res.json({
        success: true,
        message: 'Funcionário excluído permanentemente com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir funcionário (hard delete):', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao excluir funcionário',
        message: error.message || 'Erro interno ao excluir funcionário',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getServices(req, res) {
    try {
      const empresaId = this.resolveEmpresaId(req);
      if (!empresaId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas empresas podem visualizar serviços de funcionários'
        });
      }

      const { id } = req.params;
      const funcionario = await Funcionario.findById(id, empresaId);
      if (!funcionario) {
        return res.status(404).json({
          success: false,
          error: 'Não encontrado',
          message: 'Funcionário não encontrado'
        });
      }

      const services = await FuncionarioService.getServicesByFuncionario(id, empresaId);
      res.json({
        success: true,
        data: { funcionario: funcionario.toJSON(), services }
      });
    } catch (error) {
      console.error('Erro ao buscar serviços do funcionário:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao buscar serviços do funcionário',
        message: error.message || 'Erro interno ao buscar serviços do funcionário',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async setServices(req, res) {
    try {
      const empresaId = this.resolveEmpresaId(req);
      if (!empresaId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas empresas podem configurar serviços de funcionários'
        });
      }

      const { id } = req.params;
      const funcionario = await Funcionario.findById(id, empresaId);
      if (!funcionario) {
        return res.status(404).json({
          success: false,
          error: 'Não encontrado',
          message: 'Funcionário não encontrado'
        });
      }

      const { services } = req.body || {};
      await FuncionarioService.setServices(id, empresaId, services || []);

      res.json({
        success: true,
        message: 'Serviços do funcionário atualizados com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar serviços do funcionário:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao atualizar serviços do funcionário',
        message: error.message || 'Erro interno ao atualizar serviços do funcionário',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = new StaffController();

