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
    const { review, rating } = body

    if (!review || rating === undefined) {
      return Response.json(
        { error: 'Review e rating são obrigatórios' },
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

    // Atualizar a análise com o review
    analysis.review = {
      content: review,
      rating: rating,
      reviewedBy: session.user.id,
      reviewedAt: new Date()
    }

    await analysis.save()

    return Response.json({
      success: true,
      message: 'Review adicionado com sucesso',
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