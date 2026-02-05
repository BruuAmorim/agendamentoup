// Gerenciador de Configurações com Componentes Separados
// Componente: GeneralSettings
class GeneralSettings {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.data = {
      company_name: '',
      logo: null
    };
  }

  applySettings(data) {
    this.data.company_name = data.company_name || '';
    this.data.logo = data.logo || null;
    this.render();
  }

  render() {
    const companyNameInput = document.getElementById('companyName');
    if (companyNameInput) {
      companyNameInput.value = this.data.company_name;
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
          <button type="button" onclick="settingsManager.formBuilder.removeExtraField('${fieldId}')">🗑️</button>
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
        <button type="button" onclick="settingsManager.formBuilder.removeExtraField('${fieldId}')">🗑️</button>
      </div>
    `;
    list.insertAdjacentHTML('beforeend', fieldHtml);
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
      servicos: []
    };
  }

  applySettings(data) {
    if (data.services) {
      this.data.servicos = Array.isArray(data.services)
        ? data.services
        : JSON.parse(data.services || '[]');
    }
    this.render();
  }

  render() {
    const list = document.getElementById('servicesList');
    if (!list) return;

    list.innerHTML = '';
    
    this.data.servicos.forEach((service, index) => {
      const serviceId = `service_${index}`;
      const serviceHtml = `
        <div class="service-item" data-service-id="${serviceId}">
          <input type="text" value="${service}" class="service-name" placeholder="Nome do serviço">
          <button type="button" onclick="settingsManager.serviceManager.removeService('${serviceId}')">🗑️</button>
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
        <button type="button" onclick="settingsManager.serviceManager.removeService('${serviceId}')">🗑️</button>
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
    document.querySelectorAll('.service-name').forEach(input => {
      const value = input.value.trim();
      if (value) {
        this.data.servicos.push(value);
      }
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

// Componente: ScheduleConfig
class ScheduleConfig {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.data = {
      dias: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      inicio: '08:00',
      fim: '18:00',
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

    if (startTimeInput) startTimeInput.value = this.data.inicio;
    if (endTimeInput) endTimeInput.value = this.data.fim;
    if (slotIntervalInput) slotIntervalInput.value = this.data.slot;

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

    if (startTimeInput) this.data.inicio = startTimeInput.value;
    if (endTimeInput) this.data.fim = endTimeInput.value;
    if (slotIntervalInput) this.data.slot = parseInt(slotIntervalInput.value) || 30;

    return {
      working_days: this.data.dias,
      working_hours: {
        start: this.data.inicio,
        end: this.data.fim
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
    
    // Inicializar componentes
    this.generalSettings = new GeneralSettings(this);
    this.formBuilder = new FormBuilder(this);
    this.serviceManager = new ServiceManager(this);
    this.scheduleConfig = new ScheduleConfig(this);
    
    this.init();
  }

  async init() {
    // Verificar autenticação
    if (!window.authManager) {
      window.location.href = '../css/index.html';
      return;
    }

    const user = window.authManager.currentUser;
    if (!user || (user.role !== 'moderator' && user.role !== 'admin_master' && !(user.role === 'user' && user.parent_user_id))) {
      window.location.href = 'agendamentos.html';
      return;
    }

    // Verificar senha antes de habilitar o acesso
    await this.checkPasswordAccess();

    if (this.isPasswordVerified) {
      // Bind eventos
      this.bindEvents();
      
      // Carregar configurações
      await this.loadSettings();
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
      const response = await window.authManager.apiRequest('/api/auth/verify-admin-password', {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      if (response.success) {
        this.isPasswordVerified = true;
        sessionStorage.setItem('settings_password_verified', 'true');
        
        // Esconder lock screen e mostrar conteúdo
        this.hideLockScreen();
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
    }
  }

  cancelPassword() {
    window.location.href = 'agendamentos.html';
  }

  markChanged() {
    this.hasChanges = true;
    this.updateSaveButton();
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
      logoUpload.addEventListener('change', (e) => {
        if (e.target.files[0]) {
          this.generalSettings.handleLogoUpload(e.target.files[0]);
        }
      });
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

    // Seção admin master para senha
    this.initAdminPasswordSection();
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
      companyName.addEventListener('input', () => this.markChanged());
    }

    // Campos visíveis
    ['fieldNome', 'fieldTelefone', 'fieldEmail', 'fieldCPF'].forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', () => this.markChanged());
      }
    });

    // Dias da semana
    document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.markChanged();
        this.scheduleConfig.updateDayCheckboxStyle(checkbox);
      });
    });

    // Horários
    ['startTime', 'endTime', 'slotInterval'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', () => this.markChanged());
      }
    });
  }

  updateSaveButton() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
      saveBtn.disabled = !this.hasChanges;
    }
  }

  async loadSettings() {
    const data = await this.fetchSettingsOnce();
    if (data) {
      this.generalSettings.applySettings(data);
      this.formBuilder.applySettings(data);
      this.serviceManager.applySettings(data);
      this.scheduleConfig.applySettings(data);
    }

    this.cachedSettings = this.collectAllSettings();
    this.hasChanges = false;
    this.updateSaveButton();
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
    if (!this.isPasswordVerified) {
      alert('Por favor, verifique sua senha primeiro.');
      return;
    }

    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '💾 Salvando...';
    }

    try {
      const settings = this.collectAllSettings();
      const user = window.authManager.currentUser;
      const userId = user.parent_user_id || user.id;

      // Preparar dados para o backend
      const backendData = {
        company_name: settings.company_name,
        services: settings.services,
        working_hours: settings.working_hours,
        working_days: settings.working_days,
        campos_visiveis: settings.campos_visiveis,
        campos_extras: settings.campos_extras,
        logo: settings.logo,
        slot_interval: settings.slot_interval
      };

      const response = await window.authManager.apiRequest('/api/moderator/settings', {
        method: 'PUT',
        body: JSON.stringify(backendData)
      });

      if (response.success) {
        this.hasChanges = false;
        this.updateSaveButton();
        this.cachedSettings = settings;
        
        // Salvar também no localStorage para uso imediato
        localStorage.setItem('moderator_settings', JSON.stringify(this.buildLegacyLocalSettings(settings)));
        localStorage.setItem('moderator_settings_v2', JSON.stringify(settings));
        
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
      const response = await window.authManager.apiRequest('/api/settings-password');
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
    try {
      const user = window.authManager.currentUser;
      const userId = user.parent_user_id || user.id;
      const response = await window.authManager.apiRequest(`/api/moderator/settings?userId=${userId}`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
    return null;
  }
}

// Inicializar quando o DOM estiver pronto
let settingsManager;
document.addEventListener('DOMContentLoaded', () => {
  const maxAttempts = 30;
  let attempts = 0;
  let initialized = false;

  const tryInit = () => {
    if (initialized || window.settingsManager) {
      initialized = true;
      return;
    }

    if (window.authManager) {
      settingsManager = new SettingsManager();
      window.settingsManager = settingsManager;
      initialized = true;
      return;
    }

    attempts += 1;
    if (attempts >= maxAttempts) {
      console.error('AuthManager não carregou a tempo. Recarregue a página.');
      return;
    }

    setTimeout(tryInit, 200);
  };

  tryInit();
});

// Funções globais para os botões
function addExtraField() {
  if (window.settingsManager && window.settingsManager.isPasswordVerified) {
    window.settingsManager.formBuilder.addExtraField();
  }
}

function addService() {
  if (window.settingsManager && window.settingsManager.isPasswordVerified) {
    window.settingsManager.serviceManager.addService();
  }
}

