const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

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
          console.log('🔐 [User.beforeCreate] Preparando hash de senha...');
          console.log('🔐 [User.beforeCreate] Dados do usuário:', { 
            name: user.name, 
            email: user.email, 
            role: user.role,
            hasPassword: !!user.password,
            passwordType: typeof user.password
          });
          
          if (user.password && typeof user.password === 'string') {
            // Evitar double-hash (bcrypt geralmente começa com $2a/$2b/$2y)
            if (!user.password.startsWith('$2')) {
              const salt = await bcrypt.genSalt(12);
              user.password = await bcrypt.hash(user.password, salt);
              console.log('✅ [User.beforeCreate] Senha hasheada com sucesso');
            } else {
              console.log('ℹ️ [User.beforeCreate] Senha já parece hasheada, mantendo');
            }
          } else {
            console.warn('⚠️ [User.beforeCreate] Senha não fornecida ou tipo inválido');
          }
        } catch (error) {
          console.error('❌ [User.beforeCreate] Erro ao hashear senha:', error);
          console.error('❌ [User.beforeCreate] Stack:', error.stack);
          throw error;
        }
      },
      beforeUpdate: async (user) => {
        try {
          if (user.changed('password')) {
            console.log('🔐 [User.beforeUpdate] Senha alterada, preparando hash...');
            if (user.password && typeof user.password === 'string') {
              if (!user.password.startsWith('$2')) {
                const salt = await bcrypt.genSalt(12);
                user.password = await bcrypt.hash(user.password, salt);
                console.log('✅ [User.beforeUpdate] Nova senha hasheada com sucesso');
              } else {
                console.log('ℹ️ [User.beforeUpdate] Nova senha já parece hasheada, mantendo');
              }
            }
          }
        } catch (error) {
          console.error('❌ [User.beforeUpdate] Erro ao hashear senha:', error);
          throw error;
        }
      },
    },
  });

  // Método de instância para verificar senha
  User.prototype.checkPassword = async function(password) {
    console.log('🔍 [User.checkPassword] Verificando senha...');
    console.log('🔍 [User.checkPassword] Password recebido:', password ? 'Presente' : 'Ausente');
    console.log('🔍 [User.checkPassword] this.password:', this.password ? 'Presente' : 'Ausente');
    console.log('🔍 [User.checkPassword] Tipo de this.password:', typeof this.password);
    
    if (!this.password) {
      console.error('❌ [User.checkPassword] this.password está undefined!');
      return false;
    }
    
    if (!password) {
      console.error('❌ [User.checkPassword] password recebido está undefined!');
      return false;
    }
    
    try {
      const isValid = await bcrypt.compare(password, this.password);
      console.log(`🔐 [User.checkPassword] Senha ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
      return isValid;
    } catch (error) {
      console.error('❌ [User.checkPassword] Erro ao verificar senha:', error);
      console.error('❌ [User.checkPassword] Detalhes do erro:', {
        message: error.message,
        passwordType: typeof password,
        thisPasswordType: typeof this.password,
        passwordLength: password ? password.length : 0,
        thisPasswordLength: this.password ? this.password.length : 0
      });
      return false;
    }
  };

  // Método de instância para gerar token JWT (será implementado no controller)
  User.prototype.generateToken = function() {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    return jwt.sign(
      {
        id: this.id,
        email: this.email,
        role: this.role,
        name: this.name
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
  };

  return User;
};
