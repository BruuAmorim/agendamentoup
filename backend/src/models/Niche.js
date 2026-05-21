const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Niche = sequelize.define('Niche', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    config: { type: DataTypes.JSON, defaultValue: {} },
    field_templates: { type: DataTypes.JSON, defaultValue: [] },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'niches',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Niche;
};
