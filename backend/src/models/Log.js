const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Log = sequelize.define('Log', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Tipo de ação realizada (create_user, update_user, delete_user, create_appointment, update_appointment, delete_appointment, change_password, update_settings, etc.)'
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Tipo de entidade afetada (user, appointment, settings, etc.)'
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID da entidade afetada'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID do usuário que realizou a ação'
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nome do usuário que realizou a ação'
    },
    user_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Email do usuário que realizou a ação'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Descrição detalhada da ação'
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detalhes adicionais em JSON'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Endereço IP de onde a ação foi realizada'
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'User agent do navegador'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'system_logs',
    timestamps: true,
    updatedAt: false, // Logs não são atualizados, apenas criados
    indexes: [
      {
        fields: ['action']
      },
      {
        fields: ['entity_type']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return Log;
};









