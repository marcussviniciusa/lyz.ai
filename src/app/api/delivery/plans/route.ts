import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Analysis from '@/models/Analysis'
import Patient from '@/models/Patient'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const userCompanyId = session.user.company

    // Buscar análises de plano de tratamento que foram aprovadas
    const treatmentPlans = await Analysis.find({
      company: userCompanyId,
      type: 'treatment',
      status: 'completed',
      'professionalReview.reviewed': true,
      'professionalReview.approved': true
    })
    .populate('patient', 'name email phone')
    .sort({ createdAt: -1 })

    // Para cada plano de tratamento, buscar todas as análises relacionadas do mesmo paciente
    const deliveryPlans = await Promise.all(
      treatmentPlans.map(async (treatmentPlan) => {
        const patientAnalyses = await Analysis.find({
          company: userCompanyId,
          patient: treatmentPlan.patient._id,
          status: 'completed',
          'professionalReview.reviewed': true,
          'professionalReview.approved': true
        })

        // Organizar análises por tipo
        const analysesByType = patientAnalyses.reduce((acc, analysis) => {
          acc[analysis.type] = analysis
          return acc
        }, {} as any)

        // Determinar status do plano de entrega
        let deliveryStatus = 'ready'
        if (treatmentPlan.deliveryInfo?.deliveredAt) {
          deliveryStatus = treatmentPlan.deliveryInfo.viewedAt ? 'viewed' : 'delivered'
        }

        return {
          _id: treatmentPlan._id,
          patientId: treatmentPlan.patient,
          treatmentPlan: analysesByType.treatment?.result,
          laboratorial: analysesByType.laboratory?.result,
          mtc: analysesByType.tcm?.result,
          chronology: analysesByType.chronology?.result,
          ifmMatrix: analysesByType.ifm?.result,
          status: deliveryStatus,
          deliveredAt: treatmentPlan.deliveryInfo?.deliveredAt,
          viewedAt: treatmentPlan.deliveryInfo?.viewedAt,
          deliveryMethod: treatmentPlan.deliveryInfo?.deliveryMethod || 'email',
          createdAt: treatmentPlan.createdAt
        }
      })
    )

    return NextResponse.json({
      plans: deliveryPlans
    })

  } catch (error) {
    console.error('Erro ao buscar planos para entrega:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 