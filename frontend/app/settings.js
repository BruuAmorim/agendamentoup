// Gerenciador de Configurações com Componentes Separados
// Componente: GeneralSettings
class GeneralSettings {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.data = {
      company_name: '',
      logo: null
    };

    // Flag para evitar que carregamentos assíncronos sobrescrevam o texto digitado
    this.isUserEditingName = false;

    // Anexa listeners leves diretamente no input de nome da empresa
    window.addEventListener('DOMContentLoaded', () => {
      const companyNameInput = document.getElementById('companyName');
      if (companyNameInput) {
        companyNameInput.addEventListener('input', () => {
          this.isUserEditingName = true;
        });
        companyNameInput.addEventListener('blur', () => {
          // Ao sair do campo, sincroniza o valor digitado com this.data
          this.data.company_name = companyNameInput.value.trim();
          this.isUserEditingName = false;
        });
      }
    });
  }

  applySettings(data) {
    this.data.company_name = data.company_name || '';
    this.data.logo = data.logo || null;
    this.render();
  }

  render() {
    const companyNameInput = document.getElementById('companyName');
    if (companyNameInput) {
      // Não sobrescrever o que o usuário está digitando no momento
      if (!this.isUserEditingName && document.activeElement !== companyNameInput) {
        companyNameInput.value = this.data.company_name;
      }
    }

    const logoPreview = document.getElementById('logoPreview');
    if (logoPreview) {
      if (this.data.logo) {
        logoPreview.innerHTML = `<img src="${this.data.logo}" alt="Logo">`;
      } else {
        logoPreview.innerHTML = '<div class="logo-preview-placeholder">Sem logo</div>';
      }
    }
  }

  collect() {
    const companyNameInput = document.getElementById('companyName');
    if (companyNameInput) {
      this.data.company_name = companyNameInput.value.trim();
    }
    return {
      company_name: this.data.company_name,
      logo: this.data.logo
    };
  }

  handleLogoUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('logoPreview');
      if (preview) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Logo">`;
      }
      this.data.logo = e.target.result; // Base64
      this.settingsManager.markChanged();
    };
    reader.readAsDataURL(file);
  }

  async save() {
    const data = this.collect();
    return data;
  }
}

// Componente: FormBuilder
class FormBuilder {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.data = {
      campos_visiveis: ['nome', 'telefone'],
      campos_extras: []
    };
  }

  applySettings(data) {
    if (data.campos_visiveis) {
      this.data.campos_visiveis = Array.isArray(data.campos_visiveis)
        ? data.campos_visiveis
        : JSON.parse(data.campos_visiveis || '[]');
    }
    if (data.campos_extras) {
      this.data.campos_extras = Array.isArray(data.campos_extras)
        ? data.campos_extras
        : JSON.parse(data.campos_extras || '[]');
    }
    this.render();
  }

  render() {
    // Renderizar campos visíveis
    const fields = {
      'nome': 'fieldNome',
      'telefone': 'fieldTelefone',
      'email': 'fieldEmail',
      'cpf': 'fieldCPF'
    };

    Object.keys(fields).forEach(field => {
      const checkbox = document.getElementById(fields[field]);
      if (checkbox) {
        checkbox.checked = this.data.campos_visiveis.includes(field);
      }
    });

    // Renderizar campos extras
    this.renderExtraFields();
  }

  renderExtraFields() {
    const list = document.getElementById('extraFieldsList');
    if (!list) return;

    list.innerHTML = '';
    
    this.data.campos_extras.forEach((field, index) => {
      const fieldId = `extra_${index}`;
      const fieldHtml = `
        <div class="extra-field-item" data-field-id="${fieldId}">
          <input type="text" value="${field}" class="extra-field-name" placeholder="Nome do campo">
          <button type="button" class="remove-extra-field-btn">🗑️</button>
        </div>
      `;
      list.insertAdjacentHTML('beforeend', fieldHtml);
    });
  }

  addExtraField() {
    const list = document.getElementById('extraFieldsList');
    if (!list) return;

    const fieldId = `extra_${Date.now()}`;
    const fieldHtml = `
      <div class="extra-field-item" data-field-id="${fieldId}">
        <input type="text" placeholder="Nome do campo (ex: Observações)" class="extra-field-name">
        <button type="button" class="remove-extra-field-btn">🗑️</button>
      </div>
    `;
    list.insertAdjacentHTML('beforeend', fieldHtml);
    
    // Anexar evento de mudança ao campo recém-criado
    const newField = list.querySelector(`[data-field-id="${fieldId}"] .extra-field-name`);
    if (newField) {
      newField.addEventListener('input', () => {
        this.settingsManager.markChanged();
      });
    }
    
    this.settingsManager.markChanged();
  }

  removeExtraField(fieldId) {
    const field = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (field) {
      field.remove();
      this.settingsManager.markChanged();
    }
  }

  collect() {
    // Coletar campos visíveis
    this.data.campos_visiveis = [];
    if (document.getElementById('fieldNome')?.checked) this.data.campos_visiveis.push('nome');
    if (document.getElementById('fieldTelefone')?.checked) this.data.campos_visiveis.push('telefone');
    if (document.getElementById('fieldEmail')?.checked) this.data.campos_visiveis.push('email');
    if (document.getElementById('fieldCPF')?.checked) this.data.campos_visiveis.push('cpf');

    // Coletar campos extras
    this.data.campos_extras = [];
    document.querySelectorAll('.extra-field-name').forEach(input => {
      const value = input.value.trim();
      if (value) {
        this.data.campos_extras.push(value);
      }
    });

    return {
      campos_visiveis: this.data.campos_visiveis,
      campos_extras: this.data.campos_extras
    };
  }

  async save() {
    const data = this.collect();
    return data;
  }
}

// Componente: ServiceManager
class ServiceManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.data = {
      // Cada serviço é { name: string, duration_minutes: number|null }
      servicos: []
    };
  }

  applySettings(data) {
    if (data.services) {
      let rawServices = Array.isArray(data.services)
        ? data.services
        : JSON.parse(data.services || '[]');

      // Normalizar para o novo formato com duração opcional
      this.data.servicos = rawServices
        .map(service => {
          if (typeof service === 'string') {
            return { name: service, duration_minutes: null };
          }

          if (service && typeof service === 'object') {
            return {
              name: service.name || service.nome || service.label || '',
              duration_minutes: service.duration_minutes || service.duration || null
            };
          }

          return null;
        })
        .filter(s => s && s.name);
    }
    this.render();
  }

  render() {
    const list = document.getElementById('servicesList');
    if (!list) return;

    list.innerHTML = '';
    
    this.data.servicos.forEach((service, index) => {
      const serviceId = `service_${index}`;
      const name = typeof service === 'string' ? service : (service.name || '');
      const duration = typeof service === 'object' && service.duration_minutes ? service.duration_minutes : '';
      const serviceHtml = `
        <div class="service-item" data-service-id="${serviceId}">
          <input type="text" value="${name}" class="service-name" placeholder="Nome do serviço">
          <input type="number" min="1" step="1" value="${duration}" class="service-duration" placeholder="Duração (min)" style="max-width: 140px; margin-left: 8px;">
          <button type="button" class="remove-service-btn">🗑️</button>
        </div>
      `;
      list.insertAdjacentHTML('beforeend', serviceHtml);
    });
  }

  addService() {
    const list = document.getElementById('servicesList');
    if (!list) return;

    const serviceId = `service_${Date.now()}`;
    const serviceHtml = `
      <div class="service-item" data-service-id="${serviceId}">
        <input type="text" placeholder="Nome do serviço" class="service-name">
        <input type="number" min="1" step="1" class="service-duration" placeholder="Duração (min)" style="max-width: 140px; margin-left: 8px;">
        <button type="button" class="remove-service-btn">🗑️</button>
      </div>
    `;
    list.insertAdjacentHTML('beforeend', serviceHtml);
    this.settingsManager.markChanged();
  }

  removeService(serviceId) {
    const service = document.querySelector(`[data-service-id="${serviceId}"]`);
    if (service) {
      service.remove();
      this.settingsManager.markChanged();
    }
  }

  collect() {
    this.data.servicos = [];
    document.querySelectorAll('.service-item').forEach(item => {
      const nameInput = item.querySelector('.service-name');
      const durationInput = item.querySelector('.service-duration');

      if (!nameInput) return;

      const name = nameInput.value.trim();
      if (!name) return;

      const rawDuration = durationInput ? parseInt(durationInput.value, 10) : NaN;
      const durationMinutes = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null;

      this.data.servicos.push({
        name,
        duration_minutes: durationMinutes
      });
    });

    return {
      services: this.data.servicos
    };
  }

  async save() {
    const data = this.collect();
    return data;
  }
}

