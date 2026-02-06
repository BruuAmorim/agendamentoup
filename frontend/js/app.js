// Aevum - Sistema de Agendamento Inteligente
// Arquivo principal da aplicação frontend

class Aevum {
    constructor() {
        this.appointments = [];
        this.availableSlots = [];
        this.selectedAppointment = null;
        this.currentTheme = localStorage.getItem('theme') || 'dark';

        this.init();
    }

    // Função helper para formatar horário como HH:MM
    formatTime(time) {
        if (!time) return '00:00';
        if (typeof time !== 'string') return '00:00';
        
        // Remover segundos se existirem e formatar como HH:MM
        const parts = time.split(':');
        if (parts.length >= 2) {
            const hours = String(parseInt(parts[0]) || 0).padStart(2, '0');
            const minutes = String(parseInt(parts[1]) || 0).padStart(2, '0');
            return `${hours}:${minutes}`;
        }
        return '00:00';
    }

    init() {
        this.bindEvents();
        this.setTheme(this.currentTheme);
        this.loadInitialData();
        this.showWelcomeMessage();
        
        // Verificar acesso do moderador - chamar múltiplas vezes para garantir
        // Primeira verificação imediata
        this.checkModeratorAccess();
        
        // Segunda verificação após delay (caso localStorage ainda não esteja pronto)
        setTimeout(() => {
            this.checkModeratorAccess();
        }, 500);
        
        // Terceira verificação após mais delay (garantia extra)
        setTimeout(() => {
            this.checkModeratorAccess();
        }, 1500);
        
        this.loadCompanyInfo();
        // Listener para atualizar quando configurações forem salvas
        window.addEventListener('companySettingsUpdated', (event) => {
            console.log('🔄 Configurações da empresa atualizadas, recarregando...', event.detail);
            // Atualizar imediatamente se tiver dados
            if (event.detail) {
                const settings = event.detail;
                this.populateServicesDropdown(settings.services || []);
                this.updateCompanyTitle(settings.company_name);
                this.updateCompanyLogo(settings.logo || this.getStoredCompanyLogo());
            }
            // Também recarregar do servidor
            this.loadCompanyInfo();
            this.loadModeratorSettings();
        });
        
        // Listener para atualizar quando configurações forem salvas na página de settings
        window.addEventListener('settingsUpdated', (event) => {
            console.log('🔄 Configurações atualizadas, recarregando formulário...', event.detail);
            // Salvar no localStorage imediatamente
            if (event.detail) {
                const settings = event.detail;
                localStorage.setItem('moderator_settings', JSON.stringify({
                    campos_visiveis: settings.campos_visiveis || ['nome', 'telefone'],
                    campos_extras: settings.campos_extras || [],
                    servicos: settings.services || [],
                    funcionamento: {
                        dias: settings.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                        inicio: settings.working_hours?.start || '08:00',
                        fim: settings.working_hours?.end || '18:00',
                        slot: settings.slot_interval || 30
                    }
                }));
                localStorage.setItem('moderator_settings_v2', JSON.stringify(settings));
                
                // Atualizar interface imediatamente
                this.renderFormFields(settings);
                this.populateServicesDropdown(settings.services || []);
                this.updateCompanyTitle(settings.company_name);
                this.updateCompanyLogo(settings.logo || this.getStoredCompanyLogo());
            }
            // Também recarregar do servidor para garantir sincronização
            this.loadModeratorSettings();
        });
        
        // Carregar configurações do moderador
        this.loadModeratorSettings();
    }

