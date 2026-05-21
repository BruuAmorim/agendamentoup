const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Plan = sequelize.define('Plan', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    features: { type: DataTypes.JSON, defaultValue: {} },
    limits: {
      type: DataTypes.JSON,
      defaultValue: {
        max_appointments_per_month: 100,
        max_staff: 5,
        max_units: 1,
        api_access: false,
        white_label: false,
      },
    },
    price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    billing_cycle: { type: DataTypes.STRING(20), defaultValue: 'monthly' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Plan;
};
