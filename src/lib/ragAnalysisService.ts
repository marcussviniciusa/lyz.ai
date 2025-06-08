import RAGService from './ragService'
import AIService from './ai'

export interface RAGEnhancedAnalysisParams {
  type: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatment-plan'
  inputData: any
  patientData: any
  companyId: string
  ragCategories?: string[]
}

export interface RAGContext {
  relevantDocuments: Array<{
    content: string
    fileName: string
    score: number
    category: string
  }>
  searchQueries: string[]
  contextSummary: string
}

class RAGAnalysisService {
  
  private getRAGSearchQueries(type: string, inputData: any): string[] {
    const queries: string[] = []
    
    switch (type) {
      case 'laboratory':
        // Criar queries baseadas nos exames alterados
        if (inputData.labData) {
          Object.entries(inputData.labData).forEach(([exam, data]: [string, any]) => {
            if (data.value && data.isAbnormal) {
              queries.push(`${exam} alterado ${data.value}`)
              queries.push(`interpretação ${exam} medicina funcional`)
              queries.push(`protocolo tratamento ${exam}`)
            }
          })
        }
        
        // Adicionar queries baseadas nos sintomas
        if (inputData.symptoms && inputData.symptoms.length > 0) {
          inputData.symptoms.forEach((symptom: string) => {
            queries.push(`tratamento ${symptom}`)
            queries.push(`protocolo ${symptom} medicina funcional`)
          })
        }
        
        // Queries gerais por tipo de análise
        if (inputData.analysisType) {
          queries.push(`análise ${inputData.analysisType}`)
          queries.push(`protocolo ${inputData.analysisType}`)
        }
        break
        
      case 'tcm':
        if (inputData.tongueObservation) {
          queries.push(`diagnóstico língua ${inputData.tongueObservation.color}`)
          queries.push(`saburra ${inputData.tongueObservation.coating} MTC`)
        }
        
        if (inputData.pulseAnalysis) {
          queries.push(`pulso ${inputData.pulseAnalysis.quality} medicina chinesa`)
          queries.push(`diagnóstico pulso ${inputData.pulseAnalysis.frequency}`)
        }
        
        if (inputData.energeticSymptoms) {
          inputData.energeticSymptoms.forEach((symptom: string) => {
            queries.push(`${symptom} medicina tradicional chinesa`)
            queries.push(`tratamento ${symptom} MTC`)
          })
        }
        break
        
      case 'chronology':
        if (inputData.significantEvents) {
          inputData.significantEvents.forEach((event: any) => {
            queries.push(`${event.category} ${event.description}`)
            queries.push(`impacto saúde ${event.type}`)
          })
        }
        
        if (inputData.symptomEvolution) {
          Object.keys(inputData.symptomEvolution).forEach((symptom: string) => {
            queries.push(`evolução ${symptom}`)
            queries.push(`cronologia ${symptom}`)
          })
        }
        break
        
      case 'ifm':
        const systems = ['assimilation', 'defense', 'energy', 'biotransformation', 'transport', 'communication', 'structure']
        systems.forEach((system) => {
          if (inputData[system]) {
            queries.push(`sistema ${system} medicina funcional`)
            queries.push(`disfunção ${system} IFM`)
            queries.push(`protocolo ${system}`)
          }
        })
        break
        
      case 'treatment-plan':
        queries.push('plano tratamento medicina funcional')
        queries.push('protocolo terapêutico integrativo')
        queries.push('cronograma acompanhamento')
        
        if (inputData.primaryDiagnosis) {
          queries.push(`tratamento ${inputData.primaryDiagnosis}`)
          queries.push(`protocolo ${inputData.primaryDiagnosis}`)
        }
        break
    }
    
    return queries.slice(0, 5) // Limitar a 5 queries para não sobrecarregar
  }
  
  private getCategoriesForAnalysis(type: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'laboratory': ['medicina-funcional', 'protocolos-clinicos', 'pesquisas-cientificas'],
      'tcm': ['mtc', 'fitoterapia', 'medicina-funcional'],
      'chronology': ['medicina-funcional', 'pesquisas-cientificas', 'estudos-caso'],
      'ifm': ['medicina-funcional', 'protocolos-clinicos', 'diretrizes-medicas'],
      'treatment-plan': ['protocolos-clinicos', 'medicina-funcional', 'diretrizes-medicas', 'fitoterapia', 'nutricao']
    }
    
