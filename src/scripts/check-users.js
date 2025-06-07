const mongoose = require('mongoose')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '../../.env.local') })

// Schema básico do usuário
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  company: mongoose.Schema.Types.ObjectId
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Conectado ao MongoDB')

    const users = await User.find({}).limit(5)
    console.log(`\n📊 Encontrados ${users.length} usuários:`)
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`)
    })

    if (users.length === 0) {
      console.log('\n⚠️  Nenhum usuário encontrado. Criando usuário de teste...')
      
      const testUser = new User({
        name: 'Admin Teste',
        email: 'admin@lyz.ai',
        role: 'superadmin',
        company: null
      })
      
      await testUser.save()
      console.log('✅ Usuário de teste criado:', testUser.email)
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await mongoose.disconnect()
    console.log('✅ Desconectado do MongoDB')
  }
}

if (require.main === module) {
  checkUsers()
}

module.exports = { checkUsers } 