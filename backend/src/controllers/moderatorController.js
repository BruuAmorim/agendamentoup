const { query } = require('../config/database');

/**
 * Controller para funcionalidades do perfil Moderador
 * Gerencia configurações da empresa e estatísticas rápidas
 */
class ModeratorController {

  /**
   * GET /api/moderator/stats
   * Retorna estatísticas rápidas do dia para o moderador
   */
  async getStats(req, res) {
    try {
      console.log('📊 getStats - Iniciando para usuário:', req.user?.id, req.user?.role);

      // Verificar se usuário é moderador ou funcionário (funcionários podem ver stats do moderador)
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Não autenticado',
          message: 'Usuário não autenticado'
        });
      }
      
      // Se for funcionário, usar o parent_user_id; se for moderador, usar o próprio id
      const targetUserId = (user.role === 'user' && user.parent_user_id) ? user.parent_user_id : 
                          (user.role === 'moderator' ? user.id : null);
      
      if (!targetUserId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Esta funcionalidade é restrita a moderadores e funcionários'
        });
      }

      const today = new Date().toISOString().split('T')[0];
      console.log('📅 getStats - Data de hoje:', today);

      // Query para total de agendamentos do dia
      const todayQuery = `
        SELECT COUNT(*) as total
        FROM appointments
        WHERE appointment_date = $1
          AND status != 'cancelled'
      `;

      // Query para serviço mais popular do dia
      const topServiceQuery = `
        SELECT
          COALESCE(service_type, 'Serviço Geral') as service,
          COUNT(*) as count
        FROM appointments
        WHERE appointment_date = $1
          AND status != 'cancelled'
          AND (service_type IS NOT NULL AND service_type != '')
        GROUP BY COALESCE(service_type, 'Serviço Geral')
        ORDER BY count DESC
        LIMIT 1
      `;

      console.log('🔍 getStats - Executando queries para data:', today);

      let todayResult, topServiceResult;
      try {
        [todayResult, topServiceResult] = await Promise.all([
          query(todayQuery, [today]),
          query(topServiceQuery, [today])
        ]);
      } catch (dbError) {
        // Se a tabela appointments não existir, retornar valores padrão
        if (dbError.message && dbError.message.includes('no such table')) {
          console.warn('⚠️ Tabela appointments não encontrada, retornando valores padrão');
          return res.json({
            success: true,
            data: {
              total_today: 0,
              top_service: 'Nenhum agendamento',
              top_service_count: 0
            }
          });
        }
        throw dbError; // Re-lançar se for outro erro
      }

      console.log('📊 getStats - Resultados:', {
        todayCount: todayResult.rows[0]?.total || 0,
        topServiceCount: topServiceResult.rows.length
      });

      const totalToday = parseInt(todayResult.rows[0]?.total || 0);
      const topService = topServiceResult.rows.length > 0 ?
        topServiceResult.rows[0] : { service: 'Nenhum agendamento', count: 0 };

      console.log('✅ getStats - Retornando dados:', { totalToday, topService: topService.service });

      res.json({
        success: true,
        data: {
          total_today: totalToday,
          top_service: topService.service,
          top_service_count: topService.count
        }
      });

    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas do moderador:', {
        message: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar as estatísticas',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/moderator/settings
   * Busca configurações da empresa do moderador
   */
  async getSettings(req, res) {
    try {
      console.log('⚙️ getSettings - Iniciando para usuário:', req.user?.id, req.user?.role);

      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Não autenticado',
          message: 'Usuário não autenticado'
        });
      }

      // Se for funcionário, usar o parent_user_id; se for moderador, usar o próprio id
      // Admin pode passar userId na query string
      let targetUserId;
      if (req.query.userId) {
        targetUserId = parseInt(req.query.userId);
      } else if (user.role === 'user' && user.parent_user_id) {
        // Funcionário - buscar configurações do moderador
        targetUserId = user.parent_user_id;
      } else if (user.role === 'moderator') {
        targetUserId = user.id;
      } else {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Esta funcionalidade é restrita a moderadores e funcionários'
        });
      }

      console.log('🔍 getSettings - Buscando configurações para user_id:', targetUserId);
      
      const settingsQuery = `
        SELECT company_name, services, working_hours, working_days, employee_limit, created_at, updated_at,
               campos_visiveis, campos_extras, logo, slot_interval
        FROM moderator_settings
        WHERE user_id = $1
      `;

      let result;
      try {
        result = await query(settingsQuery, [targetUserId]);
      } catch (dbError) {
        // Se a tabela moderator_settings não existir, retornar valores padrão
        if (dbError.message && (dbError.message.includes('no such table') || dbError.message.includes('does not exist'))) {
          console.warn('⚠️ Tabela moderator_settings não encontrada, retornando valores padrão');
          return res.json({
            success: true,
            data: {
              company_name: null,
              services: [],
              working_hours: { start: '09:00', end: '18:00' },
              working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
              employee_limit: 10,
              campos_visiveis: ['nome', 'telefone'],
              campos_extras: [],
              logo: null,
              slot_interval: 30
            }
          });
        }
        throw dbError; // Re-lançar se for outro erro
      }
      
      console.log('📊 getSettings - Query executada, resultados:', result.rows.length);

      let settings = {
        company_name: null,
        services: [],
        working_hours: { start: '09:00', end: '18:00' },
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        employee_limit: 10,
        campos_visiveis: ['nome', 'telefone'],
        campos_extras: [],
        logo: null,
        slot_interval: 30
      };

      if (result.rows.length > 0) {
        const row = result.rows[0];
        console.log('📋 getSettings - Dados encontrados:', {
          company_name: row.company_name,
          services_type: typeof row.services,
          working_hours: row.working_hours,
          working_days: row.working_days
        });

        // Parse JSON se necessário (SQLite armazena como string)
        let services = row.services;
        let workingHours = row.working_hours;
        let workingDays = row.working_days;
        let camposVisiveis = row.campos_visiveis;
        let camposExtras = row.campos_extras;
        
        try {
          if (typeof services === 'string') services = JSON.parse(services);
          if (typeof workingHours === 'string') workingHours = JSON.parse(workingHours);
          if (typeof workingDays === 'string') workingDays = JSON.parse(workingDays);
          if (typeof camposVisiveis === 'string') camposVisiveis = JSON.parse(camposVisiveis);
          if (typeof camposExtras === 'string') camposExtras = JSON.parse(camposExtras);
        } catch (e) {
          console.warn('Erro ao fazer parse do JSON:', e);
        }
        
        settings = {
          company_name: row.company_name,
          services: services || [],
          working_hours: workingHours || { start: '09:00', end: '18:00' },
          working_days: workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          employee_limit: row.employee_limit || 10,
          campos_visiveis: camposVisiveis || ['nome', 'telefone'],
          campos_extras: camposExtras || [],
          logo: row.logo || null,
          slot_interval: row.slot_interval || 30
        };
      } else {
        console.log('📋 getSettings - Nenhum registro encontrado, retornando padrão');
      }

      console.log('✅ getSettings - Retornando:', settings);
      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      console.error('Erro ao buscar configurações do moderador:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar as configurações'
      });
    }
  }

  /**
   * PUT /api/moderator/settings
   * Atualiza configurações da empresa do moderador
   */
  async updateSettings(req, res) {
    try {
      console.log('🔧 updateSettings - Iniciando para usuário:', req.user?.id);

      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Não autenticado',
          message: 'Usuário não autenticado'
        });
      }
      
      // Apenas moderadores podem atualizar configurações (não funcionários)
      if (user.role !== 'moderator') {
        console.log('❌ updateSettings - Acesso negado:', { userId: user?.id, role: user?.role });
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas moderadores podem atualizar configurações'
        });
      }

      const { company_name, services, working_hours, working_days, campos_visiveis, campos_extras, logo, slot_interval } = req.body;
      console.log('📝 updateSettings - Dados recebidos:', { 
        company_name, 
        services_count: services?.length,
        working_hours,
        working_days,
        campos_visiveis,
        campos_extras_count: campos_extras?.length,
        has_logo: !!logo,
        slot_interval
      });

      // Validar dados
      if (typeof company_name !== 'string' && company_name !== null) {
        console.log('❌ updateSettings - company_name inválido:', typeof company_name);
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Nome da empresa deve ser uma string ou null'
        });
      }

      if (!Array.isArray(services)) {
        console.log('❌ updateSettings - services não é array:', typeof services);
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Serviços deve ser um array'
        });
      }

      // Validar working_hours
      const defaultWorkingHours = { start: '09:00', end: '18:00' };
      let validWorkingHours = defaultWorkingHours;
      if (working_hours) {
        if (typeof working_hours === 'object' && working_hours.start && working_hours.end) {
          validWorkingHours = working_hours;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            message: 'Horário de funcionamento deve ter formato {start: "HH:MM", end: "HH:MM"}'
          });
        }
      }

      // Validar working_days
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const defaultWorkingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      let validWorkingDays = defaultWorkingDays;
      if (working_days) {
        if (Array.isArray(working_days) && working_days.every(day => validDays.includes(day))) {
          validWorkingDays = working_days;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            message: 'Dias de funcionamento deve ser um array com valores válidos (monday, tuesday, etc.)'
          });
        }
      }

      // Verificar se já existe configuração para este usuário
      console.log('🔍 updateSettings - Verificando se configuração existe...');
      const checkQuery = 'SELECT id FROM moderator_settings WHERE user_id = $1';
      const checkResult = await query(checkQuery, [user.id]);
      console.log('📊 updateSettings - Configuração existe:', checkResult.rows.length > 0);

      // Query para buscar configurações (usada em ambos os casos)
      const selectQuery = 'SELECT company_name, services, working_hours, working_days, campos_visiveis, campos_extras, logo, slot_interval FROM moderator_settings WHERE user_id = $1';
      
      if (checkResult.rows.length > 0) {
        // Atualizar configuração existente
        console.log('📝 updateSettings - Atualizando configuração existente...');
        // Preparar campos adicionais
        const camposVisiveis = Array.isArray(campos_visiveis) ? JSON.stringify(campos_visiveis) : JSON.stringify(['nome', 'telefone']);
        const camposExtras = Array.isArray(campos_extras) ? JSON.stringify(campos_extras) : JSON.stringify([]);
        const slotInterval = slot_interval && !isNaN(slot_interval) ? parseInt(slot_interval) : 30;

        const updateQuery = `
          UPDATE moderator_settings
          SET company_name = $1, services = $2, working_hours = $4, working_days = $5, 
              campos_visiveis = $6, campos_extras = $7, logo = $8, slot_interval = $9, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $3
        `;
        await query(updateQuery, [
          company_name, 
          JSON.stringify(services), 
          user.id,
          JSON.stringify(validWorkingHours),
          JSON.stringify(validWorkingDays),
          camposVisiveis,
          camposExtras,
          logo || null,
          slotInterval
        ]);
        
        // Buscar dados atualizados (usar SELECT separado para garantir compatibilidade com SQLite)
        let updateResult = await query(selectQuery, [user.id]);
        console.log('✅ updateSettings - Configuração atualizada, linhas retornadas:', updateResult.rows.length);

        if (updateResult.rows.length === 0) {
          // Se não encontrou após atualização, tentar criar novamente
          console.warn('⚠️ Configuração não encontrada após atualização, tentando criar...');
          // Preparar campos adicionais
          const camposVisiveis = Array.isArray(campos_visiveis) ? JSON.stringify(campos_visiveis) : JSON.stringify(['nome', 'telefone']);
          const camposExtras = Array.isArray(campos_extras) ? JSON.stringify(campos_extras) : JSON.stringify([]);
          const slotInterval = slot_interval && !isNaN(slot_interval) ? parseInt(slot_interval) : 30;

          const insertQuery = `
            INSERT INTO moderator_settings (user_id, company_name, services, working_hours, working_days, campos_visiveis, campos_extras, logo, slot_interval)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `;
          await query(insertQuery, [
            user.id, 
            company_name, 
            JSON.stringify(services),
            JSON.stringify(validWorkingHours),
            JSON.stringify(validWorkingDays),
            camposVisiveis,
            camposExtras,
            logo || null,
            slotInterval
          ]);
          
          // Buscar novamente
          const retryResult = await query(selectQuery, [user.id]);
          if (retryResult.rows.length === 0) {
            throw new Error('Falha ao criar/atualizar configuração');
          }
          updateResult = retryResult;
        }
        
        const row = updateResult.rows[0];
        // Parse JSON se necessário (SQLite armazena como string)
        let parsedServices = row.services;
        let parsedWorkingHours = row.working_hours;
        let parsedWorkingDays = row.working_days;
        
        try {
          if (typeof parsedServices === 'string' && parsedServices.trim()) {
            parsedServices = JSON.parse(parsedServices);
          }
          if (typeof parsedWorkingHours === 'string' && parsedWorkingHours.trim()) {
            parsedWorkingHours = JSON.parse(parsedWorkingHours);
          }
          if (typeof parsedWorkingDays === 'string' && parsedWorkingDays.trim()) {
            parsedWorkingDays = JSON.parse(parsedWorkingDays);
          }
        } catch (e) {
          console.warn('⚠️ Erro ao fazer parse do JSON:', e.message);
          // Usar valores padrão se o parse falhar
          if (!Array.isArray(parsedServices)) parsedServices = [];
          if (typeof parsedWorkingHours !== 'object') parsedWorkingHours = { start: '09:00', end: '18:00' };
          if (!Array.isArray(parsedWorkingDays)) parsedWorkingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        }
        
        return res.json({
          success: true,
          data: {
            company_name: row.company_name || null,
            services: parsedServices || [],
            working_hours: parsedWorkingHours || { start: '09:00', end: '18:00' },
            working_days: parsedWorkingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          },
          message: 'Configurações atualizadas com sucesso'
        });

      } else {
        // Criar nova configuração
        console.log('📝 updateSettings - Criando nova configuração...');
        // Preparar campos adicionais
        const camposVisiveis = Array.isArray(campos_visiveis) ? JSON.stringify(campos_visiveis) : JSON.stringify(['nome', 'telefone']);
        const camposExtras = Array.isArray(campos_extras) ? JSON.stringify(campos_extras) : JSON.stringify([]);
        const slotInterval = slot_interval && !isNaN(slot_interval) ? parseInt(slot_interval) : 30;

        const insertQuery = `
          INSERT INTO moderator_settings (user_id, company_name, services, working_hours, working_days, campos_visiveis, campos_extras, logo, slot_interval)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        await query(insertQuery, [
          user.id, 
          company_name, 
          JSON.stringify(services),
          JSON.stringify(validWorkingHours),
          JSON.stringify(validWorkingDays),
          camposVisiveis,
          camposExtras,
          logo || null,
          slotInterval
        ]);
        
        // Buscar dados inseridos (usar SELECT separado para garantir compatibilidade com SQLite)
        let insertResult = await query(selectQuery, [user.id]);
        console.log('✅ updateSettings - Configuração criada, linhas retornadas:', insertResult.rows.length);

        if (insertResult.rows.length === 0) {
          // Tentar buscar novamente após um pequeno delay (para SQLite)
          await new Promise(resolve => setTimeout(resolve, 100));
          const retryResult = await query(selectQuery, [user.id]);
          if (retryResult.rows.length === 0) {
            throw new Error('Falha ao criar configuração - registro não encontrado após inserção');
          }
          insertResult = retryResult;
        }
        
        const row = insertResult.rows[0];
        // Parse JSON se necessário (SQLite armazena como string)
        let parsedServices = row.services;
        let parsedWorkingHours = row.working_hours;
        let parsedWorkingDays = row.working_days;
        
        try {
          if (typeof parsedServices === 'string' && parsedServices.trim()) {
            parsedServices = JSON.parse(parsedServices);
          }
          if (typeof parsedWorkingHours === 'string' && parsedWorkingHours.trim()) {
            parsedWorkingHours = JSON.parse(parsedWorkingHours);
          }
          if (typeof parsedWorkingDays === 'string' && parsedWorkingDays.trim()) {
            parsedWorkingDays = JSON.parse(parsedWorkingDays);
          }
        } catch (e) {
          console.warn('⚠️ Erro ao fazer parse do JSON:', e.message);
          // Usar valores padrão se o parse falhar
          if (!Array.isArray(parsedServices)) parsedServices = [];
          if (typeof parsedWorkingHours !== 'object') parsedWorkingHours = { start: '09:00', end: '18:00' };
          if (!Array.isArray(parsedWorkingDays)) parsedWorkingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        }
        
        return res.json({
          success: true,
          data: {
            company_name: row.company_name || null,
            services: parsedServices || [],
            working_hours: parsedWorkingHours || { start: '09:00', end: '18:00' },
            working_days: parsedWorkingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          },
          message: 'Configurações criadas com sucesso'
        });
      }

    } catch (error) {
      console.error('❌ ERRO GRAVE AO SALVAR CONFIGURAÇÕES:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack,
        userId: req.user?.id,
        body: req.body
      });

      // Verificar se é erro relacionado à tabela não existir
      if (error.message && error.message.includes('relation "moderator_settings" does not exist')) {
        console.error('🚨 Tabela moderator_settings não existe! Execute: node setup_moderator_table.js');
        return res.status(500).json({
          success: false,
          error: 'Configuração do banco de dados',
          message: 'Tabela de configurações não encontrada. Execute o script de setup.',
          details: 'Execute: node setup_moderator_table.js'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível salvar as configurações',
        details: error.message
      });
    }
  }

  /**
   * GET /api/moderator/company-info
   * Retorna informações públicas da empresa (para uso no frontend do cliente)
   */
  async getCompanyInfo(req, res) {
    try {
      // Tentar buscar informações da empresa
      let companyInfo = {
        company_name: null,
        services: []
      };

      try {
        // Por enquanto, retorna informações do primeiro moderador encontrado
        // Em produção, pode ser baseado em domínio ou configuração global
        const companyQuery = `
          SELECT ms.company_name, ms.services
          FROM moderator_settings ms
          JOIN users u ON ms.user_id = u.id
          WHERE u.role = 'moderator' AND u."isActive" = true
          LIMIT 1
        `;

        const result = await query(companyQuery);

        if (result.rows.length > 0) {
          companyInfo = {
            company_name: result.rows[0].company_name,
            services: Array.isArray(result.rows[0].services) ? result.rows[0].services : []
          };
        }
      } catch (dbError) {
        // Se a tabela não existir ainda, retorna valores padrão
        console.warn('Tabela moderator_settings não encontrada, usando valores padrão:', dbError.message);
      }

      res.json({
        success: true,
        data: companyInfo
      });

    } catch (error) {
      console.error('Erro ao buscar informações da empresa:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar as informações da empresa'
      });
    }
  }

  /**
   * GET /api/moderator/employees
   * Lista funcionários vinculados ao moderador
   */
  async getEmployees(req, res) {
    try {
      const user = req.user;
      if (!user || user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Esta funcionalidade é restrita a moderadores'
        });
      }

      const employeesQuery = `
        SELECT u.id, u.name, u.email, u.isActive, e.created_at
        FROM employees e
        JOIN users u ON e.user_id = u.id
        WHERE e.moderator_id = $1
        ORDER BY u.name ASC
      `;
      const result = await query(employeesQuery, [user.id]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar os funcionários'
      });
    }
  }

  /**
   * POST /api/moderator/employees
   * Adiciona um funcionário ao moderador
   */
  async addEmployee(req, res) {
    try {
      const user = req.user;
      if (!user || user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Esta funcionalidade é restrita a moderadores'
        });
      }

      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'ID do usuário é obrigatório'
        });
      }

      // Verificar se o usuário existe e é do tipo 'user'
      const userQuery = 'SELECT id, role FROM users WHERE id = $1';
      const userResult = await query(userQuery, [user_id]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
          message: 'O usuário especificado não existe'
        });
      }

      if (userResult.rows[0].role !== 'user') {
        return res.status(400).json({
          success: false,
          error: 'Tipo inválido',
          message: 'Apenas usuários comuns podem ser funcionários'
        });
      }

      // Verificar limite de funcionários
      const settingsQuery = 'SELECT employee_limit FROM moderator_settings WHERE user_id = $1';
      const settingsResult = await query(settingsQuery, [user.id]);
      const employeeLimit = settingsResult.rows[0]?.employee_limit || 10;

      const countQuery = 'SELECT COUNT(*) as count FROM employees WHERE moderator_id = $1';
      const countResult = await query(countQuery, [user.id]);
      const currentCount = parseInt(countResult.rows[0]?.count || 0);

      if (currentCount >= employeeLimit) {
        return res.status(400).json({
          success: false,
          error: 'Limite atingido',
          message: `Você atingiu o limite de ${employeeLimit} funcionários. Entre em contato com o administrador para aumentar o limite.`
        });
      }

      // Verificar se já está vinculado
      const checkQuery = 'SELECT id FROM employees WHERE user_id = $1 AND moderator_id = $2';
      const checkResult = await query(checkQuery, [user_id, user.id]);
      
      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Já vinculado',
          message: 'Este usuário já é funcionário deste moderador'
        });
      }

      // Adicionar funcionário
      const insertQuery = 'INSERT INTO employees (user_id, moderator_id) VALUES ($1, $2)';
      await query(insertQuery, [user_id, user.id]);

      res.json({
        success: true,
        message: 'Funcionário adicionado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao adicionar funcionário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível adicionar o funcionário'
      });
    }
  }

  /**
   * DELETE /api/moderator/employees/:id
   * Remove um funcionário do moderador
   */
  async removeEmployee(req, res) {
    try {
      const user = req.user;
      if (!user || user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Esta funcionalidade é restrita a moderadores'
        });
      }

      const { id } = req.params;

      const deleteQuery = 'DELETE FROM employees WHERE user_id = $1 AND moderator_id = $2';
      await query(deleteQuery, [id, user.id]);

      res.json({
        success: true,
        message: 'Funcionário removido com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover funcionário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível remover o funcionário'
      });
    }
  }
}

module.exports = new ModeratorController();
