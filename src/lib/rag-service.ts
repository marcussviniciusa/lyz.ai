import DocumentModel from '@/models/Document';
import { AIService } from './ai-service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface DocumentChunk {
  content: string;
  metadata: {
    documentId: string;
    chunkIndex: number;
    documentName: string;
    source: string;
  };
  embedding?: number[];
}

export class RAGService {
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor(
    private aiService: AIService,
    chunkSize = 1000,
    chunkOverlap = 200
  ) {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ['\n\n', '\n', '.', '!', '?', ';', ':', ' ', ''],
    });
  }

  /**
   * Processa um documento: divide em chunks e gera embeddings
   */
  async processDocument(
    documentId: string,
    content: string,
    metadata: { name: string; source: string }
  ): Promise<DocumentChunk[]> {
    // Dividir o documento em chunks
    const chunks = await this.textSplitter.splitText(content);
    
    const processedChunks: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Gerar embedding para o chunk
      const embedding = await this.aiService.generateEmbedding(chunk);
      
      const documentChunk: DocumentChunk = {
        content: chunk,
        metadata: {
          documentId,
          chunkIndex: i,
          documentName: metadata.name,
          source: metadata.source,
        },
        embedding,
      };

      processedChunks.push(documentChunk);
    }

    // Salvar chunks no banco de dados
    await DocumentModel.findByIdAndUpdate(documentId, {
      $set: {
        chunks: processedChunks.map(chunk => ({
          content: chunk.content,
          chunkIndex: chunk.metadata.chunkIndex,
          embedding: chunk.embedding,
        })),
        status: 'processed',
        processedAt: new Date(),
      }
    });

    return processedChunks;
  }

  /**
   * Busca semântica: encontra chunks mais relevantes para uma query
   */
  async semanticSearch(
    query: string,
    companyId: string,
    topK = 5
  ): Promise<DocumentChunk[]> {
    // Gerar embedding da query
    const queryEmbedding = await this.aiService.generateEmbedding(query);

    // Buscar documentos da empresa
    const documents = await DocumentModel.find({
      companyId,
      status: 'processed',
    });

    const relevantChunks: Array<DocumentChunk & { score: number }> = [];

    // Calcular similaridade com todos os chunks
    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        if (chunk.embedding) {
          const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
          
          relevantChunks.push({
            content: chunk.content,
            metadata: {
              documentId: doc._id.toString(),
              chunkIndex: chunk.chunkIndex,
              documentName: doc.name,
              source: doc.source || 'upload',
            },
            embedding: chunk.embedding,
            score,
          });
        }
      }
    }

    // Ordenar por relevância e retornar os top K
    return relevantChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Gera contexto RAG para uma análise específica
   */
  async generateContext(
    query: string,
    analysisType: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatmentPlan',
    companyId: string
  ): Promise<string> {
    // Expandir a query baseada no tipo de análise
    const expandedQuery = this.expandQueryForAnalysis(query, analysisType);
    
    // Buscar chunks relevantes
    const relevantChunks = await this.semanticSearch(expandedQuery, companyId, 5);
    
    if (relevantChunks.length === 0) {
      return '';
    }

    // Construir contexto estruturado
    const context = relevantChunks
      .map((chunk, index) => {
        return `
[Documento ${index + 1}: ${chunk.metadata.documentName}]
${chunk.content}
`;
      })
      .join('\n---\n');

    return `
CONTEXTO CIENTÍFICO RELEVANTE:
${context}

Use estas informações científicas para embasar sua análise, mas adapte as recomendações para o caso específico da paciente.
`;
  }

  /**
   * Expande a query baseada no tipo de análise
   */
  private expandQueryForAnalysis(
    query: string,
    analysisType: string
  ): string {
    const expansions = {
      laboratory: `${query} exames laboratoriais medicina funcional valores referência biomarcadores`,
      tcm: `${query} medicina tradicional chinesa diagnóstico padrões língua pulso acupuntura fitoterapia`,
      chronology: `${query} cronologia timeline saúde feminina ciclo menstrual hormônios`,
      ifm: `${query} medicina funcional matriz IFM sistemas corporais causas raiz intervenções`,
      treatmentPlan: `${query} plano tratamento terapêutico prescrição acompanhamento protocolos`,
    };

    return expansions[analysisType as keyof typeof expansions] || query;
  }

  /**
   * Calcula similaridade coseno entre dois vetores
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vetores devem ter o mesmo tamanho');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Remove documentos processados
   */
  async deleteDocument(documentId: string): Promise<void> {
    await DocumentModel.findByIdAndDelete(documentId);
  }

  /**
   * Reprocessa um documento existente
   */
  async reprocessDocument(documentId: string): Promise<DocumentChunk[]> {
    const document = await DocumentModel.findById(documentId);
    if (!document) {
      throw new Error('Documento não encontrado');
    }

    // Limpar chunks existentes
    await DocumentModel.findByIdAndUpdate(documentId, {
      $unset: { chunks: 1 },
      $set: { status: 'processing' }
    });

    // Reprocessar
    return this.processDocument(
      documentId,
      document.content,
      { name: document.name, source: document.source || 'upload' }
    );
  }

  /**
   * Obtém estatísticas do sistema RAG
   */
  async getRAGStats(companyId: string) {
    const documents = await DocumentModel.find({ companyId });
    
    const stats = {
      totalDocuments: documents.length,
      processedDocuments: documents.filter((d: any) => d.status === 'processed').length,
      totalChunks: documents.reduce((sum: any, doc: any) => sum + (doc.chunks?.length || 0), 0),
      documentsByType: documents.reduce((acc: any, doc: any) => {
        const type = doc.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return stats;
  }
} 