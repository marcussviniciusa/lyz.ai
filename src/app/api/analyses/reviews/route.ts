import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Analysis from '@/models/Analysis'
import User from '@/models/User'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const user = await User.findOne({ email: session.user?.email })
    if (!user) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Buscar análises que precisam de revisão
    const pendingReviews = await Analysis.find({
      company: user.company,
      status: 'completed'
    })
    .populate('patient', 'name email')
    .populate('professional', 'name email')
    .sort({ createdAt: -1 })

    return Response.json({
      success: true,
      analyses: pendingReviews
    })

  } catch (error) {
    console.error('Erro ao buscar revisões:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const user = await User.findOne({ email: session.user?.email })
    if (!user) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      analysisId, 
      action, // 'approve', 'request_changes', 'reject'
      comments,
      suggestions 
    } = body

    if (!analysisId || !action) {
      return Response.json(
        { error: 'ID da análise e ação são obrigatórios' },
        { status: 400 }
      )
    }

    const analysis = await Analysis.findById(analysisId)
    if (!analysis) {
      return Response.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    // Atualizar status da revisão
    let newReviewStatus = 'pending'
    let newStatus = analysis.status

    switch (action) {
      case 'approve':
        newReviewStatus = 'approved'
        newStatus = 'approved'
        break
      case 'request_changes':
        newReviewStatus = 'needs_revision'
        newStatus = 'revision_requested'
        break
      case 'reject':
        newReviewStatus = 'rejected'
        newStatus = 'rejected'
        break
      default:
        return Response.json(
          { error: 'Ação inválida' },
          { status: 400 }
        )
    }

    const updatedAnalysis = await Analysis.findByIdAndUpdate(
      analysisId,
      {
        reviewStatus: newReviewStatus,
        status: newStatus,
        reviewedBy: user._id,
        reviewedAt: new Date(),
        reviewComments: comments,
        reviewSuggestions: suggestions,
        updatedAt: new Date()
      },
      { new: true }
    )
    .populate('patient', 'name email')
    .populate('professional', 'name email')
    .populate('reviewedBy', 'name email')

    return Response.json({
      success: true,
      analysis: updatedAnalysis,
      message: `Análise ${action === 'approve' ? 'aprovada' : action === 'request_changes' ? 'enviada para revisão' : 'rejeitada'} com sucesso`
    })

  } catch (error) {
    console.error('Erro na revisão:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 