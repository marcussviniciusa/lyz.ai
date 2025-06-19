import mongoose, { Document, Schema } from 'mongoose'

export interface IDeliveryPlan extends Document {
  _id: mongoose.Types.ObjectId
  patient: mongoose.Types.ObjectId
  professional?: mongoose.Types.ObjectId | null
  company: mongoose.Types.ObjectId
  
  // Análises incluídas no plano
  analyses: mongoose.Types.ObjectId[]
  
  // Arquivo PDF gerado
  pdfFile?: {
    key: string // Chave no MinIO
    url: string // URL assinada para download
    size: number // Tamanho do arquivo em bytes
    generatedAt: Date
    lastAccessed?: Date // Última vez que foi acessado
  }
  
  // Arquivo PDF da página renderizada
  pdfPageFile?: {
    key: string // Chave no MinIO
    url: string // URL assinada para download
    size: number // Tamanho do arquivo em bytes
    generatedAt: Date
    lastAccessed?: Date // Última vez que foi acessado
  }
  
  // Sistema de compartilhamento
  shareLink?: {
    token: string // Token único para o link
    isPublic: boolean // Se é público ou privado
    password?: string // Senha para acesso (opcional)
    expiresAt: Date // Data de expiração
    createdAt: Date // Data de criação do link
    accessCount: number // Contador de acessos
    lastAccessed?: Date // Último acesso
    isActive: boolean // Se o link está ativo
  }
  
  // Status do plano
  status: 'generated' | 'delivered' | 'viewed_by_patient' | 'archived'
  
  // Método de entrega
  deliveryMethod?: 'email' | 'app' | 'printed' | 'download'
  
  // Datas importantes
  deliveredAt?: Date
  viewedAt?: Date
  
  // Feedback da paciente
  patientFeedback?: string
  
  // Metadados
  title: string
  description?: string
  
  createdAt: Date
  updatedAt: Date
}

const DeliveryPlanSchema = new Schema<IDeliveryPlan>({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  professional: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  analyses: [{
    type: Schema.Types.ObjectId,
    ref: 'Analysis'
  }],
  pdfFile: {
    key: {
      type: String,
      required: false
    },
    url: {
      type: String,
      required: false
    },
    size: {
      type: Number,
      required: false
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    lastAccessed: {
      type: Date
    }
  },
  pdfPageFile: {
    key: {
      type: String,
      required: false
    },
    url: {
      type: String,
      required: false
    },
    size: {
      type: Number,
      required: false
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    lastAccessed: {
      type: Date
    }
  },
  shareLink: {
    token: {
      type: String,
      unique: true,
      sparse: true
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    password: {
      type: String,
      required: false
    },
    expiresAt: {
      type: Date,
      required: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    accessCount: {
      type: Number,
      default: 0
    },
    lastAccessed: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['generated', 'delivered', 'viewed_by_patient', 'archived'],
    default: 'generated'
  },
  deliveryMethod: {
    type: String,
    enum: ['email', 'app', 'printed', 'download']
  },
  deliveredAt: Date,
  viewedAt: Date,
  patientFeedback: String,
  title: {
    type: String,
    required: true
  },
  description: String
}, {
  timestamps: true
})

// Índices para otimização
DeliveryPlanSchema.index({ patient: 1, createdAt: -1 })
DeliveryPlanSchema.index({ company: 1, status: 1 })
DeliveryPlanSchema.index({ professional: 1, createdAt: -1 })
DeliveryPlanSchema.index({ 'shareLink.token': 1 })
DeliveryPlanSchema.index({ 'shareLink.expiresAt': 1 })

const DeliveryPlan = mongoose.models.DeliveryPlan || mongoose.model<IDeliveryPlan>('DeliveryPlan', DeliveryPlanSchema)

export default DeliveryPlan 