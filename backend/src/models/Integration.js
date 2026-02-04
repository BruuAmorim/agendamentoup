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
      unique: true,
      defaultValue: 'n8n',
    },
    webhookUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    apiKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
  });

  return Integration;
};













