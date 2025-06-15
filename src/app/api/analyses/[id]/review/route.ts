import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Analysis from '@/models/Analysis'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const { id } = await params
    const body = await request.json()
    const { reviewStatus, reviewNotes } = body

    if (!reviewStatus) {
      return Response.json(
        { error: 'Status da revisão é obrigatório' },
        { status: 400 }
      )
    }

    const analysis = await Analysis.findById(id)
    
    if (!analysis) {
      return Response.json(
        { error: 'Análise não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar a análise com a revisão
    analysis.professionalReview = {
      reviewed: true,
      reviewedAt: new Date(),
      adjustments: reviewNotes || '',
      approved: reviewStatus === 'approved',
      notes: reviewNotes || ''
    }

    // Atualizar status se aprovado
    if (reviewStatus === 'approved') {
      analysis.status = 'approved'
    }

    await analysis.save()

    return Response.json({
      success: true,
      message: 'Revisão realizada com sucesso',
      analysis: analysis
    })

  } catch (error) {
    console.error('Erro ao adicionar review:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 