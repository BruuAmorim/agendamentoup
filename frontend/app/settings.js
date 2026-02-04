// Gerenciador de Configurações
class SettingsManager {
  constructor() {
    this.settings = {
      empresa_nome: '',
      logo: null,
      campos_visiveis: ['nome', 'telefone'],
      campos_extras: [],
      servicos: [],
      funcionamento: {
        dias: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        inicio: '08:00',
        fim: '18:00',
        slot: 30
      }
    };
    this.hasChanges = false;
    this.init();
  }

  async init() {
    // Verificar autenticação
    if (!window.authManager) {
      window.location.href = '../css/index.html';
      return;
    }

    const user = window.authManager.currentUser;
    if (!user || (user.role !== 'moderator' && !(user.role === 'user' && user.parent_user_id))) {
      window.location.href = 'agendamentos.html';
      return;
    }

    // Bind eventos
    this.bindEvents();
    
    // Carregar configurações
    await this.loadSettings();
  }

  bindEvents() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Logo upload
    const logoUpload = document.getElementById('logoUpload');
    if (logoUpload) {
      logoUpload.addEventListener('change', (e) => this.handleLogoUpload(e));
    }

    // Salvar configurações
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (window.authManager) {
          window.authManager.logout();
        }
      });
    }

    // Detectar mudanças
    this.detectChanges();
  }

  switchTab(tabName) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      }
    });

    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  detectChanges() {
    // Nome da empresa
    const companyName = document.getElementById('companyName');
    if (companyName) {
      companyName.addEventListener('input', () => {
        this.hasChanges = true;
        this.updateSaveButton();
      });
    }

    // Campos visíveis
    ['fieldNome', 'fieldTelefone', 'fieldEmail', 'fieldCPF'].forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.hasChanges = true;
          this.updateSaveButton();
        });
      }
    });

    // Dias da semana
    document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.hasChanges = true;
        this.updateSaveButton();
        this.updateDayCheckboxStyle(checkbox);
      });
    });

    // Horários
    ['startTime', 'endTime', 'slotInterval'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', () => {
          this.hasChanges = true;
          this.updateSaveButton();
        });
      }
    });
  }

  updateDayCheckboxStyle(checkbox) {
    const dayCheckbox = checkbox.closest('.day-checkbox');
    if (checkbox.checked) {
      dayCheckbox.classList.add('checked');
    } else {
      dayCheckbox.classList.remove('checked');
    }
  }

  updateSaveButton() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
      saveBtn.disabled = !this.hasChanges;
    }
  }

  handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('logoPreview');
      preview.innerHTML = `<img src="${e.target.result}" alt="Logo">`;
      this.settings.logo = e.target.result; // Base64
      this.hasChanges = true;
      this.updateSaveButton();
    };
    reader.readAsDataURL(file);
  }

  addExtraField() {
    const list = document.getElementById('extraFieldsList');
    const fieldId = `extra_${Date.now()}`;
    const fieldHtml = `
      <div class="extra-field-item" data-field-id="${fieldId}">
        <input type="text" placeholder="Nome do campo (ex: Observações)" class="extra-field-name">
        <button type="button" onclick="settingsManager.removeExtraField('${fieldId}')">🗑️</button>
      </div>
    `;
    list.insertAdjacentHTML('beforeend', fieldHtml);
    this.hasChanges = true;
    this.updateSaveButton();
  }

  removeExtraField(fieldId) {
    const field = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (field) {
      field.remove();
      this.hasChanges = true;
      this.updateSaveButton();
    }
  }

  addService() {
    const list = document.getElementById('servicesList');
    const serviceId = `service_${Date.now()}`;
    const serviceHtml = `
      <div class="service-item" data-service-id="${serviceId}">
        <input type="text" placeholder="Nome do serviço" class="service-name">
        <button type="button" onclick="settingsManager.removeService('${serviceId}')">🗑️</button>
      </div>
    `;
    list.insertAdjacentHTML('beforeend', serviceHtml);
    this.hasChanges = true;
    this.updateSaveButton();
  }

  removeService(serviceId) {
    const service = document.querySelector(`[data-service-id="${serviceId}"]`);
    if (service) {
      service.remove();
      this.hasChanges = true;
      this.updateSaveButton();
    }
  }

  async loadSettings() {
    try {
      const user = window.authManager.currentUser;
      const userId = user.parent_user_id || user.id;

      const response = await window.authManager.apiRequest(`/api/moderator/settings?userId=${userId}`);
      
      if (response.success && response.data) {
        const data = response.data;
        
        // Carregar nome da empresa
        if (data.company_name) {
          document.getElementById('companyName').value = data.company_name;
          this.settings.empresa_nome = data.company_name;
        }

        // Carregar serviços
        if (data.services && Array.isArray(data.services)) {
          this.settings.servicos = data.services;
          this.renderServices();
        }

        // Carregar funcionamento
        if (data.working_hours) {
          const hours = typeof data.working_hours === 'string' 
            ? JSON.parse(data.working_hours) 
            : data.working_hours;
          
          if (hours.start) document.getElementById('startTime').value = hours.start;
          if (hours.end) document.getElementById('endTime').value = hours.end;
          
          this.settings.funcionamento.inicio = hours.start || '08:00';
          this.settings.funcionamento.fim = hours.end || '18:00';
        }

        if (data.working_days) {
          const days = typeof data.working_days === 'string'
            ? JSON.parse(data.working_days)
            : data.working_days;
          
          this.settings.funcionamento.dias = days;
          this.renderDays();
        }

        // Carregar campos visíveis (se existir no backend)
        if (data.campos_visiveis) {
          this.settings.campos_visiveis = data.campos_visiveis;
          this.renderVisibleFields();
        }

        // Carregar campos extras (se existir no backend)
        if (data.campos_extras) {
          this.settings.campos_extras = data.campos_extras;
          this.renderExtraFields();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }

  renderServices() {
    const list = document.getElementById('servicesList');
    list.innerHTML = '';
    
    this.settings.servicos.forEach((service, index) => {
      const serviceId = `service_${index}`;
      const serviceHtml = `
        <div class="service-item" data-service-id="${serviceId}">
          <input type="text" value="${service}" class="service-name">
          <button type="button" onclick="settingsManager.removeService('${serviceId}')">🗑️</button>
        </div>
      `;
      list.insertAdjacentHTML('beforeend', serviceHtml);
    });
  }

  renderDays() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const checkbox = document.getElementById(`day${day.charAt(0).toUpperCase() + day.slice(1)}`);
      if (checkbox) {
        checkbox.checked = this.settings.funcionamento.dias.includes(day);
        this.updateDayCheckboxStyle(checkbox);
      }
    });
  }

  renderVisibleFields() {
    const fields = {
      'nome': 'fieldNome',
      'telefone': 'fieldTelefone',
      'email': 'fieldEmail',
      'cpf': 'fieldCPF'
    };

    Object.keys(fields).forEach(field => {
      const checkbox = document.getElementById(fields[field]);
      if (checkbox) {
        checkbox.checked = this.settings.campos_visiveis.includes(field);
      }
    });
  }

  renderExtraFields() {
    const list = document.getElementById('extraFieldsList');
    list.innerHTML = '';
    
    this.settings.campos_extras.forEach((field, index) => {
      const fieldId = `extra_${index}`;
      const fieldHtml = `
        <div class="extra-field-item" data-field-id="${fieldId}">
          <input type="text" value="${field}" class="extra-field-name">
          <button type="button" onclick="settingsManager.removeExtraField('${fieldId}')">🗑️</button>
        </div>
      `;
      list.insertAdjacentHTML('beforeend', fieldHtml);
    });
  }

  collectSettings() {
    // Nome da empresa
    this.settings.empresa_nome = document.getElementById('companyName').value;

    // Campos visíveis
    this.settings.campos_visiveis = [];
    if (document.getElementById('fieldNome').checked) this.settings.campos_visiveis.push('nome');
    if (document.getElementById('fieldTelefone').checked) this.settings.campos_visiveis.push('telefone');
    if (document.getElementById('fieldEmail').checked) this.settings.campos_visiveis.push('email');
    if (document.getElementById('fieldCPF').checked) this.settings.campos_visiveis.push('cpf');

    // Campos extras
    this.settings.campos_extras = [];
    document.querySelectorAll('.extra-field-name').forEach(input => {
      const value = input.value.trim();
      if (value) {
        this.settings.campos_extras.push(value);
      }
    });

    // Serviços
    this.settings.servicos = [];
    document.querySelectorAll('.service-name').forEach(input => {
      const value = input.value.trim();
      if (value) {
        this.settings.servicos.push(value);
      }
    });

    // Funcionamento
    const days = [];
    document.querySelectorAll('.day-checkbox input[type="checkbox"]:checked').forEach(checkbox => {
      const dayCheckbox = checkbox.closest('.day-checkbox');
      days.push(dayCheckbox.dataset.day);
    });
    
    this.settings.funcionamento = {
      dias: days,
      inicio: document.getElementById('startTime').value,
      fim: document.getElementById('endTime').value,
      slot: parseInt(document.getElementById('slotInterval').value) || 30
    };

    return this.settings;
  }

  async saveSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '💾 Salvando...';
    }

    try {
      const settings = this.collectSettings();
      const user = window.authManager.currentUser;
      const userId = user.parent_user_id || user.id;

      // Preparar dados para o backend
      const backendData = {
        company_name: settings.empresa_nome,
        services: settings.servicos,
        working_hours: {
          start: settings.funcionamento.inicio,
          end: settings.funcionamento.fim
        },
        working_days: settings.funcionamento.dias,
        campos_visiveis: settings.campos_visiveis,
        campos_extras: settings.campos_extras,
        logo: settings.logo,
        slot_interval: settings.funcionamento.slot
      };

      const response = await window.authManager.apiRequest('/api/moderator/settings', {
        method: 'PUT',
        body: JSON.stringify(backendData)
      });

      if (response.success) {
        this.hasChanges = false;
        this.updateSaveButton();
        
        // Salvar também no localStorage para uso imediato
        localStorage.setItem('moderator_settings', JSON.stringify(settings));
        
        // Disparar evento para atualizar a tela de agendamentos
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
        
        alert('✅ Configurações salvas com sucesso!');
        
        if (saveBtn) {
          saveBtn.textContent = '💾 Salvar Alterações';
        }
      } else {
        throw new Error(response.message || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('❌ Erro ao salvar configurações: ' + error.message);
      
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Salvar Alterações';
      }
    }
  }
}

// Inicializar quando o DOM estiver pronto
let settingsManager;
document.addEventListener('DOMContentLoaded', () => {
  // Aguardar authManager estar disponível
  if (window.authManager) {
    settingsManager = new SettingsManager();
    window.settingsManager = settingsManager;
  } else {
    // Aguardar um pouco e tentar novamente
    setTimeout(() => {
      if (window.authManager) {
        settingsManager = new SettingsManager();
        window.settingsManager = settingsManager;
      }
    }, 500);
  }
});

// Funções globais para os botões
function addExtraField() {
  if (window.settingsManager) {
    window.settingsManager.addExtraField();
  }
}

function addService() {
  if (window.settingsManager) {
    window.settingsManager.addService();
  }
}

