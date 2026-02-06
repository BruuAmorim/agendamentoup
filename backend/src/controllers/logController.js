const { query } = require('../config/database');

/**
 * Controller para gerenciamento de logs do sistema
 * Apenas admin_master pode visualizar logs
 */
class LogController {
  /**
   * GET /api/logs
   * Lista logs do sistema com filtros e paginação
   */
  async getLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        action,
        entity_type,
        user_id,
        start_date,
        end_date,
        search
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Construir query base
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Filtros
      if (action) {
        whereConditions.push(`action = $${paramIndex}`);
        queryParams.push(action);
        paramIndex++;
      }

      if (entity_type) {
        whereConditions.push(`entity_type = $${paramIndex}`);
        queryParams.push(entity_type);
        paramIndex++;
      }

      if (user_id) {
        whereConditions.push(`user_id = $${paramIndex}`);
        queryParams.push(parseInt(user_id));
        paramIndex++;
      }

      if (start_date) {
        whereConditions.push(`created_at >= $${paramIndex}`);
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        whereConditions.push(`created_at <= $${paramIndex}`);
        queryParams.push(end_date);
        paramIndex++;
      }

      if (search) {
        // Adaptar para SQLite (LIKE) e PostgreSQL (ILIKE)
        const dialect = require('../config/database').sequelize.getDialect();
        const likeOperator = dialect === 'sqlite' ? 'LIKE' : 'ILIKE';
        whereConditions.push(`(description ${likeOperator} $${paramIndex} OR user_name ${likeOperator} $${paramIndex} OR user_email ${likeOperator} $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Query para contar total
      const countQuery = `SELECT COUNT(*) as total FROM system_logs ${whereClause}`;
      const countResult = await query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0]?.total || 0);

      // Query para buscar logs
      const logsQuery = `
        SELECT 
          id,
          action,
          entity_type,
          entity_id,
          user_id,
          user_name,
          user_email,
          description,
          details,
          ip_address,
          user_agent,
          created_at
        FROM system_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limitNum, offset);
      const logsResult = await query(logsQuery, queryParams);

      // Parse details JSON
      const logs = logsResult.rows.map(log => {
        let details = null;
        if (log.details) {
          try {
            details = JSON.parse(log.details);
          } catch (e) {
            details = log.details;
          }
        }
        return {
          ...log,
          details
        };
      });

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar os logs'
      });
    }
  }

  /**
   * GET /api/logs/stats
   * Retorna estatísticas dos logs
   */
  async getLogStats(req, res) {
    try {
      // Total de logs
      const totalQuery = 'SELECT COUNT(*) as total FROM system_logs';
      const totalResult = await query(totalQuery);
      const total = parseInt(totalResult.rows[0]?.total || 0);

      // Logs por ação
      const actionsQuery = `
        SELECT action, COUNT(*) as count
        FROM system_logs
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `;
      const actionsResult = await query(actionsQuery);

      // Logs por tipo de entidade
      const entitiesQuery = `
        SELECT entity_type, COUNT(*) as count
        FROM system_logs
        GROUP BY entity_type
        ORDER BY count DESC
      `;
      const entitiesResult = await query(entitiesQuery);

      // Logs hoje
      const todayQuery = `
        SELECT COUNT(*) as count
        FROM system_logs
        WHERE DATE(created_at) = CURRENT_DATE
      `;
      const todayResult = await query(todayQuery);
      const today = parseInt(todayResult.rows[0]?.count || 0);

      res.json({
        success: true,
        data: {
          total,
          today,
          by_action: actionsResult.rows,
          by_entity: entitiesResult.rows
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas de logs:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar as estatísticas'
      });
    }
  }

  /**
   * GET /api/logs/:id
   * Busca um log específico
   */
  async getLogById(req, res) {
    try {
      const { id } = req.params;

      const logQuery = `
        SELECT *
        FROM system_logs
        WHERE id = $1
      `;
      const result = await query(logQuery, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Log não encontrado',
          message: 'O log especificado não existe'
        });
      }

      let log = result.rows[0];
      if (log.details) {
        try {
          log.details = JSON.parse(log.details);
        } catch (e) {
          // Manter como string se não for JSON válido
        }
      }

      res.json({
        success: true,
        data: log
      });
    } catch (error) {
      console.error('Erro ao buscar log:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar o log'
      });
    }
  }
}

module.exports = new LogController();

