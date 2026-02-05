// api.js - FRONTEND (adicionar no início)
(function() {
    console.log("🔧 Iniciando configuração da API...");
    
    const BACKEND_PORT = 3000;
    const BASE_URL = `http://localhost:${BACKEND_PORT}/api`;
    
    console.log("🔧 Base URL configurada:", BASE_URL);

    window.API_CONFIG = {
        baseUrl: BASE_URL,
        endpoints: {
            auth: {
                login: '/auth/login',
                register: '/auth/register'
            },
            users: {
                list: '/users',
                get: '/users/:id'
            },
            appointments: {
                list: '/appointments',
                create: '/appointments'
            }
        }
    };

    // DEBUG: Mostrar todos os endpoints
    console.log("🔧 Endpoints configurados:", window.API_CONFIG.endpoints);
    console.log("🔧 Login endpoint:", window.API_CONFIG.endpoints.auth.login);

    window.getEndpointUrl = function(endpointPath, params = {}) {
        console.log("🔧 getEndpointUrl chamado com:", endpointPath);
        
        // Verifica se o endpoint já contém /api
        if (endpointPath.startsWith('/api/')) {
            console.warn("⚠️  AVISO: endpointPath já contém /api:", endpointPath);
            console.warn("⚠️  Corrigindo automaticamente...");
            endpointPath = endpointPath.substring(4); // Remove "/api"
        }
        
        let url = `${window.API_CONFIG.baseUrl}${endpointPath}`;
        
        Object.keys(params).forEach(key => {
            url = url.replace(`:${key}`, params[key]);
        });
        
        console.log("🔧 URL final montada:", url);
        return url;
    };
    
    // Função de LOG para todas as requisições
    window.apiRequest = function(method, endpoint, data = null) {
        const url = getEndpointUrl(endpoint);
        console.log(`🌐 [apiRequest] ${method} ${url}`);
        
        return fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : null
        });
    };
    
    // Objeto API com métodos para interagir com o backend
    window.API = {
        // Obter token de autenticação
        getToken: function() {
            return localStorage.getItem('token') || localStorage.getItem('authToken');
        },

        // Adicionar token aos headers
        getHeaders: function() {
            const headers = {
                'Content-Type': 'application/json'
            };
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            return headers;
        },

        // Testar conexão com a API
        testConnection: async function() {
            try {
                const response = await fetch(`${BASE_URL}/health`, {
                    method: 'GET',
                    headers: this.getHeaders()
                });
                const data = await response.json();
                return { success: response.ok, data };
            } catch (error) {
                console.error('Erro ao testar conexão:', error);
                return { success: false, error: error.message };
            }
        },

        // Obter lista de agendamentos
        getAppointments: async function(filters = {}) {
            try {
                let url = `${BASE_URL}/appointments`;
                const params = new URLSearchParams();
                
                if (filters.date) {
                    params.append('date', filters.date);
                }
                if (filters.status) {
                    params.append('status', filters.status);
                }
                
                const queryString = params.toString();
                if (queryString) {
                    url += `?${queryString}`;
                }

                const response = await fetch(url, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                const data = await response.json();
                // O backend retorna { success: true, data: [...] }
                return { 
                    success: data.success !== false && response.ok, 
                    data: data.data || data.appointments || data || [],
                    message: data.message,
                    error: data.error
                };
            } catch (error) {
                console.error('Erro ao obter agendamentos:', error);
                return { success: false, error: error.message, data: [] };
            }
        },

        // Criar novo agendamento
        createAppointment: async function(appointmentData) {
            try {
                const response = await fetch(`${BASE_URL}/appointments`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(appointmentData)
                });

                const data = await response.json();
                // O backend retorna { success: true/false, data: ..., message: ... }
                // Se o status não for 2xx, considerar como erro mesmo se success for true
                const isSuccess = data.success === true && response.ok && response.status >= 200 && response.status < 300;
                
                return { 
                    success: isSuccess,
                    data: data.data || data,
                    message: data.message || data.error,
                    error: data.error || (!isSuccess ? (data.message || 'Erro ao criar agendamento') : null)
                };
            } catch (error) {
                console.error('Erro ao criar agendamento:', error);
                return { success: false, error: error.message };
            }
        },

        // Atualizar agendamento
        updateAppointment: async function(id, appointmentData) {
            try {
                const response = await fetch(`${BASE_URL}/appointments/${id}`, {
                    method: 'PUT',
                    headers: this.getHeaders(),
                    body: JSON.stringify(appointmentData)
                });

                const data = await response.json();
                return { success: response.ok, data };
            } catch (error) {
                console.error('Erro ao atualizar agendamento:', error);
                return { success: false, error: error.message };
            }
        },

        // Cancelar agendamento
        cancelAppointment: async function(id, reason = null) {
            try {
                const response = await fetch(`${BASE_URL}/appointments/${id}/cancel`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({ reason })
                });

                const data = await response.json();
                return { success: response.ok, data };
            } catch (error) {
                console.error('Erro ao cancelar agendamento:', error);
                return { success: false, error: error.message };
            }
        },

        // Deletar agendamento
        deleteAppointment: async function(id) {
            try {
                const response = await fetch(`${BASE_URL}/appointments/${id}`, {
                    method: 'DELETE',
                    headers: this.getHeaders()
                });

                const data = await response.json();
                return { success: response.ok, data };
            } catch (error) {
                console.error('Erro ao deletar agendamento:', error);
                return { success: false, error: error.message };
            }
        },

        // Obter horários disponíveis
        getAvailableSlots: async function(date) {
            try {
                const response = await fetch(`${BASE_URL}/slots/${date}`, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                const data = await response.json();
                return { success: response.ok, data: data.data || data.slots || data || [] };
            } catch (error) {
                console.error('Erro ao obter horários disponíveis:', error);
                return { success: false, error: error.message, data: [] };
            }
        }
    };
    
    console.log("✅ API_CONFIG carregado com sucesso em:", window.API_CONFIG.baseUrl);
    console.log("✅ Objeto API criado com sucesso");
})();