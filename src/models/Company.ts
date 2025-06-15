import mongoose, { Document, Schema } from 'mongoose'

export interface ICompany extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  cnpj?: string
  address?: {
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
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  approvedBy?: mongoose.Types.ObjectId
  approvedAt?: Date
  rejectionReason?: string
  metadata?: {
    contactPerson?: {
      name: string
      email: string
      phone: string
      position: string
    }
    description?: string
    registrationDate?: Date
    registrationSource?: string
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
    street: { type: String, trim: true },
    number: { type: String, trim: true },
    complement: { type: String, trim: true },
    neighborhood: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true, maxlength: 2 },
    zipCode: { type: String, trim: true, match: /^\d{5}-?\d{3}$/ }
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  metadata: {
    contactPerson: {
      name: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      phone: { type: String, trim: true },
      position: { type: String, trim: true }
    },
    description: { type: String, trim: true },
    registrationDate: { type: Date },
    registrationSource: { type: String, trim: true }
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
      default: 10
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
      tokensUsed: { type: Number, default: 0 }
    }]
  }
}, {
  timestamps: true
})

// Índices
// cnpj já tem índice único definido no schema
CompanySchema.index({ status: 1 })
CompanySchema.index({ approvedBy: 1 })

export default mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema)