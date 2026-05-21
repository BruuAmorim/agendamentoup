const { sequelize } = require('../config/database');

const UserModel = require('./User');
const Appointment = require('./Appointment');
const LogModel = require('./Log');
const PlanModel = require('./Plan');
const NicheModel = require('./Niche');
const TenantModel = require('./Tenant');
const SubscriptionModel = require('./Subscription');

const User = UserModel(sequelize);
const Log = LogModel(sequelize);
const Plan = PlanModel(sequelize);
const Niche = NicheModel(sequelize);
const Tenant = TenantModel(sequelize);
const Subscription = SubscriptionModel(sequelize);

// Relacionamentos SaaS
Tenant.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });
Tenant.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });
Tenant.belongsTo(Niche, { foreignKey: 'niche_id', as: 'niche' });
Tenant.hasMany(Subscription, { foreignKey: 'tenant_id', as: 'subscriptions' });
Subscription.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Subscription.belongsTo(Plan, { foreignKey: 'plan_id' });

if (User.associate) User.associate(sequelize.models);
if (Appointment && Appointment.associate) Appointment.associate(sequelize.models);

module.exports = {
  sequelize,
  User,
  Appointment,
  Log,
  Plan,
  Niche,
  Tenant,
  Subscription,
};
