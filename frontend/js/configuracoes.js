// Configurações do Sistema Aevum

class ConfiguracoesManager {
    constructor() {
        this.config = this.loadConfig();
        this.init();
    }

    init() {
        console.log('🔧 Inicializando configurações...');
        this.setupEventListeners();
        this.loadCurrentConfig();
        this.updateStatusIndicators();
        console.log('Sistema de configurações inicializado');
    }

    setupEventListeners() {
        // Botões principais
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());
        document.getElementById('resetConfigBtn').addEventListener('click', () => this.resetConfig());

        // Botões de teste
        document.getElementById('testN8nBtn').addEventListener('click', () => this.testN8nWebhook());
        document.getElementById('testCloudChatBtn').addEventListener('click', () => this.testCloudChatAPI());

        // Outros controles
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());

        // Toggle do tema
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('evagendamento_config');
            return saved ? JSON.parse(saved) : this.getDefaultConfig();
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            return this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            whatsapp: {
                enabled: false,
                token: '',
                phoneNumberId: '',
                businessId: ''
            },
            n8n: {
                enabled: false,
                webhookUrl: '',
                apiKey: ''
            },
            cloudChat: {
                enabled: false,
                apiKey: '',
                baseUrl: 'https://api.clouddchat.com',
                instanceId: '',
                webhookToken: '',
                autoReply: false
            }
        };
    }

    saveConfig() {
        try {
            this.collectFormData();
            localStorage.setItem('evagendamento_config', JSON.stringify(this.config));
            this.showToast('✅ Configurações salvas com sucesso!', 'success');
            this.updateStatusIndicators();
            this.log('Configurações salvas no localStorage');
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showToast('❌ Erro ao salvar configurações', 'error');
        }
    }

    collectFormData() {
        // WhatsApp
        this.config.whatsapp.enabled = document.getElementById('whatsappEnabled').checked;
        this.config.whatsapp.token = document.getElementById('whatsappToken').value;
        this.config.whatsapp.phoneNumberId = document.getElementById('whatsappPhoneNumberId').value;
        this.config.whatsapp.businessId = document.getElementById('whatsappBusinessId').value;

        // n8n
        this.config.n8n.enabled = document.getElementById('n8nEnabled').checked;
        this.config.n8n.webhookUrl = document.getElementById('n8nWebhookUrl').value;
        this.config.n8n.apiKey = document.getElementById('n8nApiKey').value;

        // Cloud Chat
        this.config.cloudChat.enabled = document.getElementById('cloudChatEnabled').checked;
        this.config.cloudChat.apiKey = document.getElementById('cloudChatApiKey').value;
        this.config.cloudChat.baseUrl = document.getElementById('cloudChatBaseUrl').value;
        this.config.cloudChat.instanceId = document.getElementById('cloudChatInstanceId').value;
        this.config.cloudChat.webhookToken = document.getElementById('cloudChatWebhookToken').value;
        this.config.cloudChat.autoReply = document.getElementById('cloudChatAutoReply').checked;

        console.log('Dados do formulário coletados');
    }

    loadCurrentConfig() {
        // WhatsApp
        document.getElementById('whatsappEnabled').checked = this.config.whatsapp.enabled;
        document.getElementById('whatsappToken').value = this.config.whatsapp.token;
        document.getElementById('whatsappPhoneNumberId').value = this.config.whatsapp.phoneNumberId;
        document.getElementById('whatsappBusinessId').value = this.config.whatsapp.businessId;

        // n8n
        document.getElementById('n8nEnabled').checked = this.config.n8n.enabled;
        document.getElementById('n8nWebhookUrl').value = this.config.n8n.webhookUrl;
        document.getElementById('n8nApiKey').value = this.config.n8n.apiKey;

        // Cloud Chat
        document.getElementById('cloudChatEnabled').checked = this.config.cloudChat.enabled;
        document.getElementById('cloudChatApiKey').value = this.config.cloudChat.apiKey;
        document.getElementById('cloudChatBaseUrl').value = this.config.cloudChat.baseUrl;
        document.getElementById('cloudChatInstanceId').value = this.config.cloudChat.instanceId;
        document.getElementById('cloudChatWebhookToken').value = this.config.cloudChat.webhookToken;
        document.getElementById('cloudChatAutoReply').checked = this.config.cloudChat.autoReply;

        console.log('Configurações carregadas na interface');
    }

    updateStatusIndicators() {
        // Status do WhatsApp
        const whatsappStatus = document.getElementById('whatsappStatus');
        if (this.config.whatsapp.enabled && this.config.whatsapp.token && this.config.whatsapp.phoneNumberId) {
            whatsappStatus.textContent = 'Configurado';
            whatsappStatus.className = 'status-indicator configured';
        } else if (this.config.whatsapp.enabled) {
            whatsappStatus.textContent = 'Incompleto';
            whatsappStatus.className = 'status-indicator warning';
        } else {
            whatsappStatus.textContent = 'Desabilitado';
            whatsappStatus.className = 'status-indicator disabled';
        }

        // Status do n8n
        const n8nStatus = document.getElementById('n8nStatus');
        if (this.config.n8n.enabled && this.config.n8n.webhookUrl) {
            n8nStatus.textContent = 'Configurado';
            n8nStatus.className = 'status-indicator configured';
        } else if (this.config.n8n.enabled) {
            n8nStatus.textContent = 'Incompleto';
            n8nStatus.className = 'status-indicator warning';
        } else {
            n8nStatus.textContent = 'Desabilitado';
            n8nStatus.className = 'status-indicator disabled';
        }

        // Status do Cloud Chat
        const cloudChatStatus = document.getElementById('cloudChatStatus');
        if (this.config.cloudChat.enabled && this.config.cloudChat.apiKey && this.config.cloudChat.baseUrl) {
            cloudChatStatus.textContent = 'Configurado';
            cloudChatStatus.className = 'status-indicator configured';
        } else if (this.config.cloudChat.enabled) {
            cloudChatStatus.textContent = 'Incompleto';
            cloudChatStatus.className = 'status-indicator warning';
        } else {
            cloudChatStatus.textContent = 'Desabilitado';
            cloudChatStatus.className = 'status-indicator disabled';
        }
    }


    async testN8nWebhook() {
        const webhookUrl = document.getElementById('n8nWebhookUrl').value;
        const apiKey = document.getElementById('n8nApiKey').value;

        if (!webhookUrl) {
            this.showToast('❌ URL do webhook não configurada', 'error');
            return;
        }

        this.log('🔍 Testando webhook n8n...');

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    event: 'test_webhook',
                    message: 'Teste de conexão do Cloudd Agenda',
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                this.showToast('✅ Webhook n8n testado com sucesso!', 'success');
                this.log('✅ Webhook n8n respondeu OK');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            this.showToast('❌ Falha no teste do webhook n8n', 'error');
            this.log('❌ Erro no webhook n8n:', error.message);
        }
    }

    async testCloudChatAPI() {
        const apiKey = document.getElementById('cloudChatApiKey').value;
        const baseUrl = document.getElementById('cloudChatBaseUrl').value;

        if (!apiKey || !baseUrl) {
            this.showToast('❌ API Key e URL Base são obrigatórios', 'error');
            return;
        }

        this.log('🔍 Testando API do Cloud Chat...');

        try {
            // Teste básico - verificar conectividade
            // Baseado na documentação do Cloud Chat, vamos fazer uma requisição de teste
            const testUrl = `${baseUrl}/status`; // Endpoint comum de status

            const headers = {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'ClouddAgenda/1.0'
            };

            // Alguns provedores têm endpoints diferentes, vamos tentar alguns comuns
            const testEndpoints = [
                '/status',
                '/health',
                '/ping',
                '/api/v1/status'
            ];

            let response = null;
            let lastError = null;

            for (const endpoint of testEndpoints) {
                try {
                    this.log(`🔍 Testando endpoint: ${endpoint}`);
                    response = await fetch(`${baseUrl}${endpoint}`, {
                        method: 'GET',
                        headers: headers,
                        signal: AbortSignal.timeout(10000) // 10 segundos timeout
                    });

                    if (response.ok) {
                        break;
                    }
                } catch (error) {
                    lastError = error;
                    this.log(`⚠️ Endpoint ${endpoint} falhou: ${error.message}`);
                }
            }

            if (response && response.ok) {
                const data = await response.json().catch(() => ({}));
                this.showToast('✅ API do Cloud Chat conectada com sucesso!', 'success');
                this.log('✅ API do Cloud Chat respondeu OK');
                this.log('📊 Resposta:', JSON.stringify(data, null, 2));
            } else {
                throw new Error(lastError?.message || `HTTP ${response?.status}: ${response?.statusText}`);
            }
        } catch (error) {
            this.showToast('❌ Falha na conexão com Cloud Chat API', 'error');
            this.log('❌ Erro na API do Cloud Chat:', error.message);

            // Sugestões específicas para troubleshooting
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.log('💡 Verifique: URL base, conectividade de internet, CORS');
            } else if (error.message.includes('401') || error.message.includes('403')) {
                this.log('💡 Verifique: API Key está correta e válida');
            } else if (error.message.includes('timeout')) {
                this.log('💡 Verifique: Servidor pode estar lento ou indisponível');
            }
        }
    }

    resetConfig() {
        if (confirm('⚠️ Tem certeza que deseja restaurar as configurações padrão? Todas as alterações serão perdidas.')) {
            this.config = this.getDefaultConfig();
            this.loadCurrentConfig();
            this.updateStatusIndicators();
            this.showToast('🔄 Configurações restauradas para padrão', 'success');
            this.log('Configurações restauradas para padrão');
        }
    }


    toggleTheme() {
        const body = document.body;
        const themeToggle = document.getElementById('themeToggle');

        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            themeToggle.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.add('dark-theme');
            themeToggle.textContent = '☀️';
            localStorage.setItem('theme', 'dark');
        }
    }

    goBack() {
        window.location.href = 'index.html';
    }

    showToast(message, type = 'info') {
        // Criar toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        document.getElementById('toastContainer').appendChild(toast);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.configManager = new ConfiguracoesManager();
});

