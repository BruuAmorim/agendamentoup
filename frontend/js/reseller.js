// Painel Administrativo do Revendedor (Super Admin)
class ResellerManager {
    constructor() {
        this.masterPassword = 'master@revenda123';
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Fechar dashboard
        const closeResellerDashboard = document.getElementById('closeResellerDashboard');
        if (closeResellerDashboard) {
            closeResellerDashboard.addEventListener('click', () => this.closeResellerDashboard());
        }

        // Nova instância
        const newInstanceBtn = document.getElementById('newInstanceBtn');
        if (newInstanceBtn) {
            newInstanceBtn.addEventListener('click', () => this.openNewInstanceModal());
        }

        const newInstanceModalClose = document.getElementById('newInstanceModalClose');
        if (newInstanceModalClose) {
            newInstanceModalClose.addEventListener('click', () => this.closeNewInstanceModal());
        }

        const cancelInstanceBtn = document.getElementById('cancelInstanceBtn');
        if (cancelInstanceBtn) {
            cancelInstanceBtn.addEventListener('click', () => this.closeNewInstanceModal());
        }

        const newInstanceForm = document.getElementById('newInstanceForm');
        if (newInstanceForm) {
            newInstanceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewInstance();
            });
        }

        // Gerar slug automático
        const instanceCompanyName = document.getElementById('instanceCompanyName');
        if (instanceCompanyName) {
            instanceCompanyName.addEventListener('input', () => this.generateSlug());
        }
    }

    // Métodos de autenticação removidos - roteamento agora é feito automaticamente pelo auth.js baseado no email

    openResellerDashboard() {
        const dashboard = document.getElementById('resellerDashboard');
        dashboard.style.display = 'block';
        this.loadInstances();
        this.updateSummaryCards();
    }

    closeResellerDashboard() {
        const dashboard = document.getElementById('resellerDashboard');
        dashboard.style.display = 'none';
        // Fazer logout e voltar para tela de login
        if (window.authManager) {
            window.authManager.adminLogout();
        }
    }

    // Obter todas as instâncias
    getInstances() {
        const instancesStr = localStorage.getItem('saas_instances');
        return instancesStr ? JSON.parse(instancesStr) : [];
    }

    // Salvar instâncias
    saveInstances(instances) {
        localStorage.setItem('saas_instances', JSON.stringify(instances));
    }

    // Gerar slug automático
    generateSlug() {
        const companyName = document.getElementById('instanceCompanyName').value;
        const slugInput = document.getElementById('instanceSlug');
        
        if (companyName && slugInput) {
            const slug = companyName
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                .replace(/[^a-z0-9]+/g, '-') // Substitui espaços e caracteres especiais por hífen
                .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
            
            slugInput.value = slug;
        }
    }

    // Criar nova instância
    createNewInstance() {
        const companyName = document.getElementById('instanceCompanyName').value.trim();
        const slug = document.getElementById('instanceSlug').value.trim();
        const ownerName = document.getElementById('instanceOwnerName').value.trim();
        const adminEmail = document.getElementById('instanceAdminEmail').value.trim();
        const adminPassword = document.getElementById('instanceAdminPassword').value;
        const plan = document.getElementById('instancePlan').value;
        const expiryDate = document.getElementById('instanceExpiryDate').value;

        // Validações
        if (!companyName || !slug || !ownerName || !adminEmail || !adminPassword || !expiryDate) {
            this.showToast('Preencha todos os campos', 'error');
            return;
        }

        // Validar formato do slug
        if (!/^[a-z0-9-]+$/.test(slug)) {
            this.showToast('O slug deve conter apenas letras minúsculas, números e hífens', 'error');
            return;
        }

        // Verificar se o slug já existe
        const instances = this.getInstances();
        if (instances.find(inst => inst.slug === slug)) {
            this.showToast('Este slug já está em uso. Escolha outro.', 'error');
            return;
        }

        // Verificar se o email já existe
        const systemUsers = JSON.parse(localStorage.getItem('system_users') || '[]');
        if (systemUsers.find(u => u.email === adminEmail)) {
            this.showToast('Este e-mail já está cadastrado no sistema', 'error');
            return;
        }

        // Criar nova instância
        const newInstance = {
            id: Date.now().toString(),
            companyName: companyName,
            slug: slug,
            ownerName: ownerName,
            adminEmail: adminEmail,
            plan: plan,
            status: 'active',
            expiryDate: expiryDate,
            createdAt: new Date().toISOString()
        };

        instances.push(newInstance);
        this.saveInstances(instances);

        // Criar usuário admin automaticamente
        const newAdminUser = {
            email: adminEmail,
            senha: adminPassword,
            tipo: 'admin',
            nome: ownerName,
            instance_id: slug // Adicionar instance_id ao usuário
        };

        systemUsers.push(newAdminUser);
        localStorage.setItem('system_users', JSON.stringify(systemUsers));

        // Limpar formulário e fechar modal
        document.getElementById('newInstanceForm').reset();
        this.closeNewInstanceModal();

        // Recarregar lista
        this.loadInstances();
        this.updateSummaryCards();

        this.showToast(`Instância "${companyName}" criada com sucesso!`, 'success');
    }

    // Carregar lista de instâncias
    loadInstances() {
        const instances = this.getInstances();
        const tbody = document.getElementById('instancesTableBody');
        tbody.innerHTML = '';

        if (instances.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">
                        Nenhuma instância cadastrada ainda
                    </td>
                </tr>
            `;
            return;
        }

        instances.forEach(instance => {
            const row = document.createElement('tr');
            const statusClass = instance.status === 'active' ? 'active' : 'blocked';
            const statusText = instance.status === 'active' ? 'Ativo' : 'Bloqueado';
            const planText = instance.plan === 'pro' ? 'Pro' : 'Basic';

            row.innerHTML = `
                <td><strong>${instance.companyName}</strong></td>
                <td>${instance.ownerName}</td>
                <td>${instance.adminEmail}</td>
                <td><span class="instance-plan">${planText}</span></td>
                <td><span class="instance-status ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="instance-actions">
                        <button class="reseller-action-btn edit" onclick="resellerManager.editInstance('${instance.id}')" title="Editar">
                            ✏️ Editar
                        </button>
                        <button class="reseller-action-btn block" onclick="resellerManager.toggleInstanceStatus('${instance.id}')" title="${instance.status === 'active' ? 'Bloquear' : 'Desbloquear'}">
                            ${instance.status === 'active' ? '🔒 Bloquear' : '🔓 Desbloquear'}
                        </button>
                        <button class="reseller-action-btn delete" onclick="resellerManager.deleteInstance('${instance.id}')" title="Excluir">
                            🗑️ Excluir
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    // Atualizar cards de resumo
    updateSummaryCards() {
        const instances = this.getInstances();
        const activeInstances = instances.filter(inst => inst.status === 'active');
        
        // Calcular faturamento mensal (simulado)
        const basicPrice = 99.00;
        const proPrice = 199.00;
        let monthlyRevenue = 0;
        
        activeInstances.forEach(inst => {
            monthlyRevenue += inst.plan === 'pro' ? proPrice : basicPrice;
        });

        document.getElementById('totalClients').textContent = instances.length;
        document.getElementById('activeClients').textContent = activeInstances.length;
        document.getElementById('monthlyRevenue').textContent = `R$ ${monthlyRevenue.toFixed(2).replace('.', ',')}`;
    }

    // Editar instância
    editInstance(id) {
        const instances = this.getInstances();
        const instance = instances.find(inst => inst.id === id);
        
        if (!instance) {
            this.showToast('Instância não encontrada', 'error');
            return;
        }

        // Preencher formulário com dados da instância
        document.getElementById('instanceCompanyName').value = instance.companyName;
        document.getElementById('instanceSlug').value = instance.slug;
        document.getElementById('instanceOwnerName').value = instance.ownerName;
        document.getElementById('instanceAdminEmail').value = instance.adminEmail;
        document.getElementById('instancePlan').value = instance.plan;
        document.getElementById('instanceExpiryDate').value = instance.expiryDate;

        // Abrir modal (pode ser o mesmo modal, mas com modo de edição)
        this.openNewInstanceModal();
        
        // Adicionar flag de edição
        document.getElementById('newInstanceForm').dataset.editId = id;
        document.querySelector('#newInstanceModal h3').textContent = '✏️ Editar Instância';
    }

    // Alternar status da instância
    toggleInstanceStatus(id) {
        const instances = this.getInstances();
        const instance = instances.find(inst => inst.id === id);
        
        if (!instance) {
            this.showToast('Instância não encontrada', 'error');
            return;
        }

        const newStatus = instance.status === 'active' ? 'blocked' : 'active';
        const action = newStatus === 'active' ? 'desbloqueada' : 'bloqueada';

        if (!confirm(`Tem certeza que deseja ${action === 'bloqueada' ? 'bloquear' : 'desbloquear'} a instância "${instance.companyName}"?`)) {
            return;
        }

        instance.status = newStatus;
        this.saveInstances(instances);
        this.loadInstances();
        this.updateSummaryCards();

        this.showToast(`Instância ${action} com sucesso`, 'success');
    }

    // Excluir instância
    deleteInstance(id) {
        const instances = this.getInstances();
        const instance = instances.find(inst => inst.id === id);
        
        if (!instance) {
            this.showToast('Instância não encontrada', 'error');
            return;
        }

        if (!confirm(`Tem certeza que deseja excluir a instância "${instance.companyName}"? Esta ação é irreversível!`)) {
            return;
        }

        // Remover instância
        const filteredInstances = instances.filter(inst => inst.id !== id);
        this.saveInstances(filteredInstances);

        // Remover usuário admin associado
        const systemUsers = JSON.parse(localStorage.getItem('system_users') || '[]');
        const filteredUsers = systemUsers.filter(u => u.instance_id !== instance.slug);
        localStorage.setItem('system_users', JSON.stringify(filteredUsers));

        this.loadInstances();
        this.updateSummaryCards();

        this.showToast('Instância excluída com sucesso', 'success');
    }

    openNewInstanceModal() {
        const modal = document.getElementById('newInstanceModal');
        modal.classList.add('show');
        document.getElementById('newInstanceForm').reset();
        document.getElementById('newInstanceForm').removeAttribute('data-edit-id');
        document.querySelector('#newInstanceModal h3').textContent = '➕ Nova Instância';
    }

    closeNewInstanceModal() {
        const modal = document.getElementById('newInstanceModal');
        modal.classList.remove('show');
        document.getElementById('newInstanceForm').reset();
    }

    showToast(message, type = 'info') {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        } else {
            alert(message);
        }
    }
}

// Instância global
const resellerManager = new ResellerManager();

// Exportar para uso global
window.resellerManager = resellerManager;

