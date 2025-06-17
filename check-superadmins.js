#!/usr/bin/env node

const mongoose = require('mongoose')
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

// Função para verificar super admins
async function checkSuperAdmins() {
  try {
    console.log('🔍 === VERIFICAÇÃO DE SUPER ADMINS ===\n')

    // Conectar ao MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI não encontrada no .env')
    }

    console.log('📡 Conectando ao MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Conectado ao MongoDB:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***@'))

    // Buscar todos os super admins
    const superAdmins = await User.find({ role: 'superadmin' }).sort({ createdAt: 1 })
    
    if (superAdmins.length === 0) {
      console.log('⚠️  Nenhum super admin encontrado no sistema!')
      console.log('💡 Use um dos scripts de criação para criar o primeiro super admin')
      return
    }

    console.log(`\n📊 Encontrados ${superAdmins.length} super admin(s):\n`)

    superAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. 👑 SUPER ADMIN`)
      console.log(`   📧 Email: ${admin.email}`)
      console.log(`   👤 Nome: ${admin.name}`)
      console.log(`   🆔 ID: ${admin._id}`)
      console.log(`   ✅ Ativo: ${admin.active ? 'Sim' : 'Não'}`)
      console.log(`   📅 Criado: ${admin.createdAt.toLocaleString('pt-BR')}`)
      if (admin.lastLogin) {
        console.log(`   🔐 Último login: ${admin.lastLogin.toLocaleString('pt-BR')}`)
      } else {
        console.log(`   🔐 Último login: Nunca`)
      }
      if (admin.curseduca_id) {
        console.log(`   🎓 Curseduca ID: ${admin.curseduca_id}`)
      }
      console.log('')
    })

    // Estatísticas gerais
    const totalUsers = await User.countDocuments()
    const activeUsers = await User.countDocuments({ active: true })
    const adminUsers = await User.countDocuments({ role: 'admin' })
    const professionalUsers = await User.countDocuments({ role: 'professional' })

    console.log('📈 === ESTATÍSTICAS GERAIS ===')
    console.log(`👥 Total de usuários: ${totalUsers}`)
    console.log(`✅ Usuários ativos: ${activeUsers}`)
    console.log(`👑 Super admins: ${superAdmins.length}`)
    console.log(`🏢 Admins: ${adminUsers}`)
    console.log(`👨‍⚕️ Profissionais: ${professionalUsers}`)

  } catch (error) {
    console.error('❌ Erro ao verificar super admins:', error.message)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Desconectado do MongoDB')
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  checkSuperAdmins()
}

module.exports = { checkSuperAdmins } 