class ConfiguracoesManager {
    constructor() {
        this.config = this.loadConfig();
        this.init();
    }

    init() {
        console.log('🔧 Inicializando configurações...');
        this.setupEventListeners();
        this.loadCurrentConfig();
        this.updateStatusIndicators();
        console.log('Sistema de configurações inicializado');
    }

    setupEventListeners() {
        // Botões principais
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());
        document.getElementById('resetConfigBtn').addEventListener('click', () => this.resetConfig());

        // Botões de teste
        document.getElementById('testN8nBtn').addEventListener('click', () => this.testN8nWebhook());
        document.getElementById('testCloudChatBtn').addEventListener('click', () => this.testCloudChatAPI());

        // Outros controles
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());

        // Toggle do tema
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('evagendamento_config');
            return saved ? JSON.parse(saved) : this.getDefaultConfig();
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            return this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            whatsapp: {
                enabled: false,
                token: '',
                phoneNumberId: '',
                businessId: ''
            },
            n8n: {
                enabled: false,
                webhookUrl: '',
                apiKey: ''
            },
            cloudChat: {
                enabled: false,
                apiKey: '',
                baseUrl: 'https://api.clouddchat.com',
                instanceId: '',
                webhookToken: '',
                autoReply: false
            }
        };
    }

    saveConfig() {
        try {
            this.collectFormData();
            localStorage.setItem('evagendamento_config', JSON.stringify(this.config));
            this.showToast('✅ Configurações salvas com sucesso!', 'success');
            this.updateStatusIndicators();
            this.log('Configurações salvas no localStorage');
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showToast('❌ Erro ao salvar configurações', 'error');
        }
    }

    collectFormData() {
        // WhatsApp
        this.config.whatsapp.enabled = document.getElementById('whatsappEnabled').checked;
        this.config.whatsapp.token = document.getElementById('whatsappToken').value;
        this.config.whatsapp.phoneNumberId = document.getElementById('whatsappPhoneNumberId').value;
        this.config.whatsapp.businessId = document.getElementById('whatsappBusinessId').value;

        // n8n
        this.config.n8n.enabled = document.getElementById('n8nEnabled').checked;
        this.config.n8n.webhookUrl = document.getElementById('n8nWebhookUrl').value;
        this.config.n8n.apiKey = document.getElementById('n8nApiKey').value;

        // Cloud Chat
        this.config.cloudChat.enabled = document.getElementById('cloudChatEnabled').checked;
        this.config.cloudChat.apiKey = document.getElementById('cloudChatApiKey').value;
        this.config.cloudChat.baseUrl = document.getElementById('cloudChatBaseUrl').value;
        this.config.cloudChat.instanceId = document.getElementById('cloudChatInstanceId').value;
        this.config.cloudChat.webhookToken = document.getElementById('cloudChatWebhookToken').value;
        this.config.cloudChat.autoReply = document.getElementById('cloudChatAutoReply').checked;

        console.log('Dados do formulário coletados');
    }

    loadCurrentConfig() {
        // WhatsApp
        document.getElementById('whatsappEnabled').checked = this.config.whatsapp.enabled;
        document.getElementById('whatsappToken').value = this.config.whatsapp.token;
        document.getElementById('whatsappPhoneNumberId').value = this.config.whatsapp.phoneNumberId;
        document.getElementById('whatsappBusinessId').value = this.config.whatsapp.businessId;

        // n8n
        document.getElementById('n8nEnabled').checked = this.config.n8n.enabled;
        document.getElementById('n8nWebhookUrl').value = this.config.n8n.webhookUrl;
        document.getElementById('n8nApiKey').value = this.config.n8n.apiKey;

        // Cloud Chat
        document.getElementById('cloudChatEnabled').checked = this.config.cloudChat.enabled;
        document.getElementById('cloudChatApiKey').value = this.config.cloudChat.apiKey;
        document.getElementById('cloudChatBaseUrl').value = this.config.cloudChat.baseUrl;
        document.getElementById('cloudChatInstanceId').value = this.config.cloudChat.instanceId;
        document.getElementById('cloudChatWebhookToken').value = this.config.cloudChat.webhookToken;
        document.getElementById('cloudChatAutoReply').checked = this.config.cloudChat.autoReply;

        console.log('Configurações carregadas na interface');
    }

    updateStatusIndicators() {
        // Status do WhatsApp
        const whatsappStatus = document.getElementById('whatsappStatus');
        if (this.config.whatsapp.enabled && this.config.whatsapp.token && this.config.whatsapp.phoneNumberId) {
            whatsappStatus.textContent = 'Configurado';
            whatsappStatus.className = 'status-indicator configured';
        } else if (this.config.whatsapp.enabled) {
            whatsappStatus.textContent = 'Incompleto';
            whatsappStatus.className = 'status-indicator warning';
        } else {
            whatsappStatus.textContent = 'Desabilitado';
            whatsappStatus.className = 'status-indicator disabled';
        }

        // Status do n8n
        const n8nStatus = document.getElementById('n8nStatus');
        if (this.config.n8n.enabled && this.config.n8n.webhookUrl) {
            n8nStatus.textContent = 'Configurado';
            n8nStatus.className = 'status-indicator configured';
        } else if (this.config.n8n.enabled) {
            n8nStatus.textContent = 'Incompleto';
            n8nStatus.className = 'status-indicator warning';
        } else {
            n8nStatus.textContent = 'Desabilitado';
            n8nStatus.className = 'status-indicator disabled';
        }

        // Status do Cloud Chat
        const cloudChatStatus = document.getElementById('cloudChatStatus');
        if (this.config.cloudChat.enabled && this.config.cloudChat.apiKey && this.config.cloudChat.baseUrl) {
            cloudChatStatus.textContent = 'Configurado';
            cloudChatStatus.className = 'status-indicator configured';
        } else if (this.config.cloudChat.enabled) {
            cloudChatStatus.textContent = 'Incompleto';
            cloudChatStatus.className = 'status-indicator warning';
        } else {
            cloudChatStatus.textContent = 'Desabilitado';
            cloudChatStatus.className = 'status-indicator disabled';
        }
    }


    async testN8nWebhook() {
        const webhookUrl = document.getElementById('n8nWebhookUrl').value;
        const apiKey = document.getElementById('n8nApiKey').value;

        if (!webhookUrl) {
            this.showToast('❌ URL do webhook não configurada', 'error');
            return;
        }

        this.log('🔍 Testando webhook n8n...');

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    event: 'test_webhook',
                    message: 'Teste de conexão do Cloudd Agenda',
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                this.showToast('✅ Webhook n8n testado com sucesso!', 'success');
                this.log('✅ Webhook n8n respondeu OK');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            this.showToast('❌ Falha no teste do webhook n8n', 'error');
            this.log('❌ Erro no webhook n8n:', error.message);
        }
    }

    async testCloudChatAPI() {
        const apiKey = document.getElementById('cloudChatApiKey').value;
        const baseUrl = document.getElementById('cloudChatBaseUrl').value;

        if (!apiKey || !baseUrl) {
            this.showToast('❌ API Key e URL Base são obrigatórios', 'error');
            return;
        }

        this.log('🔍 Testando API do Cloud Chat...');

        try {
            // Teste básico - verificar conectividade
            // Baseado na documentação do Cloud Chat, vamos fazer uma requisição de teste
            const testUrl = `${baseUrl}/status`; // Endpoint comum de status

            const headers = {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'ClouddAgenda/1.0'
            };

            // Alguns provedores têm endpoints diferentes, vamos tentar alguns comuns
            const testEndpoints = [
                '/status',
                '/health',
                '/ping',
                '/api/v1/status'
            ];

            let response = null;
            let lastError = null;

            for (const endpoint of testEndpoints) {
                try {
                    this.log(`🔍 Testando endpoint: ${endpoint}`);
                    response = await fetch(`${baseUrl}${endpoint}`, {
                        method: 'GET',
                        headers: headers,
                        signal: AbortSignal.timeout(10000) // 10 segundos timeout
                    });

                    if (response.ok) {
                        break;
                    }
                } catch (error) {
                    lastError = error;
                    this.log(`⚠️ Endpoint ${endpoint} falhou: ${error.message}`);
                }
            }

            if (response && response.ok) {
                const data = await response.json().catch(() => ({}));
                this.showToast('✅ API do Cloud Chat conectada com sucesso!', 'success');
                this.log('✅ API do Cloud Chat respondeu OK');
                this.log('📊 Resposta:', JSON.stringify(data, null, 2));
            } else {
                throw new Error(lastError?.message || `HTTP ${response?.status}: ${response?.statusText}`);
            }
        } catch (error) {
            this.showToast('❌ Falha na conexão com Cloud Chat API', 'error');
            this.log('❌ Erro na API do Cloud Chat:', error.message);

            // Sugestões específicas para troubleshooting
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.log('💡 Verifique: URL base, conectividade de internet, CORS');
            } else if (error.message.includes('401') || error.message.includes('403')) {
                this.log('💡 Verifique: API Key está correta e válida');
            } else if (error.message.includes('timeout')) {
                this.log('💡 Verifique: Servidor pode estar lento ou indisponível');
            }
        }
    }

    resetConfig() {
        if (confirm('⚠️ Tem certeza que deseja restaurar as configurações padrão? Todas as alterações serão perdidas.')) {
            this.config = this.getDefaultConfig();
            this.loadCurrentConfig();
            this.updateStatusIndicators();
            this.showToast('🔄 Configurações restauradas para padrão', 'success');
            this.log('Configurações restauradas para padrão');
        }
    }


    toggleTheme() {
        const body = document.body;
        const themeToggle = document.getElementById('themeToggle');

        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            themeToggle.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.add('dark-theme');
            themeToggle.textContent = '☀️';
            localStorage.setItem('theme', 'dark');
        }
    }

    goBack() {
        window.location.href = 'index.html';
    }

    showToast(message, type = 'info') {
        // Criar toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        document.getElementById('toastContainer').appendChild(toast);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.configManager = new ConfiguracoesManager();
});