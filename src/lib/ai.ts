import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface AIProvider {
  provider: 'openai' | 'anthropic' | 'google'
  model: string
  apiKey: string
}

export interface AIResponse {
  content: string
  tokensUsed: number
  processingTime: number
  cost: number
}

export interface AIPromptData {
  type: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatment'
  inputData: any
  patientData: any
  previousAnalyses?: any[]
  knowledgeBase?: string
}

class AIService {
  private openaiClient: OpenAI | null = null
  private anthropicClient: Anthropic | null = null
  private googleClient: GoogleGenerativeAI | null = null

  constructor() {
    // Inicializar clientes conforme disponibilidade das chaves
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      })
    }

    if (process.env.GOOGLE_AI_API_KEY) {
      this.googleClient = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
    }
  }

  /**
   * Gerar análise usando o provedor especificado
   */
  async generateAnalysis(
    provider: AIProvider,
    promptData: AIPromptData
  ): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      let response: string
      let tokensUsed = 0

      switch (provider.provider) {
        case 'openai':
          const openaiResult = await this.callOpenAI(provider, promptData)
          response = openaiResult.content
          tokensUsed = openaiResult.tokensUsed
          break

        case 'anthropic':
          const anthropicResult = await this.callAnthropic(provider, promptData)
          response = anthropicResult.content
          tokensUsed = anthropicResult.tokensUsed
          break

        case 'google':
          const googleResult = await this.callGoogle(provider, promptData)
          response = googleResult.content
          tokensUsed = googleResult.tokensUsed
          break

        default:
          throw new Error(`Provedor não suportado: ${provider.provider}`)
      }

      const processingTime = Date.now() - startTime
      const cost = this.calculateCost(provider, tokensUsed)

      return {
        content: response,
        tokensUsed,
        processingTime,
        cost
      }
    } catch (error) {
      console.error('Erro na geração de análise:', error)
      throw new Error('Falha na geração da análise de IA')
    }
  }

  /**
   * Chamar OpenAI
   */
  private async callOpenAI(provider: AIProvider, promptData: AIPromptData) {
    if (!this.openaiClient) {
      throw new Error('Cliente OpenAI não inicializado')
    }

    const prompt = this.buildPrompt(promptData)

    const completion = await this.openaiClient.chat.completions.create({
      model: provider.model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(promptData.type)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    })

    return {
      content: completion.choices[0]?.message?.content || '',
      tokensUsed: completion.usage?.total_tokens || 0
    }
  }

  /**
   * Chamar Anthropic
   */
  private async callAnthropic(provider: AIProvider, promptData: AIPromptData) {
    if (!this.anthropicClient) {
      throw new Error('Cliente Anthropic não inicializado')
    }

    const prompt = this.buildPrompt(promptData)

    const message = await this.anthropicClient.messages.create({
      model: provider.model,
      max_tokens: 4000,
      temperature: 0.7,
      system: this.getSystemPrompt(promptData.type),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const content = message.content[0]
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens

    return {
      content: content.type === 'text' ? content.text : '',
      tokensUsed
    }
  }

  /**
   * Chamar Google AI
   */
  private async callGoogle(provider: AIProvider, promptData: AIPromptData) {
    if (!this.googleClient) {
      throw new Error('Cliente Google AI não inicializado')
    }

    const model = this.googleClient.getGenerativeModel({ model: provider.model })
    const prompt = this.buildPrompt(promptData)
    const fullPrompt = `${this.getSystemPrompt(promptData.type)}\n\n${prompt}`

    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()

    return {
      content: text,
      tokensUsed: 0 // Google não fornece contagem de tokens na resposta
    }
  }

  /**
   * Construir prompt baseado no tipo de análise
   */
  private buildPrompt(promptData: AIPromptData): string {
    const { type, inputData, patientData, previousAnalyses, knowledgeBase } = promptData

    let prompt = `
DADOS DA PACIENTE:
${JSON.stringify(patientData, null, 2)}

DADOS DE ENTRADA PARA ANÁLISE:
${JSON.stringify(inputData, null, 2)}
`

    if (previousAnalyses && previousAnalyses.length > 0) {
      prompt += `
ANÁLISES ANTERIORES:
${JSON.stringify(previousAnalyses, null, 2)}
`
    }

    if (knowledgeBase) {
      prompt += `
CONHECIMENTO ESPECIALIZADO RELEVANTE:
${knowledgeBase}
`
    }

    prompt += this.getSpecificInstructions(type)

    return prompt
  }

  /**
   * Obter prompt do sistema baseado no tipo de análise
   */
  private getSystemPrompt(type: string): string {
    const basePrompt = `
Você é uma assistente especializada em saúde feminina e ciclicidade, com conhecimento avançado em medicina funcional, medicina tradicional chinesa e abordagens integrativas.

Sua função é analisar dados médicos e fornecer interpretações clínicas estruturadas e baseadas em evidências científicas.

DIRETRIZES GERAIS:
- Seja precisa e baseada em evidências
- Use linguagem técnica mas compreensível
- Estruture as respostas de forma clara e organizada
- Considere as peculiaridades da saúde feminina e ciclicidade
- Integre conhecimentos de medicina funcional quando relevante
- Seja cautelosa com recomendações e sempre indique a necessidade de supervisão profissional
`

    switch (type) {
      case 'laboratory':
        return basePrompt + `
FOCO ESPECÍFICO: ANÁLISE LABORATORIAL
- Interprete exames laboratoriais com foco em medicina funcional
- Compare valores convencionais com faixas funcionais
- Identifique padrões relacionados à saúde hormonal feminina
- Priorize alterações por relevância clínica
- Forneça interpretação contextualizada
`

      case 'tcm':
        return basePrompt + `
FOCO ESPECÍFICO: MEDICINA TRADICIONAL CHINESA
- Analise sob a perspectiva da MTC
- Considere padrões energéticos e desequilíbrios
- Recomende fitoterapia chinesa quando apropriado
- Sugira pontos de acupuntura relevantes
- Integre com ciclo menstrual quando aplicável
`

      case 'chronology':
        return basePrompt + `
FOCO ESPECÍFICO: CRONOLOGIA DA SAÚDE
- Crie linha temporal dos eventos de saúde
- Identifique padrões e correlações temporais
- Destaque momentos críticos na história
- Relacione eventos com ciclo de vida hormonal
- Identifique possíveis gatilhos e fatores causais
`

      case 'ifm':
        return basePrompt + `
FOCO ESPECÍFICO: MATRIZ DE MEDICINA FUNCIONAL
- Analise pelos 7 sistemas funcionais do IFM
- Identifique causas raiz dos desequilíbrios
- Estabeleça conexões sistêmicas
- Priorize intervenções por impacto
- Considere interações entre sistemas
`

      case 'treatment':
        return basePrompt + `
FOCO ESPECÍFICO: PLANO DE TRATAMENTO
- Integre todas as análises anteriores
- Crie plano personalizado e estruturado
- Estabeleça objetivos terapêuticos claros
- Priorize intervenções por eficácia e segurança
- Inclua cronograma de acompanhamento
- Forneça orientações claras para a paciente
`

      default:
        return basePrompt
    }
  }

  /**
   * Obter instruções específicas para cada tipo de análise
   */
  private getSpecificInstructions(type: string): string {
    switch (type) {
      case 'laboratory':
        return `
FORMATE A RESPOSTA COMO JSON COM A SEGUINTE ESTRUTURA:
{
  "interpretation": "Interpretação geral dos exames",
  "alteredValues": [
    {
      "parameter": "Nome do parâmetro",
      "value": "Valor encontrado",
      "referenceRange": "Faixa de referência",
      "interpretation": "Interpretação específica",
      "priority": "low|medium|high"
    }
  ],
  "functionalMedicineComparison": [
    {
      "parameter": "Nome do parâmetro",
      "conventionalRange": "Faixa convencional",
      "functionalRange": "Faixa funcional",
      "status": "Status do parâmetro"
    }
  ],
  "recommendations": ["Lista de recomendações"]
}
`

      case 'tcm':
        return `
FORMATE A RESPOSTA COMO JSON COM A SEGUINTE ESTRUTURA:
{
  "energeticDiagnosis": "Diagnóstico energético segundo MTC",
  "phytotherapyRecommendations": [
    {
      "herb": "Nome da erva",
      "dosage": "Dosagem recomendada",
      "duration": "Duração do tratamento",
      "purpose": "Finalidade terapêutica"
    }
  ],
  "acupunctureRecommendations": {
    "points": ["Lista de pontos"],
    "frequency": "Frequência das sessões",
    "duration": "Duração do tratamento"
  },
  "lifestyleRecommendations": ["Recomendações de estilo de vida"]
}
`

      case 'chronology':
        return `
FORMATE A RESPOSTA COMO JSON COM A SEGUINTE ESTRUTURA:
{
  "timeline": [
    {
      "date": "Data do evento",
      "event": "Descrição do evento",
      "category": "menstrual|symptom|treatment|lifestyle|other",
      "impact": "Impacto na saúde"
    }
  ],
  "patterns": [
    {
      "pattern": "Padrão identificado",
      "frequency": "Frequência do padrão",
      "triggers": ["Gatilhos identificados"]
    }
  ],
  "criticalMoments": [
    {
      "date": "Data do momento crítico",
      "event": "Evento crítico",
      "significance": "Significado para a saúde"
    }
  ]
}
`

      case 'ifm':
        return `
FORMATE A RESPOSTA COMO JSON COM A SEGUINTE ESTRUTURA:
{
  "systemsAssessment": [
    {
      "system": "assimilation|defense|energy|biotransformation|transport|communication|structure",
      "status": "optimal|suboptimal|dysfunctional",
      "findings": ["Achados específicos"],
      "priority": 1-7
    }
  ],
  "rootCauses": ["Causas raiz identificadas"],
  "systemicConnections": [
    {
      "primary": "Sistema primário",
      "secondary": "Sistema secundário",
      "connection": "Descrição da conexão"
    }
  ],
  "treatmentPriorities": [
    {
      "priority": 1-5,
      "system": "Sistema a ser tratado",
      "intervention": "Intervenção recomendada",
      "rationale": "Justificativa"
    }
  ]
}
`

      case 'treatment':
        return `
FORMATE A RESPOSTA COMO JSON COM A SEGUINTE ESTRUTURA:
{
  "executiveSummary": "Resumo executivo do caso",
  "diagnosticSynthesis": "Síntese diagnóstica",
  "therapeuticObjectives": ["Objetivos terapêuticos"],
  "interventions": [
    {
      "category": "nutrition|supplementation|lifestyle|medication|therapy|monitoring",
      "intervention": "Descrição da intervenção",
      "dosage": "Dosagem (se aplicável)",
      "frequency": "Frequência",
      "duration": "Duração",
      "rationale": "Justificativa",
      "priority": 1-5
    }
  ],
  "followUpSchedule": [
    {
      "timeframe": "Prazo para retorno",
      "type": "consultation|exam|assessment",
      "objectives": ["Objetivos do retorno"]
    }
  ],
  "expectedOutcomes": ["Resultados esperados"],
  "contraindications": ["Contraindicações"],
  "patientGuidelines": ["Orientações para a paciente"]
}
`

      default:
        return 'Forneça uma análise estruturada e detalhada.'
    }
  }

  /**
   * Calcular custo estimado baseado no provedor e tokens utilizados
   */
  private calculateCost(provider: AIProvider, tokensUsed: number): number {
    // Preços aproximados por 1000 tokens (valores de exemplo)
    const pricing: Record<string, Record<string, number>> = {
      openai: {
        'gpt-4o-mini': 0.0015,
        'gpt-4.5': 0.03,
        'gpt-4.1-mini': 0.002
      },
      anthropic: {
        'claude-3-5-sonnet-20241022': 0.003,
        'claude-3-5-haiku-20241022': 0.001
      },
      google: {
        'gemini-1.5-flash': 0.001,
        'gemini-1.5-pro': 0.005
      }
    }

    const modelPrice = pricing[provider.provider]?.[provider.model] || 0.002
    return (tokensUsed / 1000) * modelPrice
  }

  /**
   * Gerar embeddings para RAG
   */
  async generateEmbeddings(text: string, model: string = 'text-embedding-ada-002'): Promise<number[]> {
    if (!this.openaiClient) {
      throw new Error('Cliente OpenAI não disponível para embeddings')
    }

    try {
      const response = await this.openaiClient.embeddings.create({
        model,
        input: text
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('Erro ao gerar embeddings:', error)
      throw new Error('Falha na geração de embeddings')
    }
  }
}

export default new AIService() 