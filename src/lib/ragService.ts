import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'
import { RAGDocument, DocumentChunk } from '@/models/RAGDocument'
import MinIOService from './minio'
import Company from '@/models/Company'
import CacheService from './cacheService'

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

  private async initializeEmbeddings(companyId: string): Promise<OpenAIEmbeddings> {
    if (this.embeddings) {
      return this.embeddings
    }

    try {
      const company = await Company.findById(companyId)
      if (!company) {
        throw new Error('Empresa não encontrada')
      }

      // Buscar chave OpenAI da empresa
      const openaiConfig = company.aiConfiguration?.providers?.find(
        (p: any) => p.provider === 'openai'
      )

      if (!openaiConfig?.apiKey) {
        throw new Error('Chave da API OpenAI não configurada para esta empresa')
      }

      this.embeddings = new OpenAIEmbeddings({
        apiKey: openaiConfig.apiKey,
        model: 'text-embedding-3-small' // Modelo mais eficiente para embeddings
      })

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
      // 1. Criar registro do documento
      ragDocument = await RAGDocument.create({
        fileName: params.fileName,
        originalFileName: params.originalFileName,
        fileSize: params.fileBuffer.length,
        mimeType: params.mimeType,
        category: params.category,
        fileKey: params.fileName,
        fileUrl: '', // Será preenchido após upload
        status: 'processing',
        companyId: params.companyId,
        uploadedBy: params.uploadedBy
      })

      // 2. Upload para MinIO
      const uploadResult = await MinIOService.uploadFile(
        params.fileBuffer,
        params.originalFileName,
        {
          folder: 'rag-documents',
          filename: params.fileName,
          contentType: params.mimeType
        }
      )

      // Atualizar URL no documento
      await RAGDocument.findByIdAndUpdate(ragDocument._id, {
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key
      })

      // 3. Extrair texto do documento
      let extractedText = ''
      
      if (params.mimeType === 'application/pdf') {
        extractedText = await this.extractTextFromPDF(params.fileBuffer)
      } else if (params.mimeType.startsWith('text/')) {
        extractedText = params.fileBuffer.toString('utf-8')
      } else {
        throw new Error(`Tipo de arquivo não suportado para extração: ${params.mimeType}`)
      }

      // 4. Dividir texto em chunks
      const documents = [new Document({ pageContent: extractedText })]
      const chunks = await this.textSplitter.splitDocuments(documents)

      // 5. Inicializar embeddings
      const embeddings = await this.initializeEmbeddings(params.companyId)

      // 6. Gerar embeddings para cada chunk
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
      }

      // 7. Salvar chunks no banco de dados
      await DocumentChunk.insertMany(chunkData)

      // 8. Atualizar documento com metadados finais
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
      // Inicializar embeddings
      const embeddings = await this.initializeEmbeddings(params.companyId)

      // Gerar embedding da query
      const queryEmbedding = await embeddings.embedQuery(params.query)

      // Buscar documentos da empresa/categoria
      const filter: any = { companyId: params.companyId }
      if (params.category) {
        filter['documentId'] = {
          $in: await RAGDocument.find({ 
            companyId: params.companyId, 
            category: params.category,
            status: 'completed'
          }).distinct('_id')
        }
      } else {
        filter['documentId'] = {
          $in: await RAGDocument.find({ 
            companyId: params.companyId,
            status: 'completed'
          }).distinct('_id')
        }
      }

      // Buscar chunks
      const chunks = await DocumentChunk.find(filter)
        .populate('documentId')
        .limit(params.limit || 50)

      // Calcular similaridade
      const results = chunks.map(chunk => {
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding)
        
        return {
          content: chunk.content,
          score,
          documentId: chunk.documentId._id.toString(),
          fileName: (chunk.documentId as any).originalFileName,
          chunkIndex: chunk.chunkIndex,
          metadata: chunk.metadata
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
      const [totalDocs, processingDocs, completedDocs, errorDocs, categoryStats] = await Promise.all([
        RAGDocument.countDocuments({ companyId }),
        RAGDocument.countDocuments({ companyId, status: 'processing' }),
        RAGDocument.countDocuments({ companyId, status: 'completed' }),
        RAGDocument.countDocuments({ companyId, status: 'error' }),
        RAGDocument.aggregate([
          { $match: { companyId } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ])
      ])

      const totalChunks = await DocumentChunk.countDocuments({ companyId })

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
      // Verificar se o documento pertence à empresa
      const document = await RAGDocument.findOne({
        _id: documentId,
        companyId
      })

      if (!document) {
        throw new Error('Documento não encontrado')
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
      throw error
    }
  }
}

export default new RAGService() 