    return categoryMap[type] || []
  }
  
  async searchRelevantContext(
    type: string, 
    inputData: any, 
    companyId: string,
    maxResults: number = 3
  ): Promise<RAGContext> {
    try {
      const queries = this.getRAGSearchQueries(type, inputData)
      const categories = this.getCategoriesForAnalysis(type)
      
      const searchPromises = queries.map(async (query) => {
        // Buscar em todas as categorias relevantes
        const categoryPromises = categories.map(async (category) => {
          return RAGService.searchDocuments({
            query,
            companyId,
            category,
            limit: 2,
            threshold: 0.6
          })
        })
        
        const categoryResults = await Promise.all(categoryPromises)
        return categoryResults.flat()
      })
      
      const allResults = await Promise.all(searchPromises)
      const flatResults = allResults.flat()
      
      // Remover duplicatas e ordenar por score
      const uniqueResults = flatResults
        .filter((result, index, self) => 
          index === self.findIndex(r => r.documentId === result.documentId && r.chunkIndex === result.chunkIndex)
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
      
      // Criar contexto resumido
      const contextSummary = this.createContextSummary(uniqueResults, type)
      
      return {
        relevantDocuments: uniqueResults.map(result => ({
          content: result.content,
          fileName: result.fileName,
          score: result.score,
          category: result.metadata?.category || 'geral'
        })),
        searchQueries: queries,
        contextSummary
      }
      
    } catch (error) {
      console.error('Erro ao buscar contexto RAG:', error)
      return {
        relevantDocuments: [],
        searchQueries: [],
        contextSummary: ''
      }
    }
  }
  
  private createContextSummary(results: any[], analysisType: string): string {
    if (results.length === 0) {
      return 'Nenhum contexto adicional encontrado na base de conhecimento.'
    }
    
    const summary = results
      .map((result, index) => `${index + 1}. ${result.fileName}: ${result.content.substring(0, 200)}...`)
      .join('\n\n')
    
    return `Contexto relevante da base de conhecimento para ${analysisType}:\n\n${summary}`
  }
  
  async generateEnhancedAnalysis(params: RAGEnhancedAnalysisParams) {
    try {
      // 1. Buscar contexto RAG relevante
      const ragContext = await this.searchRelevantContext(
        params.type,
        params.inputData,
        params.companyId
      )
      
      // 2. Construir prompt enriquecido com contexto RAG
      const enhancedPromptData = {
        type: params.type === 'treatment-plan' ? 'treatment' as const : params.type,
        inputData: params.inputData,
        patientData: params.patientData,
        knowledgeBase: ragContext.contextSummary
      }
      
      // 3. Gerar análise com contexto enriquecido
      const provider = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY || ''
      }
      
      const response = await AIService.generateAnalysis(provider, enhancedPromptData)
      
      return {
        analysis: response.content,
        ragContext,
        metadata: {
          enhancedWithRAG: true,
          documentsUsed: ragContext.relevantDocuments.length,
          searchQueries: ragContext.searchQueries,
          processingTime: response.tokensUsed || 0
        }
      }
      
    } catch (error) {
      console.error('Erro na análise enriquecida com RAG:', error)
      throw error
    }
  }
  
  // Método para validar se há documentos suficientes na base
  async checkRAGAvailability(companyId: string, analysisType: string): Promise<{
    available: boolean
    documentCount: number
    suggestedCategories: string[]
  }> {
    try {
      const stats = await RAGService.getDocumentStats(companyId)
      const relevantCategories = this.getCategoriesForAnalysis(analysisType)
      
      const relevantDocCount = stats.categories
        .filter(cat => relevantCategories.includes(cat.category))
        .reduce((sum, cat) => sum + cat.count, 0)
      
      return {
        available: relevantDocCount > 0,
        documentCount: relevantDocCount,
        suggestedCategories: relevantCategories
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade RAG:', error)
      return {
        available: false,
        documentCount: 0,
        suggestedCategories: []
      }
    }
  }
}

export default new RAGAnalysisService() 