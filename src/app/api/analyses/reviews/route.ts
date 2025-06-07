import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Analysis from '@/models/Analysis'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const userCompanyId = session.user.company

    // Buscar análises que precisam de revisão
    const analyses = await Analysis.find({
      company: userCompanyId,
      status: 'completed', // Apenas análises concluídas precisam de revisão
      $or: [
        { 'professionalReview.reviewed': { $ne: true } }, // Não revisadas ainda
        { 'professionalReview.reviewed': true } // Já revisadas (para histórico)
      ]
    })
    .populate('patient', 'name')
    .populate('professional', 'name')
    .sort({ createdAt: -1 })

    // Formatar as análises
    const formattedAnalyses = analyses.map(analysis => ({
      _id: analysis._id,
      type: analysis.type,
      patientId: analysis.patient,
      createdBy: analysis.professional,
      status: analysis.status,
      results: analysis.result,
      reviewStatus: analysis.professionalReview?.reviewed ? 
        (analysis.professionalReview.approved ? 'approved' : 'rejected') : 'pending',
      reviewNotes: analysis.professionalReview?.notes,
      reviewedBy: analysis.professionalReview?.reviewedAt ? 'professional' : null,
      reviewedAt: analysis.professionalReview?.reviewedAt,
      createdAt: analysis.createdAt,
      cost: analysis.aiMetadata?.cost || 0
    }))

    return NextResponse.json({
      analyses: formattedAnalyses
    })

  } catch (error) {
    console.error('Erro ao buscar análises para revisão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 