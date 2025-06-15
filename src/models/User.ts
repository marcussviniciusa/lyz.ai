import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  password: string
  role: 'superadmin' | 'admin' | 'professional'
  company?: mongoose.Types.ObjectId
  specialization?: string
  curseduca_id?: string
  active: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [8, 'Senha deve ter pelo menos 8 caracteres'],
    select: false // Por padrão, não incluir a senha nas consultas
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'professional'],
    required: [true, 'Tipo de usuário é obrigatório'],
    default: 'professional'
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: function(this: IUser) {
      return this.role !== 'superadmin'
    }
  },
  specialization: {
    type: String,
    trim: true,
    maxlength: [100, 'Especialização não pode ter mais de 100 caracteres']
  },
  curseduca_id: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Permite null/undefined mas cria índice único para valores não nulos
  },
  active: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
})

// Índices para melhor performance
UserSchema.index({ email: 1 }, { unique: true })
UserSchema.index({ company: 1, role: 1 })
UserSchema.index({ active: 1 })
// curseduca_id já tem índice único definido no schema

// Método para verificar senha
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(candidatePassword, this.password)
}

// Método para atualizar último login
UserSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date()
  return this.save()
}

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
export default User 