import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import ChronologyAnalysis from '@/models/ChronologyAnalysis'
import Patient from '@/models/Patient'
import Company from '@/models/Company'
import User from '@/models/User'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { patientId, chronologyData } = await request.json()

    // Verificar se o usuário existe e pegar dados da empresa
    const user = await User.findById(session.user.id).populate('company')
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const company = user.company as any
    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    // Verificar se a paciente existe e pertence à empresa
    const patient = await Patient.findOne({ 
      _id: patientId, 
      company: company._id 
    })
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrada' }, { status: 404 })
    }

    // Verificar configurações de IA
    if (!company.aiSettings?.openai?.apiKey) {
      return NextResponse.json({ 
        error: 'Configuração de IA não encontrada' 
      }, { status: 400 })
    }

    // Inicializar OpenAI
    const openai = new OpenAI({
      apiKey: company.aiSettings.openai.apiKey
    })

    const model = company.aiSettings.openai.defaultModel || 'gpt-4o-mini'
    const temperature = company.aiSettings.openai.temperature || 0.3

    // Prompt especializado para análise cronológica
    const systemPrompt = `Você é um especialista em medicina funcional e saúde da mulher, especializado em análise cronológica de histórias clínicas.

Sua tarefa é analisar a cronologia de eventos na vida de uma paciente e identificar padrões temporais, correlações hormonais e momentos críticos que influenciam sua saúde atual.

Analise os dados fornecidos e forneça uma análise estruturada seguindo EXATAMENTE o formato JSON especificado.

DIRETRIZES PARA ANÁLISE CRONOLÓGICA:

1. TIMELINE CONSOLIDADA:
   - Organize eventos por períodos históricos (infância, adolescência, idade reprodutiva, etc.)
   - Identifique fases hormonais (pré-menarca, menarca, ciclos regulares, irregularidades, etc.)
   - Correlacione eventos de vida com mudanças sintomáticas

2. IDENTIFICAÇÃO DE PADRÕES:
   - Padrões cíclicos relacionados ao ciclo menstrual
   - Gatilhos recorrentes de sintomas
   - Padrões de resposta a tratamentos

3. MOMENTOS CRÍTICOS:
   - Eventos que causaram mudanças significativas na saúde
   - Pontos de inflexão na progressão sintomática
   - Janelas de oportunidade terapêutica perdidas

4. CORRELAÇÕES HORMONAIS:
   - Relacione eventos com fases hormonais específicas
   - Identifique disruptores endócrinos
   - Analise impacto de contraceptivos hormonais

5. PROGNÓSTICO TEMPORAL:
   - Baseie-se em padrões históricos identificados
   - Considere fatores de progressão ou melhora
   - Identifique janelas terapêuticas futuras

Responda EXCLUSIVAMENTE em formato JSON válido, sem texto adicional.`

    const userPrompt = `Analise a cronologia desta paciente:

DADOS DA PACIENTE:
- Nome: ${patient.name}
- Idade: ${patient.age} anos
- Sintomas principais: ${patient.mainSymptoms.map((s: any) => s.symptom).join(', ')}

HISTÓRICO MENSTRUAL:
- Menarca: ${patient.menstrualHistory.menarche} anos
- Ciclo: ${patient.menstrualHistory.cycleLength} dias
- Duração menstruação: ${patient.menstrualHistory.menstruationLength} dias
- Status menopausal: ${patient.menstrualHistory.menopausalStatus}
- Contraceptivos: ${patient.menstrualHistory.contraceptiveUse || 'Não informado'}

DADOS CRONOLÓGICOS:
${JSON.stringify(chronologyData, null, 2)}

Forneça uma análise cronológica estruturada no seguinte formato JSON:

{
  "consolidatedTimeline": [
    {
      "period": "string (ex: 'Infância (0-12 anos)')",
      "phase": "string (ex: 'Pré-menarca')",
      "keyEvents": ["string"],
      "hormonalChanges": ["string"],
      "symptomChanges": ["string"],
      "treatmentResponses": ["string"]
    }
  ],
  "patterns": {
    "cyclicalPatterns": [
      {
        "pattern": "string",
        "frequency": "string",
        "description": "string",
        "relatedHormones": ["string"]
      }
    ],
    "triggerPatterns": [
      {
        "trigger": "string",
        "symptoms": ["string"],
        "timeframe": "string",
        "mechanism": "string"
      }
    ],
    "treatmentPatterns": [
      {
        "treatment": "string",
        "responseTime": "string",
        "effectiveness": "string",
        "bestResponders": "string"
      }
    ]
  },
  "criticalMoments": [
    {
      "date": "YYYY-MM-DD",
      "event": "string",
      "impact": "string",
      "cascadeEffects": ["string"],
      "recommendedIntervention": "string"
    }
  ],
  "hormonalCorrelations": [
    {
      "hormone": "string",
      "lifePhase": "string",
      "symptoms": ["string"],
      "interventions": ["string"]
    }
  ],
  "temporalPrognosis": {
    "shortTerm": "string (3-6 meses)",
    "mediumTerm": "string (6-12 meses)",
    "longTerm": "string (1-2 anos)",
    "keyMilestones": ["string"]
  },
  "therapeuticWindows": [
    {
      "period": "string",
      "opportunity": "string",
      "recommendedActions": ["string"],
      "expectedOutcomes": "string"
    }
  ],
  "chronologicalSynthesis": "string (síntese completa da análise cronológica)"
}`

    const startTime = Date.now()
    
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: 4000
    })

    const processingTime = (Date.now() - startTime) / 1000

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('Resposta vazia da IA')
    }

    // Parse da resposta JSON
    let analysisResult
    try {
      analysisResult = JSON.parse(content)
    } catch (error) {
      console.error('Erro ao fazer parse da resposta:', content)
      throw new Error('Resposta da IA não está em formato JSON válido')
    }

    // Calcular custo
    const promptTokens = completion.usage?.prompt_tokens || 0
    const completionTokens = completion.usage?.completion_tokens || 0
    const totalTokens = completion.usage?.total_tokens || 0
    
    // Preços por 1k tokens (exemplo para GPT-4o-mini)
    const inputCostPer1k = 0.00015 // $0.00015
    const outputCostPer1k = 0.0006 // $0.0006
    
    const cost = ((promptTokens * inputCostPer1k) + (completionTokens * outputCostPer1k)) / 1000

    // Salvar análise no banco
    const analysis = new ChronologyAnalysis({
      company: company._id,
      professional: user._id,
      patient: patient._id,
      inputData: chronologyData,
      analysis: analysisResult,
      aiMetadata: {
        model,
        provider: 'openai',
        promptTokens,
        completionTokens,
        totalTokens,
        cost,
        processingTime,
        temperature,
        reasoning: 'Análise cronológica baseada em padrões temporais e correlações hormonais'
      },
      status: 'completed'
    })

    await analysis.save()

    // Atualizar estatísticas da empresa
    await Company.findByIdAndUpdate(company._id, {
      $inc: {
        'usage.totalAnalyses': 1,
        'usage.totalTokens': totalTokens,
        'usage.totalCost': cost
      }
    })

    return NextResponse.json({
      analysisId: analysis._id,
      analysis: analysisResult,
      aiMetadata: {
        model,
        totalTokens,
        cost,
        processingTime
      },
      createdAt: analysis.createdAt
    })

  } catch (error) {
    console.error('Erro na análise cronológica:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')

    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const query: any = { 
      company: user.company,
      professional: user._id 
    }

    if (patientId) {
      query.patient = patientId
    }

    const analyses = await ChronologyAnalysis
      .find(query)
      .populate('patient', 'name age')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)

    const total = await ChronologyAnalysis.countDocuments(query)

    return NextResponse.json({
      analyses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar análises cronológicas:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
} 