import mongoose from 'mongoose'

export interface IAnalysisTemplate {
  _id?: string
  name: string
  description: string
  type: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatment-plan'
  companyId: string
  createdBy: string
  
  // Configurações do template
  promptTemplate: string
  systemPrompt?: string
  parameters: {
    temperature?: number
    maxTokens?: number
    model?: string
  }
  
  // Campos personalizáveis
  customFields?: Array<{
    id: string
    label: string
    type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea'
    required: boolean
    options?: string[]
    defaultValue?: any
  }>
  
  // Configurações de saída
  outputFormat?: {
    sections: Array<{
      title: string
      required: boolean
      placeholder?: string
    }>
  }
  
  // Configurações RAG
  ragConfig?: {
    enabled: boolean
    categories: string[]
    threshold: number
    maxResults: number
  }
  
  // Metadados
  isDefault: boolean
  isActive: boolean
  usageCount: number
  lastUsed?: Date
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

const AnalysisTemplateSchema = new mongoose.Schema<IAnalysisTemplate>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['laboratory', 'tcm', 'chronology', 'ifm', 'treatment-plan'],
    required: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  createdBy: {
    type: String,
    required: true
  },
  
  promptTemplate: {
    type: String,
    required: true
  },
  systemPrompt: String,
  
  parameters: {
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2
    },
    maxTokens: {
      type: Number,
      default: 4000,
      min: 100,
      max: 8000
    },
    model: {
      type: String,
      default: 'gpt-4o-mini'
    }
  },
  
  customFields: [{
    id: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'number', 'select', 'multiselect', 'textarea'],
      required: true
    },
    required: {
      type: Boolean,
      default: false
    },
    options: [String],
    defaultValue: mongoose.Schema.Types.Mixed
  }],
  
  outputFormat: {
    sections: [{
      title: {
        type: String,
        required: true
      },
      required: {
        type: Boolean,
        default: true
      },
      placeholder: String
    }]
  },
  
  ragConfig: {
    enabled: {
      type: Boolean,
      default: true
    },
    categories: [String],
    threshold: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    },
    maxResults: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    }
  },
  
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: Date

}, {
  timestamps: true
})

// Índices para performance
AnalysisTemplateSchema.index({ companyId: 1, type: 1 })
AnalysisTemplateSchema.index({ companyId: 1, isActive: 1 })
AnalysisTemplateSchema.index({ createdBy: 1 })

// Middleware para validação
AnalysisTemplateSchema.pre('save', function() {
  // Apenas um template padrão por tipo e empresa
  if (this.isDefault) {
    return AnalysisTemplate.updateMany(
      { 
        companyId: this.companyId, 
        type: this.type, 
        _id: { $ne: this._id } 
      },
      { isDefault: false }
    )
  }
})

// Métodos estáticos
AnalysisTemplateSchema.statics.getDefaultTemplate = function(
  companyId: string, 
  type: string
) {
  return this.findOne({
    companyId,
    type,
    isDefault: true,
    isActive: true
  })
}

AnalysisTemplateSchema.statics.getTemplatesByType = function(
  companyId: string, 
  type: string
) {
  return this.find({
    companyId,
    type,
    isActive: true
  }).sort({ isDefault: -1, usageCount: -1, name: 1 })
}

// Métodos de instância
AnalysisTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1
  this.lastUsed = new Date()
  return this.save()
}

AnalysisTemplateSchema.methods.buildPrompt = function(inputData: any, ragContext?: string) {
  let prompt = this.promptTemplate
  
  // Substituir variáveis padrão
  prompt = prompt.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return inputData[key] || match
  })
  
  // Adicionar contexto RAG se disponível
  if (ragContext && this.ragConfig?.enabled) {
    prompt = `${prompt}\n\nCONTEXTO DA BASE DE CONHECIMENTO:\n${ragContext}`
  }
  
  return prompt
}

const AnalysisTemplate = mongoose.models.AnalysisTemplate || 
  mongoose.model<IAnalysisTemplate>('AnalysisTemplate', AnalysisTemplateSchema)

export default AnalysisTemplate 