const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Armazenamento em memória para desenvolvimento
let memoryStorage = [];

// Inicializar com dados de teste após a definição da classe
setTimeout(() => {
  if (memoryStorage.length === 0 && useMemoryStorage()) {
    // Dados de teste para o dashboard
    const testData = [
      {
        id: 'test-1',
        protocol: '20240128-ABC1',
        customer_name: 'João Silva',
        customer_email: 'joao@email.com',
        customer_phone: '(11) 99999-9999',
        appointment_date: '2024-01-28',
        appointment_time: '09:00',
        duration_minutes: 60,
        notes: 'Corte de cabelo',
        status: 'confirmed',
        created_at: new Date('2024-01-25'),
        updated_at: new Date('2024-01-25')
      },
      {
        id: 'test-2',
        protocol: '20240127-DEF2',
        customer_name: 'Maria Santos',
        customer_email: 'maria@email.com',
        customer_phone: '(11) 88888-8888',
        appointment_date: '2024-01-27',
        appointment_time: '14:00',
        duration_minutes: 60,
        notes: 'Escova',
        status: 'confirmed',
        created_at: new Date('2024-01-24'),
        updated_at: new Date('2024-01-24')
      },
      {
        id: 'test-3',
        protocol: '20240126-GHI3',
        customer_name: 'Pedro Oliveira',
        customer_email: 'pedro@email.com',
        customer_phone: '(11) 77777-7777',
        appointment_date: '2024-01-26',
        appointment_time: '10:00',
        duration_minutes: 60,
        notes: 'Corte de cabelo',
        status: 'confirmed',
        created_at: new Date('2024-01-23'),
        updated_at: new Date('2024-01-23')
      },
      {
        id: 'test-4',
        protocol: '20240125-JKL4',
        customer_name: 'Ana Costa',
        customer_email: 'ana@email.com',
        customer_phone: '(11) 66666-6666',
        appointment_date: '2024-01-25',
        appointment_time: '16:00',
        duration_minutes: 60,
        notes: 'Coloração',
        status: 'confirmed',
        created_at: new Date('2024-01-22'),
        updated_at: new Date('2024-01-22')
      },
      {
        id: 'test-5',
        protocol: '20240124-MNO5',
        customer_name: 'Carlos Lima',
        customer_email: 'carlos@email.com',
        customer_phone: '(11) 55555-5555',
        appointment_date: '2024-01-24',
        appointment_time: '11:00',
        duration_minutes: 60,
        notes: 'Corte de cabelo',
        status: 'confirmed',
        created_at: new Date('2024-01-21'),
        updated_at: new Date('2024-01-21')
      }
    ];

    testData.forEach(data => {
      memoryStorage.push(new Appointment(data));
    });

    console.log('📊 Dados de teste inicializados:', memoryStorage.length, 'agendamentos');
  }
}, 100);

// Verificar se deve usar armazenamento em memória
const useMemoryStorage = () => {
  // Verificar se há DATABASE_URL configurada
  // Se não houver, usar memória (desenvolvimento)
  // Se houver, usar banco de dados (produção)
  const hasDatabase = process.env.DATABASE_URL || !process.env.USE_MEMORY_STORAGE;
  return process.env.USE_MEMORY_STORAGE === 'true' || (!hasDatabase && !process.env.DATABASE_URL);
};

class Appointment {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.protocol = data.protocol || this.generateProtocol();
    this.user_id = data.user_id || null; // ID da empresa que criou o agendamento
    this.customer_name = data.customer_name;
    this.customer_email = data.customer_email;
    this.customer_phone = data.customer_phone;
    this.customer_cpf = data.customer_cpf || null;
    this.service_type = data.service_type || null;
    this.appointment_date = data.appointment_date;
    this.appointment_time = data.appointment_time;
    this.duration_minutes = data.duration_minutes || 60;
    this.notes = data.notes;
    this.extra_fields = data.extra_fields || null; // JSON com campos extras
    this.status = data.status || 'pending';
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.cancelled_at = data.cancelled_at;
    this.cancellation_reason = data.cancellation_reason;
  }

  // Buscar configurações da empresa (working_hours e working_days)
  // Se userId for fornecido, busca configurações específicas dessa empresa
  // Caso contrário, busca a primeira empresa disponível (compatibilidade)
  static async getCompanySettings(userId = null) {
    try {
      const { query } = require('../config/database');
      const { sequelize } = require('../config/database');
      const dialect = sequelize.getDialect();
      
      let settingsQuery;
      let params = [];
      
      if (userId) {
        // Buscar configurações específicas da empresa
        if (dialect === 'sqlite') {
          settingsQuery = `
            SELECT working_hours, working_days
            FROM moderator_settings
            WHERE user_id = ?
            LIMIT 1
          `;
          params = [userId];
        } else {
          settingsQuery = `
            SELECT working_hours, working_days
            FROM moderator_settings
            WHERE user_id = $1
            LIMIT 1
          `;
          params = [userId];
        }
      } else {
        // Buscar primeira empresa disponível (compatibilidade)
        settingsQuery = `
          SELECT working_hours, working_days
          FROM moderator_settings
          WHERE user_id IN (SELECT id FROM users WHERE role = 'empresa')
          LIMIT 1
        `;
      }
      
      const result = await query(settingsQuery, params);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        let workingHours = row.working_hours;
        let workingDays = row.working_days;
        
        // Parse JSON se necessário
        if (typeof workingHours === 'string') {
          try {
            workingHours = JSON.parse(workingHours);
          } catch (e) {
            console.warn('Erro ao parsear working_hours:', e);
          }
        }
        if (typeof workingDays === 'string') {
          try {
            workingDays = JSON.parse(workingDays);
          } catch (e) {
            console.warn('Erro ao parsear working_days:', e);
          }
        }
        
        // Validar estrutura
        if (!workingHours || typeof workingHours !== 'object' || !workingHours.start || !workingHours.end) {
          console.warn('⚠️ working_hours inválido, usando padrão');
          workingHours = { start: '09:00', end: '18:00' };
        }
        if (!workingDays || !Array.isArray(workingDays) || workingDays.length === 0) {
          console.warn('⚠️ working_days inválido, usando padrão');
          workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        }
        
        console.log('✅ Configurações da empresa carregadas:', { workingHours, workingDays, userId });
        return {
          working_hours: workingHours,
          working_days: workingDays
        };
      }
      
      // Retornar valores padrão se não encontrar
      console.warn('⚠️ Nenhuma configuração encontrada, usando padrões');
      return {
        working_hours: { start: '09:00', end: '18:00' },
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      };
    } catch (error) {
      console.warn('❌ Erro ao buscar configurações da empresa, usando padrões:', error);
      return {
        working_hours: { start: '09:00', end: '18:00' },
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      };
    }
  }

  // Validar horário de expediente
  static validateWorkingHours(appointmentDate, appointmentTime, settings) {
    const errors = [];
    
    // Verificar dia da semana
    const dateObj = new Date(appointmentDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    if (!settings.working_days.includes(dayName)) {
      errors.push(`Não atendemos aos ${this.getDayNamePT(dayName)}. Por favor, escolha outro dia.`);
      return errors;
    }
    
    // Verificar horário de funcionamento
    const [timeHours, timeMinutes] = appointmentTime.split(':').map(Number);
    const appointmentMinutes = timeHours * 60 + timeMinutes;
    
    const [startHours, startMinutes] = settings.working_hours.start.split(':').map(Number);
    const startMinutesTotal = startHours * 60 + startMinutes;
    
    const [endHours, endMinutes] = settings.working_hours.end.split(':').map(Number);
    const endMinutesTotal = endHours * 60 + endMinutes;
    
    // Validar que o horário está dentro do expediente
    // O horário deve estar >= início E < fim (não pode ser igual ao fim)
    if (appointmentMinutes < startMinutesTotal || appointmentMinutes >= endMinutesTotal) {
      errors.push(`Horário fora do expediente. Atendemos das ${settings.working_hours.start} às ${settings.working_hours.end}.`);
      console.log('❌ validateWorkingHours - Horário fora do expediente:', {
        appointmentTime,
        appointmentMinutes,
        startMinutesTotal,
        endMinutesTotal,
        workingHours: settings.working_hours
      });
    }
    
    return errors;
  }

  // Helper para nome do dia em português
  static getDayNamePT(dayName) {
    const days = {
      'sunday': 'domingos',
      'monday': 'segundas-feiras',
      'tuesday': 'terças-feiras',
      'wednesday': 'quartas-feiras',
      'thursday': 'quintas-feiras',
      'friday': 'sextas-feiras',
      'saturday': 'sábados'
    };
    return days[dayName] || dayName;
  }

  // Validar dados do agendamento
  // userId opcional: ID da empresa para buscar configurações específicas
  static async validate(data, userId = null) {
    const errors = [];

    if (!data.customer_name || data.customer_name.trim().length < 2) {
      errors.push('Nome do cliente é obrigatório e deve ter pelo menos 2 caracteres');
    }

    if (!data.appointment_date) {
      errors.push('Data do agendamento é obrigatória');
    } else {
      const appointmentDate = new Date(data.appointment_date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const appointmentDateStr = appointmentDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      if (appointmentDateStr < todayStr) {
        errors.push('Data do agendamento não pode ser no passado');
      }

      // Validar que a data é um dia ativo (working_days da empresa)
      const settings = await this.getCompanySettings(userId);
      const dayOfWeek = appointmentDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      if (!settings.working_days.includes(dayName)) {
        errors.push(`Não atendemos aos ${this.getDayNamePT(dayName)}. Escolha outro dia.`);
      }
    }

    if (!data.appointment_time) {
      errors.push('Horário do agendamento é obrigatório');
    } else {
      // Validar horário de expediente - buscar configurações da empresa específica
      const settings = await this.getCompanySettings(userId);
      const workingHoursErrors = this.validateWorkingHours(
        data.appointment_date,
        data.appointment_time,
        settings
      );
      errors.push(...workingHoursErrors);
    }

    if (data.duration_minutes && (data.duration_minutes < 15 || data.duration_minutes > 480)) {
      errors.push('Duração deve estar entre 15 e 480 minutos');
    }

    if (data.customer_email && !this.isValidEmail(data.customer_email)) {
      errors.push('Email inválido');
    }

    return errors;
  }

  // Validar formato de email
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Gerar protocolo único (formato curto: AG-XXXX onde AG é prefixo e XXXX são 4-6 caracteres alfanuméricos)
  static generateProtocol() {
    // Prefixo fixo para identificação
    const prefix = 'AG';

    // Gerar 4-6 caracteres aleatórios (letras maiúsculas e números, excluindo caracteres confusos)
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Sem 0, O, I, 1
    const randomLength = Math.floor(Math.random() * 3) + 4; // 4, 5 ou 6 caracteres

    let randomStr = '';
    for (let i = 0; i < randomLength; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}-${randomStr}`;
  }

  // Verificar se protocolo já existe (para garantir unicidade)
  static async isProtocolUnique(protocol, excludeId = null) {
    try {
      if (useMemoryStorage()) {
        // Usar armazenamento em memória
        const existing = memoryStorage.find(apt =>
          apt.protocol === protocol && (!excludeId || apt.id !== excludeId)
        );
        return !existing;
      } else {
        // Usar banco de dados (SQLite ou PostgreSQL)
        // Para SQLite, simplificar a query
        let queryText;
        let params;
        
        if (excludeId) {
          queryText = 'SELECT COUNT(*) as count FROM appointments WHERE protocol = $1 AND id != $2';
          params = [protocol, excludeId];
        } else {
          queryText = 'SELECT COUNT(*) as count FROM appointments WHERE protocol = $1';
          params = [protocol];
        }
        
        try {
          const result = await query(queryText, params);
          const count = parseInt(result.rows[0]?.count || 0);
          return count === 0;
        } catch (dbError) {
          console.error('❌ Erro ao verificar protocolo único:', dbError);
          // Se a tabela não existe, retornar true (protocolo único)
          if (dbError.message && dbError.message.includes('no such table')) {
            console.warn('⚠️ Tabela appointments não existe, assumindo protocolo único');
            return true;
          }
          throw dbError;
        }
      }
    } catch (error) {
      console.error('❌ isProtocolUnique - Erro:', error);
      throw error;
    }
  }

  // Criar novo agendamento
  // userId opcional: ID da empresa para buscar configurações específicas
  static async create(data, userId = null) {
    try {
      console.log('📅 Appointment.create - Iniciando com dados:', data);
      if (userId) {
        console.log('📅 Appointment.create - Validando para empresa:', userId);
      }
      
      // Validar ANTES de qualquer coisa - se houver erro, NÃO criar
      const validationErrors = await this.validate(data, userId);
      if (validationErrors.length > 0) {
        console.log('❌ Appointment.create - Erros de validação detectados:', validationErrors);
        console.log('❌ Appointment.create - BLOQUEANDO criação do agendamento');
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }
      
      console.log('✅ Appointment.create - Validação passou, prosseguindo com criação...');

      // Normalizar data/hora para evitar conflitos falsos por formatação
      const normalizedDate = this.normalizeDate(data.appointment_date);
      const normalizedTime = this.normalizeTime(data.appointment_time);
      console.log('📅 Appointment.create - Data/hora normalizados:', { normalizedDate, normalizedTime });

      // Verificar conflito de horário (verificação tripla para evitar race conditions)
      console.log('📅 Appointment.create - Verificando conflito de horário...');
      
      // Primeira verificação (filtrar por userId para isolar por empresa)
      const conflict1 = await this.checkTimeConflict(
        normalizedDate,
        normalizedTime,
        data.duration_minutes,
        null, // excludeId
        userId // userId para filtrar apenas agendamentos da mesma empresa
      );
      if (conflict1) {
        console.log('❌ Appointment.create - Conflito de horário detectado (primeira verificação)');
        throw new Error(`Já existe um agendamento cadastrado para a data ${normalizedDate} no horário ${normalizedTime}. Por favor, escolha outro horário.`);
      }
      
      // Segunda verificação (proteção contra race condition)
      const conflict2 = await this.checkTimeConflict(
        normalizedDate,
        normalizedTime,
        data.duration_minutes,
        null, // excludeId
        userId // userId para filtrar apenas agendamentos da mesma empresa
      );
      if (conflict2) {
        console.log('❌ Appointment.create - Conflito de horário detectado (segunda verificação)');
        throw new Error(`Já existe um agendamento cadastrado para a data ${normalizedDate} no horário ${normalizedTime}. Por favor, escolha outro horário.`);
      }
      
      // Terceira verificação imediatamente antes de inserir no banco (máxima proteção)
      const conflict3 = await this.checkTimeConflict(
        normalizedDate,
        normalizedTime,
        data.duration_minutes,
        null, // excludeId
        userId // userId para filtrar apenas agendamentos da mesma empresa
      );
      if (conflict3) {
        console.log('❌ Appointment.create - Conflito de horário detectado (terceira verificação)');
        throw new Error(`Já existe um agendamento cadastrado para a data ${normalizedDate} no horário ${normalizedTime}. Por favor, escolha outro horário.`);
      }
      
      console.log('✅ Appointment.create - Sem conflitos de horário (verificação tripla)');

      // Gerar protocolo único
      console.log('📅 Appointment.create - Gerando protocolo único...');
      let protocol;
      let attempts = 0;
      do {
        protocol = Appointment.generateProtocol();
        attempts++;
        // Limitar tentativas para evitar loop infinito (muito improvável)
        if (attempts > 10) {
          throw new Error('Não foi possível gerar um protocolo único');
        }
      } while (!(await Appointment.isProtocolUnique(protocol)));
      console.log('✅ Appointment.create - Protocolo gerado:', protocol);

      const appointment = new Appointment({
        ...data,
        protocol,
        user_id: userId, // Salvar ID da empresa
        appointment_date: normalizedDate,
        appointment_time: normalizedTime
      });

      if (useMemoryStorage()) {
        // Usar armazenamento em memória
        memoryStorage.push(appointment);
        console.log('✅ Agendamento criado em memória:', appointment.id);
        return appointment;
      } else {
        // Usar banco de dados (SQLite ou PostgreSQL)
        // Verificar se a tabela existe antes de inserir
        try {
          const { sequelize } = require('../config/database');
          const dialect = sequelize.getDialect();
          if (dialect === 'sqlite') {
            const tableCheck = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'", []);
            if (!tableCheck.rows || tableCheck.rows.length === 0) {
              console.error('❌ Tabela appointments não existe! Criando agora...');
              // Tentar criar a tabela
              const createTable = `
                CREATE TABLE appointments (
                  id TEXT PRIMARY KEY,
                  protocol TEXT UNIQUE NOT NULL,
                  user_id INTEGER,
                  customer_name TEXT NOT NULL,
                  customer_email TEXT,
                  customer_phone TEXT,
                  customer_cpf TEXT,
                  service_type TEXT,
                  appointment_date TEXT NOT NULL,
                  appointment_time TEXT NOT NULL,
                  duration_minutes INTEGER DEFAULT 60,
                  notes TEXT,
                  extra_fields TEXT,
                  status TEXT DEFAULT 'pending',
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  cancelled_at TEXT,
                  cancellation_reason TEXT
                )
              `;
              await query(createTable, []);
              console.log('✅ Tabela appointments criada com sucesso!');
            }
          }
        } catch (tableError) {
          console.error('❌ Erro ao verificar/criar tabela:', tableError);
          // Se a tabela já existe, continuar
          if (!tableError.message.includes('already exists') && !tableError.message.includes('duplicate')) {
            throw new Error(`Tabela appointments não existe e não foi possível criá-la: ${tableError.message}`);
          }
        }

        const queryText = `
          INSERT INTO appointments (
            id, protocol, user_id, customer_name, customer_email, customer_phone, customer_cpf, service_type,
            appointment_date, appointment_time, duration_minutes,
            notes, extra_fields, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *
        `;

        const values = [
          appointment.id,
          appointment.protocol,
          appointment.user_id || null,
          appointment.customer_name,
          appointment.customer_email || null,
          appointment.customer_phone || null,
          appointment.customer_cpf || null,
          appointment.service_type || null,
          appointment.appointment_date,
          appointment.appointment_time,
          appointment.duration_minutes,
          appointment.notes || null,
          appointment.extra_fields || null,
          appointment.status,
          appointment.created_at,
          appointment.updated_at
        ];

        console.log('📅 Appointment.create - Executando INSERT no banco...');
        let result;
        try {
          result = await query(queryText, values);
        } catch (dbError) {
          // Se a coluna não existir, tentar criar e executar novamente
          if (dbError.message && (dbError.message.includes('does not exist') || dbError.message.includes('no such column'))) {
            console.warn('⚠️ Coluna não encontrada, tentando criar...', dbError.message);
            try {
              const { sequelize } = require('../config/database');
              const dialect = sequelize.getDialect();
              console.log('🔍 Dialect detectado:', dialect);
              
              // Verificar se é PostgreSQL ou SQLite
              const isPostgres = dialect === 'postgres' || dialect === 'postgresql';
              const isSQLite = dialect === 'sqlite';
              
              // Criar todas as colunas que podem estar faltando
              const columnsToAdd = [];
              
              // Detectar qual coluna está faltando pela mensagem de erro
              const missingColumn = dbError.message.match(/column "(\w+)" of relation/);
              const columnName = missingColumn ? missingColumn[1] : null;
              
              console.log('🔍 Coluna faltando detectada:', columnName);
              
              if (isPostgres) {
                // Para PostgreSQL, usar IF NOT EXISTS
                if (!columnName || columnName === 'user_id') {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id INTEGER');
                }
                if (!columnName || columnName === 'customer_cpf') {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_cpf VARCHAR(20)');
                }
                if (!columnName || columnName === 'service_type') {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_type VARCHAR(100)');
                }
                if (!columnName || columnName === 'extra_fields') {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS extra_fields JSONB');
                }
              } else if (isSQLite) {
                // Para SQLite, verificar se existe antes de adicionar
                const tableInfo = await query("PRAGMA table_info(appointments)", []);
                const existingColumns = tableInfo.rows.map(col => col.name);
                
                if (!existingColumns.includes('user_id')) {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN user_id INTEGER');
                }
                if (!existingColumns.includes('customer_cpf')) {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN customer_cpf TEXT');
                }
                if (!existingColumns.includes('service_type')) {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN service_type TEXT');
                }
                if (!existingColumns.includes('extra_fields')) {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN extra_fields TEXT');
                }
              } else {
                // Fallback: tentar criar todas as colunas
                console.log('⚠️ Dialect não reconhecido, tentando criar todas as colunas...');
                if (isPostgres) {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id INTEGER');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_cpf VARCHAR(20)');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_type VARCHAR(100)');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS extra_fields JSONB');
                } else {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN user_id INTEGER');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN customer_cpf TEXT');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN service_type TEXT');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN extra_fields TEXT');
                }
              }
              
              // Executar todas as alterações
              for (const alterQuery of columnsToAdd) {
                try {
                  await query(alterQuery, []);
                  console.log('✅ Coluna criada/verificada:', alterQuery);
                } catch (alterError) {
                  // Ignorar erro se coluna já existe
                  if (!alterError.message.includes('already exists') && 
                      !alterError.message.includes('duplicate column') &&
                      !alterError.message.includes('duplicate key')) {
                    console.warn('⚠️ Erro ao criar coluna (pode já existir):', alterError.message);
                  } else {
                    console.log('ℹ️ Coluna já existe, ignorando...');
                  }
                }
              }
              
              console.log('✅ Colunas criadas/verificadas, tentando inserir novamente...');
              result = await query(queryText, values);
            } catch (migrationError) {
              console.error('❌ Erro ao criar colunas:', migrationError);
              console.error('❌ Stack:', migrationError.stack);
              throw new Error(`Erro ao criar colunas necessárias: ${migrationError.message}`);
            }
          } else {
            throw dbError;
          }
        }
        
        // Para SQLite, fazer SELECT separado se necessário (RETURNING não funciona)
        const { sequelize } = require('../config/database');
        const currentDialect = sequelize.getDialect();
        if (currentDialect === 'sqlite' && (!result.rows || result.rows.length === 0)) {
          const selectQuery = 'SELECT * FROM appointments WHERE id = $1';
          const selectResult = await query(selectQuery, [appointment.id]);
          if (selectResult.rows && selectResult.rows.length > 0) {
            console.log('✅ Appointment.create - Agendamento inserido no banco (SQLite)');
            return new Appointment(selectResult.rows[0]);
          }
        }
        
        if (result.rows && result.rows.length > 0) {
          console.log('✅ Appointment.create - Agendamento inserido no banco');
          return new Appointment(result.rows[0]);
        } else {
          // Se não retornou dados, buscar novamente
          const selectQuery = 'SELECT * FROM appointments WHERE id = $1';
          const selectResult = await query(selectQuery, [appointment.id]);
          if (selectResult.rows && selectResult.rows.length > 0) {
            console.log('✅ Appointment.create - Agendamento recuperado após inserção');
            return new Appointment(selectResult.rows[0]);
          }
          throw new Error('Falha ao recuperar agendamento após inserção');
        }
      }
    } catch (error) {
      console.error('❌ Appointment.create - Erro:', error);
      console.error('❌ Appointment.create - Stack:', error.stack);
      throw error;
    }
  }

  // Buscar agendamento por ID
  // userId opcional: ID da empresa para verificar se o agendamento pertence à empresa
  static async findById(id, userId = null) {
    if (useMemoryStorage()) {
      // Usar armazenamento em memória
      const appointment = memoryStorage.find(apt => apt.id === id);
      if (!appointment) return null;
      
      // CRÍTICO: Se userId fornecido, verificar se o agendamento pertence à empresa
      if (userId && appointment.user_id !== userId) {
        return null; // Agendamento não pertence à empresa
      }
      
      return appointment;
    } else {
      // Usar PostgreSQL
      let queryText = 'SELECT * FROM appointments WHERE id = $1';
      const params = [id];
      
      // CRÍTICO: Se userId fornecido, filtrar por user_id
      if (userId) {
        queryText += ' AND user_id = $2';
        params.push(userId);
      }
      
      const result = await query(queryText, params);

      if (result.rows.length === 0) {
        return null;
      }

      return new Appointment(result.rows[0]);
    }
  }

  // Buscar agendamento por protocolo (case-insensitive)
  // userId opcional: ID da empresa para verificar se o agendamento pertence à empresa
  static async findByProtocol(protocol, userId = null) {
    if (useMemoryStorage()) {
      // Usar armazenamento em memória
      const appointment = memoryStorage.find(apt => {
        if (apt.protocol.toUpperCase() !== protocol.toUpperCase()) return false;
        // CRÍTICO: Se userId fornecido, verificar se o agendamento pertence à empresa
        if (userId && apt.user_id !== userId) return false;
        return true;
      });
      return appointment || null;
    } else {
      // Usar PostgreSQL - busca case-insensitive
      let queryText = 'SELECT * FROM appointments WHERE UPPER(protocol) = UPPER($1)';
      const params = [protocol];
      
      // CRÍTICO: Se userId fornecido, filtrar por user_id
      if (userId) {
        queryText += ' AND user_id = $2';
        params.push(userId);
      }
      
      const result = await query(queryText, params);

      if (result.rows.length === 0) {
        return null;
      }

      return new Appointment(result.rows[0]);
    }
  }

  // Buscar agendamentos com filtros
  // userId obrigatório para isolamento multi-tenant (null apenas para admin_master)
  static async find(filters = {}, userId = null) {
    if (useMemoryStorage()) {
      // Usar armazenamento em memória
      let filteredAppointments = [...memoryStorage];

      // CRÍTICO: Filtrar por user_id primeiro (isolamento de dados por empresa)
      // Se userId for null, retornar array vazio (admin_master deve passar userId explícito ou null intencionalmente)
      // Em produção, userId nunca deve ser null para usuários normais
      if (userId !== null) {
        filteredAppointments = filteredAppointments.filter(apt => apt.user_id === userId);
      } else {
        // userId null significa "ver todos" - apenas para admin_master
        // Manter todos os agendamentos (comportamento para admin_master)
        console.warn('⚠️ Appointment.find chamado com userId=null - retornando todos os agendamentos (apenas para admin_master)');
      }

      if (filters.customer_name) {
        const searchTerm = filters.customer_name.toLowerCase();
        filteredAppointments = filteredAppointments.filter(apt =>
          apt.customer_name.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.date) {
        filteredAppointments = filteredAppointments.filter(apt =>
          apt.appointment_date === filters.date
        );
      }

      if (filters.status) {
        filteredAppointments = filteredAppointments.filter(apt =>
          apt.status === filters.status
        );
      }

      if (filters.start_date && filters.end_date) {
        filteredAppointments = filteredAppointments.filter(apt => {
          const aptDate = new Date(apt.appointment_date);
          const startDate = new Date(filters.start_date);
          const endDate = new Date(filters.end_date);
          return aptDate >= startDate && aptDate <= endDate;
        });
      }

      // Ordenar por data e horário
      filteredAppointments.sort((a, b) => {
        const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
        const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
        return dateA - dateB;
      });

      return filteredAppointments;
    } else {
      // Usar PostgreSQL
      let queryText = 'SELECT * FROM appointments WHERE 1=1';
      const values = [];
      let paramIndex = 1;

      // CRÍTICO: Filtrar por user_id primeiro (isolamento de dados por empresa)
      // Se userId for null, não adicionar filtro (admin_master vê todos)
      // Em produção, userId nunca deve ser null para usuários normais
      if (userId !== null) {
        queryText += ` AND user_id = $${paramIndex}`;
        values.push(userId);
        paramIndex++;
      } else {
        console.warn('⚠️ Appointment.find chamado com userId=null - retornando todos os agendamentos (apenas para admin_master)');
      }

      if (filters.customer_name) {
        queryText += ` AND customer_name ILIKE $${paramIndex}`;
        values.push(`%${filters.customer_name}%`);
        paramIndex++;
      }

      if (filters.date) {
        queryText += ` AND appointment_date = $${paramIndex}`;
        values.push(filters.date);
        paramIndex++;
      }

      if (filters.status) {
        queryText += ` AND status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }

      if (filters.start_date && filters.end_date) {
        queryText += ` AND appointment_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        values.push(filters.start_date, filters.end_date);
        paramIndex += 2;
      }

      queryText += ' ORDER BY appointment_date ASC, appointment_time ASC';

      const result = await query(queryText, values);
      return result.rows.map(row => new Appointment(row));
    }
  }

  // Buscar horários disponíveis para uma data
  // Usa horário de funcionamento e dias ativos da empresa (company_id)
  static async getAvailableSlots(date, duration = 60, userId = null) {
    const settings = await this.getCompanySettings(userId);

    // Validar dia da semana: só retornar slots em dias ativos
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    if (!settings.working_days.includes(dayName)) {
      return [];
    }

    let bookedSlots;

    if (useMemoryStorage()) {
      bookedSlots = memoryStorage
        .filter(apt => {
          if (apt.appointment_date !== date || apt.status === 'cancelled') return false;
          if (userId && apt.user_id !== userId) return false;
          return true;
        })
        .map(apt => ({
          appointment_time: apt.appointment_time,
          duration_minutes: apt.duration_minutes
        }));
    } else {
      let queryText = `
        SELECT appointment_time, duration_minutes
        FROM appointments
        WHERE appointment_date = $1 AND status != 'cancelled'
      `;
      const params = [date];
      if (userId) {
        queryText += ' AND user_id = $2';
        params.push(userId);
      }
      queryText += ' ORDER BY appointment_time ASC';
      const result = await query(queryText, params);
      bookedSlots = result.rows;
    }

    const workStart = this.timeToMinutes(settings.working_hours.start);
    const workEnd = this.timeToMinutes(settings.working_hours.end);
    const slotDuration = duration;
    const slotInterval = 30;

    const availableSlots = [];
    let currentTime = workStart;

    while (currentTime + slotDuration <= workEnd) {
      const slotStart = currentTime;
      const slotEnd = currentTime + slotDuration;

      const hasConflict = bookedSlots.some(booking => {
        const bookingStart = this.timeToMinutes(booking.appointment_time);
        const bookingEnd = bookingStart + (booking.duration_minutes || 60);
        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      if (!hasConflict) {
        availableSlots.push({
          time: this.minutesToTime(slotStart),
          duration: slotDuration
        });
      }

      currentTime += slotInterval;
    }

    return availableSlots;
  }

  // Verificar conflito de horário
  // userId opcional: ID da empresa para verificar conflitos apenas com agendamentos dessa empresa
  static async checkTimeConflict(date, time, duration = 60, excludeId = null, userId = null) {
    try {
      if (useMemoryStorage()) {
        // Usar armazenamento em memória
        const normalizedDate = this.normalizeDate(date);
        const normalizedTime = this.normalizeTime(time);

        // Filtrar agendamentos da mesma data, mesma empresa e que não estão cancelados
        const sameDateAppointments = memoryStorage.filter(apt => {
          if (apt.status === 'cancelled') return false;
          if (excludeId && apt.id === excludeId) return false;
          // CRÍTICO: Filtrar por user_id para isolar dados por empresa
          if (userId && apt.user_id !== userId) return false;
          const aptDate = this.normalizeDate(apt.appointment_date);
          return aptDate === normalizedDate;
        });

        // Verificar conflitos
        const timeMinutes = this.timeToMinutes(normalizedTime);
        const endTimeMinutes = timeMinutes + (duration || 60);

        for (const apt of sameDateAppointments) {
          const aptTimeMinutes = this.timeToMinutes(this.normalizeTime(apt.appointment_time));
          const aptEndTimeMinutes = aptTimeMinutes + (apt.duration_minutes || 60);

          // Verificar sobreposição: dois intervalos se sobrepõem se
          // início1 < fim2 E fim1 > início2
          if (timeMinutes < aptEndTimeMinutes && endTimeMinutes > aptTimeMinutes) {
            return true;
          }
        }

        return false;
      } else {
        // Usar banco de dados (SQLite ou PostgreSQL)
        // Para SQLite, simplificar a query
        const normalizedDate = this.normalizeDate(date);
        const normalizedTime = this.normalizeTime(time);
        
        // Buscar todos os agendamentos da data
        // Para PostgreSQL, precisamos especificar o tipo quando o parâmetro pode ser NULL
        // Usar apenas os parâmetros necessários na query
        let queryText;
        let params;
        
        // Construir query com filtros necessários
        let paramIndex = 1;
        queryText = `
          SELECT appointment_time, duration_minutes, id
          FROM appointments
          WHERE appointment_date = $${paramIndex}
            AND status != 'cancelled'
        `;
        params = [normalizedDate];
        paramIndex++;

        // CRÍTICO: Filtrar por user_id para isolar dados por empresa
        if (userId) {
          queryText += ` AND user_id = $${paramIndex}`;
          params.push(userId);
          paramIndex++;
        }

        if (excludeId) {
          queryText += ` AND id != $${paramIndex}`;
          params.push(excludeId);
        }
        console.log('🔍 Verificando conflitos no banco:', { date: normalizedDate, time: normalizedTime, duration, excludeId });
        
        try {
          const result = await query(queryText, params);
          
          // Verificar conflitos manualmente (compatível com SQLite)
          const timeMinutes = this.timeToMinutes(normalizedTime);
          const endTimeMinutes = timeMinutes + (duration || 60);
          
          for (const apt of result.rows) {
            const aptTime = this.normalizeTime(apt.appointment_time);
            const aptTimeMinutes = this.timeToMinutes(aptTime);
            const aptEndTimeMinutes = aptTimeMinutes + (apt.duration_minutes || 60);
            
            // Verificar sobreposição
            if (timeMinutes < aptEndTimeMinutes && endTimeMinutes > aptTimeMinutes) {
              console.log('📊 Conflito encontrado no banco');
              return true;
            }
          }
          
          console.log('✅ Sem conflitos no banco');
          return false;
        } catch (dbError) {
          console.error('❌ Erro ao verificar conflitos no banco:', dbError);
          // Se a tabela não existe, retornar false (sem conflito)
          if (dbError.message && dbError.message.includes('no such table')) {
            console.warn('⚠️ Tabela appointments não existe, assumindo sem conflitos');
            return false;
          }
          throw dbError;
        }
      }
    } catch (error) {
      console.error('❌ checkTimeConflict - Erro:', error);
      throw error;
    }
  }

  // Atualizar agendamento
  // userId opcional: ID da empresa para buscar configurações específicas (RF02)
  async update(data, userId = null) {
    // RF02 - Validar dados antes de atualizar (incluindo horário de expediente)
    const validationErrors = await Appointment.validate({ ...this, ...data }, userId);
    if (validationErrors.length > 0) {
      throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
    }

    // RF02 - Se está mudando data/hora, verificar conflitos ANTES de atualizar
    if ((data.appointment_date && data.appointment_date !== this.appointment_date) ||
        (data.appointment_time && data.appointment_time !== this.appointment_time) ||
        (data.duration_minutes && data.duration_minutes !== this.duration_minutes)) {

      const newDate = Appointment.normalizeDate(data.appointment_date || this.appointment_date);
      const newTime = Appointment.normalizeTime(data.appointment_time || this.appointment_time);
      const newDuration = data.duration_minutes || this.duration_minutes;

      console.log('🔄 Appointment.update - Verificando conflito para reagendamento:', {
        newDate,
        newTime,
        newDuration,
        excludeId: this.id
      });

      // Verificar conflito considerando apenas agendamentos da mesma empresa
      // Usar userId passado como parâmetro, ou this.user_id como fallback
      const empresaId = userId || this.user_id;
      const conflict = await Appointment.checkTimeConflict(newDate, newTime, newDuration, this.id, empresaId);
      if (conflict) {
        console.log('❌ Appointment.update - Conflito detectado no reagendamento');
        throw new Error(`Já existe um agendamento cadastrado para a data ${newDate} no horário ${newTime}. Por favor, escolha outro horário.`);
      }
      
      console.log('✅ Appointment.update - Sem conflitos, prosseguindo com atualização');
    }

    // Atualizar campos
    const nextData = { ...data };
    if (nextData.appointment_date) nextData.appointment_date = Appointment.normalizeDate(nextData.appointment_date);
    if (nextData.appointment_time) nextData.appointment_time = Appointment.normalizeTime(nextData.appointment_time);

    Object.assign(this, nextData, { updated_at: new Date() });

    if (useMemoryStorage()) {
      // Usar armazenamento em memória
      const index = memoryStorage.findIndex(apt => apt.id === this.id);
      if (index !== -1) {
        memoryStorage[index] = this;
        console.log('✅ Agendamento atualizado em memória:', this.id);
        return this;
      } else {
        throw new Error('Agendamento não encontrado');
      }
    } else {
      // Usar banco de dados (SQLite ou PostgreSQL)
      const { sequelize } = require('../config/database');
      const dialect = sequelize.getDialect();
      
      const queryText = `
        UPDATE appointments SET
          customer_name = $1, customer_email = $2, customer_phone = $3,
          customer_cpf = $4, service_type = $5,
          appointment_date = $6, appointment_time = $7, duration_minutes = $8,
          notes = $9, extra_fields = $10, status = $11, updated_at = $12
        WHERE id = $13
        RETURNING *
      `;

      const values = [
        this.customer_name || null,
        this.customer_email || null,
        this.customer_phone || null,
        this.customer_cpf || null,
        this.service_type || null,
        this.appointment_date,
        this.appointment_time,
        this.duration_minutes || 60,
        this.notes || null,
        this.extra_fields || null,
        this.status || 'pending',
        this.updated_at || new Date(),
        this.id
      ];

      try {
        console.log('📅 Appointment.update - Executando UPDATE no banco...');
        const result = await query(queryText, values);
        
        // Para SQLite, fazer SELECT separado se necessário (RETURNING não funciona)
        if (dialect === 'sqlite' && (!result.rows || result.rows.length === 0)) {
          console.log('📅 Appointment.update - Fazendo SELECT separado para SQLite...');
          const selectQuery = 'SELECT * FROM appointments WHERE id = $1';
          const selectResult = await query(selectQuery, [this.id]);
          if (selectResult.rows && selectResult.rows.length > 0) {
            console.log('✅ Appointment.update - Agendamento atualizado no banco (SQLite)');
            return new Appointment(selectResult.rows[0]);
          } else {
            throw new Error('Agendamento não encontrado após atualização');
          }
        }
        
        if (result.rows && result.rows.length > 0) {
          console.log('✅ Appointment.update - Agendamento atualizado no banco');
          return new Appointment(result.rows[0]);
        } else {
          // Se não retornou dados, buscar novamente
          const selectQuery = 'SELECT * FROM appointments WHERE id = $1';
          const selectResult = await query(selectQuery, [this.id]);
          if (selectResult.rows && selectResult.rows.length > 0) {
            console.log('✅ Appointment.update - Agendamento recuperado após atualização');
            return new Appointment(selectResult.rows[0]);
          }
          throw new Error('Falha ao recuperar agendamento após atualização');
        }
      } catch (error) {
        console.error('❌ Erro ao atualizar agendamento:', error);
        console.error('❌ Stack:', error.stack);
        console.error('❌ SQL:', queryText);
        console.error('❌ Values:', values);
        throw new Error(`Erro ao atualizar agendamento: ${error.message}`);
      }
    }
  }

  // Cancelar agendamento
  async cancel(reason = null) {
    this.status = 'cancelled';
    this.cancelled_at = new Date();
    this.cancellation_reason = reason;
    this.updated_at = new Date();

    if (useMemoryStorage()) {
      // Usar armazenamento em memória
      const index = memoryStorage.findIndex(apt => apt.id === this.id);
      if (index !== -1) {
        memoryStorage[index] = this;
        console.log('✅ Agendamento cancelado em memória:', this.id);
        return this;
      } else {
        throw new Error('Agendamento não encontrado');
      }
    } else {
      // Usar PostgreSQL
      const queryText = `
        UPDATE appointments SET
          status = $1, cancelled_at = $2, cancellation_reason = $3, updated_at = $4
        WHERE id = $5
        RETURNING *
      `;

      const values = [this.status, this.cancelled_at, this.cancellation_reason, this.updated_at, this.id];

      try {
        const result = await query(queryText, values);
        return new Appointment(result.rows[0]);
      } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        throw new Error('Erro ao cancelar agendamento');
      }
    }
  }

  // Deletar agendamento
  async delete() {
    if (useMemoryStorage()) {
      // Usar armazenamento em memória
      const index = memoryStorage.findIndex(apt => apt.id === this.id);
      if (index !== -1) {
        memoryStorage.splice(index, 1);
        console.log('✅ Agendamento deletado em memória:', this.id);
        return true;
      } else {
        throw new Error('Agendamento não encontrado');
      }
    } else {
      // Usar PostgreSQL
      const queryText = 'DELETE FROM appointments WHERE id = $1';
      await query(queryText, [this.id]);
      return true;
    }
  }

  // Converter tempo para minutos
  static timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Normalizar data em YYYY-MM-DD
  static normalizeDate(value) {
    if (!value) return value;

    // Se já está em YYYY-MM-DD, manter
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // Aceitar ISO (YYYY-MM-DDTHH:mm...) e Date
    const d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) return value;

    // Usar UTC para evitar deslocamento de fuso ao serializar
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Normalizar hora em HH:MM
  static normalizeTime(value) {
    if (!value) return value;
    if (typeof value !== 'string') return value;
    const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return value;
    const hh = String(parseInt(match[1], 10)).padStart(2, '0');
    const mm = match[2];
    return `${hh}:${mm}`;
  }

  // Converter minutos para tempo
  static minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Serializar para JSON
  toJSON() {
    return {
      id: this.id,
      protocol: this.protocol,
      user_id: this.user_id, // Incluir user_id no JSON
      customer_name: this.customer_name,
      customer_email: this.customer_email,
      customer_phone: this.customer_phone,
      customer_cpf: this.customer_cpf,
      service_type: this.service_type,
      appointment_date: this.appointment_date,
      appointment_time: this.appointment_time,
      duration_minutes: this.duration_minutes,
      notes: this.notes,
      extra_fields: this.extra_fields,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
      cancelled_at: this.cancelled_at,
      cancellation_reason: this.cancellation_reason
    };
  }
}

module.exports = Appointment;



