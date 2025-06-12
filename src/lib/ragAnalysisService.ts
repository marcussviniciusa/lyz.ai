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
  specificContext?: {
    protocols?: string[]
    evidenceLevel?: string
    clinicalRecommendations?: string[]
  }
}

class RAGAnalysisService {
  
  /**
   * Gera queries inteligentes baseadas no tipo de análise e dados da paciente
   */
  private getRAGSearchQueries(type: string, inputData: any, patientData?: any): string[] {
    const queries: string[] = []
    
    // Queries baseadas no perfil da paciente
    if (patientData) {
      const age = patientData.age || 0
      const symptoms = patientData.mainSymptoms || []
      const menstrualStatus = patientData.menstrualHistory?.menopausalStatus || 'pre'
      
      // Queries contextuais por idade e status hormonal
      if (age >= 40 && menstrualStatus === 'pre') {
        queries.push('perimenopausa sintomas tratamento')
        queries.push('transição hormonal mulher 40 anos')
      }
      
      if (menstrualStatus === 'post') {
        queries.push('menopausa medicina funcional')
        queries.push('reposição hormonal bioidêntica')
      }
      
      // Queries por sintomas principais
      symptoms.forEach((symptom: any) => {
        const symptomText = typeof symptom === 'string' ? symptom : symptom.symptom
        queries.push(`tratamento ${symptomText} medicina integrativa`)
        queries.push(`${symptomText} mulher ${menstrualStatus}menopausal`)
      })
    }
    
    switch (type) {
      case 'laboratory':
        // Queries para análise laboratorial enriquecida
        if (inputData.laboratoryManualData) {
          const labText = inputData.laboratoryManualData.toLowerCase()
          
          // Detectar hormônios alterados
          if (labText.includes('tsh') || labText.includes('tireoide')) {
            queries.push('TSH alterado medicina funcional protocolo')
            queries.push('disfunção tireoidiana tratamento natural')
            queries.push('hashimoto hipotireoidismo fitoterapia')
          }
          
          if (labText.includes('testosterona') || labText.includes('dhea')) {
            queries.push('testosterona baixa mulher tratamento')
            queries.push('DHEA suplementação protocolo')
            queries.push('androgens femininos medicina funcional')
          }
          
          if (labText.includes('insulina') || labText.includes('glicose')) {
            queries.push('resistência insulina protocolo tratamento')
            queries.push('síndrome metabólica medicina funcional')
            queries.push('diabetes tipo 2 prevenção natural')
          }
          
          if (labText.includes('cortisol') || labText.includes('adrenal')) {
            queries.push('fadiga adrenal cortisol protocolo')
            queries.push('estresse crônico eixo HPA')
            queries.push('adaptógenos cortisol medicina funcional')
          }
          
          if (labText.includes('vitamina d') || labText.includes('b12')) {
            queries.push('deficiência vitamina D protocolo')
            queries.push('vitamina B12 suplementação dosagem')
            queries.push('micronutrientes medicina funcional')
          }
        }
        
        queries.push('interpretação exames medicina funcional')
        queries.push('valores referência funcionais laboratório')
        break
        
      case 'tcm':
        // Queries específicas para MTC com base nos dados de entrada
        if (inputData.lingualObservation || inputData.tongueColor) {
          const tongueColor = inputData.tongueColor || inputData.lingualObservation?.color
          if (tongueColor) {
            queries.push(`língua ${tongueColor} diagnóstico MTC`)
            queries.push(`saburra lingual ${tongueColor} medicina chinesa`)
          }
        }
        
        if (inputData.pulseAnalysis) {
          const pulseDesc = typeof inputData.pulseAnalysis === 'object' 
            ? (inputData.pulseAnalysis.quality || inputData.pulseAnalysis.rate || inputData.pulseAnalysis.strength || 'Fraco')
            : inputData.pulseAnalysis;
          queries.push(`pulso ${pulseDesc} MTC`)
          queries.push('diagnóstico pelo pulso medicina chinesa')
        }
        
        // Sintomas específicos da MTC
        if (patientData?.mainSymptoms) {
          patientData.mainSymptoms.forEach((symptom: any) => {
            const symptomText = typeof symptom === 'string' ? symptom : symptom.symptom
            queries.push(`${symptomText} padrão energético MTC`)
            queries.push(`${symptomText} acupuntura pontos tratamento`)
            queries.push(`${symptomText} fitoterapia chinesa fórmula`)
          })
        }
        
        // Queries por padrões energéticos femininos
        queries.push('padrões MTC ginecologia feminina')
        queries.push('irregularidade menstrual medicina chinesa')
        queries.push('Qi sangue estagnação mulher')
        queries.push('yang deficiência rim sintomas')
        queries.push('fígado qi estagnação TPM')
        
        break
        
      case 'chronology':
        // Queries para cronologia de saúde
        if (inputData.significantEvents) {
          inputData.significantEvents.forEach((event: any) => {
            queries.push(`${event.category} ${event.description} impacto saúde`)
            queries.push(`evento traumático ${event.type} sequelas`)
            queries.push(`gatilho autoimune ${event.category}`)
          })
        }
        
        if (inputData.symptomEvolution) {
          Object.keys(inputData.symptomEvolution).forEach((symptom: string) => {
            queries.push(`evolução ${symptom} cronologia`)
            queries.push(`progressão ${symptom} fatores agravantes`)
            queries.push(`${symptom} timeline medicina funcional`)
          })
        }
        
        // Queries por fases da vida feminina
        queries.push('cronologia hormonal feminina marcos')
        queries.push('eventos vida mulher impacto saúde')
        queries.push('trauma emocional doenças autoimunes')
        queries.push('estresse crônico eixo hipotalamo hipofise')
        
        break
        
      case 'ifm':
        // Queries específicas para cada sistema da Matriz IFM
        const systemQueries = {
          assimilation: [
            'disbiose intestinal protocolo tratamento',
            'permeabilidade intestinal medicina funcional',
            'microbioma feminino estrogênio',
            'SIBO tratamento natural'
          ],
          defenseRepair: [
            'autoimunidade mulher protocolo',
            'inflamação crônica medicina funcional',
            'modulação imune natural',
            'tireoidite hashimoto tratamento'
          ],
          energy: [
            'fadiga mitocondrial protocolo',
            'produção energia celular suplementos',
            'cansaço crônico medicina funcional',
            'ATP mitocôndrias nutrientes'
          ],
          biotransformation: [
            'detoxificação hepática protocolo',
            'fase 1 fase 2 detox suplementos',
            'sobrecarga tóxica tratamento',
            'metabolismo estrogênio fígado'
          ],
          transport: [
            'saúde cardiovascular mulher',
            'circulação sanguínea medicina funcional',
            'hipertensão tratamento natural',
            'colesterol protocolo integrativo'
          ],
          communication: [
            'desequilíbrio hormonal protocolo',
            'neurotransmissores medicina funcional',
            'eixo HPA regulação',
            'serotonina dopamina suplementação'
          ],
          structuralIntegrity: [
            'saúde óssea mulher medicina funcional',
            'osteoporose prevenção natural',
            'colágeno articulações suplementos',
            'densidade óssea protocolo'
          ]
        }
        
        // Adicionar queries específicas baseadas nos sistemas afetados
        Object.keys(systemQueries).forEach(system => {
          if (inputData[system] && Object.values(inputData[system]).some(value => value)) {
            queries.push(...systemQueries[system as keyof typeof systemQueries])
          }
        })
        
        queries.push('matriz IFM medicina funcional')
        queries.push('sistemas corporais interconexões')
        queries.push('causas raiz doenças crônicas')
        
        break
        
      case 'treatment-plan':
        // Queries para plano de tratamento integrado
        queries.push('plano tratamento medicina funcional')
        queries.push('protocolo terapêutico integrativo')
        queries.push('cronograma acompanhamento paciente')
        queries.push('medicina personalizada feminina')
        
        // Baseado em diagnósticos anteriores
        if (inputData.primaryDiagnosis) {
          queries.push(`protocolo ${inputData.primaryDiagnosis}`)
          queries.push(`tratamento ${inputData.primaryDiagnosis} medicina funcional`)
          queries.push(`${inputData.primaryDiagnosis} suplementação natural`)
        }
        
        // Queries por prioridades terapêuticas
        if (inputData.therapeuticPriorities) {
          inputData.therapeuticPriorities.forEach((priority: string) => {
            queries.push(`protocolo ${priority}`)
            queries.push(`tratamento ${priority} medicina integrativa`)
          })
        }
        
        break
    }
    
             return Array.from(new Set(queries)).slice(0, 8) // Remover duplicatas e limitar a 8 queries
  }
  
