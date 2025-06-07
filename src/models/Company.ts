import mongoose, { Document, Schema } from 'mongoose'

export interface ICompany extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  cnpj?: string
  address: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  phone?: string
  email?: string
  website?: string
  isActive: boolean
  subscription: {
    plan: 'basic' | 'premium' | 'enterprise'
    status: 'active' | 'inactive' | 'suspended'
    expiresAt: Date
    features: string[]
  }
  settings: {
    aiProviders: {
      openai?: {
        apiKey: string
        models: string[]
      }
      anthropic?: {
        apiKey: string
        models: string[]
      }
      google?: {
        apiKey: string
        models: string[]
      }
    }
    defaultAiProvider: string
    maxUsersAllowed: number
    ragSettings: {
      chunkSize: number
      chunkOverlap: number
      embeddingModel: string
    }
  }
  usage: {
    totalAnalyses: number
    totalUsers: number
    monthlyUsage: {
      month: Date
      analysesCount: number
      tokensUsed: number
      cost: number
    }[]
  }
  createdAt: Date
  updatedAt: Date
}

const CompanySchema = new Schema<ICompany>({
  name: {
    type: String,
    required: [true, 'Nome da empresa é obrigatório'],
    trim: true,
    maxlength: [200, 'Nome não pode ter mais de 200 caracteres']
  },
  cnpj: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    match: [/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, 'CNPJ inválido']
  },
  address: {
    street: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true },
    complement: { type: String, trim: true },
    neighborhood: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true, maxlength: 2 },
    zipCode: { type: String, required: true, trim: true, match: /^\d{5}-?\d{3}$/ }
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/, 'Telefone inválido']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  website: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    expiresAt: {
      type: Date,
      required: true
    },
    features: [{
      type: String
    }]
  },
  settings: {
    aiProviders: {
      openai: {
        apiKey: { type: String, select: false },
        models: [{ type: String }]
      },
      anthropic: {
        apiKey: { type: String, select: false },
        models: [{ type: String }]
      },
      google: {
        apiKey: { type: String, select: false },
        models: [{ type: String }]
      }
    },
    defaultAiProvider: {
      type: String,
      default: 'openai'
    },
    maxUsersAllowed: {
      type: Number,
      default: 5
    },
    ragSettings: {
      chunkSize: {
        type: Number,
        default: 1000
      },
      chunkOverlap: {
        type: Number,
        default: 200
      },
      embeddingModel: {
        type: String,
        default: 'text-embedding-ada-002'
      }
    }
  },
  usage: {
    totalAnalyses: {
      type: Number,
      default: 0
    },
    totalUsers: {
      type: Number,
      default: 0
    },
    monthlyUsage: [{
      month: { type: Date, required: true },
      analysesCount: { type: Number, default: 0 },
      tokensUsed: { type: Number, default: 0 },
      cost: { type: Number, default: 0 }
    }]
  }
}, {
  timestamps: true
})

// Índices
CompanySchema.index({ cnpj: 1 })
CompanySchema.index({ isActive: 1 })
CompanySchema.index({ 'subscription.status': 1 })

export default mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema) 