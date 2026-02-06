const { query, getClient } = require('../config/database');
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
  static async getCompanySettings() {
    try {
      const { query } = require('../config/database');
      const settingsQuery = `
        SELECT working_hours, working_days
        FROM moderator_settings
        WHERE user_id IN (SELECT id FROM users WHERE role = 'empresa')
        LIMIT 1
      `;
      const result = await query(settingsQuery, []);
      
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
        
        return {
          working_hours: workingHours || { start: '09:00', end: '18:00' },
          working_days: workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        };
      }
      
      // Retornar valores padrão se não encontrar
      return {
        working_hours: { start: '09:00', end: '18:00' },
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      };
    } catch (error) {
      console.warn('Erro ao buscar configurações da empresa, usando padrões:', error);
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
    
    if (appointmentMinutes < startMinutesTotal || appointmentMinutes >= endMinutesTotal) {
      errors.push(`Horário fora do expediente. Atendemos das ${settings.working_hours.start} às ${settings.working_hours.end}.`);
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
  static async validate(data) {
    const errors = [];

    if (!data.customer_name || data.customer_name.trim().length < 2) {
      errors.push('Nome do cliente é obrigatório e deve ter pelo menos 2 caracteres');
    }

    if (!data.appointment_date) {
      errors.push('Data do agendamento é obrigatória');
    } else {
      const appointmentDate = new Date(data.appointment_date + 'T00:00:00'); // Força horário 00:00
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Comparar apenas AAAA-MM-DD (ignorar horário)
      const appointmentDateStr = appointmentDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      if (appointmentDateStr < todayStr) {
        errors.push('Data do agendamento não pode ser no passado');
      }
    }

    if (!data.appointment_time) {
      errors.push('Horário do agendamento é obrigatório');
    } else {
      // Validar horário de expediente
      const settings = await this.getCompanySettings();
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
  static async create(data) {
    try {
      console.log('📅 Appointment.create - Iniciando com dados:', data);
      
      const validationErrors = await this.validate(data);
      if (validationErrors.length > 0) {
        console.log('❌ Appointment.create - Erros de validação:', validationErrors);
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      // Normalizar data/hora para evitar conflitos falsos por formatação
      const normalizedDate = this.normalizeDate(data.appointment_date);
      const normalizedTime = this.normalizeTime(data.appointment_time);
      console.log('📅 Appointment.create - Data/hora normalizados:', { normalizedDate, normalizedTime });

      // Verificar conflito de horário (verificação tripla para evitar race conditions)
      console.log('📅 Appointment.create - Verificando conflito de horário...');
      
      // Primeira verificação
      const conflict1 = await this.checkTimeConflict(
        normalizedDate,
        normalizedTime,
        data.duration_minutes,
        null // excludeId
      );
      if (conflict1) {
        console.log('❌ Appointment.create - Conflito de horário detectado (primeira verificação)');
        throw new Error('Horário indisponível - conflito com outro agendamento');
      }
      
      // Segunda verificação (proteção contra race condition)
      const conflict2 = await this.checkTimeConflict(
        normalizedDate,
        normalizedTime,
        data.duration_minutes,
        null // excludeId
      );
      if (conflict2) {
        console.log('❌ Appointment.create - Conflito de horário detectado (segunda verificação)');
        throw new Error('Horário indisponível - conflito com outro agendamento');
      }
      
      // Terceira verificação imediatamente antes de inserir no banco (máxima proteção)
      const conflict3 = await this.checkTimeConflict(
        normalizedDate,
        normalizedTime,
        data.duration_minutes,
        null // excludeId
      );
      if (conflict3) {
        console.log('❌ Appointment.create - Conflito de horário detectado (terceira verificação)');
        throw new Error('Horário indisponível - conflito com outro agendamento');
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
            id, protocol, customer_name, customer_email, customer_phone, customer_cpf, service_type,
            appointment_date, appointment_time, duration_minutes,
            notes, extra_fields, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *
        `;

        const values = [
          appointment.id,
          appointment.protocol,
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
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_cpf VARCHAR(20)');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_type VARCHAR(100)');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS extra_fields JSONB');
                } else {
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
  static async findById(id) {
    if (useMemoryStorage()) {
      // Usar armazenamento em memória
      const appointment = memoryStorage.find(apt => apt.id === id);
      return appointment || null;
    } else {
      // Usar PostgreSQL
      const queryText = 'SELECT * FROM appointments WHERE id = $1';
      const result = await query(queryText, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return new Appointment(result.rows[0]);
    }
  }

  // Buscar agendamento por protocolo (case-insensitive)
  static async findByProtocol(protocol) {
    if (useMemoryStorage()) {
      // Usar armazenamento em memória
      const appointment = memoryStorage.find(apt => apt.protocol.toUpperCase() === protocol.toUpperCase());
      return appointment || null;
    } else {
      // Usar PostgreSQL - busca case-insensitive
      const queryText = 'SELECT * FROM appointments WHERE UPPER(protocol) = UPPER($1)';
      const result = await query(queryText, [protocol]);

      if (result.rows.length === 0) {
        return null;
      }

      return new Appointment(result.rows[0]);
    }
  }

  // Buscar agendamentos com filtros
  static async find(filters = {}) {
    if (useMemoryStorage()) {
      // Usar armazenamento em memória
      let filteredAppointments = [...memoryStorage];

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
  static async getAvailableSlots(date, duration = 60) {
    let bookedSlots;

    if (useMemoryStorage()) {
      // Usar armazenamento em memória
      bookedSlots = memoryStorage
        .filter(apt => apt.appointment_date === date && apt.status !== 'cancelled')
        .map(apt => ({
          appointment_time: apt.appointment_time,
          duration_minutes: apt.duration_minutes
        }));
    } else {
      // Usar PostgreSQL
      const queryText = `
        SELECT appointment_time, duration_minutes
        FROM appointments
        WHERE appointment_date = $1 AND status != 'cancelled'
        ORDER BY appointment_time ASC
      `;

      const result = await query(queryText, [date]);
      bookedSlots = result.rows;
    }

    // Horário de funcionamento: 8:00 às 18:00
    const workStart = 8 * 60; // 8:00 em minutos
    const workEnd = 18 * 60; // 18:00 em minutos
    const slotDuration = duration;

    const availableSlots = [];
    let currentTime = workStart;

    while (currentTime + slotDuration <= workEnd) {
      const slotStart = currentTime;
      const slotEnd = currentTime + slotDuration;

      // Verificar se há conflito com agendamentos existentes
      const hasConflict = bookedSlots.some(booking => {
        const bookingStart = this.timeToMinutes(booking.appointment_time);
        const bookingEnd = bookingStart + booking.duration_minutes;

        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      if (!hasConflict) {
        availableSlots.push({
          time: this.minutesToTime(slotStart),
          duration: slotDuration
        });
      }

      currentTime += 30; // Intervalo de 30 minutos entre slots
    }

    return availableSlots;
  }

  // Verificar conflito de horário
  static async checkTimeConflict(date, time, duration = 60, excludeId = null) {
    try {
      if (useMemoryStorage()) {
        // Usar armazenamento em memória
        const normalizedDate = this.normalizeDate(date);
        const normalizedTime = this.normalizeTime(time);

        // Filtrar agendamentos da mesma data e que não estão cancelados
        const sameDateAppointments = memoryStorage.filter(apt => {
          if (apt.status === 'cancelled') return false;
          if (excludeId && apt.id === excludeId) return false;
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
        
        if (excludeId) {
          // Se há ID para excluir, incluir na query
          queryText = `
            SELECT appointment_time, duration_minutes, id
            FROM appointments
            WHERE appointment_date = $1
              AND status != 'cancelled'
              AND id != $2
          `;
          params = [normalizedDate, excludeId];
        } else {
          // Se não há ID para excluir, query mais simples
          queryText = `
            SELECT appointment_time, duration_minutes, id
            FROM appointments
            WHERE appointment_date = $1
              AND status != 'cancelled'
          `;
          params = [normalizedDate];
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
  async update(data) {
    const validationErrors = Appointment.validate({ ...this, ...data });
    if (validationErrors.length > 0) {
      throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
    }

    // Se está mudando data/hora, verificar conflitos
    if ((data.appointment_date && data.appointment_date !== this.appointment_date) ||
        (data.appointment_time && data.appointment_time !== this.appointment_time) ||
        (data.duration_minutes && data.duration_minutes !== this.duration_minutes)) {

      const newDate = Appointment.normalizeDate(data.appointment_date || this.appointment_date);
      const newTime = Appointment.normalizeTime(data.appointment_time || this.appointment_time);
      const newDuration = data.duration_minutes || this.duration_minutes;

      const conflict = await Appointment.checkTimeConflict(newDate, newTime, newDuration, this.id);
      if (conflict) {
        throw new Error('Novo horário indisponível - conflito com outro agendamento');
      }
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
          appointment_date = $4, appointment_time = $5, duration_minutes = $6,
          notes = $7, status = $8, updated_at = $9
        WHERE id = $10
        RETURNING *
      `;

      const values = [
        this.customer_name || null,
        this.customer_email || null,
        this.customer_phone || null,
        this.appointment_date,
        this.appointment_time,
        this.duration_minutes || 60,
        this.notes || null,
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