  /**
   * Mapeia categorias de documentos por tipo de análise
   * CONFIGURADO PARA USAR APENAS "cursos-transcricoes" para todas as análises de IA
   */
  private getCategoriesForAnalysis(type: string): string[] {
    // FORÇAR todas as análises de IA a usarem apenas cursos-transcricoes
    const analysisTypesForCursos = ['tcm', 'chronology', 'ifm', 'treatment-plan', 'laboratory'];
    
    if (analysisTypesForCursos.includes(type)) {
      console.log(`🎓 FORÇANDO categoria "cursos-transcricoes" para análise: ${type}`);
      return ['cursos-transcricoes'];
    }
    
    // Fallback para outros tipos (se houver)
    return ['cursos-transcricoes'];
  }
  
  /**
   * Busca contexto relevante com foco em "cursos-transcricoes"
   * Configurado para usar apenas a categoria especificada
   */
  async searchRelevantContext(
    type: string, 
    inputData: any, 
    companyId: string,
    patientData?: any,
    maxResults: number = 5
  ): Promise<RAGContext> {
    try {
      const queries = this.getRAGSearchQueries(type, inputData, patientData)
      const categories = this.getCategoriesForAnalysis(type)
      
      console.log(`🔍 RAG Queries para ${type}:`, queries)
      console.log(`📂 Categorias de busca (APENAS cursos-transcricoes):`, categories)
      
      // Estratégia ÚNICA: Busca apenas em "cursos-transcricoes" (threshold MUITO baixo para garantir resultados)
      const specificResults = await this.searchByQueries(queries, categories, companyId, 0.1)
      
      // REMOVIDA: Busca global para manter foco apenas em cursos-transcricoes
      // REMOVIDA: Busca ampla para manter foco apenas em cursos-transcricoes
      
      // Usar apenas resultados da categoria específica
      const uniqueResults = this.deduplicateResults(specificResults).slice(0, maxResults)
      
      console.log(`📊 RAG encontrou ${uniqueResults.length} documentos relevantes em "cursos-transcricoes"`)
      console.log(`📈 Distribuição: ${specificResults.length} documentos de cursos`)
      
      // Criar contexto enriquecido
      const contextSummary = this.createEnhancedContextSummary(uniqueResults, type, patientData)
      const specificContext = this.extractSpecificContext(uniqueResults, type)
      
      return {
        relevantDocuments: uniqueResults.map(result => ({
          content: result.content,
          fileName: result.fileName,
          score: result.score,
          category: result.metadata?.category || 'cursos-transcricoes'
        })),
        searchQueries: queries,
        contextSummary,
        specificContext
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar contexto RAG:', error)
      return {
        relevantDocuments: [],
        searchQueries: [],
        contextSummary: 'Base de conhecimento não disponível.',
        specificContext: {}
      }
    }
  }
  
  /**
   * Busca por múltiplas queries e categorias
   */
  private async searchByQueries(
    queries: string[], 
    categories: string[], 
    companyId: string, 
    threshold: number
  ): Promise<any[]> {
    console.log(`🔧 Ajustando threshold para ${threshold} e limit para 5 chunks por busca`);
    
    const searchPromises = queries.flatMap(query => 
      categories.map(category => 
        RAGService.searchDocuments({
          query,
          companyId,
          category,
          limit: 5, // Aumentado de 2 para 5
          threshold: Math.min(threshold, 0.1) // Força threshold máximo de 0.1
        }).catch(error => {
          console.warn(`Busca falhou para "${query}" em "${category}":`, error.message)
          return []
        })
      )
    )
    
    const results = await Promise.all(searchPromises)
    return results.flat()
  }
  
  /**
   * Remove resultados duplicados
   */
  private deduplicateResults(results: any[]): any[] {
    const seen = new Set()
    return results
      .filter(result => {
        const key = `${result.documentId}-${result.chunkIndex}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => b.score - a.score)
  }
  
  /**
   * Cria resumo contextual enriquecido
   * Destaca documentos multi-tópico como transcrições de cursos
   */
  private createEnhancedContextSummary(results: any[], analysisType: string, patientData?: any): string {
    if (results.length === 0) {
      return 'Nenhum protocolo específico encontrado na base de conhecimento. Proceda com diretrizes gerais da medicina funcional.'
    }
    
    const patientContext = patientData ? 
      `Paciente: ${patientData.name || 'N/A'}, ${patientData.age || 'N/A'} anos, Status: ${patientData.menstrualHistory?.menopausalStatus || 'N/A'}` : ''
    
    const typeLabels = {
      laboratory: 'análise laboratorial funcional',
      tcm: 'medicina tradicional chinesa',
      chronology: 'cronologia de saúde',
      ifm: 'matriz IFM',
      'treatment-plan': 'plano de tratamento integrativo'
    }
    
    // Identificar documentos multi-tópico (ex: transcrições de cursos)
    const documentGroups: Record<string, any[]> = results.reduce((groups: Record<string, any[]>, result) => {
      const fileName = result.fileName
      if (!groups[fileName]) {
        groups[fileName] = []
      }
      groups[fileName].push(result)
      return groups
    }, {})
    
    // Identificar se há documentos abrangentes (múltiplos chunks do mesmo documento)
    const comprehensiveDocuments = Object.entries(documentGroups)
      .filter(([fileName, chunks]) => chunks.length >= 2)
      .map(([fileName, chunks]) => ({ 
        fileName, 
        chunkCount: chunks.length, 
        avgScore: chunks.reduce((sum: number, c: any) => sum + c.score, 0) / chunks.length 
      }))
    
    const contextHeader = `=== CONTEXTO CIENTÍFICO PARA ${typeLabels[analysisType as keyof typeof typeLabels]?.toUpperCase()} ===
${patientContext ? `\nPERFIL DA PACIENTE: ${patientContext}` : ''}

${comprehensiveDocuments.length > 0 ? 
`📚 DOCUMENTOS ABRANGENTES IDENTIFICADOS:
${comprehensiveDocuments.map(doc => 
  `• ${doc.fileName} (${doc.chunkCount} seções relevantes, relevância média: ${(doc.avgScore * 100).toFixed(1)}%)`
).join('\n')}

` : ''}EVIDÊNCIAS CIENTÍFICAS DISPONÍVEIS:`
    
    const evidenceList = results
      .slice(0, 5) // Limitar a 5 melhores resultados
      .map((result, index) => {
        const confidence = result.score > 0.8 ? '🔬 ALTA' : result.score > 0.6 ? '📊 MÉDIA' : '📖 BAIXA'
        const isFromComprehensive = comprehensiveDocuments.some(doc => doc.fileName === result.fileName)
        const sourceIndicator = isFromComprehensive ? '📚 [CURSO/FONTE ABRANGENTE]' : ''
        
        return `\n${index + 1}. [${confidence}] ${result.fileName} ${sourceIndicator}:\n   ${result.content.substring(0, 300)}...`
      })
      .join('\n')
    
    const footer = `\n\n=== INSTRUÇÕES ===
Utilize estas evidências científicas para fundamentar suas recomendações.
${comprehensiveDocuments.length > 0 ? 
'⚡ ATENÇÃO: Documentos marcados como "CURSO/FONTE ABRANGENTE" contêm múltiplas seções relevantes - considere o contexto amplo.\n' : ''
}Cite as fontes quando aplicável e adapte os protocolos ao perfil específico da paciente.`
    
    return `${contextHeader}${evidenceList}${footer}`
  }
  
  /**
   * Extrai contexto específico por tipo
   */
  private extractSpecificContext(results: any[], type: string): any {
    const protocols = new Set<string>()
    const recommendations = new Set<string>()
    
    results.forEach(result => {
      const content = result.content.toLowerCase()
      
             // Extrair protocolos mencionados
       const protocolMatches = content.match(/protocolo[s]?\s+[a-zA-Z\s]{3,30}/g)
       protocolMatches?.forEach((match: string) => protocols.add(match.trim()))
       
       // Extrair recomendações
       const recMatches = content.match(/(recomenda-se|sugere-se|indica-se)[^.]{10,100}/g)
       recMatches?.forEach((match: string) => recommendations.add(match.trim()))
    })
    
    return {
      protocols: Array.from(protocols).slice(0, 5),
      evidenceLevel: results.length > 3 ? 'alta' : results.length > 1 ? 'média' : 'baixa',
      clinicalRecommendations: Array.from(recommendations).slice(0, 5)
    }
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