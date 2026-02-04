const Appointment = require('../models/Appointment');

/**
 * Controller para métricas e análises do dashboard
 * Fornece dados estatísticos para o perfil Moderador
 */
class DashboardController {

  /**
   * GET /api/dashboard/daily-stats
   * Retorna contagem de agendamentos agrupados por dia (últimos 30 dias)
   */
  async getDailyStats(req, res) {
    try {
      console.log('DashboardController - getDailyStats chamado');

      // Calcular data de 30 dias atrás
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      // Usar dados em memória (desenvolvimento)
      const allAppointments = await Appointment.find();
      const statsMap = new Map();

      // Filtrar apenas agendamentos não cancelados e dentro do período
      const filteredAppointments = allAppointments.filter(apt => {
        if (apt.status === 'cancelled') return false;
        const aptDate = new Date(apt.appointment_date);
        const start = new Date(startDate);
        return aptDate >= start;
      });

      console.log(`Encontrados ${filteredAppointments.length} agendamentos no período`);

      // Agrupar por data
      filteredAppointments.forEach(apt => {
        const date = apt.appointment_date;
        statsMap.set(date, (statsMap.get(date) || 0) + 1);
      });

      // Converter para array
      let dailyStats = Array.from(statsMap.entries()).map(([date, count]) => ({
        date,
        count
      }));

      // Ordenar por data
      dailyStats.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Preencher dias sem agendamentos com count: 0
      const filledStats = this.fillMissingDays(dailyStats, startDate);

      console.log(`Retornando ${filledStats.length} dias de estatísticas`);

      res.json({
        success: true,
        data: filledStats,
        period: {
          start_date: startDate,
          end_date: new Date().toISOString().split('T')[0],
          total_days: 30
        }
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas diárias:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar as estatísticas diárias'
      });
    }
  }

  /**
   * GET /api/dashboard/top-services
   * Retorna ranking de serviços mais agendados
   */
  async getTopServices(req, res) {
    try {
      // Usar dados em memória (desenvolvimento)
      const allAppointments = await Appointment.find();
      const servicesMap = new Map();

      // Filtrar apenas agendamentos não cancelados com notes
      const filteredAppointments = allAppointments.filter(apt => {
        return apt.status !== 'cancelled' &&
               apt.notes &&
               apt.notes.trim() !== '';
      });

      console.log(`Encontrados ${filteredAppointments.length} agendamentos com serviços`);

      // Agrupar por serviço (notes)
      filteredAppointments.forEach(apt => {
        const service = apt.notes.trim();
        servicesMap.set(service, (servicesMap.get(service) || 0) + 1);
      });

      // Converter para array e ordenar
      const topServices = Array.from(servicesMap.entries())
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10

      console.log(`Retornando top ${topServices.length} serviços`);

      res.json({
        success: true,
        data: topServices,
        total_services: topServices.length
      });

    } catch (error) {
      console.error('Erro ao buscar top serviços:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar o ranking de serviços'
      });
    }
  }

  /**
   * GET /api/dashboard/summary
   * Retorna resumo geral: total de agendamentos (mês/semana/hoje)
   */
  async getSummary(req, res) {
    try {
      const now = new Date();

      // Datas de referência
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Domingo da semana atual

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Usar dados em memória (desenvolvimento)
      const allAppointments = await Appointment.find();

      // Filtrar apenas agendamentos não cancelados
      const activeAppointments = allAppointments.filter(apt => apt.status !== 'cancelled');

      console.log(`Encontrados ${activeAppointments.length} agendamentos ativos`);

      // Contar mensal
      const monthlyTotal = activeAppointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= monthStart && aptDate <= now;
      }).length;

      // Contar semanal
      const weeklyTotal = activeAppointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= weekStart && aptDate <= now;
      }).length;

      // Contar hoje
      const todayTotal = activeAppointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate.toDateString() === today.toDateString();
      }).length;

      const summary = {
        monthly: {
          total: monthlyTotal,
          period: `${monthStart.toISOString().split('T')[0]} até ${now.toISOString().split('T')[0]}`
        },
        weekly: {
          total: weeklyTotal,
          period: `${weekStart.toISOString().split('T')[0]} até ${now.toISOString().split('T')[0]}`
        },
        today: {
          total: todayTotal,
          date: today.toISOString().split('T')[0]
        }
      };

      console.log('Resumo calculado:', summary);

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Erro ao buscar resumo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar o resumo'
      });
    }
  }

  /**
   * Método auxiliar: Preenche dias sem agendamentos com count: 0
   */
  fillMissingDays(dailyStats, startDate) {
    const filled = [];
    const start = new Date(startDate);
    const end = new Date();

    // Criar mapa dos dados existentes
    const statsMap = new Map();
    dailyStats.forEach(stat => {
      statsMap.set(stat.date, stat.count);
    });

    // Preencher todos os dias
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      filled.push({
        date: dateStr,
        count: statsMap.get(dateStr) || 0
      });
      current.setDate(current.getDate() + 1);
    }

    return filled;
  }
}

module.exports = new DashboardController();