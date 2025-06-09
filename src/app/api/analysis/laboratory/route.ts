import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface LabResult {
  name: string
  value: string
  unit: string
  referenceRange: string
  functionalRange?: string
  status: 'normal' | 'borderline' | 'abnormal' | 'optimal'
  interpretation: string
  priority: 'low' | 'medium' | 'high'
}

interface AnalysisResult {
  summary: string
  results: LabResult[]
  recommendations: string[]
  functionalInsights: string[]
  riskFactors: string[]
  followUp: string
}

export async function POST(request: NextRequest) {
  try {
    // Temporariamente desabilitado para testes
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    // }

    const body = await request.json()
    const { patientId, examData, symptoms } = body

    if (!patientId || !examData) {
      return NextResponse.json(
        { error: 'Dados de paciente e exames laboratoriais são obrigatórios' },
        { status: 400 }
      )
    }

    // Simular tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock de resultados estruturados - análise abrangente por padrão
    const mockResults: AnalysisResult = generateMockResults(examData, symptoms)

    return NextResponse.json(mockResults)

  } catch (error: any) {
    console.error('Erro na API de análise laboratorial:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

function generateMockResults(examData: string, symptoms?: string): AnalysisResult {
  // Análise básica do conteúdo para personalizar resultados
  const hasHormones = examData.toLowerCase().includes('tsh') || examData.toLowerCase().includes('hormonio')
  const hasLipids = examData.toLowerCase().includes('colesterol') || examData.toLowerCase().includes('hdl')
  const hasVitamins = examData.toLowerCase().includes('vitamina') || examData.toLowerCase().includes('b12')
  
  const baseResults: LabResult[] = [
    {
      name: "TSH (Hormônio Estimulante da Tireoide)",
      value: "2.8",
      unit: "mUI/L",
      referenceRange: "0.4-4.0",
      functionalRange: "1.0-2.0",
      status: "borderline",
      interpretation: "Nível elevado para medicina funcional. Pode indicar início de hipotireoidismo subclínico.",
      priority: "medium"
    },
    {
      name: "T4 Livre",
      value: "1.1",
      unit: "ng/dL",
      referenceRange: "0.8-1.8",
      functionalRange: "1.2-1.5",
      status: "borderline",
      interpretation: "Abaixo da faixa funcional ideal. Sugere baixa conversão de T4 para T3.",
      priority: "medium"
    },
    {
      name: "Vitamina D (25-OH)",
      value: "28",
      unit: "ng/mL",
      referenceRange: "30-100",
      functionalRange: "50-80",
      status: "abnormal",
      interpretation: "Deficiência de vitamina D. Impacta absorção de cálcio e função imunológica.",
      priority: "high"
    },
    {
      name: "Vitamina B12",
      value: "380",
      unit: "pg/mL",
      referenceRange: "200-900",
      functionalRange: "500-800",
      status: "borderline",
      interpretation: "Nível adequado laboratorialmente, mas abaixo do ideal funcional para energia e cognição.",
      priority: "medium"
    },
    {
      name: "Ferritina",
      value: "18",
      unit: "ng/mL",
      referenceRange: "15-200",
      functionalRange: "50-150",
      status: "abnormal",
      interpretation: "Reservas de ferro baixas. Pode causar fadiga e queda de cabelo.",
      priority: "high"
    },
    {
      name: "Colesterol HDL",
      value: "38",
      unit: "mg/dL",
      referenceRange: ">40",
      functionalRange: ">60",
      status: "abnormal",
      interpretation: "HDL baixo aumenta risco cardiovascular. Importante para transporte hormonal.",
      priority: "high"
    },
    {
      name: "Homocisteína",
      value: "14",
      unit: "μmol/L",
      referenceRange: "<15",
      functionalRange: "<7",
      status: "abnormal",
      interpretation: "Elevada para medicina funcional. Indica deficiência de folato/B12 e risco cardiovascular.",
      priority: "high"
    },
    {
      name: "Proteína C Reativa (PCR)",
      value: "2.8",
      unit: "mg/L",
      referenceRange: "<3.0",
      functionalRange: "<1.0",
      status: "borderline",
      interpretation: "Inflamação subclínica presente. Pode indicar disbiose intestinal ou estresse oxidativo.",
      priority: "medium"
    }
  ]

  // Usar todos os resultados para análise abrangente
  const filteredResults = baseResults

  const summary = generateSummary(filteredResults, symptoms)
  const recommendations = generateRecommendations(filteredResults)
  const functionalInsights = generateFunctionalInsights(filteredResults)
  const riskFactors = generateRiskFactors(filteredResults)
  const followUp = generateFollowUp(filteredResults)

  return {
    summary,
    results: filteredResults,
    recommendations,
    functionalInsights,
    riskFactors,
    followUp
  }
}

function generateSummary(results: LabResult[], symptoms?: string): string {
  const abnormalCount = results.filter(r => r.status === 'abnormal').length
  const borderlineCount = results.filter(r => r.status === 'borderline').length
  
  let summary = `Análise laboratorial abrangente concluída. `
  
  if (abnormalCount > 0) {
    summary += `Identificadas ${abnormalCount} alterações significativas e ${borderlineCount} marcadores limítrofes. `
  } else if (borderlineCount > 0) {
    summary += `Identificados ${borderlineCount} marcadores em faixa limítrofe que merecem atenção. `
  } else {
    summary += `Marcadores dentro dos parâmetros funcionais. `
  }

  summary += `A interpretação considera tanto valores convencionais quanto faixas funcionais otimizadas para saúde feminina.`
  
  if (symptoms) {
    summary += ` Os sintomas relatados foram correlacionados com os achados laboratoriais.`
  }

  return summary
}

function generateRecommendations(results: LabResult[]): string[] {
  const recommendations: string[] = []
  
  results.forEach(result => {
    if (result.status === 'abnormal' || result.status === 'borderline') {
      if (result.name.includes('Vitamina D')) {
        recommendations.push('Suplementação de Vitamina D3 2000-4000 UI/dia com K2')
      } else if (result.name.includes('Ferritina')) {
        recommendations.push('Investigar causa da deficiência de ferro (sangramento, absorção)')
        recommendations.push('Ferro quelato 25mg em jejum com vitamina C')
      } else if (result.name.includes('TSH')) {
        recommendations.push('Avaliar função tireoidiana completa (T3, rT3, anticorpos)')
        recommendations.push('Suporte nutricional com selênio e zinco')
      } else if (result.name.includes('B12')) {
        recommendations.push('Suplementação de B12 metilcobalamina 1000mcg sublingual')
      } else if (result.name.includes('HDL')) {
        recommendations.push('Exercícios aeróbicos regulares para elevar HDL')
        recommendations.push('Ômega-3 de alta qualidade 2g/dia')
      }
    }
  })

  // Recomendações gerais
  recommendations.push('Avaliação do ciclo menstrual e padrões hormonais')
  recommendations.push('Protocolo anti-inflamatório com cúrcuma e gengibre')
  recommendations.push('Avaliação da saúde intestinal (disbiose)')

  return recommendations.slice(0, 6) // Limitar para não sobrecarregar
}

function generateFunctionalInsights(results: LabResult[]): string[] {
  const insights: string[] = []
  
  const lowVitD = results.find(r => r.name.includes('Vitamina D') && r.status !== 'optimal')
  const lowFerritin = results.find(r => r.name.includes('Ferritina') && r.status !== 'optimal')
  const thyroidIssues = results.find(r => r.name.includes('TSH') && r.status !== 'optimal')
  
  if (lowVitD && lowFerritin) {
    insights.push('Deficiência combinada de Vitamina D e ferro pode exacerbar fadiga e baixa imunidade')
  }
  
  if (thyroidIssues && lowFerritin) {
    insights.push('Baixo ferro pode comprometer a conversão de T4 para T3, afetando metabolismo')
  }
  
  insights.push('Marcadores inflamatórios elevados sugerem necessidade de abordagem intestinal')
  insights.push('Padrão nutricional indica possível malabsorção ou dieta restritiva')
  insights.push('Perfil hormonal sugere necessidade de suporte adrenal e tireoidiano')
  insights.push('Interação entre deficiências nutricionais e função hormonal é evidente')
  
  return insights.slice(0, 5)
}

function generateRiskFactors(results: LabResult[]): string[] {
  const risks: string[] = []
  
  results.forEach(result => {
    if (result.status === 'abnormal') {
      if (result.name.includes('HDL')) {
        risks.push('Risco cardiovascular elevado por HDL baixo')
      } else if (result.name.includes('Homocisteína')) {
        risks.push('Risco de trombose e doenças cardiovasculares')
      } else if (result.name.includes('PCR')) {
        risks.push('Inflamação crônica pode levar a doenças autoimunes')
      } else if (result.name.includes('Vitamina D')) {
        risks.push('Maior suscetibilidade a infecções e problemas ósseos')
      } else if (result.name.includes('Ferritina')) {
        risks.push('Anemia ferropriva pode desenvolver se não tratada')
      }
    }
  })
  
  risks.push('Síndrome metabólica se não houver correção dos desequilíbrios')
  risks.push('Fadiga crônica e baixa qualidade de vida')
  
  return risks.slice(0, 6)
}

function generateFollowUp(results: LabResult[]): string {
  const highPriorityCount = results.filter(r => r.priority === 'high').length
  
  let followUp = ''
  
  if (highPriorityCount > 2) {
    followUp = 'Recomenda-se reavaliação em 6-8 semanas após início das correções. '
  } else if (highPriorityCount > 0) {
    followUp = 'Controle laboratorial em 8-12 semanas para monitorar resposta ao tratamento. '
  } else {
    followUp = 'Acompanhamento em 3-4 meses para manutenção dos níveis otimizados. '
  }
  
  followUp += 'Priorizar correção das deficiências nutricionais antes de abordar questões hormonais complexas. '
  followUp += 'Integrar análise laboratorial com avaliação clínica e sintomas para tratamento personalizado.'
  followUp += ' Considerar mapeamento hormonal completo se sintomas persistirem.'
  
  return followUp
} 