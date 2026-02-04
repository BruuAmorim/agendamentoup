// Gerenciamento de Configurações e Integrações
class SettingsManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        // Modal de configurações
        const settingsModalClose = document.getElementById('settingsModalClose');
        if (settingsModalClose) {
            settingsModalClose.addEventListener('click', () => this.closeSettingsModal());
        }

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target);
                // Carregar regras quando abrir a aba
                if (e.target.dataset.tab === 'rules') {
                    this.loadRules();
                }
            });
        });

        // Formulários
        const clouddchatForm = document.getElementById('clouddchatForm');
        if (clouddchatForm) {
            clouddchatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveClouddChatSettings(e.target);
            });
        }

        const n8nForm = document.getElementById('n8nForm');
        if (n8nForm) {
            n8nForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveN8nSettings(e.target);
            });
        }

        // Formulário de novo usuário
        const newUserForm = document.getElementById('newUserForm');
        if (newUserForm) {
            newUserForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewUser();
            });
        }

        // Teste de conexão ClouddChat
        const testClouddchatBtn = document.getElementById('testClouddchatBtn');
        if (testClouddchatBtn) {
            testClouddchatBtn.addEventListener('click', () => this.testClouddChatConnection());
        }

        // Configurações gerais
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => this.toggleDarkMode(e.target.checked));
        }

        const notificationsToggle = document.getElementById('notificationsEnabled');
        if (notificationsToggle) {
            notificationsToggle.addEventListener('change', (e) => this.toggleNotifications(e.target.checked));
        }

        // Formulário de horários de funcionamento
        const businessHoursForm = document.getElementById('businessHoursForm');
        if (businessHoursForm) {
            businessHoursForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveBusinessHours();
            });
        }

        // Formulário de dias de trabalho
        const workDaysForm = document.getElementById('workDaysForm');
        if (workDaysForm) {
            workDaysForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveWorkDays();
            });
        }

        // Botão de limpeza de agendamentos
        const clearOldAppointmentsBtn = document.getElementById('clearOldAppointmentsBtn');
        if (clearOldAppointmentsBtn) {
            clearOldAppointmentsBtn.addEventListener('click', () => this.clearOldAppointments());
        }
    }

    switchTab(clickedBtn) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        // Add active class to clicked tab
        clickedBtn.classList.add('active');

        // Show corresponding pane
        const tabName = clickedBtn.dataset.tab;
        document.getElementById(tabName + 'Tab').classList.add('active');

        // Carregar regras se a aba de regras foi aberta
        if (tabName === 'rules') {
            this.loadRules();
        }
    }

    saveClouddChatSettings(form) {
        const formData = new FormData(form);
        const settings = {
            apiUrl: formData.get('apiUrl'),
            instanceId: formData.get('instanceId'),
            apiToken: formData.get('apiToken')
        };

        // Salvar no localStorage
        const allSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        allSettings.clouddchat = settings;
        localStorage.setItem('appSettings', JSON.stringify(allSettings));

        this.showToast('Configurações do ClouddChat salvas com sucesso!', 'success');
    }

    saveN8nSettings(form) {
        const formData = new FormData(form);
        const settings = {
            webhookUrl: formData.get('webhookUrl'),
            apiKey: formData.get('apiKey')
        };

        // Salvar no localStorage
        const allSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        allSettings.n8n = settings;
        localStorage.setItem('appSettings', JSON.stringify(allSettings));

        this.showToast('Configurações do n8n salvas com sucesso!', 'success');
    }

    async testClouddChatConnection() {
        const apiUrl = document.getElementById('clouddchatApiUrl').value;
        const instanceId = document.getElementById('clouddchatInstanceId').value;
        const apiToken = document.getElementById('clouddchatApiToken').value;

        if (!apiUrl || !instanceId || !apiToken) {
            this.showToast('Preencha todos os campos do ClouddChat primeiro', 'warning');
            return;
        }

        try {
            // Tentar fazer uma requisição simples para testar a conexão
            // Baseado na documentação do ClouddChat, vamos tentar um endpoint de teste
            const testUrl = `${apiUrl}/instances/${instanceId}/status`;

            const response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showToast('✅ Conexão com ClouddChat estabelecida com sucesso!', 'success');
            } else if (response.status === 401) {
                this.showToast('❌ Token de API inválido', 'error');
            } else if (response.status === 404) {
                this.showToast('❌ Instance ID não encontrado', 'error');
            } else {
                this.showToast(`❌ Erro na conexão: ${response.status}`, 'error');
            }

        } catch (error) {
            console.error('Erro no teste de conexão:', error);
            this.showToast('❌ Falha na conexão. Verifique a URL e credenciais.', 'error');
        }
    }

    toggleDarkMode(enabled) {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        if (!settings.general) settings.general = {};
        settings.general.darkMode = enabled;
        localStorage.setItem('appSettings', JSON.stringify(settings));

        // Aplicar modo escuro se houver implementação
        document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
        this.showToast(`Modo ${enabled ? 'escuro' : 'claro'} ativado`, 'info');
    }

    toggleNotifications(enabled) {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        if (!settings.general) settings.general = {};
        settings.general.notificationsEnabled = enabled;
        localStorage.setItem('appSettings', JSON.stringify(settings));

        this.showToast(`Notificações ${enabled ? 'ativadas' : 'desativadas'}`, 'info');
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('show');
    }

    showToast(message, type = 'info') {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        }
    }

    // Método para obter configurações
    static getSettings() {
        return JSON.parse(localStorage.getItem('appSettings') || '{}');
    }

    // Método para obter configuração específica
    static getSetting(key) {
        const settings = this.getSettings();
        return settings[key];
    }

    // ========== REGRAS DE AGENDAMENTO ==========

    // Carregar regras salvas
    loadRules() {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const rules = settings.rules || {};

        // Carregar horários
        if (rules.businessHours) {
            document.getElementById('openingTime').value = rules.businessHours.opening || '09:00';
            document.getElementById('closingTime').value = rules.businessHours.closing || '18:00';
            document.getElementById('lunchStart').value = rules.businessHours.lunchStart || '12:00';
            document.getElementById('lunchEnd').value = rules.businessHours.lunchEnd || '13:00';
        } else {
            // Valores padrão
            document.getElementById('openingTime').value = '09:00';
            document.getElementById('closingTime').value = '18:00';
            document.getElementById('lunchStart').value = '12:00';
            document.getElementById('lunchEnd').value = '13:00';
        }

        // Carregar dias de trabalho
        if (rules.workDays) {
            document.getElementById('monday').checked = rules.workDays.monday !== false;
            document.getElementById('tuesday').checked = rules.workDays.tuesday !== false;
            document.getElementById('wednesday').checked = rules.workDays.wednesday !== false;
            document.getElementById('thursday').checked = rules.workDays.thursday !== false;
            document.getElementById('friday').checked = rules.workDays.friday !== false;
            document.getElementById('saturday').checked = rules.workDays.saturday === true;
            document.getElementById('sunday').checked = rules.workDays.sunday === true;
        } else {
            // Valores padrão (Segunda a Sexta)
            document.getElementById('monday').checked = true;
            document.getElementById('tuesday').checked = true;
            document.getElementById('wednesday').checked = true;
            document.getElementById('thursday').checked = true;
            document.getElementById('friday').checked = true;
            document.getElementById('saturday').checked = false;
            document.getElementById('sunday').checked = false;
        }
    }

    // Salvar horários de funcionamento
    saveBusinessHours() {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        if (!settings.rules) settings.rules = {};

        settings.rules.businessHours = {
            opening: document.getElementById('openingTime').value,
            closing: document.getElementById('closingTime').value,
            lunchStart: document.getElementById('lunchStart').value,
            lunchEnd: document.getElementById('lunchEnd').value
        };

        localStorage.setItem('appSettings', JSON.stringify(settings));
        this.showToast('Horários de funcionamento salvos com sucesso!', 'success');
    }

    // Salvar dias de trabalho
    saveWorkDays() {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        if (!settings.rules) settings.rules = {};

        settings.rules.workDays = {
            monday: document.getElementById('monday').checked,
            tuesday: document.getElementById('tuesday').checked,
            wednesday: document.getElementById('wednesday').checked,
            thursday: document.getElementById('thursday').checked,
            friday: document.getElementById('friday').checked,
            saturday: document.getElementById('saturday').checked,
            sunday: document.getElementById('sunday').checked
        };

        localStorage.setItem('appSettings', JSON.stringify(settings));
        this.showToast('Dias de trabalho salvos com sucesso!', 'success');
    }

    // Limpar agendamentos antigos
    async clearOldAppointments() {
        // Solicitar senha de segurança
        const password = prompt('Digite a senha de segurança para confirmar a limpeza:');
        
        if (!password) {
            return; // Usuário cancelou
        }

        // Verificar senha (usar senha do admin logado ou senha fixa)
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const systemUsers = JSON.parse(localStorage.getItem('system_users') || '[]');
        const currentUser = systemUsers.find(u => u.email === userData.email);
        
        const validPassword = currentUser && currentUser.senha === password || password === 'admin123';
        
        if (!validPassword) {
            this.showToast('Senha incorreta. Operação cancelada.', 'error');
            return;
        }

        // Confirmar ação
        if (!confirm('Tem certeza que deseja excluir TODOS os agendamentos anteriores à data de hoje? Esta ação é irreversível!')) {
            return;
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Buscar todos os agendamentos
            const response = await API.getAppointments({});
            const appointments = response.data || [];

            // Filtrar agendamentos antigos
            const oldAppointments = appointments.filter(apt => apt.appointment_date < today);

            // Excluir cada agendamento antigo
            let deletedCount = 0;
            for (const appointment of oldAppointments) {
                try {
                    await API.deleteAppointment(appointment.id);
                    deletedCount++;
                } catch (error) {
                    console.error(`Erro ao excluir agendamento ${appointment.id}:`, error);
                }
            }

            this.showToast(`Limpeza concluída! ${deletedCount} agendamento(s) antigo(s) removido(s).`, 'success');
            
            // Recarregar lista de agendamentos se estiver visível
            if (window.app) {
                await window.app.loadAppointments();
            }
        } catch (error) {
            console.error('Erro ao limpar agendamentos:', error);
            this.showToast('Erro ao limpar agendamentos. Tente novamente.', 'error');
        }
    }

    // Obter regras de agendamento (método estático para uso em outros módulos)
    static getBusinessRules() {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        return settings.rules || {};
    }

    // ========== GESTÃO DE USUÁRIOS ==========

    // Obter lista de usuários do sistema
    getSystemUsers() {
        const usersStr = localStorage.getItem('system_users');
        return usersStr ? JSON.parse(usersStr) : [];
    }

    // Salvar lista de usuários
    saveSystemUsers(users) {
        localStorage.setItem('system_users', JSON.stringify(users));
    }

    // Criar novo usuário
    createNewUser() {
        const nome = document.getElementById('newUserName').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const senha = document.getElementById('newUserPassword').value;

        // Validações
        if (!nome || !email || !senha) {
            this.showToast('Preencha todos os campos', 'warning');
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showToast('E-mail inválido', 'error');
            return;
        }

        // Verificar se email já existe
        const users = this.getSystemUsers();
        if (users.find(u => u.email === email)) {
            this.showToast('Este e-mail já está cadastrado', 'error');
            return;
        }

        // Criar novo usuário (sempre tipo 'user')
        const newUser = {
            nome: nome,
            email: email,
            senha: senha,
            tipo: 'user'
        };

        users.push(newUser);
        this.saveSystemUsers(users);

        // Limpar formulário
        document.getElementById('newUserForm').reset();

        // Recarregar lista
        this.loadUsersList();

        this.showToast('Usuário cadastrado com sucesso!', 'success');
    }

    // Carregar lista de usuários
    loadUsersList() {
        const container = document.getElementById('usersListContainer');
        if (!container) return;

        const users = this.getSystemUsers();
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');

        if (users.length === 0) {
            container.innerHTML = '<p class="no-users-message">Nenhum usuário cadastrado</p>';
            return;
        }

        let html = '<table class="users-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Tipo</th><th>Ações</th></tr></thead><tbody>';

        users.forEach(user => {
            const isCurrentUser = user.email === currentUser.email;
            const tipoLabel = user.tipo === 'admin' ? '👑 Admin' : '👤 Usuário';
            
            html += `
                <tr data-email="${user.email}">
                    <td>${user.nome}</td>
                    <td>${user.email}</td>
                    <td>${tipoLabel}</td>
                    <td class="actions-cell">
                        <button class="btn-action btn-change-password" data-email="${user.email}" title="Alterar Senha">
                            🔑
                        </button>
                        ${!isCurrentUser ? `
                            <button class="btn-action btn-delete-user" data-email="${user.email}" title="Excluir Usuário">
                                🗑️
                            </button>
                        ` : '<span class="cannot-delete-self">Você não pode excluir a si mesmo</span>'}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';

        container.innerHTML = html;

        // Adicionar event listeners aos botões
        container.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', () => {
                const email = btn.dataset.email;
                this.deleteUser(email);
            });
        });

        container.querySelectorAll('.btn-change-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const email = btn.dataset.email;
                this.changeUserPassword(email);
            });
        });
    }

    // Excluir usuário
    deleteUser(email) {
        if (!confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) {
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        
        // Impedir que admin exclua a si mesmo
        if (email === currentUser.email) {
            this.showToast('Você não pode excluir a si mesmo', 'error');
            return;
        }

        const users = this.getSystemUsers();
        const filteredUsers = users.filter(u => u.email !== email);
        
        this.saveSystemUsers(filteredUsers);
        this.loadUsersList();
        
        this.showToast('Usuário excluído com sucesso', 'success');
    }

    // Alterar senha do usuário
    changeUserPassword(email) {
        const newPassword = prompt(`Digite a nova senha para ${email}:`);
        
        if (!newPassword) {
            return; // Usuário cancelou
        }

        if (newPassword.length < 3) {
            this.showToast('A senha deve ter pelo menos 3 caracteres', 'error');
            return;
        }

        const users = this.getSystemUsers();
        const userIndex = users.findIndex(u => u.email === email);
        
        if (userIndex === -1) {
            this.showToast('Usuário não encontrado', 'error');
            return;
        }

        users[userIndex].senha = newPassword;
        this.saveSystemUsers(users);
        
        this.showToast('Senha alterada com sucesso', 'success');
    }
}

// Instância global
const settingsManager = new SettingsManager();

// Exportar para uso global
window.settingsManager = settingsManager;
