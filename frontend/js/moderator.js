/**
 * Dashboard Moderador - Aevum
 *
 * Gerencia a interface de métricas e análises para o perfil Moderador.
 * Inclui gráficos interativos e estatísticas em tempo real.
 */

class ModeratorDashboard {
  constructor() {
    this.api = new ApiService();
    this.dailyChart = null;
    this.servicesChart = null;
    this.init();
  }

  /**
   * Inicializa o dashboard
   */
  async init() {
    console.log('🚀 Inicializando Dashboard Moderador...');

    // Verificar autenticação
    if (!this.checkAuthentication()) {
      this.redirectToLogin();
      return;
    }

    // Configurar event listeners
    this.setupEventListeners();

    // Carregar dados do dashboard
    await this.loadDashboardData();
  }

  /**
   * Verifica se o usuário está autenticado
   */
  checkAuthentication() {
    const user = this.api.getCurrentUser();
    if (!user) {
      console.warn('❌ Usuário não autenticado');
      return false;
    }

    // Verificar se é moderador (assumindo que tem role específica ou é admin)
    if (user.role !== 'admin' && user.role !== 'moderator') {
      console.warn('❌ Usuário não tem permissão para acessar o dashboard moderador');
      this.showError('Acesso negado. Esta área é restrita a moderadores.');
      return false;
    }

    console.log('✅ Usuário autenticado:', user.email);
    return true;
  }

  /**
   * Redireciona para login
   */
  redirectToLogin() {
    window.location.href = 'css/index.html';
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Recarregar dados ao clicar em cards (opcional)
    document.querySelectorAll('.stat-card').forEach(card => {
      card.addEventListener('click', () => this.loadDashboardData());
    });
  }

  /**
   * Logout do usuário
   */
  logout() {
    if (confirm('Tem certeza que deseja sair?')) {
      this.api.logout();
      this.redirectToLogin();
    }
  }

  /**
   * Carrega todos os dados do dashboard
   */
  async loadDashboardData() {
    try {
      console.log('📊 Carregando dados do dashboard...');

      // Mostrar loaders
      this.showLoaders();

      // Carregar dados em paralelo
      const [summaryResult, dailyStatsResult, topServicesResult] = await Promise.allSettled([
        this.api.request('/api/dashboard/summary'),
        this.api.request('/api/dashboard/daily-stats'),
        this.api.request('/api/dashboard/top-services')
      ]);

      // Processar resultados
      if (summaryResult.status === 'fulfilled') {
        this.renderSummary(summaryResult.value);
      } else {
        console.error('Erro ao carregar resumo:', summaryResult.reason);
        this.showError('Erro ao carregar estatísticas resumidas');
      }

      if (dailyStatsResult.status === 'fulfilled') {
        this.renderDailyChart(dailyStatsResult.value);
      } else {
        console.error('Erro ao carregar estatísticas diárias:', dailyStatsResult.reason);
        this.showError('Erro ao carregar gráfico de agendamentos diários');
      }

      if (topServicesResult.status === 'fulfilled') {
        this.renderServicesChart(topServicesResult.value);
      } else {
        console.error('Erro ao carregar top serviços:', topServicesResult.reason);
        this.showError('Erro ao carregar ranking de serviços');
      }

    } catch (error) {
      console.error('❌ Erro geral ao carregar dashboard:', error);
      this.showError('Erro ao carregar dados do dashboard. Tente novamente.');
    } finally {
      // Esconder loaders
      this.hideLoaders();
    }
  }

  /**
   * Mostra loaders de carregamento
   */
  showLoaders() {
    const loaders = ['summaryLoader', 'dailyLoader', 'servicesLoader'];
    loaders.forEach(id => {
      const loader = document.getElementById(id);
      if (loader) loader.style.display = 'flex';
    });
  }

  /**
   * Esconde loaders de carregamento
   */
  hideLoaders() {
    const loaders = ['summaryLoader', 'dailyLoader', 'servicesLoader'];
    loaders.forEach(id => {
      const loader = document.getElementById(id);
      if (loader) loader.style.display = 'none';
    });
  }