    bindEvents() {
        // Toggle de tema
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Formulário de agendamento
        const appointmentForm = document.getElementById('appointmentForm');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAppointmentSubmit(e.target);
            });
        }

        // Verificar disponibilidade
        const checkAvailabilityBtn = document.getElementById('checkAvailability');
        if (checkAvailabilityBtn) {
            checkAvailabilityBtn.addEventListener('click', () => {
                this.checkAvailability();
            });
        }

        // A data é aplicada automaticamente quando selecionada

        // Atualizar lista
        const refreshListBtn = document.getElementById('refreshList');
        if (refreshListBtn) {
            refreshListBtn.addEventListener('click', () => {
                this.loadAppointments();
            });
        }

        // Modal
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.closeModal();
            });
        }

        const modalCancel = document.getElementById('modalCancel');
        if (modalCancel) {
            modalCancel.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Modal de edição
        const editModalClose = document.getElementById('editModalClose');
        if (editModalClose) {
            editModalClose.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

        const editModalCancel = document.getElementById('editModalCancel');
        if (editModalCancel) {
            editModalCancel.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

        const editModalSave = document.getElementById('editModalSave');
        if (editModalSave) {
            editModalSave.addEventListener('click', () => {
                this.saveEditAppointment();
            });
        }

        const modalSave = document.getElementById('modalSave');
        if (modalSave) {
            modalSave.addEventListener('click', () => {
                this.saveAppointmentChanges();
            });
        }

        // Fechar modal ao clicar fora
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('appointmentModal');
            const editModal = document.getElementById('editAppointmentModal');
            const settingsModal = document.getElementById('settingsModal');
            const usersModal = document.getElementById('usersModal');
            const adminLoginModal = document.getElementById('adminLoginModal');

            if (e.target === modal) {
                this.closeModal();
            }

            if (e.target === editModal) {
                this.closeEditModal();
            }

            if (settingsModal && e.target === settingsModal) {
                settingsModal.classList.remove('show');
            }

            if (usersModal && e.target === usersModal) {
                if (window.authManager) {
                    window.authManager.closeUsersModal();
                }
            }

            // Proteger modal de login - não permitir fechar ao clicar fora se não estiver logado
            if (adminLoginModal && e.target === adminLoginModal) {
                const userDataStr = localStorage.getItem('userData');
                if (!userDataStr) {
                    // Não permitir fechar se não estiver logado
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        });

        // Atualizar horários disponíveis quando a data mudar
        const dateInput = document.getElementById('appointment_date');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                this.updateAvailableTimes();
            });
        }

        // Atualizar duração quando mudar
        const durationInput = document.getElementById('duration_minutes');
        if (durationInput) {
            durationInput.addEventListener('change', () => {
                this.updateAvailableTimes();
            });
        }

        // Atualizar agendamentos quando a data do filtro mudar
        const filterDateInput = document.getElementById('filterDate');
        if (filterDateInput) {
            filterDateInput.addEventListener('change', () => {
                this.loadAppointments();
            });
        }

        // Filtro de busca em tempo real
        const filtroNome = document.getElementById('filtro-nome');
        if (filtroNome) {
            filtroNome.addEventListener('keyup', () => {
                this.filterAppointmentsByName();
            });
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.currentTheme = theme;
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    async loadInitialData() {
        try {
            // Verificar conexão com API (opcional - não bloqueia a aplicação)
            try {
                await API.testConnection();
            } catch (apiError) {
                // API não disponível - aplicação continua funcionando normalmente
                console.log('API não disponível - aplicação funcionará em modo offline');
            }

            // Carregar agendamentos se houver data selecionada
            const filterDate = document.getElementById('filterDate');
            if (filterDate && filterDate.value) {
                try {
                    await this.loadAppointments();
                } catch (loadError) {
                    // Erro ao carregar agendamentos - não bloqueia a aplicação
                    console.log('Não foi possível carregar agendamentos da API');
                }
            }
        } catch (error) {
            // Erro geral - apenas logar, não mostrar toast para não incomodar o usuário
            console.log('Aplicação carregada (modo offline):', error.message);
        }
    }

    async checkAvailability() {
        const date = document.getElementById('appointment_date').value;

        if (!date) {
            this.showToast('Selecione uma data primeiro', 'warning');
            return;
        }

        try {
            // Garantir que os agendamentos do dia estejam carregados antes de calcular disponibilidade
            const filterDateEl = document.getElementById('filterDate');
            if (filterDateEl && filterDateEl.value !== date) {
                filterDateEl.value = date; // YYYY-MM-DD
                await this.loadAppointments();
            }

            // Gerar horários disponíveis (8h às 18h, intervalos de 1 hora)
            const availableSlots = this.generateAvailableSlots(date);
            this.availableSlots = availableSlots;
            this.displayAvailableSlots();
            document.getElementById('availableSlots').style.display = 'block';
        } catch (error) {
            console.error('Erro ao verificar disponibilidade:', error);
            this.showToast('Erro ao verificar disponibilidade', 'error');
        }
    }

    generateAvailableSlots(selectedDate) {
        const slots = [];
        
        // Carregar configurações do localStorage ou usar padrões
        const settingsStr = localStorage.getItem('moderator_settings');
        let settings = {
            funcionamento: {
                dias: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                inicio: '08:00',
                fim: '18:00',
                slot: 30
            }
        };
        
        if (settingsStr) {
            try {
                settings = JSON.parse(settingsStr);
            } catch (e) {
                console.warn('Erro ao parsear configurações:', e);
            }
        }
        
        // Verificar se o dia da semana está ativo
        const selectedDateObj = new Date(selectedDate);
        const dayOfWeek = selectedDateObj.getDay(); // 0 = Domingo, 1 = Segunda, etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];
        
        const workDays = settings.funcionamento?.dias || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        if (!workDays.includes(dayName)) {
            // Dia não está ativo
            return []; // Retorna array vazio - será tratado na exibição
        }

        // Obter horários de funcionamento
        const openingTime = settings.funcionamento?.inicio || '08:00';
        const closingTime = settings.funcionamento?.fim || '18:00';
        const slotInterval = settings.funcionamento?.slot || 30; // Intervalo em minutos

        // Converter horários para minutos desde meia-noite
        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const openingMinutes = parseTime(openingTime);
        const closingMinutes = parseTime(closingTime);

        // Buscar agendamentos para a data selecionada
        const dateAppointments = this.appointments.filter(apt => apt.appointment_date === selectedDate);

        // Gerar slots com intervalo configurado
        for (let minutes = openingMinutes; minutes < closingMinutes; minutes += slotInterval) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

            // Verificar se há conflito com agendamentos existentes
            const hasConflict = dateAppointments.some(apt => {
                const aptTime = apt.appointment_time.split(':');
                const aptMinutes = parseInt(aptTime[0]) * 60 + parseInt(aptTime[1] || 0);
                // Verificar se o slot conflita (dentro de 30 minutos)
                return Math.abs(aptMinutes - minutes) < 30;
            });

            if (!hasConflict) {
                slots.push({
                    time: timeString,
                    duration: 60
                });
            }
        }

        return slots;
    }

    displayAvailableSlots() {
        const container = document.getElementById('slotsContainer');
        container.innerHTML = '';

        // Verificar se o dia está ativo
        const selectedDate = document.getElementById('appointment_date').value;
        if (selectedDate) {
            const selectedDateObj = new Date(selectedDate);
            const dayOfWeek = selectedDateObj.getDay();
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = dayNames[dayOfWeek];
            
            // Usar configurações do localStorage em vez de SettingsManager
            const settingsStr = localStorage.getItem('moderator_settings') || localStorage.getItem('moderator_settings_v2');
            let workDays = {};
            
            if (settingsStr) {
                try {
                    const settings = JSON.parse(settingsStr);
                    // Suportar ambos os formatos
                    if (settings.working_days) {
                        workDays = settings.working_days.reduce((acc, day) => {
                            acc[day] = true;
                            return acc;
                        }, {});
                    } else if (settings.funcionamento?.dias) {
                        workDays = settings.funcionamento.dias.reduce((acc, day) => {
                            acc[day] = true;
                            return acc;
                        }, {});
                    }
                } catch (e) {
                    console.warn('Erro ao parsear configurações:', e);
                }
            }
            
            // Se não encontrou configurações, usar padrão (segunda a sexta)
            if (Object.keys(workDays).length === 0) {
                workDays = {
                    monday: true,
                    tuesday: true,
                    wednesday: true,
                    thursday: true,
                    friday: true
                };
            }
            
            if (workDays[dayName] !== true) {
                container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-weight: 500;">⚠️ Não atendemos neste dia</p>';
                return;
            }
        }

        if (this.availableSlots.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum horário disponível para esta data</p>';
            return;
        }

        this.availableSlots.forEach(slot => {
            const slotBtn = document.createElement('button');
            slotBtn.className = 'slot-btn';
            slotBtn.textContent = slot.time;
            slotBtn.dataset.time = slot.time;

            slotBtn.addEventListener('click', () => {
                // Remover seleção anterior
                document.querySelectorAll('.slot-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });

                // Selecionar novo horário
                slotBtn.classList.add('selected');
                document.getElementById('appointment_time').value = slot.time;
            });

            container.appendChild(slotBtn);
        });
    }

    // Verificar se um horário específico está disponível
    isTimeSlotAvailable(date, time) {
        // Garantir que this.appointments é sempre um array
        if (!Array.isArray(this.appointments)) {
            console.warn('⚠️ this.appointments não é um array, inicializando como array vazio');
            this.appointments = [];
        }
        
        // Primeiro, garantir que temos os agendamentos carregados para esta data
        const dateAppointments = this.appointments.filter(apt => 
            apt.appointment_date === date && apt.status !== 'cancelled'
        );

        // Verificar se há conflito com agendamentos existentes
        // Converter horário para minutos para verificação mais precisa
        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + (minutes || 0);
        };
        
        const requestedMinutes = parseTime(time);
        const duration = 60; // Duração padrão de 60 minutos
        
        const hasConflict = dateAppointments.some(apt => {
            const aptMinutes = parseTime(apt.appointment_time);
            const aptDuration = apt.duration_minutes || 60;
            
            // Verificar sobreposição: dois intervalos se sobrepõem se
            // início1 < fim2 E fim1 > início2
            const requestedEnd = requestedMinutes + duration;
            const aptEnd = aptMinutes + aptDuration;
            
            return requestedMinutes < aptEnd && requestedEnd > aptMinutes;
        });

        return !hasConflict;
    }

    async updateAvailableTimes() {
        const date = document.getElementById('appointment_date').value;
        if (date) {
            // Esconder slots anteriores
            document.getElementById('availableSlots').style.display = 'none';
            // O usuário pode clicar em "Verificar Disponibilidade" quando quiser
        }
    }

    async handleAppointmentSubmit(form) {
        // Proteção contra submissões duplicadas
        if (this._isSubmittingAppointment) {
            console.warn('⚠️ Submissão de agendamento já em andamento, ignorando...');
            return;
        }
        
        this._isSubmittingAppointment = true;
        
        // Desabilitar botão de submit durante o processamento
        const submitBtn = form.querySelector('button[type="submit"], #createAppointmentBtn');
        const originalBtnText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Criando...';
        }
        
        try {
            const formData = new FormData(form);

            // Obter instance_id do usuário logado
            const currentInstanceId = localStorage.getItem('currentInstanceId');

        // Coletar todos os campos do formulário (incluindo campos extras e CPF)
        const appointmentData = {
            customer_name: formData.get('customer_name') || formData.get('customer_name'),
            customer_phone: formData.get('customer_phone') || null,
            customer_email: formData.get('customer_email') || null,
            customer_cpf: formData.get('customer_cpf') || null,
            service_type: formData.get('service_type') || null,
            appointment_date: formData.get('appointment_date'),
            appointment_time: formData.get('appointment_time'),
            duration_minutes: 60, // duração fixa de 1 hora
            notes: formData.get('notes') || '' // observações do formulário
        };

        // Coletar campos extras se existirem e salvar como JSON
        const extraFields = {};
        formData.forEach((value, key) => {
            if (key.startsWith('extra_') && value && value.trim()) {
                const fieldName = key.replace('extra_', '');
                extraFields[fieldName] = value.trim();
            }
        });
        
        // Adicionar campos extras como JSON separado (não apenas nas notas)
        if (Object.keys(extraFields).length > 0) {
            appointmentData.extra_fields = JSON.stringify(extraFields);
            // Também adicionar nas notas para compatibilidade
            const extraNotes = Object.entries(extraFields)
                .map(([key, val]) => `${key}: ${val}`)
                .join('; ');
            appointmentData.notes = appointmentData.notes 
                ? `${appointmentData.notes}\n${extraNotes}` 
                : extraNotes;
        }

        console.log('📅 handleAppointmentSubmit - Dados coletados:', appointmentData);

            // Validação básica
            if (!appointmentData.customer_name || !appointmentData.appointment_date || !appointmentData.appointment_time) {
                this.showToast('Preencha todos os campos obrigatórios', 'warning');
                return;
            }

            // Garantir que os agendamentos estejam carregados para a data selecionada
            const filterDateEl = document.getElementById('filterDate');
            if (filterDateEl && filterDateEl.value !== appointmentData.appointment_date) {
                filterDateEl.value = appointmentData.appointment_date;
                await this.loadAppointments();
            }

            // Garantir que appointments é um array antes de verificar disponibilidade
            if (!Array.isArray(this.appointments)) {
                console.warn('⚠️ this.appointments não é um array, inicializando e carregando agendamentos...');
                this.appointments = [];
                await this.loadAppointments();
            }
            
            // Verificar disponibilidade do horário antes de tentar criar
            // Recarregar agendamentos para garantir dados atualizados antes da verificação
            await this.loadAppointments();
            
            if (!this.isTimeSlotAvailable(appointmentData.appointment_date, appointmentData.appointment_time)) {
                this.showToast('Horário indisponível. Este horário já está ocupado.', 'error');
                // Recarregar lista novamente para mostrar estado atualizado
                await this.loadAppointments();
                // Resetar flag de submissão
                this._isSubmittingAppointment = false;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
                return;
            }

            // Adicionar instance_id ao agendamento (quando a API suportar)
            if (currentInstanceId) {
                // appointmentData.instance_id = currentInstanceId;
                console.log('Criando agendamento para instância:', currentInstanceId);
            }

            console.log('📤 Enviando requisição para criar agendamento...');
            const response = await API.createAppointment(appointmentData);
            console.log('📥 Resposta recebida:', response);

            // Verificar se a resposta indica sucesso
            if (response && response.success) {
                this.showToast('Agendamento criado com sucesso!', 'success');
                this.resetAppointmentForm();

                // Garantir atualização da lista após criar:
                // - padroniza o filtro de data para a mesma data criada
                // - recarrega a lista sempre
                const filterDateEl2 = document.getElementById('filterDate');
                if (filterDateEl2 && appointmentData.appointment_date) {
                    filterDateEl2.value = appointmentData.appointment_date; // YYYY-MM-DD
                }
                await this.loadAppointments();
            } else {
                // Se não foi sucesso, mostrar mensagem de erro
                const errorMsg = response?.message || response?.error || response?.details || 'Erro ao criar agendamento';
                console.error('❌ Erro na resposta:', errorMsg);
                
                // Se for erro de horário fora do expediente, mostrar mensagem mais informativa
                if (errorMsg.includes('fora do expediente') || errorMsg.includes('Horário fora')) {
                    // Extrair horário de funcionamento da mensagem ou buscar das configurações
                    const settingsStr = localStorage.getItem('empresa_settings_v2') || localStorage.getItem('moderator_settings_v2');
                    let workingHours = '09:00 às 18:00'; // padrão
                    
                    if (settingsStr) {
                        try {
                            const settings = JSON.parse(settingsStr);
                            if (settings.working_hours) {
                                workingHours = `${settings.working_hours.start || '09:00'} às ${settings.working_hours.end || '18:00'}`;
                            }
                        } catch (e) {
                            console.warn('Erro ao parsear configurações:', e);
                        }
                    }
                    
                    this.showToast(`Horário fora do expediente. Atendemos das ${workingHours}. Por favor, escolha outro horário.`, 'error');
                } else {
                    this.showToast(errorMsg, 'error');
                }
            }

        } catch (error) {
            console.error('❌ Erro ao criar agendamento:', error);
            console.error('❌ Stack:', error.stack);
            // Extrair mensagem de erro da resposta se disponível
            let errorMessage = 'Erro ao criar agendamento';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }
            
            // Se for erro de horário fora do expediente, mostrar mensagem mais informativa
            if (errorMessage.includes('fora do expediente') || errorMessage.includes('Horário fora')) {
                // Extrair horário de funcionamento da mensagem ou buscar das configurações
                const settingsStr = localStorage.getItem('empresa_settings_v2') || localStorage.getItem('moderator_settings_v2');
                let workingHours = '09:00 às 18:00'; // padrão
                
                if (settingsStr) {
                    try {
                        const settings = JSON.parse(settingsStr);
                        if (settings.working_hours) {
                            workingHours = `${settings.working_hours.start || '09:00'} às ${settings.working_hours.end || '18:00'}`;
                        }
                    } catch (e) {
                        console.warn('Erro ao parsear configurações:', e);
                    }
                }
                
                this.showToast(`Horário fora do expediente. Atendemos das ${workingHours}. Por favor, escolha outro horário.`, 'error');
            } else {
                this.showToast(errorMessage, 'error');
            }
        } finally {
            // Sempre liberar o flag e reabilitar o botão, mesmo em caso de erro
            this._isSubmittingAppointment = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText || 'Criar Agendamento';
            }
        }
    }

    resetAppointmentForm() {
        document.getElementById('appointmentForm').reset();
        document.getElementById('availableSlots').style.display = 'none';
        document.querySelectorAll('.slot-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        this.availableSlots = [];
    }

    async loadAppointments() {
        try {
            const filters = this.getCurrentFilters();
            
            // Preparar para filtro por instância (futuro)
            // Por enquanto, vamos apenas adicionar o instance_id aos filtros se existir
            const currentInstanceId = localStorage.getItem('currentInstanceId');
            if (currentInstanceId) {
                // Quando a API suportar, adicionar filtro por instance_id
                // filters.instance_id = currentInstanceId;
                console.log('Carregando agendamentos para instância:', currentInstanceId);
            }
            
            const response = await API.getAppointments(filters);
            let appointments = response.data || [];
            
            // Filtro local por instance_id (temporário até API suportar)
            // Por enquanto, vamos apenas logar - quando os agendamentos tiverem instance_id, filtrar aqui
            if (currentInstanceId) {
                // Filtrar agendamentos por instance_id quando o campo existir
                // appointments = appointments.filter(apt => apt.instance_id === currentInstanceId);
            }
            
            // Normalizar horários e remover duplicatas
            const seenIds = new Set();
            appointments = appointments
                .filter(apt => {
                    // Remover duplicatas por ID
                    if (seenIds.has(apt.id)) {
                        console.warn(`⚠️ Duplicata removida: ${apt.id} - ${apt.customer_name}`);
                        return false;
                    }
                    seenIds.add(apt.id);
                    return true;
                })
                .map(apt => {
                    // Normalizar horário (remover segundos se houver)
                    // Normalizar horário para formato HH:MM
                    apt.appointment_time = this.formatTime(apt.appointment_time);
                    return apt;
                });
            
            this.appointments = appointments;
            this.displayAppointments();
            
            // Limpar filtro de busca ao carregar novos agendamentos
            const filtroNome = document.getElementById('filtro-nome');
            if (filtroNome) {
                filtroNome.value = '';
            }
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
            this.showToast('Erro ao carregar agendamentos', 'error');
        }
    }


    getCurrentFilters() {
        const filters = {};

        const filterDate = document.getElementById('filterDate').value;
        if (filterDate) {
            filters.date = filterDate;
        } else {
            // Se não há data selecionada, não mostrar nenhum agendamento
            filters.date = null;
        }

        return filters;
    }


    displayAppointments() {
        const listaContainer = document.getElementById('lista-agendamentos');
        
        if (!listaContainer) {
            console.error('Container lista-agendamentos não encontrado');
            return;
        }

        // Garantir que appointments é sempre um array
        if (!Array.isArray(this.appointments)) {
            console.warn('⚠️ this.appointments não é um array em displayAppointments, inicializando...');
            this.appointments = [];
        }

        // Limpar container
        listaContainer.innerHTML = '';

        const filterDate = document.getElementById('filterDate')?.value;

        if (!filterDate) {
            listaContainer.innerHTML = `
                <div class="no-appointments-message">
                    <p>📅 Selecione uma data para visualizar os agendamentos</p>
                </div>
            `;
            return;
        }

        if (this.appointments.length === 0) {
            listaContainer.innerHTML = `
                <div class="no-appointments-message">
                    <p>📭 Nenhum agendamento encontrado para ${new Date(filterDate).toLocaleDateString('pt-BR')}</p>
                </div>
            `;
            return;
        }

        // Ordenar agendamentos cronologicamente (por data e horário)
        const sortedAppointments = [...this.appointments].sort((a, b) => {
            // Primeiro ordenar por data
            const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
            if (dateCompare !== 0) return dateCompare;
            // Se mesma data, ordenar por horário
            return a.appointment_time.localeCompare(b.appointment_time);
        });

        // Renderizar agendamentos ordenados
        sortedAppointments.forEach(appointment => {
            const listItem = this.createAppointmentListItem(appointment);
            listaContainer.appendChild(listItem);
        });
    }

    createAppointmentListItem(appointment) {
        const div = document.createElement('div');
        div.className = 'appointment-list-item';
        div.dataset.id = appointment.id;
        div.dataset.name = appointment.customer_name.toLowerCase();

        // Normalizar horário para exibição (remover segundos se houver)
        const time = this.formatTime(appointment.appointment_time);
        const phone = appointment.customer_phone || 'Sem telefone';
        const protocol = appointment.protocol || 'N/A';

        div.innerHTML = `
            <div class="appointment-list-time">${time}</div>
            <div class="appointment-list-info">
                <div class="appointment-list-name">${appointment.customer_name} <small style="color: var(--text-muted); font-weight: normal;">(${protocol})</small></div>
                <div class="appointment-list-phone">${phone}</div>
            </div>
            <div class="appointment-list-actions">
                <button class="btn-edit" data-id="${appointment.id}" title="Editar">✏️</button>
                <button class="btn-delete" data-id="${appointment.id}" title="Excluir">🗑️</button>
            </div>
        `;

        // Prevenir propagação do clique nos botões
        const editBtn = div.querySelector('.btn-edit');
        const deleteBtn = div.querySelector('.btn-delete');

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editAppointment(appointment.id);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteAppointment(appointment.id);
        });

        // Adicionar evento de clique no item (exceto nos botões)
        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-edit') && !e.target.classList.contains('btn-delete')) {
                const fullAppointment = this.appointments.find(apt => apt.id === appointment.id);
                if (fullAppointment) {
                    this.openAppointmentModal(fullAppointment);
                }
            }
        });

        return div;
    }

    filterAppointmentsByName() {
        const filtroInput = document.getElementById('filtro-nome');
        if (!filtroInput) return;

        const searchTerm = filtroInput.value.toLowerCase().trim();
        const listItems = document.querySelectorAll('.appointment-list-item');

        if (searchTerm === '') {
            // Mostrar todos os itens
            listItems.forEach(item => {
                item.classList.remove('hidden');
            });
        } else {
            // Filtrar itens
            listItems.forEach(item => {
                const name = item.dataset.name || '';
                if (name.includes(searchTerm)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });

            // Verificar se há itens visíveis
            const visibleItems = Array.from(listItems).filter(item => !item.classList.contains('hidden'));
            const listaContainer = document.getElementById('lista-agendamentos');
            
            // Se não houver itens visíveis, mostrar mensagem
            if (visibleItems.length === 0 && listaContainer) {
                const existingMessage = listaContainer.querySelector('.no-appointments-message');
                if (!existingMessage) {
                    const message = document.createElement('div');
                    message.className = 'no-appointments-message';
                    message.innerHTML = '<p>Nenhum agendamento encontrado</p>';
                    listaContainer.appendChild(message);
                }
            } else {
                // Remover mensagem se houver itens visíveis
                const existingMessage = listaContainer.querySelector('.no-appointments-message');
                if (existingMessage) {
                    existingMessage.remove();
                }
            }
        }
    }

    createAppointmentElement(appointment) {
        const div = document.createElement('div');
        div.className = 'appointment-item';
        div.dataset.id = appointment.id;

        const time = this.formatTime(appointment.appointment_time);

        div.innerHTML = `
            <div class="appointment-info">
                <h4>${appointment.customer_name}</h4>
                <p>${time} - ${appointment.customer_phone || 'Sem telefone'}</p>
            </div>
            <div class="appointment-actions">
                <button class="action-btn edit" title="Editar" onclick="app.editAppointment('${appointment.id}')">
                    ✏️
                </button>
                <button class="action-btn cancel" title="Cancelar" onclick="app.cancelAppointment('${appointment.id}')">
                    ❌
                </button>
                <button class="action-btn delete" title="Excluir" onclick="app.deleteAppointment('${appointment.id}')">
                    🗑️
                </button>
            </div>
        `;

        // Adicionar evento de clique para abrir modal
        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('action-btn')) {
                this.openAppointmentModal(appointment);
            }
        });

        return div;
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendente',
            'confirmed': 'Confirmado',
            'cancelled': 'Cancelado',
            'completed': 'Concluído'
        };
        return statusMap[status] || status;
    }

    async editAppointment(id) {
        const appointment = this.appointments.find(apt => apt.id === id);
        if (appointment) {
            this.openEditAppointmentModal(appointment);
        }
    }

    openEditAppointmentModal(appointment) {
        this.selectedAppointment = appointment;

        // Preencher campos do modal
        document.getElementById('editCustomerName').value = appointment.customer_name || '';
        document.getElementById('editCustomerPhone').value = appointment.customer_phone || '';
        document.getElementById('editAppointmentDate').value = appointment.appointment_date || '';
        document.getElementById('editAppointmentTime').value = appointment.appointment_time || '';

        // Abrir modal
        const modal = document.getElementById('editAppointmentModal');
        modal.classList.add('show');

        // Focar no primeiro campo
        document.getElementById('editCustomerName').focus();
    }

    async cancelAppointment(id) {
        if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
        try {
            await API.cancelAppointment(id);
            this.showToast('Agendamento cancelado com sucesso', 'success');
            await this.loadAppointments();
        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
            this.showToast('Erro ao cancelar agendamento', 'error');
        }
        }
    }

    async deleteAppointment(id) {
        if (confirm('Tem certeza que deseja excluir este agendamento permanentemente?')) {
        try {
            await API.deleteAppointment(id);
            this.showToast('Agendamento excluído com sucesso', 'success');
            await this.loadAppointments();
        } catch (error) {
            console.error('Erro ao excluir agendamento:', error);
            this.showToast('Erro ao excluir agendamento', 'error');
        }
        }
    }

    createModalIfNotExists() {
        // Verificar se o modal já existe
        if (document.getElementById('appointmentModal')) {
            return;
        }

        // Criar estrutura do modal
        const modalHTML = `
            <div id="appointmentModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 600px; margin: 50px auto; background: white; border-radius: 12px; padding: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                    <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: var(--text);">Detalhes do Agendamento</h3>
                        <button class="modal-close" onclick="window.aevum.closeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
                    </div>
                    <div id="modalBody" class="modal-body" style="padding: 20px; max-height: 500px; overflow-y: auto;"></div>
                    <div class="modal-footer" style="padding: 15px 20px; border-top: 1px solid #e0e0e0; display: flex; justify-content: flex-end; gap: 10px;">
                        <button onclick="window.aevum.closeModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Fechar</button>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar ao body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Adicionar estilos se não existirem
        if (!document.getElementById('modalStyles')) {
            const style = document.createElement('style');
            style.id = 'modalStyles';
            style.textContent = `
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal.show {
                    display: flex;
                }
            `;
            document.head.appendChild(style);
        }
    }

    openAppointmentModal(appointment, editMode = false) {
        this.selectedAppointment = appointment;

        // Criar modal se não existir
        this.createModalIfNotExists();

        const modal = document.getElementById('appointmentModal');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalBody) {
            console.error('❌ Não foi possível criar o modal');
            this.showToast('Erro ao abrir detalhes do agendamento', 'error');
            return;
        }

        modalBody.innerHTML = this.createAppointmentModalContent(appointment, editMode);
        modal.classList.add('show');

        // Se estiver em modo de edição, configurar eventos
        if (editMode) {
            this.setupEditMode();
        }
    }

    createAppointmentModalContent(appointment, editMode) {
        const date = new Date(appointment.appointment_date).toLocaleDateString('pt-BR');
        const created = appointment.created_at 
            ? new Date(appointment.created_at).toLocaleString('pt-BR')
            : 'Não disponível';
        const updated = appointment.updated_at 
            ? new Date(appointment.updated_at).toLocaleString('pt-BR')
            : 'Não disponível';

        // Parse campos extras se existirem
        let extraFieldsHtml = '';
        if (appointment.extra_fields) {
            try {
                const extraFields = typeof appointment.extra_fields === 'string' 
                    ? JSON.parse(appointment.extra_fields) 
                    : appointment.extra_fields;
                
                if (extraFields && Object.keys(extraFields).length > 0) {
                    extraFieldsHtml = '<div class="detail-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">';
                    extraFieldsHtml += '<h4 style="margin: 0 0 15px 0; color: var(--text); font-size: 1.1rem;">📝 Campos Extras</h4>';
                    Object.entries(extraFields).forEach(([key, value]) => {
                        extraFieldsHtml += `
                            <div class="detail-row">
                                <strong>${key}:</strong> ${value || 'Não informado'}
                            </div>
                        `;
                    });
                    extraFieldsHtml += '</div>';
                }
            } catch (e) {
                console.warn('Erro ao parsear campos extras:', e);
            }
        }

        if (editMode) {
            return `
                <form id="editAppointmentForm">
                    <div class="form-group">
                        <label for="edit_customer_name">Nome do Cliente *</label>
                        <input type="text" id="edit_customer_name" name="customer_name" value="${appointment.customer_name || ''}" required>
                    </div>

                    <div class="form-group">
                        <label for="edit_customer_phone">Telefone</label>
                        <input type="tel" id="edit_customer_phone" name="customer_phone" value="${appointment.customer_phone || ''}">
                    </div>

                    <div class="form-group">
                        <label for="edit_customer_email">E-mail</label>
                        <input type="email" id="edit_customer_email" name="customer_email" value="${appointment.customer_email || ''}">
                    </div>

                    <div class="form-group">
                        <label for="edit_customer_cpf">CPF</label>
                        <input type="text" id="edit_customer_cpf" name="customer_cpf" value="${appointment.customer_cpf || ''}">
                    </div>

                    <div class="form-group">
                        <label for="edit_service_type">Serviço</label>
                        <input type="text" id="edit_service_type" name="service_type" value="${appointment.service_type || ''}">
                    </div>

                    <div class="form-group">
                        <label for="edit_appointment_date">Data *</label>
                        <input type="date" id="edit_appointment_date" name="appointment_date" value="${appointment.appointment_date}" required>
                    </div>

                    <div class="form-group">
                        <label for="edit_appointment_time">Horário *</label>
                        <input type="time" id="edit_appointment_time" name="appointment_time" value="${appointment.appointment_time}" required>
                    </div>

                    <div class="form-group">
                        <label for="edit_notes">Observações</label>
                        <textarea id="edit_notes" name="notes" rows="3">${appointment.notes || ''}</textarea>
                    </div>
                </form>
            `;
        } else {
            return `
                <div class="appointment-details" style="max-height: 500px; overflow-y: auto;">
                    <div class="detail-section">
                        <h4 style="margin: 0 0 15px 0; color: var(--text); font-size: 1.1rem;">👤 Dados do Cliente</h4>
                        <div class="detail-row">
                            <strong>Nome:</strong> ${appointment.customer_name || 'Não informado'}
                        </div>
                        <div class="detail-row">
                            <strong>Telefone:</strong> ${appointment.customer_phone || 'Não informado'}
                        </div>
                        ${appointment.customer_email ? `
                        <div class="detail-row">
                            <strong>E-mail:</strong> ${appointment.customer_email}
                        </div>
                        ` : ''}
                        ${appointment.customer_cpf ? `
                        <div class="detail-row">
                            <strong>CPF:</strong> ${appointment.customer_cpf}
                        </div>
                        ` : ''}
                    </div>

                    <div class="detail-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
                        <h4 style="margin: 0 0 15px 0; color: var(--text); font-size: 1.1rem;">📅 Dados do Agendamento</h4>
                        <div class="detail-row">
                            <strong>Protocolo:</strong> ${appointment.protocol || 'N/A'}
                        </div>
                        <div class="detail-row">
                            <strong>Data:</strong> ${date}
                        </div>
                        <div class="detail-row">
                            <strong>Horário:</strong> ${this.formatTime(appointment.appointment_time)}
                        </div>
                        <div class="detail-row">
                            <strong>Duração:</strong> ${appointment.duration_minutes || 60} minutos
                        </div>
                        ${appointment.service_type ? `
                        <div class="detail-row">
                            <strong>Serviço:</strong> ${appointment.service_type}
                        </div>
                        ` : ''}
                        ${appointment.notes ? `
                        <div class="detail-row">
                            <strong>Observações:</strong> ${appointment.notes}
                        </div>
                        ` : ''}
                    </div>

                    ${extraFieldsHtml}

                    <div class="detail-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
                        <h4 style="margin: 0 0 15px 0; color: var(--text); font-size: 1.1rem;">ℹ️ Informações do Sistema</h4>
                        <div class="detail-row">
                            <strong>Status:</strong> 
                            <span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; 
                                background: ${appointment.status === 'confirmed' ? '#28a745' : appointment.status === 'cancelled' ? '#dc3545' : '#ffc107'};
                                color: white;">
                                ${appointment.status === 'confirmed' ? 'Confirmado' : appointment.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                            </span>
                        </div>
                        <div class="detail-row">
                            <strong>Criado em:</strong> ${created}
                        </div>
                        ${appointment.updated_at && appointment.updated_at !== appointment.created_at ? `
                        <div class="detail-row">
                            <strong>Atualizado em:</strong> ${updated}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
    }

    setupEditMode() {
        // Configurar validação em tempo real para campos de edição
        const form = document.getElementById('editAppointmentForm');
        if (form) {
            form.addEventListener('input', (e) => {
                // Validação básica pode ser adicionada aqui
            });
        }
    }

    closeModal() {
        const modal = document.getElementById('appointmentModal');
        modal.classList.remove('show');
        this.selectedAppointment = null;
    }

    closeEditModal() {
        const modal = document.getElementById('editAppointmentModal');
        modal.classList.remove('show');
        this.selectedAppointment = null;
    }

    async saveEditAppointment() {
        const form = document.getElementById('editAppointmentForm');
        const appointmentId = form?.dataset.appointmentId;

        if (!appointmentId) {
            this.showToast('Erro: ID do agendamento não encontrado', 'error');
            return;
        }

        const updateData = {
            customer_name: document.getElementById('editCustomerName').value,
            customer_phone: document.getElementById('editCustomerPhone').value,
            appointment_date: document.getElementById('editAppointmentDate').value,
            appointment_time: document.getElementById('editAppointmentTime').value,
            duration_minutes: 60 // manter duração padrão
        };

        try {
            const response = await fetch(`http://localhost:3000/api/appointments/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                this.showToast('Agendamento atualizado com sucesso!', 'success');
                this.closeEditModal();
                // Atualizar lista em tempo real
                await this.loadAppointments();
            } else {
                const errorData = await response.json();
                this.showToast(errorData.message || 'Erro ao atualizar agendamento', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar agendamento:', error);
            this.showToast('Erro ao atualizar agendamento', 'error');
        }
    }

    async saveAppointmentChanges() {
        if (!this.selectedAppointment) return;

        const form = document.getElementById('editAppointmentForm');
        if (!form) return;

        const formData = new FormData(form);
        const updateData = {
            customer_name: formData.get('customer_name'),
            customer_phone: formData.get('customer_phone'),
            appointment_date: formData.get('appointment_date'),
            appointment_time: formData.get('appointment_time'),
            duration_minutes: 60 // duração fixa
        };

        try {
            await API.updateAppointment(this.selectedAppointment.id, updateData);
            this.showToast('Agendamento atualizado com sucesso', 'success');
            this.closeModal();
            await this.loadAppointments();
        } catch (error) {
            console.error('Erro ao atualizar agendamento:', error);
            this.showToast(error.message || 'Erro ao atualizar agendamento', 'error');
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = this.getToastIcon(type);

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        toastContainer.appendChild(toast);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    showWelcomeMessage() {
        // Removido para evitar mensagem duplicada
        // setTimeout(() => {
        //     this.showToast('Bem-vindo ao Aevum! Sistema de agendamento inteligente.', 'info');
        // }, 1000);
    }

    // Editar agendamento
    editAppointment(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            this.showToast('Agendamento não encontrado', 'error');
            return;
        }

        // Preencher modal de edição
        document.getElementById('editCustomerName').value = appointment.customer_name;
        document.getElementById('editCustomerPhone').value = appointment.customer_phone || '';
        document.getElementById('editAppointmentDate').value = appointment.appointment_date;
        document.getElementById('editAppointmentTime').value = appointment.appointment_time;

        // Armazenar ID do agendamento sendo editado
        document.getElementById('editAppointmentForm').dataset.appointmentId = appointmentId;

        // Abrir modal de edição
        document.getElementById('editAppointmentModal').classList.add('show');
    }

    // Excluir agendamento
    async deleteAppointment(appointmentId) {
        if (!confirm('Tem certeza que deseja excluir este agendamento?')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/appointments/${appointmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                // Remover da lista local
                this.appointments = this.appointments.filter(apt => apt.id !== appointmentId);

                // Atualizar exibição
                this.displayAppointments();

                this.showToast('Agendamento excluído com sucesso!', 'success');
            } else {
                const errorData = await response.json();
                this.showToast(errorData.message || 'Erro ao excluir agendamento', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir agendamento:', error);
            this.showToast('Erro ao excluir agendamento', 'error');
        }
    }

    // ========== FUNCIONALIDADES DO MODERADOR ==========

    /**
     * Verifica se o usuário logado é moderador e mostra botão de configurações
     */
    checkModeratorAccess() {
        console.log('🔍 checkModeratorAccess chamado');
        
        // Carregar user do localStorage diretamente (mais confiável)
        const userData = localStorage.getItem('userData');
        
        if (!userData) {
            console.log('⚠️ UserData não encontrado no localStorage');
            return;
        }
        
        let user;
        try {
            user = JSON.parse(userData);
            console.log('👤 User carregado do localStorage:', user);
            
            // Atualizar authManager se disponível
            if (window.authManager) {
                window.authManager.currentUser = user;
                window.authManager.token = localStorage.getItem('authToken');
            }
        } catch (e) {
            console.error('Erro ao parse userData:', e);
            return;
        }
        
        const role = user.role;
        console.log('👤 Verificando acesso - Role:', role, 'User completo:', user);
        
        // Verificar se é empresa (não funcionário)
        // Funcionários são usuários com role 'user' e parent_user_id (vinculados a uma empresa)
        // Manter compatibilidade com 'moderator' para dados antigos
        const isEmployee = role === 'user' && user.parent_user_id;
        const isCompany = role === 'empresa' || role === 'moderator'; // Compatibilidade
        
        console.log('🔍 Verificação:', { isCompany, isEmployee, role, parent_user_id: user.parent_user_id });
        
        if (isCompany && !isEmployee) {
            console.log('✅ Mostrando botão de configurações para empresa');
            this.showModeratorSettingsButton();
            this.showSettingsLink();
        } else if (isEmployee) {
            console.log('🚫 Ocultando botão de configurações para funcionário');
            this.hideModeratorSettingsButton();
            this.hideSettingsLink();
        } else {
            console.log('ℹ️ Usuário não é empresa nem funcionário - Role:', role);
            this.hideModeratorSettingsButton();
            this.hideSettingsLink();
        }
    }

    /**
     * Oculta o botão flutuante de configurações
     */
    hideModeratorSettingsButton() {
        const existingButton = document.getElementById('moderatorSettingsButton');
        if (existingButton) {
            existingButton.remove();
        }
    }

    /**
     * Mostra o link de configurações no header
     */
    showSettingsLink() {
        const settingsLink = document.getElementById('settingsLink');
        if (settingsLink) {
            settingsLink.style.display = 'inline-flex';
        }
    }

    /**
     * Oculta o link de configurações no header
     */
    hideSettingsLink() {
        const settingsLink = document.getElementById('settingsLink');
        if (settingsLink) {
            settingsLink.style.display = 'none';
        }
    }

    /**
     * Mostra o botão flutuante de configurações para moderadores
     */
    showModeratorSettingsButton() {
        // Desativado: manter apenas o botão de configurações no header
        this.hideModeratorSettingsButton();
        console.log('ℹ️ Botão flutuante de configurações desativado');
    }

    /**
     * Abre o modal de configurações do moderador
     */
    async openModeratorSettingsModal() {
        // Verificar se authManager está disponível
        if (!window.authManager) {
            console.error('AuthManager não disponível');
            this.showToast('Sistema de autenticação não disponível', 'error');
            return;
        }

        // Verificar autenticação
        if (!window.authManager.isAuthenticated()) {
            console.warn('Usuário não autenticado');
            this.showToast('Você precisa estar logado para acessar as configurações', 'error');
            return;
        }

        // Verificar se é moderador (não funcionário)
        const user = window.authManager.currentUser;
        if (!user) {
            this.showToast('Acesso negado', 'error');
            return;
        }
        
        const isEmployee = user.role === 'user' && user.parent_user_id;
        if (isEmployee) {
            this.showToast('Funcionários não têm permissão para acessar configurações', 'error');
            return;
        }
        
        if (user.role !== 'moderator') {
            this.showToast('Acesso restrito a moderadores', 'error');
            return;
        }

        // Verificar se o token está disponível
        const token = window.authManager.token || localStorage.getItem('authToken');
        if (!token) {
            console.error('Token não disponível');
            this.showToast('Sessão expirada. Faça login novamente.', 'error');
            return;
        }

        console.log('🔐 Carregando configurações do moderador');
        console.log('📋 User:', user);
        console.log('🔑 Token disponível:', token ? 'Sim' : 'Não');
        
        // Garantir que o token está no authManager
        if (!window.authManager.token && token) {
            window.authManager.token = token;
            console.log('✅ Token restaurado no authManager');
        }
        
        try {
            // Buscar dados atuais com tratamento de erro melhorado
            let statsResponse, settingsResponse;
            
            try {
                console.log('📊 Buscando stats...');
                statsResponse = await window.authManager.apiRequest('/api/moderator/stats');
                console.log('✅ Stats recebido:', statsResponse);
            } catch (statsError) {
                console.error('❌ Erro ao buscar stats:', statsError);
                // Se for erro 401, tentar recarregar auth
                if (statsError.message && (statsError.message.includes('401') || statsError.message.includes('Não autenticado'))) {
                    console.warn('⚠️ Token inválido, tentando recarregar auth...');
                    await window.authManager.checkAuthStatus();
                    // Tentar novamente
                    try {
                        statsResponse = await window.authManager.apiRequest('/api/moderator/stats');
                    } catch (retryError) {
                        console.error('❌ Erro ao buscar stats após retry:', retryError);
                        statsResponse = { success: false, data: null };
                    }
                } else {
                    statsResponse = { success: false, data: null };
                }
            }

            try {
                console.log('⚙️ Buscando settings...');
                settingsResponse = await window.authManager.apiRequest('/api/moderator/settings');
                console.log('✅ Settings recebido:', settingsResponse);
            } catch (settingsError) {
                console.error('❌ Erro ao buscar settings:', settingsError);
                // Se for erro 401, tentar recarregar auth
                if (settingsError.message && (settingsError.message.includes('401') || settingsError.message.includes('Não autenticado'))) {
                    console.warn('⚠️ Token inválido, tentando recarregar auth...');
                    await window.authManager.checkAuthStatus();
                    // Tentar novamente
                    try {
                        settingsResponse = await window.authManager.apiRequest('/api/moderator/settings');
                    } catch (retryError) {
                        console.error('❌ Erro ao buscar settings após retry:', retryError);
                        this.showToast('Sessão expirada. Faça login novamente.', 'error');
                        return;
                    }
                } else {
                    settingsResponse = { success: false, data: { company_name: '', services: [] } };
                }
            }

            const stats = statsResponse.success ? statsResponse.data : null;
            const settings = settingsResponse.success ? settingsResponse.data : { company_name: '', services: [] };

            // Criar modal
            this.createModeratorSettingsModal(stats, settings);

        } catch (error) {
            console.error('Erro ao carregar configurações do moderador:', error);
            let errorMessage = 'Erro ao carregar configurações';
            if (error.message && error.message.includes('401')) {
                errorMessage = 'Sessão expirada. Faça login novamente.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            this.showToast(errorMessage, 'error');
        }
    }

    /**
     * Cria e exibe o modal de configurações do moderador
     */
    createModeratorSettingsModal(stats, settings) {
        // Verificar se é funcionário - se for, não mostrar seção de configurações
        const user = window.authManager?.currentUser;
        const isEmployee = user && user.role === 'user' && user.parent_user_id;
        
        // Criar overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        // Criar modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            position: relative;
        `;

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; color: #333; font-size: 1.5rem;">⚙️ Configurações do Moderador</h2>
                <button id="closeModeratorModal" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                    padding: 5px;
                ">×</button>
            </div>

            <!-- Dashboard Rápido -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 1.2rem;">📊 Dashboard Rápido</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="text-align: center; padding: 15px; background: white; border-radius: 6px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #0099ff;">${stats?.total_today || 0}</div>
                        <div style="color: #666; font-size: 0.9rem;">Agendamentos Hoje</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: white; border-radius: 6px;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #28a745;">${stats?.top_service || 'Nenhum'}</div>
                        <div style="color: #666; font-size: 0.9rem;">Serviço Top</div>
                    </div>
                </div>
            </div>

            <!-- Configurações da Empresa (oculto para funcionários) -->
            ${isEmployee ? '' : `
            <div>
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 1.2rem;">🏢 Configurações da Empresa</h3>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">
                        Nome da Empresa
                    </label>
                    <input
                        type="text"
                        id="companyNameInput"
                        placeholder="Digite o nome da empresa"
                        value="${settings.company_name || ''}"
                        style="
                            width: 100%;
                            padding: 12px;
                            border: 1px solid #ddd;
                            border-radius: 6px;
                            font-size: 1rem;
                            box-sizing: border-box;
                        "
                    >
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">
                        Serviços Disponíveis
                    </label>
                    <div id="servicesContainer" style="margin-bottom: 10px;">
                        ${this.renderServicesList(settings.services || [])}
                    </div>
                    <button
                        id="addServiceBtn"
                        style="
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.9rem;
                        "
                    >
                        ➕ Adicionar Serviço
                    </button>
                </div>

                <!-- Horário de Funcionamento -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">
                        ⏰ Horário de Funcionamento
                    </label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: #666;">Abertura</label>
                            <input
                                type="time"
                                id="workingHoursStart"
                                value="${settings.working_hours?.start || '09:00'}"
                                style="
                                    width: 100%;
                                    padding: 10px;
                                    border: 1px solid #ddd;
                                    border-radius: 6px;
                                    font-size: 1rem;
                                    box-sizing: border-box;
                                "
                            >
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: #666;">Fechamento</label>
                            <input
                                type="time"
                                id="workingHoursEnd"
                                value="${settings.working_hours?.end || '18:00'}"
                                style="
                                    width: 100%;
                                    padding: 10px;
                                    border: 1px solid #ddd;
                                    border-radius: 6px;
                                    font-size: 1rem;
                                    box-sizing: border-box;
                                "
                            >
                        </div>
                    </div>
                </div>

                <!-- Dias de Funcionamento -->
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">
                        📅 Dias de Funcionamento
                    </label>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                        ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                            const dayNames = {
                                monday: 'Segunda',
                                tuesday: 'Terça',
                                wednesday: 'Quarta',
                                thursday: 'Quinta',
                                friday: 'Sexta',
                                saturday: 'Sábado',
                                sunday: 'Domingo'
                            };
                            const isChecked = (settings.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']).includes(day);
                            return `
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    gap: 6px;
                                    padding: 8px;
                                    background: ${isChecked ? '#e7f3ff' : '#f8f9fa'};
                                    border: 1px solid ${isChecked ? '#0099ff' : '#ddd'};
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 0.9rem;
                                ">
                                    <input
                                        type="checkbox"
                                        name="workingDays"
                                        value="${day}"
                                        ${isChecked ? 'checked' : ''}
                                        style="margin: 0;"
                                    >
                                    ${dayNames[day]}
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button
                        id="cancelModeratorSettings"
                        style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 1rem;
                        "
                    >
                        Cancelar
                    </button>
                    <button
                        id="saveModeratorSettings"
                        style="
                            background: #0099ff;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 1rem;
                        "
                    >
                        💾 Salvar
                    </button>
                </div>
            </div>
            `}
        `;

        // Event listeners
        modal.querySelector('#closeModeratorModal').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // Event listeners apenas se não for funcionário
        if (!isEmployee) {
            const cancelBtn = modal.querySelector('#cancelModeratorSettings');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(overlay);
                });
            }

            const saveBtn = modal.querySelector('#saveModeratorSettings');
            if (saveBtn) {
                saveBtn.addEventListener('click', async () => {
                    await this.saveModeratorSettings();
                    document.body.removeChild(overlay);
                });
            }

            const addServiceBtn = modal.querySelector('#addServiceBtn');
            if (addServiceBtn) {
                addServiceBtn.addEventListener('click', () => {
                    this.addServiceInput();
                });
            }
        }

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    /**
     * Renderiza a lista de serviços como inputs editáveis
     */
    renderServicesList(services) {
        return services.map((service, index) => `
            <div style="display: flex; gap: 10px; margin-bottom: 8px; align-items: center;" class="service-item">
                <input
                    type="text"
                    value="${service}"
                    placeholder="Nome do serviço"
                    style="
                        flex: 1;
                        padding: 8px 12px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 0.9rem;
                    "
                    data-index="${index}"
                >
                <button
                    class="remove-service-btn"
                    style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.9rem;
                    "
                    data-index="${index}"
                >
                    🗑️
                </button>
            </div>
        `).join('');
    }

    /**
     * Adiciona um novo input de serviço
     */
    addServiceInput() {
        const container = document.getElementById('servicesContainer');
        const newServiceDiv = document.createElement('div');
        newServiceDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 8px; align-items: center;';
        newServiceDiv.className = 'service-item';
        newServiceDiv.innerHTML = `
            <input
                type="text"
                placeholder="Nome do serviço"
                style="
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 0.9rem;
                "
            >
            <button
                class="remove-service-btn"
                style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9rem;
                "
            >
                🗑️
            </button>
        `;

        container.appendChild(newServiceDiv);

        // Event listener para remover
        newServiceDiv.querySelector('.remove-service-btn').addEventListener('click', function() {
            this.closest('.service-item').remove();
        });
    }

    /**
     * Salva as configurações do moderador
     */
    async saveModeratorSettings() {
        try {
            const companyName = document.getElementById('companyNameInput').value.trim();

            // Coletar serviços
            const serviceInputs = document.querySelectorAll('#servicesContainer input[type="text"]');
            const services = Array.from(serviceInputs)
                .map(input => input.value.trim())
                .filter(service => service.length > 0);

            // Coletar horário de funcionamento
            const workingHoursStart = document.getElementById('workingHoursStart').value;
            const workingHoursEnd = document.getElementById('workingHoursEnd').value;
            const workingHours = {
                start: workingHoursStart || '09:00',
                end: workingHoursEnd || '18:00'
            };

            // Coletar dias de funcionamento
            const workingDaysCheckboxes = document.querySelectorAll('input[name="workingDays"]:checked');
            const workingDays = Array.from(workingDaysCheckboxes).map(cb => cb.value);

            const settingsData = {
                company_name: companyName || null,
                services: services,
                working_hours: workingHours,
                working_days: workingDays.length > 0 ? workingDays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            };

            const response = await window.authManager.apiRequest('/api/moderator/settings', {
                method: 'PUT',
                body: JSON.stringify(settingsData)
            });

            if (response.success) {
                this.showToast('Configurações salvas com sucesso!', 'success');
                // Atualizar título da página se necessário
                this.updateCompanyTitle(companyName);
                // Recarregar informações da empresa para atualizar a tela de agendamentos
                await this.loadCompanyInfo();
                // Forçar atualização do dropdown de serviços com os novos dados
                this.populateServicesDropdown(services);
                // Disparar evento customizado para notificar outras partes da aplicação
                window.dispatchEvent(new CustomEvent('companySettingsUpdated', {
                    detail: { company_name: companyName, services: services }
                }));
            } else {
                // Tentar extrair mensagem mais detalhada do erro
                let errorMessage = response.message || response.details || 'Erro ao salvar configurações';

                // Se for erro relacionado à tabela não existir
                if (errorMessage.includes('configuração do banco') || errorMessage.includes('tabela')) {
                    errorMessage = 'Banco de dados não configurado. Contate o administrador.';
                }

                this.showToast(errorMessage, 'error');
            }

        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            // Tentar extrair mensagem mais detalhada do erro
            let errorMessage = 'Erro ao salvar configurações';
            if (error.message && error.message.includes('JSON')) {
                errorMessage = 'Erro de comunicação com o servidor. Tente novamente.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            this.showToast(errorMessage, 'error');
        }
    }

    /**
     * Atualiza o título da página com o nome da empresa
     */
    updateCompanyTitle(companyName) {
        if (companyName) {
            document.title = `${companyName} - Aevum`;
            // Atualizar também o título no header se existir
            const headerTitle = document.querySelector('.header-title span');
            if (headerTitle) {
                headerTitle.textContent = companyName;
            }
        } else {
            document.title = 'Sistema de Agendamentos - Aevum';
            const headerTitle = document.querySelector('.header-title span');
            if (headerTitle) {
                headerTitle.textContent = 'Sistema de Agendamentos';
            }
        }
    }

    updateCompanyLogo(logoData) {
        const logoEl = document.getElementById('companyLogo');
        if (!logoEl) return;

        if (logoData) {
            logoEl.src = logoData;
            logoEl.style.display = 'block';
        } else {
            logoEl.style.display = 'none';
        }
    }

    /**
     * Carrega informações da empresa (nome e serviços)
     */
    async loadCompanyInfo() {
        try {
            // Se for funcionário, buscar configurações do moderador
            const user = window.authManager?.currentUser;
            let response;
            
            if (user) {
                // Se estiver autenticado, sempre usar settings (fonte completa)
                const targetUserId = user.parent_user_id || user.id;
                response = await window.authManager.apiRequest(`/api/moderator/settings?userId=${targetUserId}`);
            } else {
                // Público - usar company-info
                response = await window.authManager.apiRequest('/api/moderator/company-info');
            }
            
            if (response.success && response.data) {
                const { company_name, services, logo } = response.data;

                // Atualizar título da página
                if (company_name) {
                    this.updateCompanyTitle(company_name);
                }
                this.updateCompanyLogo(logo || this.getStoredCompanyLogo());

                // Carregar serviços no dropdown
                this.populateServicesDropdown(services || []);

                console.log('🏢 Informações da empresa carregadas:', { company_name, services_count: (services || []).length });
            }
        } catch (error) {
            console.warn('Erro ao carregar informações da empresa:', error.message);
            // Usar valores padrão se não conseguir carregar
            this.populateServicesDropdown([]);
        }
    }

    async loadModeratorSettings() {
        try {
            const user = window.authManager?.currentUser;
            if (!user) return;

            const userId = user.parent_user_id || user.id;
            const response = await window.authManager.apiRequest(`/api/moderator/settings?userId=${userId}`);
            
            if (response.success && response.data) {
                const settings = response.data;
                
                // Salvar no localStorage para uso imediato
                localStorage.setItem('moderator_settings', JSON.stringify({
                    campos_visiveis: settings.campos_visiveis || ['nome', 'telefone'],
                    campos_extras: settings.campos_extras || [],
                    servicos: settings.services || [],
                    funcionamento: {
                        dias: settings.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                        inicio: settings.working_hours?.start || '08:00',
                        fim: settings.working_hours?.end || '18:00',
                        slot: settings.slot_interval || 30
                    }
                }));
                localStorage.setItem('moderator_settings_v2', JSON.stringify(settings));
                this.updateCompanyTitle(settings.company_name);
                this.updateCompanyLogo(settings.logo || this.getStoredCompanyLogo());
                
                // Renderizar formulário dinamicamente
                this.renderFormFields(settings);
                
                // Popular serviços
                this.populateServicesDropdown(settings.services || []);
            }
        } catch (error) {
            console.error('Erro ao carregar configurações do moderador:', error);
            const fallback = this.getLocalSettingsFallback();
            if (fallback) {
                this.renderFormFields(fallback);
                this.populateServicesDropdown(fallback.services || []);
                this.updateCompanyTitle(fallback.company_name);
                this.updateCompanyLogo(fallback.logo || this.getStoredCompanyLogo());
            }
        }
    }

    getStoredCompanyLogo() {
        try {
            const stored = localStorage.getItem('moderator_settings');
            if (!stored) return null;
            const parsed = JSON.parse(stored);
            return parsed.logo || null;
        } catch (e) {
            return null;
        }
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

    renderFormFields(settings) {
        const form = document.getElementById('appointmentForm');
        if (!form) return;

        const camposVisiveis = settings.campos_visiveis || ['nome', 'telefone'];
        const camposExtras = settings.campos_extras || [];

        // Mapear campos padrão
        const fieldMap = {
            'nome': { id: 'customer_name', label: 'Nome do Cliente *', type: 'text', required: true },
            'telefone': { id: 'customer_phone', label: 'Telefone', type: 'tel', required: false },
            'email': { id: 'customer_email', label: 'E-mail', type: 'email', required: false },
            'cpf': { id: 'customer_cpf', label: 'CPF', type: 'text', required: false }
        };

        // Remover campos existentes (exceto serviço, data, horário e botões)
        const existingFields = form.querySelectorAll('.form-group');
        existingFields.forEach(field => {
            const input = field.querySelector('input, select');
            if (input && !['service_type', 'appointment_date', 'appointment_time'].includes(input.name || input.id)) {
                field.remove();
            }
        });

        // Adicionar campos visíveis
        camposVisiveis.forEach(campo => {
            if (fieldMap[campo]) {
                const fieldData = fieldMap[campo];
                const fieldHtml = `
                    <div class="form-group">
                        <label>${fieldData.label}</label>
                        <input type="${fieldData.type}" name="${fieldData.id}" id="${fieldData.id}" 
                               placeholder="${fieldData.label.replace('*', '')}" 
                               ${fieldData.required ? 'required' : ''}>
                    </div>
                `;
                const serviceField = form.querySelector('#serviceType')?.closest('.form-group');
                if (serviceField) {
                    serviceField.insertAdjacentHTML('beforebegin', fieldHtml);
                }
            }
        });

        // Adicionar campos extras
        camposExtras.forEach((campoExtra, index) => {
            const fieldHtml = `
                <div class="form-group">
                    <label>${campoExtra}</label>
                    <input type="text" name="extra_${index}" id="extra_${index}" 
                           placeholder="${campoExtra}">
                </div>
            `;
            const serviceField = form.querySelector('#serviceType')?.closest('.form-group');
            if (serviceField) {
                serviceField.insertAdjacentHTML('beforebegin', fieldHtml);
            }
        });
    }

    /**
     * Preenche o dropdown de serviços
     */
    populateServicesDropdown(services) {
        const serviceSelect = document.getElementById('serviceType');
        if (!serviceSelect) return;

        // Limpar opções existentes (exceto a primeira)
        while (serviceSelect.options.length > 1) {
            serviceSelect.remove(1);
        }

        // Adicionar serviços
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service;
            option.textContent = service;
            serviceSelect.appendChild(option);
        });

        // Adicionar opção "Outro" se houver serviços
        if (services.length > 0) {
            const otherOption = document.createElement('option');
            otherOption.value = 'Outro';
            otherOption.textContent = 'Outro (especificar em observações)';
            serviceSelect.appendChild(otherOption);
        }

        console.log(`📋 Dropdown de serviços populado com ${services.length} opções`);
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new Aevum();
});
