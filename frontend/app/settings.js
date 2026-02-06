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
    this.isLoading = false; // Flag para evitar múltiplas requisições simultâneas
    this.settingsLoaded = false; // Flag para evitar recarregar múltiplas vezes
    
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
        method: 'POST',
        body: JSON.stringify({ password })
      });

      if (response.success) {
        this.isPasswordVerified = true;
        sessionStorage.setItem('settings_password_verified', 'true');
        
        // Esconder lock screen e mostrar conteúdo
        this.hideLockScreen();
        
        // Carregar configurações após verificação
        await this.loadSettings();
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
      // Habilitar botão apenas se senha verificada
      saveBtn.disabled = !this.isPasswordVerified;
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
      saveBtn.addEventListener('click', () => {
        if (this.isPasswordVerified) {
          this.saveSettings();
        } else {
          alert('⚠️ Por favor, verifique sua senha primeiro.');
        }
      });
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

    // Seção admin master para senha
    this.initAdminPasswordSection();

    // Event delegation para botões dinâmicos (campos extras e serviços)
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
    };

    // Usar o mesmo elemento para evitar múltiplos listeners
    const settingsContainer = document.getElementById('settingsContainer');
    if (settingsContainer) {
      settingsContainer.addEventListener('click', handleDynamicButtonClick.bind(this));
    } else {
      // Fallback para document se container não existir ainda
      document.addEventListener('click', handleDynamicButtonClick.bind(this));
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
      } else {
        console.error(`❌ Tab ${tabName}-tab não encontrada`);
      }
    } catch (error) {
      console.error('Erro ao trocar tab:', error);
    }
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
    if (!this.isPasswordVerified) {
      alert('Por favor, verifique sua senha primeiro.');
      return;
    }

    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn && saveBtn.disabled) {
      console.log('⚠️ Salvamento já em andamento, ignorando...');
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '💾 Salvando...';
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
        this.hasChanges = false;
        this.updateSaveButton();
        this.cachedSettings = settings;
        
        // Salvar também no localStorage para uso imediato
        localStorage.setItem('moderator_settings', JSON.stringify(this.buildLegacyLocalSettings(settings)));
        localStorage.setItem('moderator_settings_v2', JSON.stringify(settings));
        
        // Disparar eventos para atualizar a tela de agendamentos
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
        window.dispatchEvent(new CustomEvent('companySettingsUpdated', { detail: settings }));
        
        // Forçar recarregamento das configurações na tela de agendamentos
        if (window.app && typeof window.app.loadModeratorSettings === 'function') {
          setTimeout(() => {
            window.app.loadModeratorSettings();
            window.app.loadCompanyInfo();
          }, 500);
        }
        
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