// Componente: StaffManager (Funcionários)
class StaffManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.funcionarios = [];
  }

  getAllServiceNames() {
    const servicesComponent = this.settingsManager.serviceManager;
    if (!servicesComponent || !Array.isArray(servicesComponent.data?.servicos)) {
      return [];
    }
    return servicesComponent.data.servicos
      .map(s => (typeof s === 'string' ? s : (s.name || '')))
      .filter(Boolean);
  }

  async loadStaff() {
    try {
      const response = await window.authManager.apiRequest('/api/staff');
      if (response && response.success && Array.isArray(response.data)) {
        this.funcionarios = response.data;
      } else {
        this.funcionarios = [];
      }
      this.renderList();
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      this.funcionarios = [];
      this.renderList();
    }
  }

  renderList() {
    const list = document.getElementById('staffList');
    if (!list) return;

    list.innerHTML = '';

    if (!this.funcionarios.length) {
      list.innerHTML = '<p style="font-size:13px; color:#6b7280;">Nenhum funcionário cadastrado ainda.</p>';
      return;
    }

    this.funcionarios.forEach(func => {
      const ativo = func.ativo !== false; // default true
      const item = document.createElement('div');
      item.className = 'staff-item';
      item.dataset.id = func.id;
      item.innerHTML = `
        <div class="staff-main">
          <div class="staff-name">${func.nome || func.name || 'Sem nome'}</div>
          <div class="staff-role">${func.funcao ? func.funcao : '<span style="color:#9ca3af;">Função não informada</span>'}</div>
        </div>
        <div class="staff-actions">
          <span class="status-badge ${ativo ? 'status-badge--active' : 'status-badge--inactive'}">
            ${ativo ? 'Ativo' : 'Inativo'}
          </span>
          <button type="button" class="btn-edit" data-action="edit">Editar</button>
          <button type="button" class="btn-toggle" data-action="toggle">
            ${ativo ? 'Desativar' : 'Ativar'}
          </button>
          <button type="button" class="btn-toggle" data-action="delete" style="background:#fee2e2; color:#b91c1c;">
            Excluir
          </button>
        </div>
      `;
      list.appendChild(item);
    });
  }

  openModal(funcionario = null) {
    const modal = document.getElementById('staffModal');
    if (!modal) return;

    const titleEl = document.getElementById('staffModalTitle');
    const idInput = document.getElementById('staffId');
    const nameInput = document.getElementById('staffName');
    const roleInput = document.getElementById('staffRole');
    const activeInput = document.getElementById('staffActive');
    const lunchStartInput = document.getElementById('staffLunchStart');
    const lunchEndInput = document.getElementById('staffLunchEnd');

    const isEdit = !!(funcionario && funcionario.id);

    if (titleEl) titleEl.textContent = isEdit ? 'Editar Funcionário' : 'Novo Funcionário';
    if (idInput) idInput.value = isEdit ? funcionario.id : '';
    if (nameInput) nameInput.value = isEdit ? (funcionario.nome || funcionario.name || '') : '';
    if (roleInput) roleInput.value = isEdit ? (funcionario.funcao || '') : '';
    if (activeInput) activeInput.checked = isEdit ? (funcionario.ativo !== false) : true;
    if (lunchStartInput) lunchStartInput.value = isEdit && funcionario.lunch_start ? funcionario.lunch_start : '';
    if (lunchEndInput) lunchEndInput.value = isEdit && funcionario.lunch_end ? funcionario.lunch_end : '';

    // Renderizar lista de serviços com seleção
    this.renderServicesInModal(funcionario);

    modal.style.display = 'block';
  }

  closeModal() {
    const modal = document.getElementById('staffModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  renderServicesInModal(funcionario = null, selectedFromApi = null) {
    const container = document.getElementById('staffServicesList');
    const emptyHint = document.getElementById('staffServicesEmpty');
    if (!container) return;

    const allServices = this.getAllServiceNames();
    container.innerHTML = '';

    if (!allServices.length) {
      if (emptyHint) emptyHint.style.display = 'block';
      return;
    }

    if (emptyHint) emptyHint.style.display = 'none';

    let selectedNames = [];
    if (Array.isArray(selectedFromApi)) {
      selectedNames = selectedFromApi.map(s => String(s).trim());
    }

    allServices.forEach(name => {
      const id = `staff_service_${name.replace(/\s+/g, '_').toLowerCase()}`;
      const label = document.createElement('label');
      label.className = 'staff-service-item';

      const span = document.createElement('span');
      span.className = 'staff-service-name';
      span.textContent = name;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = id;
      checkbox.dataset.serviceName = name;
      if (selectedNames.includes(name)) {
        checkbox.checked = true;
      }

      label.appendChild(span);
      label.appendChild(checkbox);
      container.appendChild(label);
    });
  }

  collectSelectedServices() {
    const container = document.getElementById('staffServicesList');
    if (!container) return [];
    const selected = [];
    container.querySelectorAll('input[type="checkbox"][data-service-name]').forEach(input => {
      if (input.checked) {
        const name = input.getAttribute('data-service-name');
        if (name) selected.push(name);
      }
    });
    return selected;
  }

  async saveFromModal() {
    if (!this.settingsManager.isPasswordVerified) {
      alert('⚠️ Por favor, verifique sua senha primeiro.');
      return;
    }

    const idInput = document.getElementById('staffId');
    const nameInput = document.getElementById('staffName');
    const roleInput = document.getElementById('staffRole');
    const activeInput = document.getElementById('staffActive');
    const lunchStartInput = document.getElementById('staffLunchStart');
    const lunchEndInput = document.getElementById('staffLunchEnd');

    const nome = nameInput?.value.trim() || '';
    const funcao = roleInput?.value.trim() || '';
    const ativo = !!(activeInput && activeInput.checked);
    const lunch_start = lunchStartInput?.value || null;
    const lunch_end = lunchEndInput?.value || null;

    if (!nome) {
      alert('Informe o nome do funcionário.');
      return;
    }

    const isEdit = !!(idInput && idInput.value);
    const id = isEdit ? idInput.value : null;

    try {
      let savedId = id;
      const payload = { nome, funcao, ativo, lunch_start, lunch_end };

      if (isEdit) {
        const response = await window.authManager.apiRequest(`/api/staff/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (!response || !response.success) {
          throw new Error(response?.message || 'Erro ao atualizar funcionário');
        }
        savedId = response.data?.id || id;
      } else {
        const response = await window.authManager.apiRequest('/api/staff', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (!response || !response.success) {
          throw new Error(response?.message || 'Erro ao criar funcionário');
        }
        savedId = response.data?.id;
      }

      // Salvar serviços vinculados
      const services = this.collectSelectedServices();
      if (savedId) {
        await window.authManager.apiRequest(`/api/staff/${savedId}/services`, {
          method: 'POST',
          body: JSON.stringify({ services })
        });
      }

      if (window.authManager?.showToast) {
        window.authManager.showToast('Funcionário salvo com sucesso!', 'success');
      } else {
        alert('Funcionário salvo com sucesso!');
      }

      this.closeModal();
      await this.loadStaff();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      alert('❌ Erro ao salvar funcionário: ' + (error.message || 'Erro desconhecido'));
    }
  }

  async toggleActive(id) {
    const funcionario = this.funcionarios.find(f => String(f.id) === String(id));
    if (!funcionario) return;

    const currentlyActive = funcionario.ativo !== false;

    try {
      if (currentlyActive) {
        // Desativar via DELETE (soft delete)
        const response = await window.authManager.apiRequest(`/api/staff/${id}`, {
          method: 'DELETE'
        });
        if (!response || !response.success) {
          throw new Error(response?.message || 'Erro ao desativar funcionário');
        }
      } else {
        // Reativar via PUT
        const response = await window.authManager.apiRequest(`/api/staff/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ ativo: true })
        });
        if (!response || !response.success) {
          throw new Error(response?.message || 'Erro ao ativar funcionário');
        }
      }

      await this.loadStaff();
    } catch (error) {
      console.error('Erro ao alterar status do funcionário:', error);
      alert('❌ Erro ao alterar status do funcionário: ' + (error.message || 'Erro desconhecido'));
    }
  }

  async deletePermanently(id) {
    const funcionario = this.funcionarios.find(f => String(f.id) === String(id));
    const nome = funcionario ? (funcionario.nome || funcionario.name || '') : '';

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir permanentemente o funcionário${nome ? ` "${nome}"` : ''}?`
      + '\n\nEssa ação não poderá ser desfeita.'
    );
    if (!confirmed) return;

    try {
      const response = await window.authManager.apiRequest(`/api/staff/${id}/hard`, {
        method: 'DELETE'
      });
      if (!response || !response.success) {
        throw new Error(response?.message || 'Erro ao excluir funcionário');
      }
      if (window.authManager?.showToast) {
        window.authManager.showToast('Funcionário excluído com sucesso!', 'success');
      } else {
        alert('Funcionário excluído com sucesso!');
      }
      await this.loadStaff();
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error);
      alert('❌ Erro ao excluir funcionário: ' + (error.message || 'Erro desconhecido'));
    }
  }

  async openEditWithServices(id) {
    const funcionario = this.funcionarios.find(f => String(f.id) === String(id));
    if (!funcionario) return;

    try {
      const response = await window.authManager.apiRequest(`/api/staff/${id}/services`);
      let selectedServices = [];
      if (response && response.success && response.data && Array.isArray(response.data.services)) {
        selectedServices = response.data.services;
      }
      this.openModal(funcionario);
      this.renderServicesInModal(funcionario, selectedServices);
    } catch (error) {
      console.error('Erro ao carregar serviços do funcionário:', error);
      // Mesmo se falhar, abrir modal com dados básicos
      this.openModal(funcionario);
    }
  }
}

// Componente: ScheduleConfig
class ScheduleConfig {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.data = {
        dias: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        inicio: '08:00',
        fim: '18:00',
        almoco_inicio: '',
        almoco_fim: '',
        slot: 30
    };
  }

  applySettings(data) {
    if (data.working_hours) {
      const hours = typeof data.working_hours === 'string'
        ? JSON.parse(data.working_hours)
        : data.working_hours;

      if (hours.start) this.data.inicio = hours.start;
      if (hours.end) this.data.fim = hours.end;
      if (hours.lunch_start) this.data.almoco_inicio = hours.lunch_start;
      if (hours.lunch_end) this.data.almoco_fim = hours.lunch_end;
    }

    if (data.working_days) {
      const days = typeof data.working_days === 'string'
        ? JSON.parse(data.working_days)
        : data.working_days;

      this.data.dias = Array.isArray(days) ? days : this.data.dias;
    }

    if (data.slot_interval) {
      this.data.slot = parseInt(data.slot_interval) || 30;
    }

    this.render();
  }

  render() {
    // Renderizar horários
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const slotIntervalInput = document.getElementById('slotInterval');
    const lunchStartInput = document.getElementById('lunchStartTime');
    const lunchEndInput = document.getElementById('lunchEndTime');

    if (startTimeInput) startTimeInput.value = this.data.inicio;
    if (endTimeInput) endTimeInput.value = this.data.fim;
    if (slotIntervalInput) slotIntervalInput.value = this.data.slot;
    if (lunchStartInput) lunchStartInput.value = this.data.almoco_inicio || '';
    if (lunchEndInput) lunchEndInput.value = this.data.almoco_fim || '';

    // Renderizar dias
    this.renderDays();
  }

  renderDays() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const checkbox = document.getElementById(`day${day.charAt(0).toUpperCase() + day.slice(1)}`);
      if (checkbox) {
        checkbox.checked = this.data.dias.includes(day);
        this.updateDayCheckboxStyle(checkbox);
      }
    });
  }

  updateDayCheckboxStyle(checkbox) {
    const dayCheckbox = checkbox.closest('.day-checkbox');
    if (dayCheckbox) {
      if (checkbox.checked) {
        dayCheckbox.classList.add('checked');
      } else {
        dayCheckbox.classList.remove('checked');
      }
    }
  }

  collect() {
    // Coletar dias
    const days = [];
    document.querySelectorAll('.day-checkbox input[type="checkbox"]:checked').forEach(checkbox => {
      const dayCheckbox = checkbox.closest('.day-checkbox');
      if (dayCheckbox && dayCheckbox.dataset.day) {
        days.push(dayCheckbox.dataset.day);
      }
    });
    
    this.data.dias = days.length > 0 ? days : this.data.dias;

    // Coletar horários
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const slotIntervalInput = document.getElementById('slotInterval');
    const lunchStartInput = document.getElementById('lunchStartTime');
    const lunchEndInput = document.getElementById('lunchEndTime');

    if (startTimeInput) this.data.inicio = startTimeInput.value;
    if (endTimeInput) this.data.fim = endTimeInput.value;
    if (slotIntervalInput) this.data.slot = parseInt(slotIntervalInput.value) || 30;
    if (lunchStartInput) this.data.almoco_inicio = lunchStartInput.value || '';
    if (lunchEndInput) this.data.almoco_fim = lunchEndInput.value || '';

    return {
      working_days: this.data.dias,
      working_hours: {
        start: this.data.inicio,
        end: this.data.fim,
        lunch_start: this.data.almoco_inicio || null,
        lunch_end: this.data.almoco_fim || null
      },
      slot_interval: this.data.slot
    };
  }

  async save() {
    const data = this.collect();
    return data;
  }
}

// Gerenciador Principal de Configurações
class SettingsManager {
  constructor() {
    this.hasChanges = false;
    this.isPasswordVerified = false;
    this.cachedSettings = null;
    this.isLoading = false; // Flag para evitar múltiplas requisições simultâneas
    this.settingsLoaded = false; // Flag para evitar recarregar múltiplas vezes
    
    // Inicializar componentes
    this.generalSettings = new GeneralSettings(this);
    this.formBuilder = new FormBuilder(this);
    this.serviceManager = new ServiceManager(this);
    this.scheduleConfig = new ScheduleConfig(this);
    this.staffManager = new StaffManager(this);
    
    this.init();
  }

  async init() {
    // Verificar autenticação
    if (!window.authManager) {
      console.error('❌ AuthManager não encontrado');
      setTimeout(() => {
        if (!window.authManager) {
          window.location.href = '../index.html';
        }
      }, 2000);
      return;
    }

    const user = window.authManager.currentUser;
    if (!user) {
      console.error('❌ Usuário não encontrado');
      window.location.href = '../index.html';
      return;
    }
    
    // Verificar permissões (empresa, admin_master, ou user com parent_user_id)
    // Manter compatibilidade com 'moderator' para dados antigos
    const hasAccess = user.role === 'empresa' || 
                      user.role === 'moderator' || // Compatibilidade
                      user.role === 'admin_master' || 
                      (user.role === 'user' && user.parent_user_id);
    
    if (!hasAccess) {
      console.error('❌ Acesso negado. Role:', user.role);
      window.location.href = 'agendamentos.html';
      return;
    }

    console.log('✅ Inicializando SettingsManager para usuário:', user.role);

    // SEMPRE limpar verificação de senha ao carregar a página (F5 ou refresh)
    // Isso garante que a senha seja sempre solicitada
    sessionStorage.removeItem('settings_password_verified');

    // Verificar senha antes de habilitar o acesso
    await this.checkPasswordAccess();

    // Sempre anexar eventos básicos (tabs, navegação)
    // Mas só permitir edição após verificação de senha
    this.bindEvents();
    
    // Inicializar gerenciamento de API Key (apenas para empresas)
    this.initApiKeyManagement();
    
    // Desabilitar campos inicialmente se senha não verificada
    if (!this.isPasswordVerified) {
      this.toggleFieldsEnabled(false);
      console.log('⚠️ Aguardando verificação de senha para carregar configurações');
    } else {
      // Carregar configurações apenas se senha verificada
      await this.loadSettings();
      this.toggleFieldsEnabled(true);
    }
  }

  async checkPasswordAccess() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
      saveBtn.style.display = 'none';
    }

    const settingsContainer = document.getElementById('settingsContainer');
    if (settingsContainer) {
      settingsContainer.style.display = 'none';
    }

    const user = window.authManager.currentUser;

    // Verificar se já foi verificado nesta sessão
    const sessionVerified = sessionStorage.getItem('settings_password_verified');
    if (sessionVerified === 'true') {
      this.isPasswordVerified = true;
      this.hideLockScreen();
      return;
    }

    // Admin Master pode acessar para configurar senha se ainda não existir
    if (user && user.role === 'admin_master') {
      const hasPassword = await this.fetchPasswordStatus();
      if (!hasPassword) {
        this.isPasswordVerified = true;
        this.hideLockScreen();
        return;
      }
    }

    // Mostrar lock screen
    const lockScreen = document.getElementById('lockScreen');
    if (lockScreen) {
      lockScreen.classList.remove('hidden');
      const input = document.getElementById('adminPasswordInput');
      if (input) {
        input.focus();
      }
    }

    // Inicializar gerenciamento de API Key (apenas para empresas)
    this.initApiKeyManagement();

    // Bind eventos do lock screen
    const verifyBtn = document.getElementById('verifyPasswordBtn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => this.verifyPassword());
    }
    const cancelBtn = document.getElementById('cancelPasswordBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelPassword());
    }
    const passwordInput = document.getElementById('adminPasswordInput');
    if (passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.verifyPassword();
        }
      });
    }
  }

  async verifyPassword() {
    const passwordInput = document.getElementById('adminPasswordInput');
    const password = passwordInput ? passwordInput.value : '';
    const errorDiv = document.getElementById('passwordError');

    if (!password) {
      if (errorDiv) {
        errorDiv.textContent = 'Por favor, informe a senha.';
        errorDiv.classList.add('show');
      }
      return;
    }

    try {
      // Determinar userId para verificação de senha
      // Se for empresa/moderator, usar o próprio id; se for admin, precisa do userId
      const user = window.authManager.currentUser;
      let userId = null;
      if (user.role === 'empresa' || user.role === 'moderator') {
        userId = user.id;
      } else if (user.role === 'admin_master') {
        // Admin precisa especificar qual empresa está configurando
        // Por enquanto, usar o próprio id (pode ser ajustado depois se necessário)
        userId = user.id;
      }

      const response = await window.authManager.apiRequest('/api/auth/verify-admin-password', {
        method: 'POST',
        body: JSON.stringify({
          password: password,
          userId: userId
        })
      });

      if (response.success) {
        this.isPasswordVerified = true;
        sessionStorage.setItem('settings_password_verified', 'true');
        
        // Esconder lock screen e mostrar conteúdo
        this.hideLockScreen();
        
        // Carregar configurações após verificação
        await this.loadSettings();
        
        // Anexar eventos de detecção de mudanças após carregar configurações
        this.detectChanges();
      } else {
        if (errorDiv) {
          errorDiv.textContent = response.message || 'Senha incorreta. Tente novamente.';
          errorDiv.classList.add('show');
        }
        if (passwordInput) {
          passwordInput.value = '';
          passwordInput.focus();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      if (errorDiv) {
        errorDiv.textContent = 'Erro ao verificar senha. Tente novamente.';
        errorDiv.classList.add('show');
      }
    }
  }

  hideLockScreen() {
    const lockScreen = document.getElementById('lockScreen');
    if (lockScreen) {
      lockScreen.classList.add('hidden');
    }
    const settingsContainer = document.getElementById('settingsContainer');
    if (settingsContainer) {
      settingsContainer.style.display = 'block';
    }
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
      saveBtn.style.display = 'block';
      // Atualizar estado do botão (considera senha verificada E mudanças)
      this.updateSaveButton();
    }
    
    // Habilitar/desabilitar campos baseado na verificação
    this.toggleFieldsEnabled(this.isPasswordVerified);
  }

  toggleFieldsEnabled(enabled) {
    // Habilitar/desabilitar todos os inputs e textareas
    const inputs = document.querySelectorAll('#settingsContainer input, #settingsContainer textarea, #settingsContainer select');
    inputs.forEach(input => {
      if (input.id !== 'adminPasswordInput' && 
          input.id !== 'adminCurrentPasswordInput' && 
          input.id !== 'adminNewPasswordInput' && 
          input.id !== 'adminConfirmPasswordInput') {
        input.disabled = !enabled;
      }
    });

    // Habilitar/desabilitar botões de ação (exceto logout e admin)
    const actionButtons = document.querySelectorAll('.add-field-btn, .remove-extra-field-btn, .remove-service-btn');
    actionButtons.forEach(btn => {
      if (!btn.id || (!btn.id.includes('admin') && btn.id !== 'logoutBtn')) {
        btn.disabled = !enabled;
      }
    });
  }

  cancelPassword() {
    window.location.href = 'agendamentos.html';
  }

  markChanged() {
    this.hasChanges = true;
    this.updateSaveButton();
  }

  bindEvents() {
    // Tabs - sempre funcionam
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tabName = e.target.dataset.tab || e.target.closest('.tab-btn')?.dataset.tab;
          if (tabName) {
            this.switchTab(tabName);
            // Se clicou na tab de integrações, carregar informações da API Key
            if (tabName === 'integrations') {
              console.log('🔍 [bindEvents] Tab Integrações clicada, carregando informações...');
              // Aguardar um pouco para garantir que a tab foi trocada
              setTimeout(() => {
                this.loadApiKeyInfo();
              }, 100);
            }
          }
        });
      });

    // Logo upload
    const logoUpload = document.getElementById('logoUpload');
    if (logoUpload) {
      logoUpload.addEventListener('change', (e) => {
        if (e.target.files[0] && this.isPasswordVerified) {
          this.generalSettings.handleLogoUpload(e.target.files[0]);
        }
      });
    }

    // Salvar configurações - só funciona se senha verificada
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
      // Remover TODOS os event listeners anteriores
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      
      // Garantir que o botão não está desabilitado por padrão
      newSaveBtn.disabled = false;
      
      // Anexar event listener usando uma função nomeada para facilitar debug
      const handleSaveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🔘 [handleSaveClick] Botão Salvar clicado!');
        console.log('🔘 [handleSaveClick] Estado completo:', {
          isPasswordVerified: this.isPasswordVerified,
          hasChanges: this.hasChanges,
          buttonDisabled: newSaveBtn.disabled,
          buttonExists: !!newSaveBtn,
          buttonText: newSaveBtn.textContent
        });
        
        // Verificar senha apenas se necessário
        if (!this.isPasswordVerified) {
          console.warn('⚠️ [handleSaveClick] Senha não verificada');
          alert('⚠️ Por favor, verifique sua senha primeiro.');
          return;
        }
        
        // Verificar se o botão está desabilitado (pode estar em processo de salvamento)
        if (newSaveBtn.disabled && newSaveBtn.textContent.includes('Salvando')) {
          console.log('⚠️ [handleSaveClick] Salvamento já em andamento');
          return;
        }
        
        // Permitir salvar mesmo se hasChanges for false (pode haver mudanças não detectadas)
        // Mas avisar o usuário se realmente não houver mudanças
        const currentSettings = this.collectAllSettings();
        const hasRealChanges = JSON.stringify(currentSettings) !== JSON.stringify(this.cachedSettings);
        
        console.log('🔘 [handleSaveClick] Verificação de mudanças:', {
          hasRealChanges,
          hasChanges: this.hasChanges,
          cachedSettingsExists: !!this.cachedSettings
        });
        
        if (!hasRealChanges && !this.hasChanges) {
          console.log('ℹ️ [handleSaveClick] Nenhuma alteração detectada');
          alert('ℹ️ Nenhuma alteração detectada para salvar.');
          return;
        }
        
        // Forçar hasChanges se houver diferenças reais
        if (hasRealChanges) {
          console.log('✅ [handleSaveClick] Mudanças detectadas, forçando hasChanges');
          this.hasChanges = true;
        }
        
        // Chamar método de salvamento
        console.log('💾 [handleSaveClick] Chamando saveSettings()...');
        await this.saveSettings();
      };
      
      newSaveBtn.addEventListener('click', handleSaveClick);
      
      // Também permitir Enter no botão se estiver focado
      newSaveBtn.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSaveClick(e);
        }
      });
      
      console.log('✅ [bindEvents] Event listener do botão Salvar anexado com sucesso');
      console.log('✅ [bindEvents] Botão estado:', {
        disabled: newSaveBtn.disabled,
        text: newSaveBtn.textContent,
        id: newSaveBtn.id
      });
    } else {
      console.error('❌ [bindEvents] Botão saveSettingsBtn não encontrado no DOM!');
    }

    // Logout - sempre funciona
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (window.authManager) {
          window.authManager.logout();
        }
      });
    }

    // Detectar mudanças - só se senha verificada
    if (this.isPasswordVerified) {
      this.detectChanges();
    }
    
    // Event delegation para campos extras e serviços (funciona mesmo após criação dinâmica)
    const settingsContainer = document.getElementById('settingsContainer');
    
    // Event delegation para detectar mudanças em campos extras e serviços
    if (settingsContainer) {
      settingsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('extra-field-name') || 
            e.target.classList.contains('service-name')) {
          if (this.isPasswordVerified) {
            console.log('📝 Mudança detectada via delegation:', e.target.className);
            this.markChanged();
          }
        }
      });
    }

    // Seção admin master para senha
    this.initAdminPasswordSection();

    // Event delegation para botões dinâmicos (campos extras, serviços e funcionários)
    // Isso garante que funcionem mesmo se adicionados depois
    const handleDynamicButtonClick = (e) => {
      // Botões de remover campo extra
      if (e.target.classList.contains('remove-extra-field-btn') || 
          (e.target.closest('[data-field-id]') && e.target.textContent.includes('🗑️'))) {
        const fieldItem = e.target.closest('[data-field-id]');
        if (fieldItem) {
          const fieldId = fieldItem.dataset.fieldId;
          if (this.isPasswordVerified && this.formBuilder) {
            this.formBuilder.removeExtraField(fieldId);
          } else if (!this.isPasswordVerified) {
            alert('⚠️ Por favor, verifique sua senha primeiro.');
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      
      // Botões de remover serviço
      if (e.target.classList.contains('remove-service-btn') ||
          (e.target.closest('[data-service-id]') && e.target.textContent.includes('🗑️'))) {
        const serviceItem = e.target.closest('[data-service-id]');
        if (serviceItem) {
          const serviceId = serviceItem.dataset.serviceId;
          if (this.isPasswordVerified && this.serviceManager) {
            this.serviceManager.removeService(serviceId);
          } else if (!this.isPasswordVerified) {
            alert('⚠️ Por favor, verifique sua senha primeiro.');
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Botões da lista de funcionários
      const staffItem = e.target.closest('.staff-item');
      if (staffItem && this.staffManager && this.isPasswordVerified) {
        const id = staffItem.dataset.id;
        const action = e.target.dataset.action;
        if (action === 'edit') {
          e.preventDefault();
          e.stopPropagation();
          this.staffManager.openEditWithServices(id);
          return;
        }
        if (action === 'toggle') {
          e.preventDefault();
          e.stopPropagation();
          this.staffManager.toggleActive(id);
          return;
        }
        if (action === 'delete') {
          e.preventDefault();
          e.stopPropagation();
          this.staffManager.deletePermanently(id);
          return;
        }
      }
    };

    // Usar o mesmo elemento para evitar múltiplos listeners
    if (settingsContainer) {
      settingsContainer.addEventListener('click', handleDynamicButtonClick.bind(this));
    } else {
      // Fallback para document se container não existir ainda
      document.addEventListener('click', handleDynamicButtonClick.bind(this));
    }

    // Botões do modal de funcionários
    const addStaffBtn = document.getElementById('addStaffBtn');
    if (addStaffBtn && this.staffManager) {
      addStaffBtn.addEventListener('click', () => {
        if (!this.isPasswordVerified) {
          alert('⚠️ Por favor, verifique sua senha primeiro.');
          return;
        }
        this.staffManager.openModal(null);
      });
    }

    const staffCancelBtn = document.getElementById('staffCancelBtn');
    if (staffCancelBtn && this.staffManager) {
      staffCancelBtn.addEventListener('click', () => this.staffManager.closeModal());
    }

    const staffSaveBtn = document.getElementById('staffSaveBtn');
    if (staffSaveBtn && this.staffManager) {
      staffSaveBtn.addEventListener('click', () => this.staffManager.saveFromModal());
    }

    const staffModal = document.getElementById('staffModal');
    if (staffModal && this.staffManager) {
      staffModal.addEventListener('click', (e) => {
        if (e.target === staffModal) {
          this.staffManager.closeModal();
        }
      });
    }
  }

  switchTab(tabName) {
    if (!tabName) {
      console.warn('⚠️ Nome da tab não fornecido');
      return;
    }

    try {
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
      
      const targetTab = document.getElementById(`${tabName}-tab`);
      if (targetTab) {
        targetTab.classList.add('active');
        // Se for a tab de integrações, carregar informações da API Key
        if (tabName === 'integrations') {
          setTimeout(() => {
            console.log('🔍 [switchTab] Carregando informações da API Key após trocar para tab Integrações...');
            this.loadApiKeyInfo();
          }, 200);
        }
      } else {
        console.error(`❌ Tab ${tabName}-tab não encontrada`);
      }
    } catch (error) {
      console.error('Erro ao trocar tab:', error);
    }
  }

  detectChanges() {
    console.log('🔍 detectChanges - Iniciando detecção de mudanças...');
    
    // Nome da empresa
    const companyName = document.getElementById('companyName');
    if (companyName) {
      // Remover listener anterior se existir para evitar duplicação
      const newCompanyName = companyName.cloneNode(true);
      companyName.parentNode.replaceChild(newCompanyName, companyName);
      newCompanyName.addEventListener('input', () => {
        console.log('📝 Mudança detectada no nome da empresa');
        this.markChanged();
      });
    }

    // Campos visíveis
    ['fieldNome', 'fieldTelefone', 'fieldEmail', 'fieldCPF'].forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        // Remover listener anterior se existir
        const newCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(newCheckbox, checkbox);
        newCheckbox.checked = checkbox.checked; // Preservar estado
        newCheckbox.addEventListener('change', () => this.markChanged());
      }
    });

    // Campos extras - usar event delegation para campos dinâmicos
    const extraFieldsList = document.getElementById('extraFieldsList');
    if (extraFieldsList) {
      // Anexar eventos aos campos extras existentes
      extraFieldsList.querySelectorAll('.extra-field-name').forEach(input => {
        // Remover listener anterior se existir
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        newInput.value = input.value; // Preservar valor
        newInput.addEventListener('input', () => {
          console.log('📝 Mudança detectada em campo extra');
          this.markChanged();
        });
      });
    }

    // Serviços - usar event delegation para campos dinâmicos
    const servicesList = document.getElementById('servicesList');
    if (servicesList) {
      servicesList.querySelectorAll('.service-name').forEach(input => {
        // Remover listener anterior se existir
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        newInput.value = input.value; // Preservar valor
        newInput.addEventListener('input', () => {
          console.log('📝 Mudança detectada em serviço');
          this.markChanged();
        });
      });
    }

    // Dias da semana
    document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
      // Remover listener anterior se existir
      const newCheckbox = checkbox.cloneNode(true);
      checkbox.parentNode.replaceChild(newCheckbox, checkbox);
      newCheckbox.checked = checkbox.checked; // Preservar estado
      newCheckbox.addEventListener('change', () => {
        this.markChanged();
        this.scheduleConfig.updateDayCheckboxStyle(newCheckbox);
      });
    });

    // Horários
    ['startTime', 'endTime', 'slotInterval'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        // Remover listener anterior se existir
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        newInput.value = input.value; // Preservar valor
        newInput.addEventListener('change', () => this.markChanged());
      }
    });
  }

  updateSaveButton() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
      // CRÍTICO: Botão só deve estar desabilitado se:
      // 1. Senha não verificada OU
      // 2. Está salvando (textContent contém "Salvando")
      const isSaving = saveBtn.textContent.includes('Salvando');
      saveBtn.disabled = !this.isPasswordVerified || isSaving;
      
      // Visual: mostrar estilo diferente se não houver mudanças detectadas
      if (this.hasChanges && !isSaving) {
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
        saveBtn.style.pointerEvents = 'auto';
      } else if (!isSaving) {
        saveBtn.style.opacity = '0.7';
        saveBtn.style.cursor = 'pointer';
        saveBtn.style.pointerEvents = 'auto'; // Sempre permite clicar se não estiver salvando
      }
      
      console.log('🔘 [updateSaveButton] Estado atualizado:', {
        isPasswordVerified: this.isPasswordVerified,
        hasChanges: this.hasChanges,
        isSaving,
        disabled: saveBtn.disabled,
        buttonText: saveBtn.textContent,
        buttonExists: !!saveBtn
      });
    } else {
      console.warn('⚠️ [updateSaveButton] Botão saveSettingsBtn não encontrado!');
    }
  }

  async loadSettings() {
    // Evitar múltiplas requisições simultâneas
    if (this.isLoading) {
      console.log('⚠️ Carregamento já em andamento, ignorando...');
      return;
    }

    if (this.settingsLoaded) {
      console.log('✅ Configurações já carregadas, usando cache');
      return;
    }
    
    this.isLoading = true;
    try {
      const data = await this.fetchSettingsOnce();
      if (data) {
        this.generalSettings.applySettings(data);
        this.formBuilder.applySettings(data);
        this.serviceManager.applySettings(data);
        this.scheduleConfig.applySettings(data);
      }

      // Carregar funcionários após serviços (para ter lista de serviços disponível)
      if (this.staffManager) {
        await this.staffManager.loadStaff();
      }

      this.cachedSettings = this.collectAllSettings();
      this.hasChanges = false;
      this.updateSaveButton();
      this.settingsLoaded = true;
    } finally {
      this.isLoading = false;
    }
  }

  collectAllSettings() {
    const general = this.generalSettings.collect();
    const form = this.formBuilder.collect();
    const services = this.serviceManager.collect();
    const schedule = this.scheduleConfig.collect();

    return {
      ...general,
      ...form,
      ...services,
      ...schedule
    };
  }

  async saveSettings() {
    console.log('💾 [saveSettings] Iniciando salvamento...');
    console.log('💾 [saveSettings] Estado:', {
      isPasswordVerified: this.isPasswordVerified,
      hasChanges: this.hasChanges
    });
    
    if (!this.isPasswordVerified) {
      alert('Por favor, verifique sua senha primeiro.');
      return;
    }

    const saveBtn = document.getElementById('saveSettingsBtn');
    if (!saveBtn) {
      console.error('❌ [saveSettings] Botão saveSettingsBtn não encontrado!');
      alert('❌ Erro: Botão de salvar não encontrado. Recarregue a página.');
      return;
    }
    
    // Verificar se já está salvando
    if (saveBtn.disabled && saveBtn.textContent.includes('Salvando')) {
      console.log('⚠️ [saveSettings] Salvamento já em andamento, ignorando...');
      return;
    }

    // Desabilitar botão durante salvamento
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '💾 Salvando...';
      saveBtn.style.cursor = 'wait';
      console.log('💾 [saveSettings] Botão desabilitado para salvamento');
    }

    try {
      const settings = this.collectAllSettings();
      const user = window.authManager.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const userId = user.parent_user_id || user.id;

      // Preparar dados para o backend
      const backendData = {
        company_name: settings.company_name || null,
        services: settings.services || [],
        working_hours: settings.working_hours || { start: '09:00', end: '18:00' },
        working_days: settings.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        campos_visiveis: settings.campos_visiveis || ['nome', 'telefone'],
        campos_extras: settings.campos_extras || [],
        logo: settings.logo || null,
        slot_interval: settings.slot_interval || 30
      };

      console.log('📤 Enviando configurações para o backend:', backendData);
      console.log('📤 URL:', `${window.authManager.apiBaseUrl}/api/moderator/settings`);

      const response = await window.authManager.apiRequest('/api/moderator/settings', {
        method: 'PUT',
        body: JSON.stringify(backendData)
      });

      console.log('📥 Resposta do backend:', response);

      if (response && response.success) {
        console.log('✅ Configurações salvas com sucesso!');
        this.hasChanges = false;
        this.updateSaveButton();
        this.cachedSettings = settings;
        
        // RF04 - Salvar também no localStorage para uso imediato
        localStorage.setItem('moderator_settings', JSON.stringify(this.buildLegacyLocalSettings(settings)));
        localStorage.setItem('moderator_settings_v2', JSON.stringify(settings));
        localStorage.setItem('empresa_settings_v2', JSON.stringify(settings)); // Compatibilidade
        
        // RF04 - Disparar eventos para atualizar a tela de agendamentos
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
        window.dispatchEvent(new CustomEvent('companySettingsUpdated', { detail: settings }));
        
        // RF04 - Forçar recarregamento das configurações na tela de agendamentos
        if (window.app && typeof window.app.loadModeratorSettings === 'function') {
          setTimeout(() => {
            window.app.loadModeratorSettings();
            window.app.loadCompanyInfo();
          }, 500);
        }
        
        alert('✅ Configurações salvas com sucesso!');
        
        // Reabilitar botão após salvamento bem-sucedido
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Salvar Alterações';
          saveBtn.style.cursor = 'pointer';
          console.log('✅ [saveSettings] Botão reabilitado após salvamento');
        }
        
        // Atualizar estado do botão
        this.updateSaveButton();
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

  collectActiveSettings(tabName) {
    switch (tabName) {
      case 'general':
        return this.generalSettings.collect();
      case 'form':
        return this.formBuilder.collect();
      case 'services':
        return this.serviceManager.collect();
      case 'schedule':
        return this.scheduleConfig.collect();
      default:
        return this.collectAllSettings();
    }
  }

  async fetchPasswordStatus() {
    try {
      const user = window.authManager.currentUser;
      if (!user) return true;
      
      // Determinar companyId: se for empresa/moderator, usar próprio id; se for admin, não precisa verificar
      let companyId = null;
      if (user.role === 'empresa' || user.role === 'moderator') {
        companyId = user.id;
      } else if (user.role === 'admin_master') {
        // Admin não precisa verificar senha de empresa específica aqui
        return false; // Sempre pedir senha para admin
      }
      
      if (!companyId) return true;
      
      const response = await window.authManager.apiRequest(`/api/settings-password?companyId=${companyId}`);
      if (response.success) {
        return !!response.data.hasPassword;
      }
    } catch (error) {
      console.warn('Não foi possível verificar status da senha:', error);
    }
    return true;
  }

  initAdminPasswordSection() {
    const user = window.authManager.currentUser;
    const section = document.getElementById('adminPasswordSection');
    if (!section) return;

    if (!user || user.role !== 'admin_master') {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    this.loadAdminPasswordStatus();
    this.bindAdminPasswordEvents();
  }

  async loadAdminPasswordStatus() {
    const statusEl = document.getElementById('adminPasswordStatus');
    const createBtn = document.getElementById('adminCreatePasswordBtn');
    const changeBtn = document.getElementById('adminChangePasswordBtn');
    if (!statusEl || !createBtn || !changeBtn) return;

    try {
      const response = await window.authManager.apiRequest('/api/settings-password');
      if (response.success && response.data) {
        if (response.data.hasPassword) {
          statusEl.textContent = '✅ Senha configurada.';
          createBtn.style.display = 'none';
          changeBtn.style.display = 'inline-block';
        } else {
          statusEl.textContent = '⚠️ Nenhuma senha definida. Crie uma senha para liberar o acesso.';
          createBtn.style.display = 'inline-block';
          changeBtn.style.display = 'none';
        }
      } else {
        statusEl.textContent = '❌ Erro ao carregar status da senha.';
      }
    } catch (error) {
      statusEl.textContent = '❌ Erro ao carregar status da senha.';
    }
  }

  bindAdminPasswordEvents() {
    const createBtn = document.getElementById('adminCreatePasswordBtn');
    const changeBtn = document.getElementById('adminChangePasswordBtn');
    const saveBtn = document.getElementById('adminSavePasswordBtn');
    const cancelBtn = document.getElementById('adminCancelPasswordBtn');

    if (createBtn) {
      createBtn.addEventListener('click', () => this.openAdminPasswordForm(false));
    }
    if (changeBtn) {
      changeBtn.addEventListener('click', () => this.openAdminPasswordForm(true));
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveAdminPassword());
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeAdminPasswordForm());
    }
  }

  openAdminPasswordForm(requireCurrent) {
    const fields = document.getElementById('adminPasswordFields');
    const actions = document.getElementById('adminPasswordActions');
    const currentGroup = document.getElementById('adminCurrentPasswordGroup');

    if (fields) fields.style.display = 'block';
    if (actions) actions.style.display = 'none';
    if (currentGroup) currentGroup.style.display = requireCurrent ? 'block' : 'none';
  }

  closeAdminPasswordForm() {
    const fields = document.getElementById('adminPasswordFields');
    const actions = document.getElementById('adminPasswordActions');
    if (fields) fields.style.display = 'none';
    if (actions) actions.style.display = 'block';

    const currentInput = document.getElementById('adminCurrentPasswordInput');
    const newInput = document.getElementById('adminNewPasswordInput');
    const confirmInput = document.getElementById('adminConfirmPasswordInput');
    if (currentInput) currentInput.value = '';
    if (newInput) newInput.value = '';
    if (confirmInput) confirmInput.value = '';
  }

  async saveAdminPassword() {
    const currentInput = document.getElementById('adminCurrentPasswordInput');
    const newInput = document.getElementById('adminNewPasswordInput');
    const confirmInput = document.getElementById('adminConfirmPasswordInput');

    const newPassword = newInput ? newInput.value.trim() : '';
    const confirmPassword = confirmInput ? confirmInput.value.trim() : '';
    const currentPassword = currentInput ? currentInput.value : '';

    if (newPassword.length < 4) {
      alert('❌ A senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('❌ As senhas não coincidem.');
      return;
    }

    const requireCurrent = document.getElementById('adminCurrentPasswordGroup')?.style.display !== 'none';
    const method = requireCurrent ? 'PUT' : 'POST';
    const payload = requireCurrent
      ? { password: newPassword, currentPassword }
      : { password: newPassword };

    try {
      const response = await window.authManager.apiRequest('/api/settings-password', {
        method,
        body: JSON.stringify(payload)
      });

      if (response.success) {
        alert('✅ Senha atualizada com sucesso.');
        this.closeAdminPasswordForm();
        this.loadAdminPasswordStatus();
      } else {
        throw new Error(response.message || 'Erro ao salvar senha');
      }
    } catch (error) {
      alert('❌ Erro ao salvar senha: ' + error.message);
    }
  }

  buildLegacyLocalSettings(settings) {
    return {
      company_name: settings.company_name,
      logo: settings.logo,
      campos_visiveis: settings.campos_visiveis || ['nome', 'telefone'],
      campos_extras: settings.campos_extras || [],
      servicos: settings.services || [],
      funcionamento: {
        dias: settings.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        inicio: settings.working_hours?.start || '08:00',
        fim: settings.working_hours?.end || '18:00',
        slot: settings.slot_interval || 30
      }
    };
  }

  async fetchSettingsOnce() {
    // Cache da requisição para evitar múltiplas chamadas
    if (this._fetchPromise) {
      console.log('📡 Requisição já em andamento, aguardando...');
      return await this._fetchPromise;
    }
    
    this._fetchPromise = (async () => {
      try {
        if (!window.authManager || !window.authManager.currentUser) {
          console.error('❌ AuthManager ou usuário não disponível');
          return this.getLocalSettingsFallback();
        }
        
        const user = window.authManager.currentUser;
        const userId = user.parent_user_id || user.id;
        
        console.log('📡 Buscando configurações para userId:', userId);
        const response = await window.authManager.apiRequest(`/api/moderator/settings?userId=${userId}`);
        
        console.log('📥 Resposta recebida:', response);
        
        if (response && response.success && response.data) {
          console.log('✅ Configurações carregadas:', response.data);
          return response.data;
        } else {
          console.warn('⚠️ Resposta sem dados válidos, usando fallback');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        console.error('❌ Stack:', error.stack);
      } finally {
        // Limpar promise após 1 segundo para permitir nova requisição se necessário
        setTimeout(() => {
          this._fetchPromise = null;
        }, 1000);
      }
      
      const fallback = this.getLocalSettingsFallback();
      if (fallback) {
        console.log('📦 Usando configurações do localStorage:', fallback);
        return fallback;
      }
      
      console.log('⚠️ Nenhuma configuração encontrada, usando padrões');
      return null;
    })();
    
    return await this._fetchPromise;
  }

  getLocalSettingsFallback() {
    try {
      const v2 = localStorage.getItem('moderator_settings_v2');
      if (v2) {
        return JSON.parse(v2);
      }
    } catch (e) {
      console.warn('Erro ao ler moderator_settings_v2:', e);
    }

    try {
      const legacy = localStorage.getItem('moderator_settings');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return {
          company_name: parsed.company_name || null,
          services: parsed.servicos || [],
          working_hours: {
            start: parsed.funcionamento?.inicio || '08:00',
            end: parsed.funcionamento?.fim || '18:00'
          },
          working_days: parsed.funcionamento?.dias || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          campos_visiveis: parsed.campos_visiveis || ['nome', 'telefone'],
          campos_extras: parsed.campos_extras || [],
          logo: parsed.logo || null,
          slot_interval: parsed.funcionamento?.slot || 30
        };
      }
    } catch (e) {
      console.warn('Erro ao ler moderator_settings:', e);
    }

    return null;
  }
}

// Inicializar quando o DOM estiver pronto
let settingsManager;
document.addEventListener('DOMContentLoaded', () => {
  console.log('📋 DOM carregado, inicializando SettingsManager...');
  
  const maxAttempts = 30;
  let attempts = 0;
  let initialized = false;

  const tryInit = () => {
    if (initialized || window.settingsManager) {
      if (!initialized) {
        console.log('✅ SettingsManager já existe, usando instância existente');
        initialized = true;
      }
      return;
    }

    if (window.authManager) {
      console.log('✅ AuthManager encontrado, criando SettingsManager...');
      try {
        settingsManager = new SettingsManager();
        window.settingsManager = settingsManager;
        initialized = true;
        console.log('✅ SettingsManager inicializado com sucesso');
        return;
      } catch (error) {
        console.error('❌ Erro ao criar SettingsManager:', error);
        alert('Erro ao inicializar configurações. Recarregue a página.');
        return;
      }
    }

    attempts += 1;
    if (attempts >= maxAttempts) {
      console.error('❌ AuthManager não carregou a tempo após', maxAttempts, 'tentativas. Recarregue a página.');
      alert('Erro ao carregar sistema de autenticação. Recarregue a página.');
      return;
    }

    if (attempts % 5 === 0) {
      console.log(`⏳ Aguardando AuthManager... (tentativa ${attempts}/${maxAttempts})`);
    }

    setTimeout(tryInit, 200);
  };

  tryInit();
});

// Funções globais para os botões - com fallback robusto
function addExtraField() {
  try {
    if (window.settingsManager) {
      if (window.settingsManager.isPasswordVerified) {
        if (window.settingsManager.formBuilder) {
          window.settingsManager.formBuilder.addExtraField();
          return;
        }
      } else {
        alert('⚠️ Por favor, verifique sua senha primeiro para adicionar campos.');
        return;
      }
    }
    console.warn('⚠️ SettingsManager não disponível ainda. Tentando novamente...');
    setTimeout(() => {
      if (window.settingsManager && window.settingsManager.isPasswordVerified) {
        addExtraField();
      }
    }, 500);
  } catch (error) {
    console.error('Erro ao adicionar campo extra:', error);
    alert('❌ Erro ao adicionar campo. Tente novamente.');
  }
}

function addService() {
  try {
    if (window.settingsManager) {
      if (window.settingsManager.isPasswordVerified) {
        if (window.settingsManager.serviceManager) {
          window.settingsManager.serviceManager.addService();
          return;
        }
      } else {
        alert('⚠️ Por favor, verifique sua senha primeiro para adicionar serviços.');
        return;
      }
    }
    console.warn('⚠️ SettingsManager não disponível ainda. Tentando novamente...');
    setTimeout(() => {
      if (window.settingsManager && window.settingsManager.isPasswordVerified) {
        addService();
      }
    }, 500);
  } catch (error) {
    console.error('Erro ao adicionar serviço:', error);
    alert('❌ Erro ao adicionar serviço. Tente novamente.');
  }
}

// Gerenciamento de API Key para empresas
SettingsManager.prototype.initApiKeyManagement = function() {
  const user = window.authManager?.currentUser;
  
  // Mostrar tab de integrações apenas para empresas (não admin_master)
  const integrationsTabBtn = document.getElementById('integrationsTabBtn');
  if (integrationsTabBtn && user && (user.role === 'empresa' || user.role === 'moderator')) {
    integrationsTabBtn.style.display = 'block';
  }

  // Bind eventos
  const regenerateBtn = document.getElementById('regenerateApiKeyBtn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => this.regenerateApiKey());
  }

  const closeModalBtn = document.getElementById('closeApiKeyModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      document.getElementById('apiKeyModal').style.display = 'none';
    });
  }

  const copyModalBtn = document.getElementById('copyApiKeyModalBtn');
  if (copyModalBtn) {
    copyModalBtn.addEventListener('click', () => {
      const apiKeyDisplay = document.getElementById('newApiKeyDisplay');
      if (apiKeyDisplay && apiKeyDisplay.textContent) {
        const apiKey = apiKeyDisplay.textContent;
        
        // Tentar usar Clipboard API (requer HTTPS ou localhost)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(apiKey).then(() => {
            alert('✅ API Key copiada para a área de transferência!');
          }).catch(() => {
            // Fallback para método antigo
            this.fallbackCopyToClipboard(apiKey);
          });
        } else {
          // Fallback para navegadores antigos ou sem HTTPS
          this.fallbackCopyToClipboard(apiKey);
        }
      }
    });
  }

  // Fechar modal ao clicar fora
  const modal = document.getElementById('apiKeyModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
};

SettingsManager.prototype.loadApiKeyInfo = async function() {
  try {
    console.log('🔍 [loadApiKeyInfo] Carregando informações da API Key...');
    const response = await window.authManager.apiRequest('/api/empresa/api-key/info');
    
    console.log('🔍 [loadApiKeyInfo] Resposta recebida:', response);
    
    if (response.success && response.data) {
      const data = response.data;
      console.log('🔍 [loadApiKeyInfo] Dados processados:', data);
      
      const statusBadge = document.getElementById('apiKeyStatusBadge');
      const prefixDisplay = document.getElementById('apiKeyPrefixDisplay');
      const prefixValue = document.getElementById('apiKeyPrefixValue');
      const datesDiv = document.getElementById('apiKeyDates');
      const createdAt = document.getElementById('apiKeyCreatedAt');
      const lastRegenerated = document.getElementById('apiKeyLastRegenerated');

      console.log('🔍 [loadApiKeyInfo] Elementos encontrados:', {
        statusBadge: !!statusBadge,
        prefixDisplay: !!prefixDisplay,
        prefixValue: !!prefixValue,
        datesDiv: !!datesDiv
      });

      // Garantir que hasApiKey seja tratado como boolean
      const hasApiKey = Boolean(data.hasApiKey);
      
      console.log('🔍 [loadApiKeyInfo] hasApiKey (boolean):', hasApiKey, typeof hasApiKey);

      if (hasApiKey === true) {
        console.log('✅ [loadApiKeyInfo] API Key configurada, atualizando UI...');
        if (statusBadge) {
          statusBadge.textContent = 'Configurada';
          statusBadge.style.background = '#10b981';
          statusBadge.style.color = 'white';
          statusBadge.style.display = 'inline-block';
          console.log('✅ [loadApiKeyInfo] Status badge atualizado para "Configurada" (verde)');
        }
        if (prefixDisplay) {
          prefixDisplay.style.display = 'block';
          console.log('✅ [loadApiKeyInfo] Prefix display mostrado');
        }
        if (prefixValue) {
          prefixValue.textContent = data.prefix || '-';
          console.log('✅ [loadApiKeyInfo] Prefix value atualizado:', data.prefix);
        }
        if (datesDiv) {
          datesDiv.style.display = 'block';
          console.log('✅ [loadApiKeyInfo] Dates div mostrado');
        }
        if (createdAt && data.createdAt) {
          createdAt.textContent = new Date(data.createdAt).toLocaleString('pt-BR');
        }
        if (lastRegenerated && data.lastRegenerated) {
          lastRegenerated.textContent = new Date(data.lastRegenerated).toLocaleString('pt-BR');
        } else if (lastRegenerated) {
          lastRegenerated.textContent = 'Nunca regenerada';
        }
      } else {
        console.log('⚠️ [loadApiKeyInfo] API Key não configurada (hasApiKey =', hasApiKey, ')');
        if (statusBadge) {
          statusBadge.textContent = 'Não configurada';
          statusBadge.style.background = '#ef4444';
          statusBadge.style.color = 'white';
          statusBadge.style.display = 'inline-block';
        }
        if (prefixDisplay) prefixDisplay.style.display = 'none';
        if (datesDiv) datesDiv.style.display = 'none';
      }
    } else {
      console.warn('⚠️ [loadApiKeyInfo] Resposta sem dados:', response);
    }
  } catch (error) {
    console.error('❌ [loadApiKeyInfo] Erro ao carregar informações da API Key:', error);
  }
};

SettingsManager.prototype.fallbackCopyToClipboard = function(text) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-999999px';
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (successful) {
      alert('✅ API Key copiada para a área de transferência!');
    } else {
      alert('❌ Erro ao copiar. Selecione e copie manualmente:\n\n' + text);
    }
  } catch (error) {
    console.error('Erro ao copiar:', error);
    alert('❌ Erro ao copiar. Selecione e copie manualmente:\n\n' + text);
  }
};

SettingsManager.prototype.regenerateApiKey = async function() {
  if (!confirm('Tem certeza que deseja regenerar a API Key?\n\nA API Key atual será invalidada e você precisará atualizar todas as integrações que a utilizam.')) {
    return;
  }

  const btn = document.getElementById('regenerateApiKeyBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Gerando...';
  }

  try {
    const response = await window.authManager.apiRequest('/api/empresa/api-key/regenerate', {
      method: 'POST'
    });

    if (response.success && response.apiKey) {
      console.log('✅ [regenerateApiKey] API Key regenerada com sucesso:', response.apiKey.substring(0, 20) + '...');
      
      // Mostrar modal com nova API Key
      const modal = document.getElementById('apiKeyModal');
      const apiKeyDisplay = document.getElementById('newApiKeyDisplay');
      
      if (apiKeyDisplay) {
        apiKeyDisplay.textContent = response.apiKey;
      }
      if (modal) {
        modal.style.display = 'block';
      }

      // Aguardar um pouco antes de recarregar (garantir que o banco foi atualizado)
      console.log('⏳ [regenerateApiKey] Aguardando 1 segundo antes de recarregar informações...');
      setTimeout(async () => {
        console.log('🔄 [regenerateApiKey] Recarregando informações da API Key...');
        await this.loadApiKeyInfo();
      }, 1000);
    } else {
      console.error('❌ [regenerateApiKey] Resposta sem API Key:', response);
      alert('Erro ao regenerar API Key: ' + (response.message || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao regenerar API Key:', error);
    alert('Erro ao regenerar API Key: ' + (error.message || 'Erro desconhecido'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔁 Gerar Nova API Key';
    }
  }
};

