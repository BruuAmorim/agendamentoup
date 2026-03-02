// Aevum - Sistema de Agendamento Inteligente
// Arquivo principal da aplicação frontend

class Aevum {
    constructor() {
        this.appointments = [];
        this.availableSlots = [];
        this.selectedAppointment = null;
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.employees = [];
        this.employeeServices = {};
        this.currentEmployeeFilter = null;
        this.allServices = [];

        this.init();
    }

    // Formata protocolo para exibição: remove letras e mantém apenas números
    formatProtocolForDisplay(protocol) {
        if (!protocol) return '';
        const onlyDigits = String(protocol).replace(/\D/g, '');
        if (!onlyDigits) return '';

        // Sempre exibir com exatamente 4 dígitos (preenchendo com zeros à esquerda se necessário)
        return onlyDigits.padStart(4, '0');
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
        // Aplicar nome da empresa do localStorage logo no init para evitar piscar "Sistema de Agendamentos" no F5
        const storedName = this.getStoredCompanyName();
        if (storedName) this.updateCompanyTitle(storedName);

        this.autoRefreshInterval = null;

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

        // Carregar funcionários para uso na agenda (selects e filtros)
        this.loadEmployeesForAgenda();
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

        // Filtro por profissional na lista
        const employeeFilter = document.getElementById('employeeFilter');
        if (employeeFilter) {
            employeeFilter.addEventListener('change', () => {
                this.currentEmployeeFilter = employeeFilter.value || null;
                this.displayAppointments();
            });
        }

        // Profissional no formulário de novo agendamento
        const employeeSelect = document.getElementById('employeeSelect');
        if (employeeSelect) {
            employeeSelect.addEventListener('change', async () => {
                const employeeId = employeeSelect.value || null;
                await this.onEmployeeChangeForNew(employeeId);
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
            editModalCancel.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeEditModal();
            });
        }

        const editModalSave = document.getElementById('editModalSave');
        if (editModalSave) {
            editModalSave.addEventListener('click', () => {
                this.saveEditAppointment();
            });
        }

        // Modal de detalhes
        const detailsModalClose = document.getElementById('detailsModalClose');
        if (detailsModalClose) {
            detailsModalClose.addEventListener('click', () => {
                this.closeDetailsModal();
            });
        }

        const detailsModalBack = document.getElementById('detailsModalBack');
        if (detailsModalBack) {
            detailsModalBack.addEventListener('click', () => {
                this.closeDetailsModal();
            });
        }

        // Botão de exportar planilha Excel
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => {
                this.exportAppointmentsToExcel();
            });
        }

        // Botão de exportar PDF
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => {
                this.exportAppointmentsToPdf();
            });
        }

        // Botão para expandir/recolher card de agendamentos (tela cheia)
        const fullscreenBtn = document.getElementById('toggleFullscreenAppointments');
        const appointmentsCard = document.getElementById('appointmentsCard');
        if (fullscreenBtn && appointmentsCard) {
            fullscreenBtn.addEventListener('click', () => {
                const isFullscreen = appointmentsCard.classList.toggle('fullscreen');
                document.body.classList.toggle('fullscreen-mode', isFullscreen);
                if (isFullscreen) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
                fullscreenBtn.textContent = isFullscreen ? '🡼 Tela normal' : '⛶ Tela cheia';
                fullscreenBtn.title = isFullscreen ? 'Sair da tela cheia' : 'Expandir para tela cheia';
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

            const detailsModal = document.getElementById('detailsAppointmentModal');
            if (detailsModal && e.target === detailsModal) {
                this.closeDetailsModal();
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

        // Atualizar horários disponíveis quando a data ou o serviço mudar
        const dateInput = document.getElementById('appointment_date');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                this.updateAvailableTimes();
            });
        }

        const serviceSelect = document.getElementById('serviceType');
        if (serviceSelect) {
            serviceSelect.addEventListener('change', () => {
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
            // Bloquear datas passadas no formulário de novo agendamento
            const dateInput = document.getElementById('appointment_date');
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.setAttribute('min', today);
            }

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

    startAutoRefresh() {
        // Evitar múltiplos intervals
        this.stopAutoRefresh();

        const indicator = document.getElementById('autoRefreshIndicator');

        const refreshFn = async () => {
            try {
                if (indicator) {
                    indicator.style.display = 'inline-flex';
                }

                const filterDateInput = document.getElementById('filterDate');
                if (filterDateInput && !filterDateInput.value) {
                    const today = new Date().toISOString().split('T')[0];
                    filterDateInput.value = today;
                }

                await this.loadAppointments();
            } finally {
                if (indicator) {
                    // Esconder de forma suave após a atualização
                    setTimeout(() => {
                        indicator.style.display = 'none';
                    }, 800);
                }
            }
        };

        // Executar uma vez imediatamente ao entrar em tela cheia
        refreshFn();
        this.autoRefreshInterval = setInterval(refreshFn, 60000); // 1 minuto
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        const indicator = document.getElementById('autoRefreshIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    async checkAvailability() {
        const date = document.getElementById('appointment_date').value;

        if (!date) {
            this.showToast('Selecione uma data primeiro', 'warning');
            return;
        }

        try {
            const filterDateEl = document.getElementById('filterDate');
            if (filterDateEl && filterDateEl.value !== date) {
                filterDateEl.value = date;
                await this.loadAppointments();
            }

            // Duração baseada no(s) serviço(s) selecionado(s) ou no intervalo padrão
            const duration = this.getTotalSelectedDuration();
            const employeeSelect = document.getElementById('employeeSelect');
            const employeeId = employeeSelect ? (employeeSelect.value || null) : null;

            const apiResult = await API.getAvailableSlots(date, duration, employeeId);
            let availableSlots = [];

            if (apiResult.success && Array.isArray(apiResult.data) && apiResult.data.length > 0) {
                availableSlots = apiResult.data.map(s => ({
                    time: s.time || s,
                    duration: s.duration || duration
                }));
            } else {
                availableSlots = this.generateAvailableSlots(date, duration, employeeId);
            }

            this.availableSlots = availableSlots;
            this.displayAvailableSlots();
            document.getElementById('availableSlots').style.display = 'block';

            // Se o cliente já digitou um horário manualmente, avisar se ele não estiver na lista de disponíveis
            const timeInput = document.getElementById('appointment_time');
            const rawTime = timeInput ? timeInput.value : '';
            if (rawTime) {
                const typedTime = this.formatTime(rawTime);
                const existsInSlots = (this.availableSlots || []).some(slot => {
                    const slotTime = typeof slot === 'string' ? slot : slot.time;
                    return this.formatTime(slotTime) === typedTime;
                });

                if (!existsInSlots) {
                    this.showToast(
                        `O horário ${typedTime} não está disponível para esta data. Selecione outro horário na lista de horários disponíveis.`,
                        'warning'
                    );
                }
            }
        } catch (error) {
            console.error('Erro ao verificar disponibilidade:', error);
            this.showToast('Erro ao verificar disponibilidade', 'error');
        }
    }

    // Retorna o dia da semana (0=dom..6=sáb) em horário local para uma data YYYY-MM-DD
    getDayOfWeekLocal(dateStr) {
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 0;
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d).getDay();
    }

    generateAvailableSlots(selectedDate, durationMinutes, employeeId = null) {
        const slots = [];

        // ==== Carregar regras de horário/dias de atendimento ====
        // 1) Novo formato (appSettings.rules.*)
        let workDaysConfig = null;
        let openingTime = '08:00';
        let closingTime = '18:00';
        let slotInterval = 30; // minutos

        const appSettingsStr = localStorage.getItem('appSettings');
        if (appSettingsStr) {
            try {
                const appSettings = JSON.parse(appSettingsStr);
                const rules = appSettings.rules || {};

                if (rules.businessHours) {
                    openingTime = rules.businessHours.opening || openingTime;
                    closingTime = rules.businessHours.closing || closingTime;
                }

                if (rules.workDays) {
                    workDaysConfig = { ...rules.workDays };
                }
            } catch (e) {
                console.warn('Erro ao parsear appSettings:', e);
            }
        }

        // 2) Formato legado (moderator_settings.funcionamento)
        const legacySettingsStr = localStorage.getItem('moderator_settings');
        if (legacySettingsStr) {
            try {
                const legacy = JSON.parse(legacySettingsStr);
                if (legacy.funcionamento) {
                    openingTime = legacy.funcionamento.inicio || openingTime;
                    closingTime = legacy.funcionamento.fim || closingTime;
                    slotInterval = legacy.funcionamento.slot || slotInterval;

                    if (Array.isArray(legacy.funcionamento.dias)) {
                        if (!workDaysConfig) workDaysConfig = {};
                        legacy.funcionamento.dias.forEach(day => {
                            // Não sobrescrever dias explicitamente desativados nas novas regras
                            if (workDaysConfig[day] !== false) {
                                workDaysConfig[day] = true;
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn('Erro ao parsear configurações legadas:', e);
            }
        }

        // 3) Padrão se nada configurado: segunda a sexta atendendo
        if (!workDaysConfig) {
            workDaysConfig = {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: false,
                sunday: false
            };
        }

        // Dia da semana em horário local (evita bug de fuso em new Date('YYYY-MM-DD'))
        const dayOfWeek = this.getDayOfWeekLocal(selectedDate);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];

        // Se estiver explicitamente desativado nas regras, não gerar slots
        if (workDaysConfig[dayName] === false) {
            return [];
        }

        // ==== Gerar slots dentro do horário de funcionamento ====

        // Duração efetiva para o slot: se houver duração específica do serviço,
        // usar ela; caso contrário, usar o intervalo padrão da agenda.
        const defaultSlot = slotInterval || this.getDefaultSlotInterval();
        const effectiveDuration = (durationMinutes && durationMinutes > 0)
            ? durationMinutes
            : defaultSlot;

        // Converter horários para minutos desde meia-noite
        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const openingMinutes = parseTime(openingTime);
        const closingMinutes = parseTime(closingTime);

        // Buscar agendamentos para a data selecionada (considerando funcionário se informado)
        const dateAppointments = this.appointments.filter(apt => {
            if (apt.appointment_date !== selectedDate || apt.status === 'cancelled') return false;
            if (employeeId && apt.employee_id && String(apt.employee_id) !== String(employeeId)) {
                return false;
            }
            return true;
        });

        // Gerar slots com intervalo configurado
        const step = effectiveDuration || defaultSlot;
        for (let minutes = openingMinutes; minutes < closingMinutes; minutes += step) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

            // Regra de conflito: novo_inicio < existente_fim AND novo_fim > existente_inicio
            const newSlotDuration = effectiveDuration;
            const slotEndMinutes = minutes + newSlotDuration;
            const hasConflict = dateAppointments.some(apt => {
                const aptTime = apt.appointment_time.split(':');
                const aptMinutes = parseInt(aptTime[0]) * 60 + parseInt(aptTime[1] || 0);
                const aptDuration = apt.duration_minutes || 60;
                const aptEnd = aptMinutes + aptDuration;
                return minutes < aptEnd && slotEndMinutes > aptMinutes;
            });

            if (!hasConflict) {
                slots.push({
                    time: timeString,
                    duration: newSlotDuration
                });
            }
        }

        return slots;
    }

    displayAvailableSlots() {
        const container = document.getElementById('slotsContainer');
        container.innerHTML = '';

        // Verificar se o dia está ativo (usar data em horário local para não errar o dia da semana)
        const selectedDate = document.getElementById('appointment_date').value;
        let isNonWorkingDay = false;

        if (selectedDate) {
            const dayOfWeek = this.getDayOfWeekLocal(selectedDate);
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = dayNames[dayOfWeek];
            
            let workDays = null;

            // 1) Novo formato (appSettings.rules.workDays)
            const appSettingsStr = localStorage.getItem('appSettings');
            if (appSettingsStr) {
                try {
                    const appSettings = JSON.parse(appSettingsStr);
                    const rules = appSettings.rules || {};
                    if (rules.workDays) {
                        workDays = { ...rules.workDays };
                    }
                } catch (e) {
                    console.warn('Erro ao parsear appSettings:', e);
                }
            }

            // 2) Formatos legados (moderator_settings / moderator_settings_v2)
            const settingsStr = localStorage.getItem('moderator_settings') || localStorage.getItem('moderator_settings_v2');
            
            if (settingsStr) {
                try {
                    const settings = JSON.parse(settingsStr);
                    // Suportar ambos os formatos
                    if (settings.working_days) {
                        if (!workDays) workDays = {};
                        settings.working_days.forEach(day => {
                            if (workDays[day] !== false) {
                                workDays[day] = true;
                            }
                        });
                    } else if (settings.funcionamento?.dias) {
                        if (!workDays) workDays = {};
                        settings.funcionamento.dias.forEach(day => {
                            if (workDays[day] !== false) {
                                workDays[day] = true;
                            }
                        });
                    }
                } catch (e) {
                    console.warn('Erro ao parsear configurações:', e);
                }
            }
            
            // Se não encontrou configurações, usar padrão (segunda a sexta)
            if (!workDays) {
                workDays = {
                    monday: true,
                    tuesday: true,
                    wednesday: true,
                    thursday: true,
                    friday: true,
                    saturday: false,
                    sunday: false
                };
            }
            
            if (workDays[dayName] === false) {
                isNonWorkingDay = true;
            }
        }

        if (this.availableSlots.length === 0) {
            const message = isNonWorkingDay
                ? '⚠️ Não atendemos neste dia'
                : 'Nenhum horário disponível para esta data';
            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-weight: ${isNonWorkingDay ? '500' : '400'};">${message}</p>`;
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
    // employeeId opcional: verifica conflitos apenas dentro da agenda deste profissional;
    // agendamentos antigos sem employee_id continuam bloqueando todos.
    isTimeSlotAvailable(date, time, durationOverride, employeeId = null) {
        // Garantir que this.appointments é sempre um array
        if (!Array.isArray(this.appointments)) {
            console.warn('⚠️ this.appointments não é um array, inicializando como array vazio');
            this.appointments = [];
        }
        
        // Primeiro, garantir que temos os agendamentos carregados para esta data
        const dateAppointments = this.appointments.filter(apt => {
            if (apt.appointment_date !== date || apt.status === 'cancelled') return false;
            // Se employeeId foi informado e o agendamento já tem employee_id,
            // só considerar conflitos do mesmo funcionário; agendamentos sem employee_id
            // são considerados "globais" e continuam bloqueando todos.
            if (employeeId && apt.employee_id && String(apt.employee_id) !== String(employeeId)) {
                return false;
            }
            return true;
        });

        // Verificar se há conflito com agendamentos existentes
        // Converter horário para minutos para verificação mais precisa
        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + (minutes || 0);
        };
        
        const requestedMinutes = parseTime(time);
        const duration = durationOverride && durationOverride > 0
            ? durationOverride
            : this.getDefaultSlotInterval(); // duração padrão baseada na agenda
        
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
        const totalDuration = this.getTotalSelectedDuration();
        const serviceLabel = this.getSelectedServicesLabel();

        // Gerar protocolo único (4-5 dígitos) com base em timestamp + aleatório
        const timestampPart = String(Date.now()).slice(-4);
        const randomDigit = Math.floor(Math.random() * 10); // 0-9
        const generatedProtocol = `${timestampPart}${randomDigit}`;

        const employeeSelect = document.getElementById('employeeSelect');
        const selectedEmployeeId = employeeSelect ? (employeeSelect.value || null) : null;

        const appointmentData = {
            customer_name: formData.get('customer_name') || formData.get('customer_name'),
            customer_phone: formData.get('customer_phone') || null,
            customer_email: formData.get('customer_email') || null,
            customer_cpf: formData.get('customer_cpf') || null,
            service_type: serviceLabel,
            appointment_date: formData.get('appointment_date'),
            appointment_time: formData.get('appointment_time'),
            duration_minutes: totalDuration, // duração baseada no(s) serviço(s) selecionado(s)
            notes: formData.get('notes') || '', // observações do formulário
            protocol: generatedProtocol
        };

        if (selectedEmployeeId) {
            appointmentData.employee_id = selectedEmployeeId;
        }

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
            
            if (!this.isTimeSlotAvailable(
                appointmentData.appointment_date,
                appointmentData.appointment_time,
                appointmentData.duration_minutes,
                selectedEmployeeId || null
            )) {
                this.showToast(`Já existe um agendamento cadastrado para a data ${appointmentData.appointment_date} no horário ${appointmentData.appointment_time}. Por favor, escolha outro horário.`, 'error');
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
                
                // RF01 - Mensagem específica para conflito de horário
                if (errorMsg.includes('Já existe um agendamento') || errorMsg.includes('conflito') || errorMsg.includes('indisponível')) {
                    this.showToast(errorMsg, 'error');
                }
                // Se for erro de horário fora do expediente, mostrar mensagem mais informativa
                else if (errorMsg.includes('fora do expediente') || errorMsg.includes('Horário fora')) {
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

        // Formatar data do campo filterDate (formato YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
        const formatDateToBR = (dateString) => {
            if (!dateString) return '';
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        };

        if (this.appointments.length === 0) {
            const formattedDate = formatDateToBR(filterDate);
            listaContainer.innerHTML = `
                <div class="no-appointments-message">
                    <p>📭 Nenhum agendamento encontrado para ${formattedDate}</p>
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

        // Aplicar filtro por profissional, se selecionado
        let filteredAppointments = sortedAppointments;
        if (this.currentEmployeeFilter) {
            filteredAppointments = sortedAppointments.filter(apt => {
                return apt.employee_id && String(apt.employee_id) === String(this.currentEmployeeFilter);
            });
        }

        if (filteredAppointments.length === 0) {
            const formattedDate = formatDateToBR(filterDate);
            const employeeName = this.getEmployeeNameById(this.currentEmployeeFilter);
            listaContainer.innerHTML = `
                <div class="no-appointments-message">
                    <p>📭 Nenhum agendamento encontrado para ${formattedDate}${employeeName ? ` (${employeeName})` : ''}</p>
                </div>
            `;
            return;
        }

        // Renderizar agendamentos ordenados (já filtrados)
        filteredAppointments.forEach(appointment => {
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
        const protocol = this.formatProtocolForDisplay(appointment.protocol) || 'N/A';
        const employeeName = this.getEmployeeNameById(appointment.employee_id);

        div.innerHTML = `
            <div class="appointment-list-time">${time}</div>
            <div class="appointment-list-info">
                <div class="appointment-list-name">
                    ${appointment.customer_name}
                    - <span class="appointment-protocol">Protocolo: ${protocol}</span>
                </div>
                <div class="appointment-list-phone">
                    ${phone}
                    ${employeeName ? ` • Profissional: ${employeeName}` : ''}
                </div>
            </div>
            <div class="appointment-list-actions">
                <button class="btn-details" data-id="${appointment.id}" title="Detalhes">🔍</button>
                <button class="btn-edit" data-id="${appointment.id}" title="Editar">✏️</button>
                <button class="btn-delete" data-id="${appointment.id}" title="Excluir">🗑️</button>
            </div>
        `;

        // Prevenir propagação do clique nos botões
        const detailsBtn = div.querySelector('.btn-details');
        const editBtn = div.querySelector('.btn-edit');
        const deleteBtn = div.querySelector('.btn-delete');

        detailsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = appointment.id;
            const fullAppointment = this.appointments.find(apt => String(apt.id) === String(id));
            if (fullAppointment) {
                this.openDetailsModal(fullAppointment);
            } else {
                this.showToast('Agendamento não encontrado na lista. Recarregue a página.', 'error');
            }
        });

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
            if (!e.target.classList.contains('btn-details') && 
                !e.target.classList.contains('btn-edit') && 
                !e.target.classList.contains('btn-delete')) {
                const fullAppointment = this.appointments.find(apt => String(apt.id) === String(appointment.id));
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
        const appointment = this.appointments.find(apt => String(apt.id) === String(id));
        if (appointment) {
            this.openEditAppointmentModal(appointment);
        } else {
            this.showToast('Agendamento não encontrado. Recarregue a lista.', 'error');
        }
    }

    openEditAppointmentModal(appointment) {
        this.selectedAppointment = appointment;

        // Preencher campos do modal
        document.getElementById('editCustomerName').value = appointment.customer_name || '';
        document.getElementById('editCustomerPhone').value = appointment.customer_phone || '';
        document.getElementById('editCustomerEmail').value = appointment.customer_email || '';
        document.getElementById('editCustomerCpf').value = appointment.customer_cpf || '';
        document.getElementById('editAppointmentDate').value = appointment.appointment_date || '';
        document.getElementById('editAppointmentTime').value = this.formatTime(appointment.appointment_time) || '';
        document.getElementById('editNotes').value = appointment.notes || '';

        // Preencher profissional
        const editEmployeeSelect = document.getElementById('editEmployeeSelect');
        if (editEmployeeSelect) {
            // Garantir que dropdown está atualizado
            this.populateEmployeeDropdowns();
            const employeeId = appointment.employee_id ? String(appointment.employee_id) : '';
            Array.from(editEmployeeSelect.options).forEach(opt => {
                opt.selected = employeeId && opt.value === employeeId;
            });
        }

        // Preencher serviço (lista será filtrada por profissional se possível)
        const serviceSelect = document.getElementById('editServiceType');
        if (serviceSelect) {
            // Limpar opções existentes (exceto a primeira)
            while (serviceSelect.options.length > 1) {
                serviceSelect.remove(1);
            }

            // Carregar serviços das configurações
            const settingsStr = localStorage.getItem('moderator_settings_v2') || localStorage.getItem('moderator_settings');
            if (settingsStr) {
                try {
                    const settings = JSON.parse(settingsStr);
                    const services = this.normalizeServices(settings.services || []);
                    services.forEach(service => {
                        const option = document.createElement('option');
                        option.value = service.name;
                        option.textContent = service.duration_minutes
                            ? `${service.name} (${service.duration_minutes} min)`
                            : service.name;
                        if (service.duration_minutes) {
                            option.dataset.durationMinutes = service.duration_minutes;
                        }
                        serviceSelect.appendChild(option);
                    });
                } catch (e) {
                    console.warn('Erro ao parsear configurações:', e);
                }
            }

            // Selecionar o(s) serviço(s) do agendamento (suporta "Corte + Barba")
            if (appointment.service_type) {
                const parts = appointment.service_type.split('+').map(p => p.trim()).filter(Boolean);
                const options = Array.from(serviceSelect.options);
                options.forEach(opt => {
                    if (parts.includes(opt.value)) {
                        opt.selected = true;
                    }
                });
            }
        }

        // Armazenar ID do agendamento no formulário
        const form = document.getElementById('editAppointmentForm');
        if (form) {
            form.dataset.appointmentId = appointment.id;
        }

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

        // Criar estrutura do modal (usa estilos próprios para não interferir nos outros modais)
        const modalHTML = `
            <div id="appointmentModal" class="modal">
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
        
        // Adicionar estilos específicos apenas para o modal de detalhes criado dinamicamente
        if (!document.getElementById('appointmentModalStyles')) {
            const style = document.createElement('style');
            style.id = 'appointmentModalStyles';
            style.textContent = `
                #appointmentModal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 2000;
                    align-items: center;
                    justify-content: center;
                }
                #appointmentModal.show {
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
            // RF03 - Exibir TODOS os campos do agendamento (sempre exibir, mesmo se vazio)
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
                        <div class="detail-row">
                            <strong>E-mail:</strong> ${appointment.customer_email || 'Não informado'}
                        </div>
                        <div class="detail-row">
                            <strong>CPF:</strong> ${appointment.customer_cpf || 'Não informado'}
                        </div>
                    </div>

                    <div class="detail-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
                        <h4 style="margin: 0 0 15px 0; color: var(--text); font-size: 1.1rem;">📅 Dados do Agendamento</h4>
                        <div class="detail-row">
                            <strong>Protocolo:</strong> ${this.formatProtocolForDisplay(appointment.protocol) || 'N/A'}
                        </div>
                        <div class="detail-row">
                            <strong>Data:</strong> ${date}
                        </div>
                        <div class="detail-row">
                            <strong>Horário:</strong> ${this.formatTime(appointment.appointment_time)}
                        </div>
                        <div class="detail-row">
                            <strong>Serviço:</strong> ${appointment.service_type || 'Não informado'}
                        </div>
                        <div class="detail-row">
                            <strong>Duração:</strong> ${appointment.duration_minutes || 60} minutos
                        </div>
                        <div class="detail-row">
                            <strong>Observações:</strong> ${appointment.notes || 'Nenhuma observação'}
                        </div>
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
        if (modal) {
            modal.classList.remove('show');
        }
        this.selectedAppointment = null;
    }

    openDetailsModal(appointment) {
        this.selectedAppointment = appointment;
        const modal = document.getElementById('detailsAppointmentModal');
        const modalBody = document.getElementById('detailsModalBody');

        if (!modal || !modalBody) {
            console.error('❌ Modal de detalhes não encontrado');
            this.showToast('Erro ao abrir detalhes do agendamento', 'error');
            return;
        }

        modalBody.innerHTML = this.createAppointmentModalContent(appointment, false);
        modal.classList.add('show');
    }

    closeDetailsModal() {
        const modal = document.getElementById('detailsAppointmentModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.selectedAppointment = null;
    }

    /**
     * Monta o Workbook de agendamentos (usado tanto para Excel quanto para PDF)
     */
    buildAppointmentsWorkbook(filterDate) {
        // Criar workbook
        const wb = XLSX.utils.book_new();
        
        // Preparar dados (inclui serviço e coloca protocolo por último)
        const headers = ['Nome do Cliente', 'Telefone', 'Serviço', 'Data', 'Hora', 'Protocolo'];
        const data = this.appointments.map(apt => [
            String(apt.customer_name || ''),
            String(apt.customer_phone || ''),
            String(apt.service_type || ''),
            apt.appointment_date ? new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR') : '',
            this.formatTime(apt.appointment_time) || '',
            this.formatProtocolForDisplay(apt.protocol || '')
        ]);

        const dateFormatted = new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR');

        const wsData = [
            ['Agendamentos do Dia'],
            [`Data: ${dateFormatted}`],
            [],
            headers,
            ...data
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Larguras de coluna
        ws['!cols'] = [
            { wch: 30 }, // Nome
            { wch: 18 }, // Telefone
            { wch: 20 }, // Serviço
            { wch: 12 }, // Data
            { wch: 10 }, // Hora
            { wch: 14 }  // Protocolo
        ];

        // Mesclas
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
        ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

        // Estilos (se o build do XLSX suportar)
        try {
            const titleCell = ws['A1'];
            if (titleCell) {
                titleCell.s = {
                    font: { bold: true, sz: 16 },
                    alignment: { horizontal: 'center', vertical: 'center' }
                };
            }

            const dateCell = ws['A2'];
            if (dateCell) {
                dateCell.s = {
                    font: { sz: 12 },
                    alignment: { horizontal: 'center', vertical: 'center' }
                };
            }

            headers.forEach((header, colIndex) => {
                const cellRef = XLSX.utils.encode_cell({ r: 3, c: colIndex });
                const cell = ws[cellRef];
                if (cell) {
                    cell.s = {
                        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
                        fill: { fgColor: { rgb: '0099FF' } },
                        alignment: { horizontal: 'left', vertical: 'center' },
                        border: {
                            top: { style: 'thin', color: { rgb: '0099FF' } },
                            bottom: { style: 'thin', color: { rgb: '0099FF' } },
                            left: { style: 'thin', color: { rgb: '0099FF' } },
                            right: { style: 'thin', color: { rgb: '0099FF' } }
                        }
                    };
                }
            });

            data.forEach((row, rowIndex) => {
                headers.forEach((header, colIndex) => {
                    const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 4, c: colIndex });
                    const cell = ws[cellRef];
                    if (cell) {
                        const bgColor = rowIndex % 2 === 0 ? 'F8F9FA' : 'FFFFFF';
                        cell.s = {
                            font: { sz: 10 },
                            fill: { fgColor: { rgb: bgColor } },
                            alignment: { horizontal: 'left', vertical: 'center' },
                            border: {
                                top: { style: 'thin', color: { rgb: 'C8C8C8' } },
                                bottom: { style: 'thin', color: { rgb: 'C8C8C8' } },
                                left: { style: 'thin', color: { rgb: 'C8C8C8' } },
                                right: { style: 'thin', color: { rgb: 'C8C8C8' } }
                            }
                        };
                    }
                });
            });

            ws['!rows'] = [
                { hpt: 25 },
                { hpt: 20 },
                { hpt: 10 },
                { hpt: 18 },
                ...data.map(() => ({ hpt: 15 }))
            ];
        } catch (e) {
            // Se o build não suportar estilos, seguimos sem quebrar
            console.warn('Estilos do Excel não suportados neste build do XLSX:', e);
        }

        XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos');
        return wb;
    }

    exportAppointmentsToExcel() {
        const filterDate = document.getElementById('filterDate')?.value;
        
        if (!filterDate) {
            this.showToast('Selecione uma data primeiro para exportar os agendamentos', 'warning');
            return;
        }

        if (!this.appointments || this.appointments.length === 0) {
            this.showToast('Não há agendamentos para exportar nesta data', 'warning');
            return;
        }

        if (typeof XLSX === 'undefined') {
            this.exportAppointmentsToCsv();
            return;
        }

        try {
            const wb = this.buildAppointmentsWorkbook(filterDate);
            const fileName = `agendamentos_${filterDate.replace(/-/g, '_')}.xlsx`;
            XLSX.writeFile(wb, fileName);
            this.showToast('Planilha Excel exportada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao gerar Excel:', error);
            this.exportAppointmentsToCsv();
        }
    }

    exportAppointmentsToCsv() {
        const filterDate = document.getElementById('filterDate')?.value;
        const dateFormatted = new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR');
        const headers = ['Nome do Cliente', 'Telefone', 'Serviço', 'Data', 'Hora', 'Protocolo'];
        
        const data = this.appointments.map(apt => [
            String(apt.customer_name || ''),
            String(apt.customer_phone || ''),
            String(apt.service_type || ''),
            apt.appointment_date ? new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR') : '',
            this.formatTime(apt.appointment_time) || '',
            this.formatProtocolForDisplay(apt.protocol || '')
        ]);

        const escapeCsvValue = (value) => {
            if (value === null || value === undefined) return '';
            value = String(value);
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const csvLines = [
            'Agendamentos do Dia',
            `Data: ${dateFormatted}`,
            '',
            headers.join(','),
            ...data.map(row => row.map(escapeCsvValue).join(','))
        ];

        const csvContent = csvLines.join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `agendamentos_${filterDate.replace(/-/g, '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast('Planilha CSV exportada com sucesso!', 'success');
    }

    exportAppointmentsToPdf() {
        const filterDate = document.getElementById('filterDate')?.value;
        
        if (!filterDate) {
            this.showToast('Selecione uma data primeiro para exportar os agendamentos', 'warning');
            return;
        }

        if (!this.appointments || this.appointments.length === 0) {
            this.showToast('Não há agendamentos para exportar nesta data', 'warning');
            return;
        }

        try {
            if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
                console.error('jsPDF não carregado corretamente:', window.jspdf);
                this.showToast('Biblioteca de PDF não carregada. Recarregue a página.', 'error');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');

            // Verificar se o plugin AutoTable está disponível na instância
            if (typeof doc.autoTable !== 'function') {
                console.error('Plugin jsPDF-AutoTable não carregado. doc.autoTable é', typeof doc.autoTable);
                this.showToast('Biblioteca de tabela para PDF não carregada. Recarregue a página.', 'error');
                return;
            }

            const pageWidth = doc.internal.pageSize.getWidth();
            const dateFormatted = new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR');

            // Título
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 0);
            doc.text('Agendamentos do Dia', pageWidth / 2, 18, { align: 'center' });

            // Data
            doc.setFontSize(12);
            doc.text(`Data: ${dateFormatted}`, pageWidth / 2, 26, { align: 'center' });

            // Cabeçalhos da tabela (inclui serviço e protocolo por último)
            const head = [['Nome do Cliente', 'Telefone', 'Serviço', 'Data', 'Hora', 'Protocolo']];

            // Corpo da tabela (todos os agendamentos carregados para o dia)
            const body = this.appointments.map(apt => {
                const customerName = String(apt.customer_name || '').trim();
                const customerPhone = String(apt.customer_phone || '').trim();
                const service = String(apt.service_type || '').trim();
                const dateCell = apt.appointment_date
                    ? new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR')
                    : '';
                const time = this.formatTime(apt.appointment_time) || '';
                const protocol = this.formatProtocolForDisplay(apt.protocol || '').trim();

                return [customerName, customerPhone, service, dateCell, time, protocol];
            });

            // Tabela com AutoTable
            doc.autoTable({
                startY: 32,
                head: head,
                body: body,
                theme: 'grid',
                styles: {
                    fontSize: 10,
                    textColor: [0, 0, 0],
                    halign: 'left',
                    valign: 'middle',
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [0, 145, 234], // azul
                    textColor: [255, 255, 255], // branco
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 252]
                },
                margin: { top: 32, left: 15, right: 15 },
                didDrawPage: (data) => {
                    // Rodapé com paginação
                    const str = `Página ${doc.internal.getNumberOfPages()}`;
                    doc.setFontSize(9);
                    doc.setTextColor(100);
                    doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
                }
            });

            const fileName = `agendamentos_${filterDate.replace(/-/g, '_')}.pdf`;
            doc.save(fileName);
            this.showToast('PDF exportado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao gerar PDF com jsPDF/AutoTable:', error);
            this.showToast('Erro ao gerar PDF. Verifique o console para mais detalhes.', 'error');
        }
    }

    async saveEditAppointment() {
        const form = document.getElementById('editAppointmentForm');
        if (!form) {
            this.showToast('Erro: Formulário de edição não encontrado', 'error');
            return;
        }

        // Obter ID do agendamento (pode estar no dataset do form ou no selectedAppointment)
        let appointmentId = form.dataset.appointmentId;
        if (!appointmentId && this.selectedAppointment) {
            appointmentId = this.selectedAppointment.id;
        }

        if (!appointmentId) {
            this.showToast('Erro: ID do agendamento não encontrado', 'error');
            return;
        }

        // Coletar todos os campos do formulário
        const formData = new FormData(form);
        const updateData = {
            customer_name: formData.get('customer_name') || document.getElementById('editCustomerName').value,
            customer_phone: formData.get('customer_phone') || document.getElementById('editCustomerPhone').value || null,
            customer_email: formData.get('customer_email') || document.getElementById('editCustomerEmail').value || null,
            customer_cpf: formData.get('customer_cpf') || document.getElementById('editCustomerCpf').value || null,
            service_type: this.getEditSelectedServicesLabel(),
            appointment_date: formData.get('appointment_date') || document.getElementById('editAppointmentDate').value,
            appointment_time: formData.get('appointment_time') || document.getElementById('editAppointmentTime').value,
            notes: formData.get('notes') || document.getElementById('editNotes').value || null,
            duration_minutes: this.getEditSelectedDuration()
        };

        const editEmployeeSelect = document.getElementById('editEmployeeSelect');
        if (editEmployeeSelect && editEmployeeSelect.value) {
            updateData.employee_id = editEmployeeSelect.value;
        } else {
            updateData.employee_id = null;
        }

        // Coletar campos extras se existirem
        const extraFields = {};
        formData.forEach((value, key) => {
            if (key.startsWith('extra_') && value && value.trim()) {
                const fieldName = key.replace('extra_', '');
                extraFields[fieldName] = value.trim();
            }
        });
        
        if (Object.keys(extraFields).length > 0) {
            updateData.extra_fields = JSON.stringify(extraFields);
        }

        console.log('📝 Salvando edição do agendamento:', { appointmentId, updateData });

        try {
            const response = await API.updateAppointment(appointmentId, updateData);
            
            if (response.success) {
                this.showToast('Agendamento atualizado com sucesso!', 'success');
                this.closeEditModal();
                // Atualizar lista em tempo real
                await this.loadAppointments();
            } else {
                const errorMsg = response.error || response.message || 'Erro ao atualizar agendamento';
                this.showToast(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar agendamento:', error);
            const errorMsg = error.message || 'Erro ao atualizar agendamento';
            this.showToast(errorMsg, 'error');
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

        // Usar a função openEditAppointmentModal que já preenche todos os campos
        this.openEditAppointmentModal(appointment);
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
     * Atualiza o título da página com o nome da empresa.
     * Se companyName for vazio, não sobrescreve com "Sistema de Agendamentos" para evitar
     * alternância no F5 quando uma resposta async chega sem company_name.
     */
    updateCompanyTitle(companyName) {
        const headerTitle = document.querySelector('.header-title span');
        const name = (companyName && String(companyName).trim()) || this.getStoredCompanyName();
        if (name) {
            document.title = `${name} - Cloudd Agenda`;
            if (headerTitle) headerTitle.textContent = name;
        }
        // Se não tiver nome, não alterar: evita sobrescrever "Barbearia" com "Sistema de Agendamentos"
    }

    getStoredCompanyName() {
        try {
            const v2 = localStorage.getItem('moderator_settings_v2');
            if (v2) {
                const p = JSON.parse(v2);
                if (p && p.company_name) return String(p.company_name).trim();
            }
            const legacy = localStorage.getItem('moderator_settings');
            if (legacy) {
                const p = JSON.parse(legacy);
                if (p && (p.company_name || p.companyName)) return String(p.company_name || p.companyName).trim();
            }
        } catch (e) { /* ignore */ }
        return '';
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

        // Remover campos existentes (exceto serviço, profissional, nome/telefone fixos, data, horário e botões)
        const existingFields = form.querySelectorAll('.form-group');
        existingFields.forEach(field => {
            const input = field.querySelector('input, select');
            if (!input) return;

            const nameOrId = input.name || input.id || '';
            const isFixed =
                nameOrId === 'customer_name' ||
                nameOrId === 'customer_phone' ||
                nameOrId === 'service_type' ||
                nameOrId === 'serviceType' ||
                nameOrId === 'appointment_date' ||
                nameOrId === 'appointment_time' ||
                nameOrId === 'employee_id' ||
                nameOrId === 'employeeSelect';

            if (!isFixed) {
                field.remove();
            }
        });

        // Adicionar campos visíveis
        camposVisiveis.forEach(campo => {
            // Para nome/telefone usamos os campos estáticos já presentes no HTML
            if (campo === 'nome' || campo === 'telefone') {
                return;
            }
            const professionalField = form.querySelector('#employeeSelect')?.closest('.form-group');
            const serviceField = form.querySelector('#serviceType')?.closest('.form-group');
            const anchor = professionalField || serviceField;
            if (!fieldMap[campo] || !anchor) return;
            const fieldData = fieldMap[campo];
            const fieldHtml = `
                <div class="form-group">
                    <label>${fieldData.label}</label>
                    <input type="${fieldData.type}" name="${fieldData.id}" id="${fieldData.id}" 
                           placeholder="${fieldData.label.replace('*', '')}" 
                           ${fieldData.required ? 'required' : ''}>
                </div>
            `;
            // Inserir logo APÓS o campo de profissional para não alterar sua posição
            if (professionalField) {
                professionalField.insertAdjacentHTML('afterend', fieldHtml);
            } else {
                anchor.insertAdjacentHTML('beforebegin', fieldHtml);
            }
        });

        // Adicionar campos extras
        camposExtras.forEach((campoExtra, index) => {
            const professionalField = form.querySelector('#employeeSelect')?.closest('.form-group');
            const serviceField = form.querySelector('#serviceType')?.closest('.form-group');
            const anchor = professionalField || serviceField;
            if (!anchor) return;
            const fieldHtml = `
                <div class="form-group">
                    <label>${campoExtra}</label>
                    <input type="text" name="extra_${index}" id="extra_${index}" 
                           placeholder="${campoExtra}">
                </div>
            `;
            if (professionalField) {
                professionalField.insertAdjacentHTML('afterend', fieldHtml);
            } else {
                anchor.insertAdjacentHTML('beforebegin', fieldHtml);
            }
        });
    }

    /**
     * Normaliza a lista de serviços vindos das configurações.
     * Aceita tanto array de strings quanto de objetos.
     */
    normalizeServices(services) {
        if (!Array.isArray(services)) return [];

        return services
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

    /**
     * Retorna o intervalo padrão da agenda (slot_interval) das configurações locais.
     */
    getDefaultSlotInterval() {
        const settings = this.getLocalSettingsFallback() || {};
        const slot = settings.slot_interval || (settings.funcionamento?.slot) || 0;
        const parsed = parseInt(slot, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
    }

    /**
     * Obtém os serviços selecionados no formulário com suas durações efetivas.
     */
    getSelectedServicesWithDuration() {
        const serviceSelect = document.getElementById('serviceType');
        if (!serviceSelect) return [];

        const defaultSlot = this.getDefaultSlotInterval();

        const selectedOptions = Array.from(serviceSelect.selectedOptions)
            .filter(opt => opt.value && opt.value !== 'Outro');

        return selectedOptions.map(opt => {
            const rawDuration = opt.dataset.durationMinutes;
            const duration = rawDuration ? parseInt(rawDuration, 10) : NaN;
            const durationMinutes = Number.isFinite(duration) && duration > 0 ? duration : defaultSlot;

            return {
                name: opt.value,
                duration_minutes: durationMinutes
            };
        });
    }

    /**
     * Calcula a duração total em minutos dos serviços selecionados.
     */
    getTotalSelectedDuration() {
        const services = this.getSelectedServicesWithDuration();
        if (services.length === 0) {
            return this.getDefaultSlotInterval();
        }
        return services.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || this.getDefaultSlotInterval();
    }

    /**
     * Retorna o texto para salvar no campo service_type
     * (ex.: "Corte" ou "Corte + Barba").
     */
    getSelectedServicesLabel() {
        const services = this.getSelectedServicesWithDuration();
        if (services.length === 0) {
            const serviceSelect = document.getElementById('serviceType');
            return serviceSelect ? (serviceSelect.value || null) : null;
        }
        return services.map(s => s.name).join(' + ');
    }

    /**
     * Obtém serviços selecionados no formulário de EDIÇÃO (editServiceType).
     */
    getEditSelectedServicesWithDuration() {
        const serviceSelect = document.getElementById('editServiceType');
        if (!serviceSelect) return [];

        const defaultSlot = this.getDefaultSlotInterval();
        const selectedOptions = Array.from(serviceSelect.selectedOptions)
            .filter(opt => opt.value && opt.value !== 'Outro');

        return selectedOptions.map(opt => {
            const rawDuration = opt.dataset.durationMinutes;
            const duration = rawDuration ? parseInt(rawDuration, 10) : NaN;
            const durationMinutes = Number.isFinite(duration) && duration > 0 ? duration : defaultSlot;
            return { name: opt.value, duration_minutes: durationMinutes };
        });
    }

    /**
     * Label e duração total para o formulário de edição.
     */
    getEditSelectedServicesLabel() {
        const services = this.getEditSelectedServicesWithDuration();
        if (services.length === 0) {
            const el = document.getElementById('editServiceType');
            return el ? (el.value || null) : null;
        }
        return services.map(s => s.name).join(' + ');
    }

    getEditSelectedDuration() {
        const services = this.getEditSelectedServicesWithDuration();
        if (services.length === 0) return this.getDefaultSlotInterval();
        return services.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || this.getDefaultSlotInterval();
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

        const normalized = this.normalizeServices(services);
        this.allServices = normalized;

        // Adicionar serviços
        normalized.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = service.duration_minutes
                ? `${service.name} (${service.duration_minutes} min)`
                : service.name;
            if (service.duration_minutes) {
                option.dataset.durationMinutes = service.duration_minutes;
            }
            serviceSelect.appendChild(option);
        });

        // Adicionar opção "Outro" se houver serviços
        if (normalized.length > 0) {
            const otherOption = document.createElement('option');
            otherOption.value = 'Outro';
            otherOption.textContent = 'Outro (especificar em observações)';
            serviceSelect.appendChild(otherOption);
        }

        console.log(`📋 Dropdown de serviços populado com ${normalized.length} opções`);
    }

    /**
     * Carrega lista de funcionários para uso na tela de agendamentos.
     */
    async loadEmployeesForAgenda() {
        try {
            if (!window.authManager || !window.authManager.currentUser) {
                return;
            }
            const response = await window.authManager.apiRequest('/api/staff');
            if (response && response.success && Array.isArray(response.data)) {
                this.employees = response.data;
            } else {
                this.employees = [];
            }
            this.populateEmployeeDropdowns();
        } catch (error) {
            console.error('Erro ao carregar funcionários para agenda:', error);
            this.employees = [];
            this.populateEmployeeDropdowns();
        }
    }

    /**
     * Preenche selects de profissionais (novo agendamento, edição e filtro).
     */
    populateEmployeeDropdowns() {
        const selects = [
            document.getElementById('employeeSelect'),
            document.getElementById('editEmployeeSelect'),
            document.getElementById('employeeFilter')
        ];

        selects.forEach((select, index) => {
            if (!select) return;
            const currentValue = select.value;

            // Preservar primeira opção
            const firstOption = select.options[0] ? select.options[0].cloneNode(true) : null;
            while (select.options.length > 0) {
                select.remove(0);
            }
            if (firstOption) {
                select.appendChild(firstOption);
            }

            this.employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id;
                const name = emp.nome || emp.name || `Funcionário ${emp.id}`;
                const ativo = emp.ativo !== false;
                opt.textContent = ativo ? name : `${name} (inativo)`;
                select.appendChild(opt);
            });

            // Restaurar valor se ainda existir
            if (currentValue) {
                Array.from(select.options).forEach(opt => {
                    if (String(opt.value) === String(currentValue)) {
                        opt.selected = true;
                    }
                });
            }
        });
    }

    getEmployeeNameById(id) {
        if (!id || !Array.isArray(this.employees)) return null;
        const emp = this.employees.find(e => String(e.id) === String(id));
        if (!emp) return null;
        const baseName = emp.nome || emp.name || null;
        if (!baseName) return null;
        return emp.ativo === false ? `${baseName} (inativo)` : baseName;
    }

    async loadEmployeeServices(employeeId) {
        if (!employeeId) return [];
        const cacheKey = String(employeeId);
        if (this.employeeServices[cacheKey]) {
            return this.employeeServices[cacheKey];
        }
        try {
            const response = await window.authManager.apiRequest(`/api/staff/${employeeId}/services`);
            let names = [];
            if (response && response.success && response.data && Array.isArray(response.data.services)) {
                names = response.data.services.map(s => String(s).trim()).filter(Boolean);
            }
            this.employeeServices[cacheKey] = names;
            return names;
        } catch (error) {
            console.error('Erro ao carregar serviços do funcionário:', error);
            this.employeeServices[cacheKey] = [];
            return [];
        }
    }

    async onEmployeeChangeForNew(employeeId) {
        const serviceSelect = document.getElementById('serviceType');
        if (!serviceSelect) return;
        serviceSelect.disabled = false;

        // Se ainda não temos allServices preenchido, construir a partir do select atual
        if (!Array.isArray(this.allServices) || this.allServices.length === 0) {
            const options = Array.from(serviceSelect.options).slice(1); // ignora "Selecione um serviço"
            this.allServices = options
                .map(opt => ({
                    name: opt.value,
                    duration_minutes: opt.dataset.durationMinutes
                        ? parseInt(opt.dataset.durationMinutes, 10)
                        : null
                }))
                .filter(s => s.name);
        }

        // Se o usuário limpar o profissional (voltar para vazio):
        if (!employeeId) {
            // Recria o select com todos os serviços
            this.populateServicesDropdown(this.allServices);
            serviceSelect.disabled = false;
            serviceSelect.value = '';
            return;
        }

        // Filtrar serviços permitidos para o profissional
        let servicesToShow = this.allServices;
        const allowedNames = await this.loadEmployeeServices(employeeId);

        if (Array.isArray(allowedNames) && allowedNames.length > 0) {
            const allowedSet = new Set(allowedNames.map(n => n.toLowerCase()));
            servicesToShow = this.allServices.filter(s => allowedSet.has(s.name.toLowerCase()));
        } else {
            servicesToShow = [];
        }

        // Limpar todas as opções menos a primeira ("Selecione um serviço")
        while (serviceSelect.options.length > 1) {
            serviceSelect.remove(1);
        }

        if (servicesToShow.length === 0) {
            // Nenhum serviço configurado para este profissional: desabilita select
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Nenhum serviço configurado para este profissional';
            placeholder.disabled = true;
            placeholder.selected = true;
            serviceSelect.appendChild(placeholder);
            serviceSelect.disabled = true;
            return;
        }

        servicesToShow.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = service.duration_minutes
                ? `${service.name} (${service.duration_minutes} min)`
                : service.name;
            if (service.duration_minutes) {
                option.dataset.durationMinutes = service.duration_minutes;
            }
            serviceSelect.appendChild(option);
        });

        // Mantém opção fixa "Outro"
        const otherOption = document.createElement('option');
        otherOption.value = 'Outro';
        otherOption.textContent = 'Outro (especificar em observações)';
        serviceSelect.appendChild(otherOption);
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new Aevum();
    window.aevum = window.app;
});
