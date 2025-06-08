import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import RAGService from '@/lib/ragService'
import dbConnect from '@/lib/db'

// Simulação de dados de análises (seria substituído por dados reais do banco)
interface AnalysisLog {
  id: string
  type: string
  timestamp: Date
  useRAG: boolean
  documentsUsed: number
  processingTime: number
  qualityScore: number
  category: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()
    
    const companyId = session.user?.company || 'default'
    
    // Obter estatísticas da base de conhecimento
    const documentStats = await RAGService.getDocumentStats(companyId)
    
    // Simular dados de análises (em uma implementação real, viria do banco)
    const mockAnalyses: AnalysisLog[] = generateMockAnalyses()
    
    // Calcular métricas
    const totalAnalyses = mockAnalyses.length
    const ragEnhancedAnalyses = mockAnalyses.filter(a => a.useRAG).length
    const avgDocumentsUsed = Math.round(
      mockAnalyses.filter(a => a.useRAG)
        .reduce((sum, a) => sum + a.documentsUsed, 0) / ragEnhancedAnalyses || 0
    )
    const avgProcessingTime = Math.round(
      mockAnalyses.reduce((sum, a) => sum + a.processingTime, 0) / totalAnalyses * 100
    ) / 100
    
    // Métricas de qualidade simuladas
    const qualityMetrics = {
      relevanceScore: 92.5,
      coherenceScore: 89.3,
      groundedness: 94.7,
      answerRelevancy: 91.2
    }
    
    // Métricas de performance simuladas
    const performanceMetrics = {
      searchLatency: 150,
      embeddingLatency: 75,
      totalLatency: 225,
      cacheHitRate: 78.5
    }
    
    // Top categorias baseadas nos documentos
    const topCategories = documentStats.categories.map(cat => ({
      category: cat.category,
      count: cat.count,
      percentage: Math.round((cat.count / documentStats.documents.total) * 100)
    })).slice(0, 5)
    
    // Tendência mensal simulada
    const monthlyTrend = generateMonthlyTrend()
    
    const analytics = {
      totalAnalyses,
      ragEnhancedAnalyses,
      avgDocumentsUsed,
      avgProcessingTime,
      accuracyScore: Math.round(
        (qualityMetrics.relevanceScore + qualityMetrics.coherenceScore + 
         qualityMetrics.groundedness + qualityMetrics.answerRelevancy) / 4
      ),
      topCategories,
      monthlyTrend,
      performanceMetrics,
      qualityMetrics,
      documentStats
    }

    return NextResponse.json(analytics)

  } catch (error: any) {
    console.error('Erro ao gerar analytics RAG:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

function generateMockAnalyses(): AnalysisLog[] {
  const analyses: AnalysisLog[] = []
  const types = ['laboratory', 'tcm', 'chronology', 'ifm', 'treatment-plan']
  const categories = ['medicina-funcional', 'protocolos-clinicos', 'mtc', 'fitoterapia', 'pesquisas-cientificas']
  
  // Gerar dados dos últimos 30 dias
  for (let i = 0; i < 150; i++) {
    const useRAG = Math.random() > 0.2 // 80% das análises usam RAG
    analyses.push({
      id: `analysis_${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      useRAG,
      documentsUsed: useRAG ? Math.floor(Math.random() * 5) + 1 : 0,
      processingTime: Math.random() * 3 + 1, // 1-4 segundos
      qualityScore: Math.random() * 20 + 80, // 80-100%
      category: categories[Math.floor(Math.random() * categories.length)]
    })
  }
  
  return analyses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

function generateMonthlyTrend() {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
  return months.map((month, index) => ({
    month,
    analyses: Math.floor(Math.random() * 50) + 20 + (index * 5), // Tendência crescente
    ragUsage: Math.floor(Math.random() * 40) + 15 + (index * 4) // RAG usage crescente
  }))
}

// Endpoint para registrar análise realizada (para futuro tracking real)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      analysisType, 
      useRAG, 
      documentsUsed, 
      processingTime, 
      qualityScore 
    } = body

    // TODO: Implementar logging real de análises no banco
    // const analysisLog = new AnalysisLog({
    //   userId: session.user.id,
    //   companyId: session.user.company,
    //   type: analysisType,
    //   useRAG,
    //   documentsUsed,
    //   processingTime,
    //   qualityScore,
    //   timestamp: new Date()
    // })
    // await analysisLog.save()

    return NextResponse.json({ 
      success: true, 
      message: 'Análise registrada com sucesso' 
    })

  } catch (error: any) {
    console.error('Erro ao registrar análise:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 