import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import IFMAnalysis from '@/models/IFMAnalysis'
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

    const { patientId, ifmData } = await request.json()

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

    // Prompt especializado para análise IFM
    const systemPrompt = `Você é um especialista em medicina funcional certificado pelo IFM (Institute for Functional Medicine), especializado em análise sistêmica dos 7 sistemas funcionais.

Sua tarefa é analisar o estado funcional de uma paciente através da abordagem IFM e identificar disfunções sistêmicas, conexões entre sistemas e causas raiz.

Analise os dados fornecidos seguindo a metodologia IFM e forneça uma análise estruturada seguindo EXATAMENTE o formato JSON especificado.

METODOLOGIA IFM - OS 7 SISTEMAS FUNCIONAIS:

1. ASSIMILAÇÃO (Digestão, Absorção, Microbioma):
   - Digestão de macronutrientes
   - Absorção intestinal
   - Integridade da barreira intestinal
   - Microbioma e disbiose
   - Sensibilidades alimentares

2. DEFESA E REPARO (Sistema Imune e Inflamação):
   - Função imune inata e adaptativa
   - Resposta inflamatória
   - Capacidade de cicatrização
   - Autoimunidade
   - Alergias e hipersensibilidades

3. ENERGIA (Produção Mitocondrial):
   - Função mitocondrial
   - Metabolismo aeróbico
   - Utilização de glicose e gorduras
   - Fadiga e vitalidade
   - Tolerância ao exercício

4. BIOTRANSFORMAÇÃO (Detoxificação):
   - Fase I (CYP450)
   - Fase II (conjugação)
   - Fase III (eliminação)
   - Carga tóxica
   - Função hepática

5. TRANSPORTE (Sistema Cardiovascular):
   - Função cardíaca
   - Circulação periférica
   - Pressão arterial
   - Perfil lipídico
   - Função endotelial

6. COMUNICAÇÃO (Neurológico e Endócrino):
   - Neurotransmissores
   - Eixo HPA
   - Hormônios reprodutivos
   - Hormônios tireoideanos
   - Função cognitiva

7. INTEGRIDADE ESTRUTURAL (Músculo-esquelético):
   - Força muscular
   - Saúde articular
   - Densidade óssea
   - Postura e movimento
   - Dor musculoesquelética

PRINCÍPIOS DA ANÁLISE:
- Identifique disfunções primárias vs. secundárias
- Mapeie conexões e efeitos em cascata entre sistemas
- Priorize intervenções baseadas em evidências
- Considere fatores de estilo de vida e ambientais
- Foque em causas raiz, não apenas sintomas

Responda EXCLUSIVAMENTE em formato JSON válido, sem texto adicional.`

    const userPrompt = `Analise esta paciente usando a metodologia IFM:

DADOS DA PACIENTE:
- Nome: ${patient.name}
- Idade: ${patient.age} anos
- Sintomas principais: ${patient.mainSymptoms.map((s: any) => s.symptom).join(', ')}

HISTÓRICO MENSTRUAL:
- Menarca: ${patient.menstrualHistory.menarche} anos
- Ciclo: ${patient.menstrualHistory.cycleLength} dias
- Status menopausal: ${patient.menstrualHistory.menopausalStatus}

DADOS DOS 7 SISTEMAS FUNCIONAIS:
${JSON.stringify(ifmData, null, 2)}

Forneça uma análise IFM estruturada no seguinte formato JSON:

{
  "systemsAssessment": {
    "assimilation": {
      "status": "optimal|suboptimal|dysfunction|critical",
      "score": number (0-100),
      "keyIssues": ["string"],
      "priority": "high|medium|low"
    },
    "defenseRepair": {
      "status": "optimal|suboptimal|dysfunction|critical",
      "score": number (0-100),
      "keyIssues": ["string"],
      "priority": "high|medium|low"
    },
    "energy": {
      "status": "optimal|suboptimal|dysfunction|critical",
      "score": number (0-100),
      "keyIssues": ["string"],
      "priority": "high|medium|low"
    },
    "biotransformation": {
      "status": "optimal|suboptimal|dysfunction|critical",
      "score": number (0-100),
      "keyIssues": ["string"],
      "priority": "high|medium|low"
    },
    "transport": {
      "status": "optimal|suboptimal|dysfunction|critical",
      "score": number (0-100),
      "keyIssues": ["string"],
      "priority": "high|medium|low"
    },
    "communication": {
      "status": "optimal|suboptimal|dysfunction|critical",
      "score": number (0-100),
      "keyIssues": ["string"],
      "priority": "high|medium|low"
    },
    "structuralIntegrity": {
      "status": "optimal|suboptimal|dysfunction|critical",
      "score": number (0-100),
      "keyIssues": ["string"],
      "priority": "high|medium|low"
    }
  },
  "systemicConnections": {
    "primaryDysfunction": "string (sistema mais disfuncional)",
    "cascadeEffects": ["string"],
    "interconnections": [
      {
        "system1": "string",
        "system2": "string",
        "connection": "string",
        "impact": "string"
      }
    ],
    "rootCauses": ["string"]
  },
  "rootCauseAnalysis": {
    "primaryCauses": [
      {
        "cause": "string",
        "affectedSystems": ["string"],
        "evidenceLevel": "high|medium|low",
        "intervention": "string"
      }
    ],
    "secondaryCauses": [
      {
        "cause": "string",
        "affectedSystems": ["string"],
        "evidenceLevel": "high|medium|low",
        "intervention": "string"
      }
    ],
    "contributingFactors": ["string"]
  },
  "interventionPriority": {
    "immediate": [
      {
        "system": "string",
        "intervention": "string",
        "rationale": "string",
        "expectedOutcome": "string",
        "timeframe": "string"
      }
    ],
    "shortTerm": [
      {
        "system": "string",
        "intervention": "string",
        "rationale": "string",
        "expectedOutcome": "string",
        "timeframe": "string"
      }
    ],
    "longTerm": [
      {
        "system": "string",
        "intervention": "string",
        "rationale": "string",
        "expectedOutcome": "string",
        "timeframe": "string"
      }
    ]
  },
  "monitoringPlan": {
    "biomarkers": [
      {
        "marker": "string",
        "system": "string",
        "frequency": "string",
        "targetRange": "string"
      }
    ],
    "symptoms": [
      {
        "symptom": "string",
        "system": "string",
        "trackingMethod": "string",
        "frequency": "string"
      }
    ],
    "functionalTests": [
      {
        "test": "string",
        "system": "string",
        "frequency": "string",
        "purpose": "string"
      }
    ]
  },
  "ifmSynthesis": "string (síntese completa da análise IFM com foco em medicina funcional)"
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
    const analysis = new IFMAnalysis({
      company: company._id,
      professional: user._id,
      patient: patient._id,
      inputData: ifmData,
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
        reasoning: 'Análise IFM baseada nos 7 sistemas funcionais e identificação de causas raiz'
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
    console.error('Erro na análise IFM:', error)
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

    const analyses = await IFMAnalysis
      .find(query)
      .populate('patient', 'name age')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)

    const total = await IFMAnalysis.countDocuments(query)

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
    console.error('Erro ao buscar análises IFM:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
} 