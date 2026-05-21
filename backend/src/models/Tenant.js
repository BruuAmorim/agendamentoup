const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tenant = sequelize.define('Tenant', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    niche_id: { type: DataTypes.INTEGER, allowNull: true },
    plan_id: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      validate: { isIn: [['active', 'suspended', 'cancelled']] },
    },
    settings: { type: DataTypes.JSON, defaultValue: {} },
  }, {
    tableName: 'tenants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Tenant;
};
