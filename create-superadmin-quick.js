#!/usr/bin/env node

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const path = require('path')

// Carregando variáveis do .env
require('dotenv').config({ path: path.join(__dirname, '.env') })

// Schema do usuário
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'professional'],
    required: true,
    default: 'professional'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() {
      return this.role !== 'superadmin'
    }
  },
  specialization: String,
  curseduca_id: {
    type: String,
    unique: true,
    sparse: true
  },
  active: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
})

const User = mongoose.models.User || mongoose.model('User', UserSchema)

// Função para criar super admin rapidamente
async function createSuperAdminQuick() {
  const defaultData = {
    name: 'Super Admin',
    email: 'admin@lyz.ai',
    password: 'admin123456',
    role: 'superadmin'
  }

  try {
    console.log('🚀 === CRIAÇÃO RÁPIDA DO SUPER ADMIN ===\n')

    // Conectar ao MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI não encontrada no .env')
    }

    console.log('📡 Conectando ao MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Conectado ao MongoDB:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***@'))

    // Verificar se já existe algum super admin
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' })
    if (existingSuperAdmin) {
      console.log('⚠️  Já existe um super admin no sistema!')
      console.log(`📧 Email: ${existingSuperAdmin.email}`)
      console.log(`👤 Nome: ${existingSuperAdmin.name}`)
      console.log('\n💡 Use o script create-superadmin.js para criar outro super admin')
      return
    }

    // Verificar se email já existe
    const existingUser = await User.findOne({ email: defaultData.email.toLowerCase() })
    if (existingUser) {
      console.log(`❌ Email ${defaultData.email} já está em uso`)
      console.log('💡 Use o script create-superadmin.js para usar outro email')
      return
    }

    console.log('📝 Criando super admin com dados padrão:')
    console.log(`👤 Nome: ${defaultData.name}`)
    console.log(`📧 Email: ${defaultData.email}`)
    console.log(`🔒 Senha: ${defaultData.password}`)
    console.log(`👑 Role: ${defaultData.role}`)

    // Hash da senha
    console.log('\n🔐 Gerando hash da senha...')
    const hashedPassword = await bcrypt.hash(defaultData.password, 12)

    // Criar usuário
    console.log('💾 Salvando usuário no banco...')
    const superAdmin = new User({
      name: defaultData.name,
      email: defaultData.email.toLowerCase(),
      password: hashedPassword,
      role: defaultData.role,
      active: true
    })

    await superAdmin.save()

    console.log('\n🎉 === SUPER ADMIN CRIADO COM SUCESSO! ===')
    console.log(`📧 Email: ${superAdmin.email}`)
    console.log(`👤 Nome: ${superAdmin.name}`)
    console.log(`🔒 Senha: ${defaultData.password}`)
    console.log(`🆔 ID: ${superAdmin._id}`)
    console.log(`📅 Criado em: ${superAdmin.createdAt.toLocaleString('pt-BR')}`)
    console.log('\n🔐 Agora você pode fazer login com essas credenciais!')
    console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!')

  } catch (error) {
    console.error('❌ Erro ao criar super admin:', error.message)
    if (error.code === 11000) {
      console.error('💡 Dica: Este email já está em uso no sistema')
    }
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Desconectado do MongoDB')
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  createSuperAdminQuick()
}

module.exports = { createSuperAdminQuick } 