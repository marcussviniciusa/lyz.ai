import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'
import { RAGDocument, DocumentChunk } from '@/models/RAGDocument'
import MinIOService from './minio'
import Company from '@/models/Company'
import CacheService from './cacheService'
import mongoose from 'mongoose'

export interface ProcessDocumentParams {
  fileBuffer: Buffer
  fileName: string
  originalFileName: string
  mimeType: string
  category: string
  companyId: string
  uploadedBy: string
}

export interface DocumentSearchParams {
  query: string
  companyId: string
  category?: string
  limit?: number
  threshold?: number
}

export interface SearchResult {
  content: string
  score: number
  documentId: string
  fileName: string
  chunkIndex: number
  metadata?: any
}

class RAGService {
  private embeddings: OpenAIEmbeddings | null = null
  private textSplitter: RecursiveCharacterTextSplitter

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', '']
    })
  }

  // Função auxiliar para validar companyId sem logs desnecessários para superadmin
  private ensureValidCompanyId(companyId: string, operation: string, isSuperAdmin: boolean = false): string {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      if (!isSuperAdmin) {
        console.warn(`CompanyId inválido para ${operation} (${companyId}), usando ObjectId fixo para desenvolvimento`)
      }
      return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
    }
    return companyId
  }

  private async initializeEmbeddings(companyId: string): Promise<OpenAIEmbeddings> {
    if (this.embeddings) {
      return this.embeddings
    }

    try {
      let openaiApiKey: string | undefined

      // Tentar buscar configuração da empresa primeiro
      try {
        const company = await Company.findById(companyId)
        if (company) {
          const openaiConfig = company.aiConfiguration?.providers?.find(
            (p: any) => p.provider === 'openai'
          )
          openaiApiKey = openaiConfig?.apiKey
          console.log('🏢 Usando configuração da empresa para embeddings')
        }
      } catch (companyError) {
        console.warn('⚠️  Erro ao buscar empresa, usando configurações globais:', companyError)
      }

      // Se não encontrou chave da empresa, tentar configurações globais
      if (!openaiApiKey) {
        console.log('🌐 Empresa não encontrada ou sem configuração, buscando configurações globais...')
        
        try {
          const GlobalAIConfig = (await import('@/models/GlobalAIConfig')).default
          const globalConfig = await GlobalAIConfig.findOne()
          
          if (globalConfig?.apiKeys?.openai) {
            openaiApiKey = globalConfig.apiKeys.openai
            console.log('✅ Usando chave OpenAI das configurações globais para embeddings')
          }
        } catch (globalError) {
          console.warn('⚠️  Erro ao buscar configurações globais:', globalError)
        }
      }

      // Se ainda não encontrou chave, tentar variável de ambiente
      if (!openaiApiKey) {
        openaiApiKey = process.env.OPENAI_API_KEY
        if (openaiApiKey) {
          console.log('🔑 Usando chave OpenAI da variável de ambiente para embeddings')
        }
      }

      if (!openaiApiKey) {
        throw new Error('Chave da API OpenAI não configurada. Configure nas configurações globais ou empresa.')
      }

      this.embeddings = new OpenAIEmbeddings({
        apiKey: openaiApiKey,
        model: 'text-embedding-3-small' // Modelo mais eficiente para embeddings
      })

      console.log('🧠 Embeddings OpenAI inicializados com sucesso')
      return this.embeddings
      
    } catch (error) {
      console.error('Erro ao inicializar embeddings:', error)
      throw error
    }
  }

  async processDocument(params: ProcessDocumentParams): Promise<string> {
    const startTime = Date.now()
    let ragDocument: any = null

    try {
      // 1. Gerar URLs locais como fallback
      const fallbackFileKey = `rag-documents/${params.fileName}`
      const fallbackFileUrl = `/api/rag/files/${params.fileName}` // URL local para download

      // 2. Criar registro do documento
      ragDocument = await RAGDocument.create({
        fileName: params.fileName,
        originalFileName: params.originalFileName,
        fileSize: params.fileBuffer.length,
        mimeType: params.mimeType,
        category: params.category,
        fileKey: fallbackFileKey,
        fileUrl: fallbackFileUrl, // URL local como fallback
        status: 'processing',
        companyId: params.companyId,
        uploadedBy: params.uploadedBy
      })

      // 3. Tentar upload para MinIO (opcional)
      try {
        const uploadResult = await MinIOService.uploadFile(
          params.fileBuffer,
          params.originalFileName,
          {
            folder: 'rag-documents',
            filename: params.fileName,
            contentType: params.mimeType
          }
        )

        // Atualizar com URL real do MinIO se upload foi bem-sucedido
        await RAGDocument.findByIdAndUpdate(ragDocument._id, {
          fileUrl: uploadResult.url,
          fileKey: uploadResult.key
        })
        
        console.log('✅ Upload MinIO realizado com sucesso:', uploadResult.url)
      } catch (minioError: any) {
        console.warn('⚠️  MinIO não disponível, usando armazenamento local:', minioError.message)
        // Continuar com URL local - não interromper o processo
      }

      // 4. Extrair texto do documento
      let extractedText = ''
      
      if (params.mimeType === 'application/pdf') {
        extractedText = await this.extractTextFromPDF(params.fileBuffer)
      } else if (params.mimeType.startsWith('text/')) {
        extractedText = params.fileBuffer.toString('utf-8')
      } else {
        throw new Error(`Tipo de arquivo não suportado para extração: ${params.mimeType}`)
      }

      console.log(`📄 Texto extraído: ${extractedText.length} caracteres`)

      // 5. Dividir texto em chunks
      const documents = [new Document({ pageContent: extractedText })]
      const chunks = await this.textSplitter.splitDocuments(documents)

      console.log(`🔀 Documento dividido em ${chunks.length} chunks`)

      // 6. Inicializar embeddings
      const embeddings = await this.initializeEmbeddings(params.companyId)

      // 7. Gerar embeddings para cada chunk
      const chunkPromises = chunks.map(async (chunk, index) => {
        const embedding = await embeddings.embedQuery(chunk.pageContent)
        
        return {
          documentId: ragDocument._id,
          content: chunk.pageContent,
          chunkIndex: index,
          embedding,
          metadata: {
            chunkSize: chunk.pageContent.length,
            startPosition: chunk.metadata?.startPosition || 0,
            endPosition: chunk.metadata?.endPosition || chunk.pageContent.length
          },
          companyId: params.companyId
        }
      })

      // Processar chunks em lotes para evitar sobrecarga
      const batchSize = 5
      const chunkData = []
      
      for (let i = 0; i < chunkPromises.length; i += batchSize) {
        const batch = chunkPromises.slice(i, i + batchSize)
        const batchResults = await Promise.all(batch)
        chunkData.push(...batchResults)
        
        console.log(`🧩 Processado lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunkPromises.length/batchSize)}`)
      }

      // 8. Salvar chunks no banco de dados
      await DocumentChunk.insertMany(chunkData)

      // 9. Atualizar documento com metadados finais
      const processingTime = Date.now() - startTime
      const averageChunkSize = chunkData.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunkData.length

      await RAGDocument.findByIdAndUpdate(ragDocument._id, {
        status: 'completed',
        extractedText: extractedText.substring(0, 10000), // Limitar tamanho
        processingMetadata: {
          totalChunks: chunkData.length,
          averageChunkSize: Math.round(averageChunkSize),
          embeddingModel: 'text-embedding-3-small',
          processingTime
        }
      })

      console.log(`✅ Documento processado com sucesso em ${processingTime}ms: ${chunkData.length} chunks criados`)

      return ragDocument._id.toString()

    } catch (error: any) {
      console.error('Erro no processamento RAG:', error)

      // Atualizar status de erro se o documento foi criado
      if (ragDocument) {
        await RAGDocument.findByIdAndUpdate(ragDocument._id, {
          status: 'error',
          'processingMetadata.errorMessage': error.message
        })
      }

      throw error
    }
  }

  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      // Criar um arquivo temporário em memória
      const tempFilePath = `/tmp/temp_${Date.now()}.pdf`
      require('fs').writeFileSync(tempFilePath, buffer)

      const loader = new PDFLoader(tempFilePath, {
        splitPages: false,
        parsedItemSeparator: ' '
      })

      const docs = await loader.load()
      
      // Limpar arquivo temporário
      require('fs').unlinkSync(tempFilePath)

      return docs.map(doc => doc.pageContent).join('\n\n')
    } catch (error) {
      console.error('Erro na extração de PDF:', error)
      throw new Error('Falha ao extrair texto do PDF')
    }
  }

  async searchDocuments(params: DocumentSearchParams): Promise<SearchResult[]> {
    try {
      // Garantir que companyId seja um ObjectId válido
      const validCompanyId = this.ensureValidCompanyId(params.companyId, 'busca', true) // true = é superadmin, não gerar logs

      // Inicializar embeddings
      const embeddings = await this.initializeEmbeddings(params.companyId)

      // Gerar embedding da query
      const queryEmbedding = await embeddings.embedQuery(params.query)

      // Buscar documentos da empresa + documentos GLOBAIS do superadmin
      const companyFilter: any = {
        $or: [
          { companyId: validCompanyId }, // Documentos da empresa
          { companyId: '000000000000000000000000' } // Documentos GLOBAIS do superadmin
        ]
      }

      let documentIds: any[]
      if (params.category) {
        documentIds = await RAGDocument.find({ 
          ...companyFilter,
          category: params.category,
          status: 'completed'
        }).distinct('_id')
        console.log(`📂 Buscando em categoria "${params.category}" (empresa + global): ${documentIds.length} documentos`)
      } else {
        documentIds = await RAGDocument.find({ 
          ...companyFilter,
          status: 'completed'
        }).distinct('_id')
        console.log(`📂 Buscando em todas as categorias (empresa + global): ${documentIds.length} documentos`)
      }

      const filter: any = { documentId: { $in: documentIds } }

      // Buscar chunks
      const chunks = await DocumentChunk.find(filter)
        .populate('documentId')
        .limit(params.limit || 50)

      console.log(`🧩 Chunks encontrados: ${chunks.length}`)

      // Calcular similaridade
      const results = chunks.map(chunk => {
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding)
        
        return {
          content: chunk.content,
          score,
          documentId: chunk.documentId._id.toString(),
          fileName: (chunk.documentId as any).originalFileName,
          chunkIndex: chunk.chunkIndex,
          metadata: {
            ...chunk.metadata,
            isGlobal: (chunk.documentId as any).companyId?.toString() === '000000000000000000000000'
          }
        }
      })

      // Filtrar por threshold e ordenar por score
      const threshold = params.threshold || 0.7
      const filteredResults = results
        .filter(result => result.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, params.limit || 10)

      return filteredResults

    } catch (error) {
      console.error('Erro na busca de documentos:', error)
      throw error
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vetores devem ter o mesmo tamanho')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  async getDocumentStats(companyId: string) {
    try {
      // Garantir que companyId seja um ObjectId válido
      const validCompanyId = this.ensureValidCompanyId(companyId, 'stats', true) // true = é superadmin, não gerar logs

      const [totalDocs, processingDocs, completedDocs, errorDocs, categoryStats] = await Promise.all([
        RAGDocument.countDocuments({ companyId: validCompanyId }),
        RAGDocument.countDocuments({ companyId: validCompanyId, status: 'processing' }),
        RAGDocument.countDocuments({ companyId: validCompanyId, status: 'completed' }),
        RAGDocument.countDocuments({ companyId: validCompanyId, status: 'error' }),
        RAGDocument.aggregate([
          { $match: { companyId: validCompanyId } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ])
      ])

      const totalChunks = await DocumentChunk.countDocuments({ companyId: validCompanyId })

      return {
        documents: {
          total: totalDocs,
          processing: processingDocs,
          completed: completedDocs,
          error: errorDocs
        },
        chunks: totalChunks,
        categories: categoryStats.map(cat => ({
          category: cat._id,
          count: cat.count
        }))
      }
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error)
      throw error
    }
  }

  async deleteDocument(documentId: string, companyId: string): Promise<boolean> {
    try {
      // Garantir que companyId seja um ObjectId válido
      const validCompanyId = this.ensureValidCompanyId(companyId, 'deleção', true) // true = é superadmin, não gerar logs

      // Verificar se o documento pertence à empresa
      const document = await RAGDocument.findOne({
        _id: documentId,
        companyId: validCompanyId
      })

      if (!document) {
        console.warn(`Documento ${documentId} não encontrado para empresa ${validCompanyId}`)
        return false
      }

      // Deletar chunks relacionados
      await DocumentChunk.deleteMany({ documentId })

      // Deletar arquivo do MinIO
      try {
        await MinIOService.deleteFile(document.fileKey)
      } catch (error) {
        console.warn('Erro ao deletar arquivo do MinIO:', error)
      }

      // Deletar documento
      await RAGDocument.findByIdAndDelete(documentId)

      return true
    } catch (error) {
      console.error('Erro ao deletar documento:', error)
      return false
    }
  }
}

export default new RAGService() 