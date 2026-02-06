const { sequelize } = require('../config/database');

const UserModel = require('./User');
const Appointment = require('./Appointment');
const LogModel = require('./Log');

// User é uma função que recebe sequelize e retorna o modelo
const User = UserModel(sequelize);

// Appointment é uma classe, não precisa inicialização especial

// Log é uma função que recebe sequelize e retorna o modelo
const Log = LogModel(sequelize);

// Relacionamentos
if (User.associate) User.associate(sequelize.models);
if (Appointment && Appointment.associate) Appointment.associate(sequelize.models);

module.exports = {
  sequelize,
  User,
  Appointment,
  Log,
};
