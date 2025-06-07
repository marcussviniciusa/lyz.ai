import mongoose, { Document, Schema } from 'mongoose'

export interface IDocument extends Document {
  _id: mongoose.Types.ObjectId
  company: mongoose.Types.ObjectId
  uploadedBy: mongoose.Types.ObjectId
  
  // Informações do arquivo
  filename: string
  originalName: string
  mimeType: string
  size: number
  
  // Armazenamento
  storage: {
    provider: 'minio' | 's3'
    bucket: string
    key: string
    url: string
  }
  
  // Metadados do documento
  metadata: {
    title?: string
    description?: string
    category: 'medical_literature' | 'protocol' | 'guideline' | 'exam_result' | 'other'
    tags: string[]
    language: string
    author?: string
    source?: string
  }
  
  // Processamento para RAG
  processing: {
    status: 'pending' | 'processing' | 'completed' | 'error'
    extractedText?: string
    chunks: {
      id: string
      content: string
      metadata: {
        page?: number
        section?: string
        startIndex: number
        endIndex: number
      }
      embedding?: number[]
    }[]
    error?: string
    processedAt?: Date
  }
  
  // Configurações do RAG
  ragSettings: {
    chunkSize: number
    chunkOverlap: number
    embeddingModel: string
  }
  
  // Controle de acesso
  isPublic: boolean
  isActive: boolean
  
  createdAt: Date
  updatedAt: Date
}

const DocumentSchema = new Schema<IDocument>({
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: [true, 'Nome do arquivo é obrigatório'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Nome original do arquivo é obrigatório'],
    trim: true
  },
  mimeType: {
    type: String,
    required: [true, 'Tipo MIME é obrigatório'],
    enum: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  size: {
    type: Number,
    required: [true, 'Tamanho do arquivo é obrigatório'],
    min: [0, 'Tamanho deve ser positivo']
  },
  storage: {
    provider: {
      type: String,
      enum: ['minio', 's3'],
      required: true,
      default: 'minio'
    },
    bucket: {
      type: String,
      required: true
    },
    key: {
      type: String,
      required: true,
      unique: true
    },
    url: {
      type: String,
      required: true
    }
  },
  metadata: {
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Título não pode ter mais de 200 caracteres']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Descrição não pode ter mais de 1000 caracteres']
    },
    category: {
      type: String,
      enum: ['medical_literature', 'protocol', 'guideline', 'exam_result', 'other'],
      required: true,
      default: 'other'
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    language: {
      type: String,
      default: 'pt-BR',
      match: [/^[a-z]{2}(-[A-Z]{2})?$/, 'Formato de idioma inválido']
    },
    author: {
      type: String,
      trim: true,
      maxlength: [100, 'Autor não pode ter mais de 100 caracteres']
    },
    source: {
      type: String,
      trim: true,
      maxlength: [200, 'Fonte não pode ter mais de 200 caracteres']
    }
  },
  processing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'error'],
      default: 'pending'
    },
    extractedText: {
      type: String
    },
    chunks: [{
      id: {
        type: String,
        required: true
      },
      content: {
        type: String,
        required: true
      },
      metadata: {
        page: Number,
        section: String,
        startIndex: {
          type: Number,
          required: true
        },
        endIndex: {
          type: Number,
          required: true
        }
      },
      embedding: [Number]
    }],
    error: String,
    processedAt: Date
  },
  ragSettings: {
    chunkSize: {
      type: Number,
      default: 1000,
      min: [100, 'Tamanho do chunk muito pequeno'],
      max: [4000, 'Tamanho do chunk muito grande']
    },
    chunkOverlap: {
      type: Number,
      default: 200,
      min: [0, 'Overlap deve ser positivo'],
      max: [1000, 'Overlap muito grande']
    },
    embeddingModel: {
      type: String,
      default: 'text-embedding-ada-002'
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Índices
DocumentSchema.index({ company: 1, 'metadata.category': 1 })
DocumentSchema.index({ 'storage.key': 1 }, { unique: true })
DocumentSchema.index({ 'processing.status': 1 })
DocumentSchema.index({ 'metadata.tags': 1 })
DocumentSchema.index({ isActive: 1, isPublic: 1 })
DocumentSchema.index({ createdAt: -1 })
DocumentSchema.index({ uploadedBy: 1 })

// Middleware para validação de chunk overlap
DocumentSchema.pre('save', function(next) {
  if (this.ragSettings.chunkOverlap >= this.ragSettings.chunkSize) {
    return next(new Error('Overlap não pode ser maior ou igual ao tamanho do chunk'))
  }
  next()
})

// Método para buscar chunks similares (será usado com vector search)
DocumentSchema.methods.findSimilarChunks = function(query: string, limit: number = 5) {
  // Implementação de busca semântica será adicionada com integração do vector database
  return this.processing.chunks.slice(0, limit)
}

// Método para atualizar status de processamento
DocumentSchema.methods.updateProcessingStatus = function(status: string, error?: string) {
  this.processing.status = status
  if (error) {
    this.processing.error = error
  }
  if (status === 'completed') {
    this.processing.processedAt = new Date()
  }
  return this.save()
}

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema) 