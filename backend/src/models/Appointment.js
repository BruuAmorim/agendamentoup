const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const Funcionario = require('./Funcionario');

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
    this.employee_id = data.employee_id || null; // ID do funcionário/profissional (novo)
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
            SELECT working_hours, working_days, slot_interval
            FROM moderator_settings
            WHERE user_id = ?
            LIMIT 1
          `;
          params = [userId];
        } else {
          settingsQuery = `
            SELECT working_hours, working_days, slot_interval
            FROM moderator_settings
            WHERE user_id = $1
            LIMIT 1
          `;
          params = [userId];
        }
      } else {
        // Buscar primeira empresa disponível (compatibilidade)
        settingsQuery = `
          SELECT working_hours, working_days, slot_interval
          FROM moderator_settings
          WHERE user_id IN (SELECT id FROM users WHERE role = 'moderator')
          LIMIT 1
        `;
      }
      
      const result = await query(settingsQuery, params);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        let workingHours = row.working_hours;
        let workingDays = row.working_days;
        let slotInterval = row.slot_interval;
        
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
        if (typeof slotInterval === 'string') {
          const parsed = parseInt(slotInterval, 10);
          slotInterval = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
        if (!slotInterval || slotInterval < 5 || slotInterval > 480) {
          slotInterval = 30;
        }
        
        return {
          working_hours: workingHours,
          working_days: workingDays,
          slot_interval: slotInterval
        };
      }
      
      return {
        working_hours: { start: '09:00', end: '18:00' },
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        slot_interval: 30
      };
    } catch (error) {
      return {
        working_hours: { start: '09:00', end: '18:00' },
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        slot_interval: 30
      };
    }
  }

  /**
   * Busca configurações efetivas considerando, se houver, o horário de almoço de um funcionário específico.
   * Se o funcionário tiver lunch_start/lunch_end definidos, eles sobrescrevem o horário de almoço padrão da empresa.
   */
  static async getEffectiveSettings(userId = null, employeeId = null) {
    const settings = await this.getCompanySettings(userId);
    if (!employeeId) {
      return settings;
    }

    try {
      const funcionario = await Funcionario.findById(employeeId, userId);
      if (funcionario && (funcionario.lunch_start || funcionario.lunch_end)) {
        const workingHours = { ...(settings.working_hours || {}) };
        if (funcionario.lunch_start) {
          workingHours.lunch_start = funcionario.lunch_start;
        }
        if (funcionario.lunch_end) {
          workingHours.lunch_end = funcionario.lunch_end;
        }
        return {
          ...settings,
          working_hours: workingHours
        };
      }
    } catch (e) {
      console.warn('⚠️ Não foi possível carregar horário de almoço do funcionário:', e.message);
    }

    return settings;
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
    }

    // Respeitar intervalo de almoço, se configurado
    if (settings.working_hours.lunch_start && settings.working_hours.lunch_end) {
      const [lunchStartH, lunchStartM] = settings.working_hours.lunch_start.split(':').map(Number);
      const [lunchEndH, lunchEndM] = settings.working_hours.lunch_end.split(':').map(Number);
      const lunchStartMinutes = lunchStartH * 60 + lunchStartM;
      const lunchEndMinutes = lunchEndH * 60 + lunchEndM;

      if (appointmentMinutes >= lunchStartMinutes && appointmentMinutes < lunchEndMinutes) {
        errors.push(`Horário indisponível. Intervalo de almoço das ${settings.working_hours.lunch_start} às ${settings.working_hours.lunch_end}.`);
      }
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
  // allowPastDays: número de dias no passado permitidos (0 = apenas hoje/futuro)
  static async validate(data, userId = null, allowPastDays = 0) {
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

      const cutoff = new Date(today);
      if (allowPastDays > 0) cutoff.setDate(cutoff.getDate() - allowPastDays);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      if (appointmentDateStr < cutoffStr) {
        const msg = allowPastDays > 0
          ? `Data do agendamento não pode ser anterior a ${allowPastDays} dias`
          : 'Data do agendamento não pode ser no passado';
        errors.push(msg);
      }

      // Validar que a data é um dia ativo (working_days da empresa / funcionário)
      const settings = await this.getEffectiveSettings(userId, data.employee_id || null);
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
      // Validar horário de expediente - buscar configurações efetivas (empresa + almoço do funcionário, se houver)
      const settings = await this.getEffectiveSettings(userId, data.employee_id || null);
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

  // Normalizar protocolo vindo de fora (trim + uppercase)
  static normalizeProtocol(protocol) {
    if (!protocol) return null;
    const normalized = String(protocol).trim().toUpperCase();
    return normalized || null;
  }

  // Gerar protocolo no formato YYYYMMDD-XXXXX (data + 5 chars alfanuméricos)
  // Exclui caracteres ambíguos: 0/O, 1/I para facilitar leitura humana e por IA
  static generateProtocol() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yyyy}${mm}${dd}`;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randPart = '';
    for (let i = 0; i < 5; i++) {
      randPart += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${datePart}-${randPart}`;
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
      const validationErrors = await this.validate(data, userId);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      const normalizedDate = this.normalizeDate(data.appointment_date);
      const normalizedTime = this.normalizeTime(data.appointment_time);

      const conflict1 = await this.checkTimeConflict(
        normalizedDate,
        normalizedTime,
        data.duration_minutes,
        null, // excludeId
        userId, // userId para filtrar apenas agendamentos da mesma empresa
        data.employee_id || null // employeeId para isolar por funcionário (se enviado)
      );
      if (conflict1) {
        throw new Error(`Já existe um agendamento cadastrado para a data ${normalizedDate} no horário ${normalizedTime}. Por favor, escolha outro horário.`);
      }

      const conflict2 = await this.checkTimeConflict(
        normalizedDate, normalizedTime, data.duration_minutes, null, userId, data.employee_id || null
      );
      if (conflict2) {
        throw new Error(`Já existe um agendamento cadastrado para a data ${normalizedDate} no horário ${normalizedTime}. Por favor, escolha outro horário.`);
      }

      const conflict3 = await this.checkTimeConflict(
        normalizedDate, normalizedTime, data.duration_minutes, null, userId, data.employee_id || null
      );
      if (conflict3) {
        throw new Error(`Já existe um agendamento cadastrado para a data ${normalizedDate} no horário ${normalizedTime}. Por favor, escolha outro horário.`);
      }

      let protocol = data.protocol ? Appointment.normalizeProtocol(data.protocol) : null;
      if (!protocol) {
        let attempts = 0;
        do {
          protocol = Appointment.generateProtocol();
          if (++attempts > 10) throw new Error('Não foi possível gerar um protocolo único');
        } while (!(await Appointment.isProtocolUnique(protocol)));
      } else if (!(await Appointment.isProtocolUnique(protocol))) {
        throw new Error(`Protocolo ${protocol} já está em uso`);
      }

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
            }
          }
        } catch (tableError) {
          // Se a tabela já existe, continuar
          if (!tableError.message.includes('already exists') && !tableError.message.includes('duplicate')) {
            throw new Error(`Tabela appointments não existe e não foi possível criá-la: ${tableError.message}`);
          }
        }

        const queryText = `
          INSERT INTO appointments (
            id, protocol, user_id, employee_id, customer_name, customer_email, customer_phone, customer_cpf, service_type,
            appointment_date, appointment_time, duration_minutes,
            notes, extra_fields, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *
        `;

        const values = [
          appointment.id,
          appointment.protocol,
          appointment.user_id || null,
          appointment.employee_id || null,
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

        let result;
        try {
          result = await query(queryText, values);
        } catch (dbError) {
          // Se a coluna não existir, tentar criar e executar novamente
          if (dbError.message && (dbError.message.includes('does not exist') || dbError.message.includes('no such column'))) {
            try {
              const { sequelize } = require('../config/database');
              const dialect = sequelize.getDialect();
              const isPostgres = dialect === 'postgres' || dialect === 'postgresql';
              const isSQLite = dialect === 'sqlite';
              
              // Criar todas as colunas que podem estar faltando
              const columnsToAdd = [];
              
              const missingColumn = dbError.message.match(/column "(\w+)" of relation/);
              const columnName = missingColumn ? missingColumn[1] : null;

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
                if (!columnName || columnName === 'employee_id') {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES funcionarios(id)');
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
                if (!existingColumns.includes('employee_id')) {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN employee_id INTEGER');
                }
              } else {
                if (isPostgres) {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id INTEGER');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_cpf VARCHAR(20)');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_type VARCHAR(100)');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS extra_fields JSONB');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES funcionarios(id)');
                } else {
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN user_id INTEGER');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN customer_cpf TEXT');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN service_type TEXT');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN extra_fields TEXT');
                  columnsToAdd.push('ALTER TABLE appointments ADD COLUMN employee_id INTEGER');
                }
              }
              
              // Executar todas as alterações
              for (const alterQuery of columnsToAdd) {
                try {
                  await query(alterQuery, []);
                } catch (alterError) {
                  if (!alterError.message.includes('already exists') &&
                      !alterError.message.includes('duplicate column') &&
                      !alterError.message.includes('duplicate key')) {
                    console.warn('Erro ao criar coluna:', alterError.message);
                  }
                }
              }
              result = await query(queryText, values);
            } catch (migrationError) {
              console.error('Erro ao criar colunas faltando:', migrationError.message);
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
            return new Appointment(selectResult.rows[0]);
          }
        }

        if (result.rows && result.rows.length > 0) {
          return new Appointment(result.rows[0]);
        } else {
          const selectQuery = 'SELECT * FROM appointments WHERE id = $1';
          const selectResult = await query(selectQuery, [appointment.id]);
          if (selectResult.rows && selectResult.rows.length > 0) {
            return new Appointment(selectResult.rows[0]);
          }
          throw new Error('Falha ao recuperar agendamento após inserção');
        }
      }
    } catch (error) {
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
  // employeeId opcional: filtra agenda por funcionário específico
  static async getAvailableSlots(date, duration = 60, userId = null, employeeId = null) {
    const settings = await this.getEffectiveSettings(userId, employeeId);

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
          if (employeeId && apt.employee_id && String(apt.employee_id) !== String(employeeId)) return false;
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
      let paramIndex = 2;
      if (userId) {
        queryText += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }
      if (employeeId) {
        queryText += ` AND (employee_id = $${paramIndex} OR employee_id IS NULL)`;
        params.push(employeeId);
      }
      queryText += ' ORDER BY appointment_time ASC';
      const result = await query(queryText, params);
      bookedSlots = result.rows;
    }

    const workStart = this.timeToMinutes(settings.working_hours.start);
    const workEnd = this.timeToMinutes(settings.working_hours.end);

    let lunchStart = null;
    let lunchEnd = null;
    if (settings.working_hours.lunch_start && settings.working_hours.lunch_end) {
      lunchStart = this.timeToMinutes(settings.working_hours.lunch_start);
      lunchEnd = this.timeToMinutes(settings.working_hours.lunch_end);
    }

    // Duração efetiva do agendamento:
    // - Se o frontend informar uma duração específica (serviço ou soma de serviços), usar essa;
    // - Caso contrário, usar o intervalo padrão configurado na agenda (slot_interval).
    const defaultSlot = settings.slot_interval || 30;
    const slotDuration = duration && duration > 0 ? duration : defaultSlot;
    const slotInterval = duration && duration > 0 ? duration : defaultSlot;

    const availableSlots = [];
    let currentTime = workStart;

    while (currentTime + slotDuration <= workEnd) {
      const slotStart = currentTime;
      const slotEnd = currentTime + slotDuration;

      // Bloquear intervalo de almoço, se configurado
      if (lunchStart !== null && lunchEnd !== null) {
        if (slotStart < lunchEnd && slotEnd > lunchStart) {
          currentTime += slotInterval;
          continue;
        }
      }

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
  // employeeId opcional: verifica conflitos apenas dentro da agenda desse funcionário
  static async checkTimeConflict(date, time, duration = 60, excludeId = null, userId = null, employeeId = null) {
    try {
      if (useMemoryStorage()) {
        // Usar armazenamento em memória
        const normalizedDate = this.normalizeDate(date);
        const normalizedTime = this.normalizeTime(time);

        // Filtrar agendamentos da mesma data, mesma empresa/funcionário e que não estão cancelados
        const sameDateAppointments = memoryStorage.filter(apt => {
          if (apt.status === 'cancelled') return false;
          if (excludeId && apt.id === excludeId) return false;
          // CRÍTICO: Filtrar por user_id para isolar dados por empresa
          if (userId && apt.user_id !== userId) return false;
          if (employeeId && apt.employee_id && String(apt.employee_id) !== String(employeeId)) return false;
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
          SELECT appointment_time, duration_minutes, id, employee_id
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

        if (employeeId) {
          queryText += ` AND (employee_id = $${paramIndex} OR employee_id IS NULL)`;
          params.push(employeeId);
          paramIndex++;
        }

        if (excludeId) {
          queryText += ` AND id != $${paramIndex}`;
          params.push(excludeId);
        }
        try {
          const result = await query(queryText, params);

          const timeMinutes = this.timeToMinutes(normalizedTime);
          const endTimeMinutes = timeMinutes + (duration || 60);

          for (const apt of result.rows) {
            const aptTime = this.normalizeTime(apt.appointment_time);
            const aptTimeMinutes = this.timeToMinutes(aptTime);
            const aptEndTimeMinutes = aptTimeMinutes + (apt.duration_minutes || 60);
            if (timeMinutes < aptEndTimeMinutes && endTimeMinutes > aptTimeMinutes) {
              return true;
            }
          }
          return false;
        } catch (dbError) {
          if (dbError.message && dbError.message.includes('no such table')) return false;
          throw dbError;
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // Atualizar agendamento
  // userId opcional: ID da empresa para buscar configurações específicas (RF02)
  async update(data, userId = null) {
    // Se só está mudando status/notes/employee, pula validação de data/horário
    const metaOnlyFields = new Set(['status', 'notes', 'employee_id', 'updated_at']);
    const isMetaOnly = Object.keys(data).every(k => metaOnlyFields.has(k));
    if (!isMetaOnly) {
      // Updates allow adjusting appointments up to 7 days in the past
      const validationErrors = await Appointment.validate({ ...this, ...data }, userId, 7);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }
    }

      // RF02 - Se está mudando data/hora, verificar conflitos ANTES de atualizar
    if ((data.appointment_date && data.appointment_date !== this.appointment_date) ||
        (data.appointment_time && data.appointment_time !== this.appointment_time) ||
        (data.duration_minutes && data.duration_minutes !== this.duration_minutes)) {

      const newDate = Appointment.normalizeDate(data.appointment_date || this.appointment_date);
      const newTime = Appointment.normalizeTime(data.appointment_time || this.appointment_time);
      const newDuration = data.duration_minutes || this.duration_minutes;

      // Manter o mesmo funcionário, ou usar o que vier no update (se houver)
      const newEmployeeId = data.employee_id !== undefined ? data.employee_id : this.employee_id;

      const empresaId = userId || this.user_id;
      const conflict = await Appointment.checkTimeConflict(newDate, newTime, newDuration, this.id, empresaId, newEmployeeId);
      if (conflict) {
        throw new Error(`Já existe um agendamento cadastrado para a data ${newDate} no horário ${newTime}. Por favor, escolha outro horário.`);
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
        return this;
      } else {
        throw new Error('Agendamento não encontrado');
      }
    } else {
      const { sequelize } = require('../config/database');
      const dialect = sequelize.getDialect();

      const queryText = `
        UPDATE appointments SET
          customer_name = $1, customer_email = $2, customer_phone = $3,
          customer_cpf = $4, service_type = $5,
          appointment_date = $6, appointment_time = $7, duration_minutes = $8,
          notes = $9, extra_fields = $10, status = $11, updated_at = $12,
          employee_id = $13
        WHERE id = $14
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
        this.employee_id || null,
        this.id
      ];

      try {
        const result = await query(queryText, values);

        if (dialect === 'sqlite' && (!result.rows || result.rows.length === 0)) {
          const selectResult = await query('SELECT * FROM appointments WHERE id = $1', [this.id]);
          if (selectResult.rows && selectResult.rows.length > 0) return new Appointment(selectResult.rows[0]);
          throw new Error('Agendamento não encontrado após atualização');
        }

        if (result.rows && result.rows.length > 0) return new Appointment(result.rows[0]);

        const selectResult = await query('SELECT * FROM appointments WHERE id = $1', [this.id]);
        if (selectResult.rows && selectResult.rows.length > 0) return new Appointment(selectResult.rows[0]);
        throw new Error('Falha ao recuperar agendamento após atualização');
      } catch (error) {
        console.error('Erro ao atualizar agendamento:', error.message);
        throw new Error(`Erro ao atualizar agendamento: ${error.message}`);
      }
    }
  }

  // Atualizar apenas o status (sem nenhuma validação de data/horário)
  static async patchStatus(id, newStatus, empresaId) {
    console.log('[patchStatus] id=%s newStatus=%s empresaId=%s', id, newStatus, empresaId);
    if (useMemoryStorage()) {
      const appt = memoryStorage.find(a => String(a.id) === String(id) && (!empresaId || a.user_id === empresaId));
      if (!appt) throw new Error('Agendamento não encontrado');
      appt.status = newStatus;
      appt.updated_at = new Date();
      return appt;
    }
    const now = new Date().toISOString();
    const sql = empresaId
      ? 'UPDATE appointments SET status = $1, updated_at = $2 WHERE id = $3 AND user_id = $4'
      : 'UPDATE appointments SET status = $1, updated_at = $2 WHERE id = $3';
    const params = empresaId ? [newStatus, now, id, empresaId] : [newStatus, now, id];
    await query(sql, params);
    const row = await query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (row.rows && row.rows.length > 0) return new Appointment(row.rows[0]);
    throw new Error('Agendamento não encontrado');
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
      employee_id: this.employee_id,
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



