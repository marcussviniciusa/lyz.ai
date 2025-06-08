import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import AnalysisTemplate from '@/models/AnalysisTemplate'

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()
    
    const { type } = params
    const companyId = session.user?.company || 'default'
    
    // Validar tipo
    const validTypes = ['laboratory', 'tcm', 'chronology', 'ifm', 'treatment-plan']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de análise inválido' },
        { status: 400 }
      )
    }
    
    // Buscar templates do tipo
    const templates = await AnalysisTemplate.find({
      companyId,
      type,
      isActive: true
    }).sort({ isDefault: -1, usageCount: -1, name: 1 })
    
    // Buscar template padrão
    const defaultTemplate = templates.find(t => t.isDefault)
    
    return NextResponse.json({
      success: true,
      templates,
      defaultTemplate,
      count: templates.length
    })

  } catch (error: any) {
    console.error('Erro ao buscar templates por tipo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Criar template padrão se não existir
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()
    
    const { type } = params
    const companyId = session.user?.company || 'default'
    const createdBy = session.user?.id || ''
    
    // Verificar se já existe template padrão
    const existingDefault = await AnalysisTemplate.findOne({
      companyId,
      type,
      isDefault: true
    })
    
    if (existingDefault) {
      return NextResponse.json(
        { error: 'Template padrão já existe para este tipo' },
        { status: 400 }
      )
    }
    
    // Criar template padrão baseado no tipo
    const defaultTemplates = getDefaultTemplatesByType()
    const templateConfig = defaultTemplates[type as keyof typeof defaultTemplates]
    
    if (!templateConfig) {
      return NextResponse.json(
        { error: 'Configuração de template não encontrada' },
        { status: 400 }
      )
    }
    
    const template = await AnalysisTemplate.create({
      ...templateConfig,
      companyId,
      createdBy,
      isDefault: true
    })
    
    return NextResponse.json({
      success: true,
      template,
      message: 'Template padrão criado com sucesso'
    })

  } catch (error: any) {
    console.error('Erro ao criar template padrão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

function getDefaultTemplatesByType() {
  return {
    laboratory: {
      name: 'Análise Laboratorial Padrão',
      description: 'Template padrão para análise de exames laboratoriais com foco em medicina funcional',
      type: 'laboratory',
      promptTemplate: `Analise os seguintes exames laboratoriais sob a perspectiva da medicina funcional:

DADOS DO PACIENTE:
{{patientData}}

EXAMES LABORATORIAIS:
{{labData}}

SINTOMAS RELATADOS:
{{symptoms}}

TIPO DE ANÁLISE:
{{analysisType}}

Por favor, forneça uma análise detalhada incluindo:
1. Interpretação funcional dos valores alterados
2. Correlação entre exames e sintomas
3. Identificação de padrões sistêmicos
4. Sugestões de investigação adicional
5. Recomendações terapêuticas iniciais

Considere as faixas funcionais além das convencionais e priorize as alterações mais significativas.`,
      systemPrompt: 'Você é um especialista em medicina funcional com vasta experiência em interpretação laboratorial.',
      ragConfig: {
        enabled: true,
        categories: ['medicina-funcional', 'protocolos-clinicos', 'pesquisas-cientificas'],
        threshold: 0.7,
        maxResults: 3
      }
    },
    
    tcm: {
      name: 'Análise MTC Padrão',
      description: 'Template padrão para análise de Medicina Tradicional Chinesa',
      type: 'tcm',
      promptTemplate: `Realize um diagnóstico energético segundo a Medicina Tradicional Chinesa:

DADOS DO PACIENTE:
{{patientData}}

OBSERVAÇÃO DA LÍNGUA:
{{tongueObservation}}

ANÁLISE DO PULSO:
{{pulseAnalysis}}

DADOS MENSTRUAIS:
{{menstrualData}}

SINTOMAS ENERGÉTICOS:
{{energeticSymptoms}}

Forneça:
1. Diagnóstico energético (padrão de desarmonia)
2. Análise dos 5 elementos
3. Estado do Qi e do Sangue
4. Recomendações fitoterapêuticas
5. Pontos de acupuntura sugeridos
6. Orientações de estilo de vida`,
      systemPrompt: 'Você é um especialista em Medicina Tradicional Chinesa com profundo conhecimento dos clássicos.',
      ragConfig: {
        enabled: true,
        categories: ['mtc', 'fitoterapia', 'medicina-funcional'],
        threshold: 0.7,
        maxResults: 3
      }
    },
    
    chronology: {
      name: 'Cronologia Padrão',
      description: 'Template padrão para geração de cronologia médica',
      type: 'chronology',
      promptTemplate: `Analise a cronologia médica e identifique padrões temporais:

DADOS DO PACIENTE:
{{patientData}}

EVENTOS SIGNIFICATIVOS:
{{significantEvents}}

EVOLUÇÃO DOS SINTOMAS:
{{symptomEvolution}}

HISTÓRICO DE TRATAMENTOS:
{{treatmentHistory}}

Gere uma análise cronológica incluindo:
1. Timeline dos eventos principais
2. Correlações temporais entre eventos e sintomas
3. Momentos críticos identificados
4. Padrões evolutivos
5. Prognóstico baseado na evolução histórica`,
      systemPrompt: 'Você é especialista em análise temporal de condições médicas complexas.',
      ragConfig: {
        enabled: true,
        categories: ['medicina-funcional', 'pesquisas-cientificas', 'estudos-caso'],
        threshold: 0.7,
        maxResults: 3
      }
    },
    
    ifm: {
      name: 'Matriz IFM Padrão',
      description: 'Template padrão para análise da Matriz do Institute for Functional Medicine',
      type: 'ifm',
      promptTemplate: `Analise os 7 sistemas funcionais do IFM:

DADOS DO PACIENTE:
{{patientData}}

SISTEMA DE ASSIMILAÇÃO:
{{assimilation}}

SISTEMA DE DEFESA E REPARO:
{{defense}}

SISTEMA DE ENERGIA:
{{energy}}

SISTEMA DE BIOTRANSFORMAÇÃO:
{{biotransformation}}

SISTEMA DE TRANSPORTE:
{{transport}}

SISTEMA DE COMUNICAÇÃO:
{{communication}}

INTEGRIDADE ESTRUTURAL:
{{structure}}

Forneça:
1. Status de cada sistema (score 1-10)
2. Identificação das causas raiz
3. Conexões entre sistemas
4. Priorização de intervenções
5. Plano de tratamento sistêmico`,
      systemPrompt: 'Você é especialista certificado pelo Institute for Functional Medicine.',
      ragConfig: {
        enabled: true,
        categories: ['medicina-funcional', 'protocolos-clinicos', 'diretrizes-medicas'],
        threshold: 0.7,
        maxResults: 3
      }
    },
    
    'treatment-plan': {
      name: 'Plano de Tratamento Padrão',
      description: 'Template padrão para plano de tratamento final',
      type: 'treatment-plan',
      promptTemplate: `Crie um plano de tratamento integrado baseado em todas as análises:

SÍNTESE DIAGNÓSTICA:
{{diagnosticSummary}}

PRIORIDADES TERAPÊUTICAS:
{{priorities}}

RECURSOS DISPONÍVEIS:
{{resources}}

PREFERÊNCIAS DO PACIENTE:
{{preferences}}

Desenvolva um plano estruturado com:
1. Objetivos terapêuticos SMART
2. Intervenções por fases (imediato, curto, médio prazo)
3. Protocolos de suplementação
4. Orientações nutricionais
5. Cronograma de acompanhamento
6. Indicadores de progresso`,
      systemPrompt: 'Você é um médico integrativo experiente em criar planos de tratamento personalizados.',
      ragConfig: {
        enabled: true,
        categories: ['protocolos-clinicos', 'medicina-funcional', 'diretrizes-medicas', 'fitoterapia', 'nutricao'],
        threshold: 0.7,
        maxResults: 5
      }
    }
  }
} 