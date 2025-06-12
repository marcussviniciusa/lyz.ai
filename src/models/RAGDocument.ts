import mongoose from 'mongoose'

const { Schema } = mongoose

export interface IRAGDocument {
  fileName: string
  originalFileName: string
  fileSize: number
  mimeType: string
  category: string
  fileKey: string
  fileUrl: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  extractedText?: string
  processingMetadata?: {
    totalChunks?: number
    averageChunkSize?: number
    embeddingModel?: string
    processingTime?: number
    errorMessage?: string
  }
  companyId: mongoose.Types.ObjectId
  uploadedBy: mongoose.Types.ObjectId
}

export interface IDocumentChunk {
  documentId: mongoose.Types.ObjectId
  content: string
  chunkIndex: number
  embedding: number[]
  metadata?: {
    startPosition?: number
    endPosition?: number
    pageNumber?: number
    chunkSize?: number
  }
  companyId: mongoose.Types.ObjectId
}

const RAGDocumentSchema = new Schema<IRAGDocument>({
  // Informações básicas do documento
  fileName: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'pesquisas-cientificas',
      'protocolos-clinicos',
      'diretrizes-medicas',
      'estudos-caso',
      'medicina-funcional',
      'mtc',
      'fitoterapia',
      'nutricao',
      'cursos-transcricoes'
    ]
  },
  
  // URLs e chaves do MinIO
  fileKey: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: false
  },
  
  // Status do processamento
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'error'],
    default: 'pending'
  },
  
  // Texto extraído do documento
  extractedText: {
    type: String
  },
  
  // Metadados do processamento
  processingMetadata: {
    totalChunks: Number,
    averageChunkSize: Number,
    embeddingModel: String,
    processingTime: Number,
    errorMessage: String
  },
  
  // Informações da empresa
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Usuário que fez upload
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

// Modelo para chunks de documento com embeddings
const DocumentChunkSchema = new Schema<IDocumentChunk>({
  // Referência ao documento pai
  documentId: {
    type: Schema.Types.ObjectId,
    ref: 'RAGDocument',
    required: true
  },
  
  // Conteúdo do chunk
  content: {
    type: String,
    required: true
  },
  
  // Posição no documento original
  chunkIndex: {
    type: Number,
    required: true
  },
  
  // Embeddings (array de números)
  embedding: {
    type: [Number],
    required: true
  },
  
  // Metadados do chunk
  metadata: {
    startPosition: Number,
    endPosition: Number,
    pageNumber: Number,
    chunkSize: Number
  },
  
  // Informações da empresa
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
})

// Índices para busca eficiente
RAGDocumentSchema.index({ companyId: 1, category: 1 })
RAGDocumentSchema.index({ status: 1 })
RAGDocumentSchema.index({ uploadedBy: 1 })

DocumentChunkSchema.index({ documentId: 1, chunkIndex: 1 })
DocumentChunkSchema.index({ companyId: 1 })

export const RAGDocument = mongoose.models.RAGDocument || mongoose.model<IRAGDocument>('RAGDocument', RAGDocumentSchema)
export const DocumentChunk = mongoose.models.DocumentChunk || mongoose.model<IDocumentChunk>('DocumentChunk', DocumentChunkSchema) 