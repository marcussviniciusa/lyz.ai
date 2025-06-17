#!/usr/bin/env node

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const path = require('path')
const readline = require('readline')

// Carregando variáveis do .env
require('dotenv').config({ path: path.join(__dirname, '.env') })

// Interface para entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

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

// Função para validar email
function validateEmail(email) {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
  return emailRegex.test(email)
}

// Função para fazer pergunta
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

// Função para criar super admin
async function createSuperAdmin() {
  try {
    console.log('🚀 === CRIAÇÃO DO PRIMEIRO SUPER ADMIN ===\n')

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
      
      const confirm = await askQuestion('\n❓ Deseja criar outro super admin? (s/N): ')
      if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'sim') {
        console.log('🔄 Operação cancelada.')
        return
      }
    }

    // Coletar dados do usuário
    console.log('\n📝 Dados do Super Admin:')
    
    const name = await askQuestion('👤 Nome completo: ')
    if (!name) {
      throw new Error('❌ Nome é obrigatório')
    }

    let email
    while (true) {
      email = await askQuestion('📧 Email: ')
      if (!email) {
        console.log('❌ Email é obrigatório')
        continue
      }
      if (!validateEmail(email)) {
        console.log('❌ Email inválido')
        continue
      }
      
      // Verificar se email já existe
      const existingUser = await User.findOne({ email: email.toLowerCase() })
      if (existingUser) {
        console.log('❌ Este email já está em uso')
        continue
      }
      break
    }

    let password
    while (true) {
      password = await askQuestion('🔒 Senha (mínimo 8 caracteres): ')
      if (!password) {
        console.log('❌ Senha é obrigatória')
        continue
      }
      if (password.length < 8) {
        console.log('❌ Senha deve ter pelo menos 8 caracteres')
        continue
      }
      break
    }

    // Confirmar dados
    console.log('\n📋 Confirmação dos dados:')
    console.log(`👤 Nome: ${name}`)
    console.log(`📧 Email: ${email}`)
    console.log(`🔒 Senha: ${'*'.repeat(password.length)}`)
    console.log(`👑 Role: superadmin`)

    const confirm = await askQuestion('\n✅ Confirma a criação? (S/n): ')
    if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'não') {
      console.log('🔄 Operação cancelada.')
      return
    }

    // Hash da senha
    console.log('\n🔐 Gerando hash da senha...')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Criar usuário
    console.log('💾 Salvando usuário no banco...')
    const superAdmin = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'superadmin',
      active: true
    })

    await superAdmin.save()

    console.log('\n🎉 === SUPER ADMIN CRIADO COM SUCESSO! ===')
    console.log(`📧 Email: ${superAdmin.email}`)
    console.log(`👤 Nome: ${superAdmin.name}`)
    console.log(`🆔 ID: ${superAdmin._id}`)
    console.log(`📅 Criado em: ${superAdmin.createdAt.toLocaleString('pt-BR')}`)
    console.log('\n🔐 Agora você pode fazer login com essas credenciais!')

  } catch (error) {
    console.error('❌ Erro ao criar super admin:', error.message)
    if (error.code === 11000) {
      console.error('💡 Dica: Este email já está em uso no sistema')
    }
  } finally {
    rl.close()
    await mongoose.disconnect()
    console.log('\n👋 Desconectado do MongoDB')
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  createSuperAdmin()
}

module.exports = { createSuperAdmin } 