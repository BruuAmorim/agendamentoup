const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    plan_id: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      validate: { isIn: [['active', 'past_due', 'cancelled', 'trialing']] },
    },
    starts_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    ends_at: { type: DataTypes.DATE, allowNull: true },
    billing_data: { type: DataTypes.JSON, defaultValue: {} },
  }, {
    tableName: 'subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Subscription;
};
