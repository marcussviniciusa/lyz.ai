import mongoose, { Document, Schema } from 'mongoose'

export interface IDeliveryPlan extends Document {
  _id: mongoose.Types.ObjectId
  patient: mongoose.Types.ObjectId
  professional: mongoose.Types.ObjectId
  company: mongoose.Types.ObjectId
  
  // Análises incluídas no plano
  analyses: mongoose.Types.ObjectId[]
  
  // Arquivo PDF gerado
  pdfFile: {
    key: string // Chave no MinIO
    url: string // URL assinada para download
    size: number // Tamanho do arquivo em bytes
    generatedAt: Date
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
    required: true
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
      required: true
    },
    url: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
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

const DeliveryPlan = mongoose.models.DeliveryPlan || mongoose.model<IDeliveryPlan>('DeliveryPlan', DeliveryPlanSchema)

export default DeliveryPlan 