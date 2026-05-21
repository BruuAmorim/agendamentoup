const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'user',
      validate: {
        isIn: [['admin_master', 'moderator', 'user']]
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    parent_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    api_key_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    api_key_prefix: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },
    api_key_created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    api_key_last_regenerated: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
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
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        try {
          if (user.password && typeof user.password === 'string' && !user.password.startsWith('$2')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        } catch (error) {
          console.error('Erro ao hashear senha (beforeCreate):', error);
          throw error;
        }
      },
      beforeUpdate: async (user) => {
        try {
          if (user.changed('password') && user.password && typeof user.password === 'string' && !user.password.startsWith('$2')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        } catch (error) {
          console.error('Erro ao hashear senha (beforeUpdate):', error);
          throw error;
        }
      },
    },
  });

  // Método de instância para verificar senha
  User.prototype.checkPassword = async function(password) {
    if (!this.password || !password) return false;
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  };

  // Método de instância para gerar token JWT (será implementado no controller)
  User.prototype.generateToken = function() {
    let empresa_id = null;
    if (this.role === 'moderator') {
      empresa_id = this.id;
    } else if (this.role === 'user' && this.parent_user_id) {
      empresa_id = this.parent_user_id;
    }

    return jwt.sign(
      {
        id: this.id,
        email: this.email,
        role: this.role,
        name: this.name,
        empresa_id,
        parent_user_id: this.parent_user_id || null,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  };

  return User;
};
