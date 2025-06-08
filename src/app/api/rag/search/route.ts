import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import RAGService from '@/lib/ragService'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const { query, category, limit = 5, threshold = 0.7 } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query de busca é obrigatória' },
        { status: 400 }
      )
    }

    if (typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query deve ser um texto válido' },
        { status: 400 }
      )
    }

    try {
      const results = await RAGService.searchDocuments({
        query: query.trim(),
        companyId: session.user.company || '1',
        category: category || undefined,
        limit: Math.min(limit, 20), // Máximo 20 resultados
        threshold: Math.max(0.1, Math.min(threshold, 1.0)) // Entre 0.1 e 1.0
      })

      return NextResponse.json({
        success: true,
        query,
        results: results.map(result => ({
          content: result.content.substring(0, 500) + (result.content.length > 500 ? '...' : ''),
          fullContent: result.content,
          score: Math.round(result.score * 100) / 100, // 2 casas decimais
          confidence: result.score > 0.8 ? 'Alta' : result.score > 0.6 ? 'Média' : 'Baixa',
          documentId: result.documentId,
          fileName: result.fileName,
          chunkIndex: result.chunkIndex,
          metadata: result.metadata
        })),
        metadata: {
          totalResults: results.length,
          queryLength: query.length,
          searchTime: new Date().toISOString(),
          category: category || 'todas',
          threshold
        }
      })

    } catch (serviceError: any) {
      console.error('Erro no serviço de busca:', serviceError)
      
      if (serviceError.message.includes('OpenAI') || serviceError.message.includes('embeddings')) {
        return NextResponse.json(
          { error: 'Erro na configuração da IA. Verifique as chaves da API.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: serviceError.message || 'Erro na busca de documentos' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Erro na API de busca:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    // Buscar estatísticas de busca ou documentos recentes
    const stats = await RAGService.getDocumentStats(session.user.company || '1')

    return NextResponse.json({
      searchEnabled: stats.documents.completed > 0,
      availableDocuments: stats.documents.completed,
      totalChunks: stats.chunks,
      categories: stats.categories,
      suggestions: [
        'Como tratar pacientes com diabetes tipo 2?',
        'Protocolos para hipertensão arterial',
        'Suplementação de vitamina D',
        'Medicina funcional para fadiga crônica',
        'Fitoterapia para ansiedade'
      ]
    })

  } catch (error: any) {
    console.error('Erro ao obter informações de busca:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 