  /**
   * Renderiza o resumo estatístico
   */
  renderSummary(data) {
    if (!data || !data.data) {
      console.warn('Dados de resumo inválidos');
      return;
    }

    const summary = data.data;

    // Atualizar card mensal
    if (summary.monthly) {
      document.getElementById('monthlyCount').textContent = summary.monthly.total;
      document.getElementById('monthlyPeriod').textContent = summary.monthly.period;
    }

    // Atualizar card semanal
    if (summary.weekly) {
      document.getElementById('weeklyCount').textContent = summary.weekly.total;
      document.getElementById('weeklyPeriod').textContent = summary.weekly.period;
    }

    // Atualizar card de hoje
    if (summary.today) {
      document.getElementById('todayCount').textContent = summary.today.total;
      document.getElementById('todayPeriod').textContent = `Data: ${this.formatDate(summary.today.date)}`;
    }

    console.log('✅ Resumo renderizado:', summary);
  }

  /**
   * Renderiza o gráfico de agendamentos diários
   */
  renderDailyChart(data) {
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.warn('Dados de estatísticas diárias inválidos');
      return;
    }

    const dailyStats = data.data;
    const ctx = document.getElementById('dailyChart');

    if (!ctx) {
      console.warn('Canvas do gráfico diário não encontrado');
      return;
    }

    // Destruir gráfico anterior se existir
    if (this.dailyChart) {
      this.dailyChart.destroy();
    }

    // Preparar dados para o gráfico
    const labels = dailyStats.map(stat => this.formatDateShort(stat.date));
    const values = dailyStats.map(stat => stat.count);

    // Cores para o gráfico
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 153, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 153, 255, 0.1)');

    this.dailyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Agendamentos',
          data: values,
          borderColor: '#0099ff',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0099ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              title: function(context) {
                return `Data: ${context[0].label}`;
              },
              label: function(context) {
                return `Agendamentos: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              stepSize: 1
            }
          },
          x: {
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              maxTicksLimit: 7 // Mostrar no máximo 7 labels
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });

    console.log('✅ Gráfico diário renderizado com', dailyStats.length, 'pontos');
  }

  /**
   * Renderiza o gráfico de top serviços
   */
  renderServicesChart(data) {
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.warn('Dados de top serviços inválidos');
      return;
    }

    const topServices = data.data;
    const ctx = document.getElementById('servicesChart');

    if (!ctx) {
      console.warn('Canvas do gráfico de serviços não encontrado');
      return;
    }

    // Destruir gráfico anterior se existir
    if (this.servicesChart) {
      this.servicesChart.destroy();
    }

    // Preparar dados para o gráfico de pizza
    const labels = topServices.map(service => this.truncateText(service.service, 20));
    const values = topServices.map(service => service.count);

    // Paleta de cores para os serviços
    const colors = [
      '#0099ff', '#00cc66', '#ff9900', '#ff4444', '#9933cc',
      '#ff66cc', '#66cccc', '#cc9966', '#cc6699', '#99cc66'
    ];

    this.servicesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, topServices.length),
          borderColor: colors.slice(0, topServices.length).map(color => color.replace('0.', '1.')),
          borderWidth: 2,
          hoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              label: function(context) {
                const service = topServices[context.dataIndex];
                return `${service.service}: ${service.count} agendamento(s)`;
              }
            }
          }
        },
        cutout: '60%'
      }
    });

    console.log('✅ Gráfico de serviços renderizado com', topServices.length, 'serviços');
  }

  /**
   * Formata data para exibição curta (DD/MM)
   */
  formatDateShort(dateStr) {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
    } catch (error) {
      return dateStr;
    }
  }

  /**
   * Formata data para exibição completa
   */
  formatDate(dateStr) {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateStr;
    }
  }

  /**
   * Trunca texto se for muito longo
   */
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Mostra mensagem de erro
   */
  showError(message) {
    // Criar toast de erro ou usar alert por simplicidade
    alert('❌ ' + message);
  }

  /**
   * Recarrega dados do dashboard (método público)
   */
  refresh() {
    this.loadDashboardData();
  }
}

// Inicializar dashboard quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.moderatorDashboard = new ModeratorDashboard();
});

// Exportar classe para uso global
window.ModeratorDashboard = ModeratorDashboard;




