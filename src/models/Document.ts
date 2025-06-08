import mongoose, { Schema, Document as MongooseDocument } from 'mongoose'

export interface IDocument extends MongooseDocument {
  companyId: mongoose.Types.ObjectId
  uploadedBy: mongoose.Types.ObjectId
  name: string
  filename?: string
  originalName?: string
  mimeType?: string
  size?: number
  content?: string
  fileUrl?: string
  source?: string
  status: 'pending' | 'processing' | 'processed' | 'error'
  errorMessage?: string
  chunks: Array<{
    content: string
    chunkIndex: number
    embedding?: number[]
  }>
  storage?: {
    provider: string
    bucket: string
    key: string
    url: string
  }
  metadata?: {
    title?: string
    description?: string
    category?: string
    tags?: string[]
    language?: string
  }
  processing?: {
    status: string
  }
  ragSettings?: {
    chunkSize: number
    chunkOverlap: number
    embeddingModel: string
  }
  processedAt?: Date
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

const DocumentSchema = new Schema<IDocument>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  filename: {
    type: String,
    trim: true
  },
  originalName: {
    type: String,
    trim: true
  },
  mimeType: {
    type: String,
    trim: true
  },
  size: {
    type: Number,
    min: 0
  },
  content: {
    type: String
  },
  fileUrl: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    default: 'upload',
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'processed', 'error'],
    default: 'pending',
    required: true,
    index: true
  },
  errorMessage: {
    type: String,
    trim: true
  },
  chunks: [{
    content: {
      type: String,
      required: true
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0
    },
    embedding: [{
      type: Number
    }]
  }],
  storage: {
    provider: {
      type: String,
      trim: true
    },
    bucket: {
      type: String,
      trim: true
    },
    key: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    }
  },
  metadata: {
    title: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: 'other'
    },
    tags: [{
      type: String,
      trim: true
    }],
    language: {
      type: String,
      default: 'pt-BR',
      trim: true
    }
  },
  processing: {
    status: {
      type: String,
      default: 'pending'
    }
  },
  ragSettings: {
    chunkSize: {
      type: Number,
      default: 1000,
      min: 100,
      max: 8000
    },
    chunkOverlap: {
      type: Number,
      default: 200,
      min: 0,
      max: 1000
    },
    embeddingModel: {
      type: String,
      default: 'text-embedding-ada-002',
      trim: true
    }
  },
  processedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'documents'
})

// Índices compostos
DocumentSchema.index({ companyId: 1, status: 1 })
DocumentSchema.index({ companyId: 1, 'metadata.category': 1 })
DocumentSchema.index({ companyId: 1, createdAt: -1 })
DocumentSchema.index({ companyId: 1, uploadedBy: 1 })

// Middleware para garantir que o companyId seja sempre definido
DocumentSchema.pre('save', function(next) {
  if (!this.companyId) {
    next(new Error('CompanyId é obrigatório'))
  }
  next()
})

// Método para limpar chunks grandes do documento ao serializar
DocumentSchema.methods.toJSON = function() {
  const obj = this.toObject()
  
  // Se há mais de 5 chunks, mostrar apenas contagem
  if (obj.chunks && obj.chunks.length > 5) {
    obj.chunksCount = obj.chunks.length
    obj.chunks = obj.chunks.slice(0, 2).concat([
      { content: `... e mais ${obj.chunks.length - 2} chunks`, chunkIndex: -1 }
    ])
  }
  
  return obj
}

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema) 