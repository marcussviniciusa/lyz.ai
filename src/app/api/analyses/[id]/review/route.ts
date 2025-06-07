import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Analysis from '@/models/Analysis'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { reviewStatus, reviewNotes } = await request.json()

    if (!reviewStatus || !['approved', 'rejected'].includes(reviewStatus)) {
      return NextResponse.json(
        { error: 'Status de revisão inválido' },
        { status: 400 }
      )
    }

    await dbConnect()

    const analysisId = params.id
    const userCompanyId = session.user.company

    // Buscar a análise
    const analysis = await Analysis.findOne({
      _id: analysisId,
      company: userCompanyId
    })

    if (!analysis) {
      return NextResponse.json(
        { error: 'Análise não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar a análise com informações da revisão
    if (!analysis.professionalReview) {
      analysis.professionalReview = {}
    }
    
    analysis.professionalReview.reviewed = true
    analysis.professionalReview.approved = reviewStatus === 'approved'
    analysis.professionalReview.notes = reviewNotes
    analysis.professionalReview.reviewedAt = new Date()

    await analysis.save()

    return NextResponse.json({
      message: 'Revisão submetida com sucesso',
      analysis: {
        _id: analysis._id,
        reviewStatus: reviewStatus,
        reviewNotes: reviewNotes,
        reviewedBy: session.user.id,
        reviewedAt: analysis.professionalReview.reviewedAt
      }
    })

  } catch (error) {
    console.error('Erro ao submeter revisão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 