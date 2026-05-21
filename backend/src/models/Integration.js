const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Integration = sequelize.define('Integration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'n8n',
      // unique removido — unicidade é (name, empresa_id), gerida via migration
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'null = configuração global; número = configuração por empresa',
    },
    webhookUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    apiKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    webhookSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'HMAC-SHA256 secret compartilhado com o n8n para validar eventos',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'integrations',
    timestamps: true,
    indexes: [
      // Unicidade composta: uma config n8n por empresa (null = global)
      {
        unique: true,
        fields: ['name', 'empresa_id'],
        name: 'integrations_name_empresa_id_unique',
      },
    ],
  });

  return Integration;
};
