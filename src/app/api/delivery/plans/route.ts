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

    // Buscar análises que estão prontas para formar planos completos
    const analysisGroups = await Analysis.aggregate([
      {
        $match: {
          companyId: user.companyId,
          status: { $in: ['completed', 'approved'] }
        }
      },
      {
        $group: {
          _id: '$patient',
          analyses: { $push: '$$ROOT' },
          lastUpdated: { $max: '$updatedAt' }
        }
      },
      {
        $match: {
          'analyses.5': { $exists: true } // Pacientes com pelo menos 5 análises
        }
      },
      {
        $lookup: {
          from: 'patients',
          localField: '_id',
          foreignField: '_id',
          as: 'patient'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'analyses.professional',
          foreignField: '_id',
          as: 'professional'
        }
      },
      {
        $sort: { lastUpdated: -1 }
      }
    ])

    // Transformar em planos de entrega
    const plans = analysisGroups.map(group => {
      const patient = group.patient[0]
      const professional = group.professional[0]
      const analyses = group.analyses

      // Determinar status do plano baseado nas análises
      const allApproved = analyses.every((a: any) => a.status === 'approved')
      const hasComplete = analyses.length >= 5

      let planStatus = 'draft'
      if (hasComplete && allApproved) {
        planStatus = 'ready_for_delivery'
      }

      // Gerar plano final consolidado
      const finalPlan = {
        executiveSummary: generateExecutiveSummary(analyses),
        laboratoryFindings: extractLaboratoryFindings(analyses),
        tcmDiagnosis: extractTCMDiagnosis(analyses),
        chronologyInsights: extractChronologyInsights(analyses),
        ifmAssessment: extractIFMAssessment(analyses),
        treatmentPlan: extractTreatmentPlan(analyses),
        recommendations: extractRecommendations(analyses),
        followUpPlan: generateFollowUpPlan(analyses)
      }

      return {
        _id: `plan_${patient._id}`,
        patient: {
          _id: patient._id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone
        },
        professional: {
          _id: professional._id,
          name: professional.name,
          email: professional.email
        },
        analyses: analyses,
        finalPlan: finalPlan,
        status: planStatus,
        deliveryMethod: 'email',
        createdAt: group.lastUpdated,
        updatedAt: group.lastUpdated
      }
    })

    return Response.json({
      success: true,
      plans: plans
    })

  } catch (error) {
    console.error('Erro ao buscar planos:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Funções auxiliares para extrair informações das análises
function generateExecutiveSummary(analyses: any[]): string {
  const patientName = analyses[0]?.patient?.name || 'Paciente'
  return `Plano de tratamento personalizado para ${patientName} baseado em análise completa incluindo: avaliação laboratorial, diagnóstico energético de MTC, cronologia de saúde, matriz de medicina funcional e plano terapêutico integrado.`
}

function extractLaboratoryFindings(analyses: any[]): string {
  const labAnalysis = analyses.find(a => a.type === 'laboratory')
  return labAnalysis?.result?.laboratoryAnalysis?.interpretation || 'Análise laboratorial não disponível'
}

function extractTCMDiagnosis(analyses: any[]): string {
  const tcmAnalysis = analyses.find(a => a.type === 'tcm')
  return tcmAnalysis?.result?.tcmAnalysis?.energeticDiagnosis || 'Diagnóstico de MTC não disponível'
}

function extractChronologyInsights(analyses: any[]): string {
  const chronologyAnalysis = analyses.find(a => a.type === 'chronology')
  return chronologyAnalysis?.result?.chronologyAnalysis?.timeline || 'Cronologia não disponível'
}

function extractIFMAssessment(analyses: any[]): string {
  const ifmAnalysis = analyses.find(a => a.type === 'ifm')
  return ifmAnalysis?.result?.ifmAnalysis?.systemicAssessment || 'Avaliação IFM não disponível'
}

function extractTreatmentPlan(analyses: any[]): string {
  const treatmentAnalysis = analyses.find(a => a.type === 'treatment')
  return treatmentAnalysis?.result?.treatmentPlan?.executiveSummary || 'Plano de tratamento não disponível'
}

function extractRecommendations(analyses: any[]): string[] {
  const recommendations: string[] = []
  
  analyses.forEach(analysis => {
    if (analysis.result?.recommendations) {
      recommendations.push(...analysis.result.recommendations)
    }
  })
  
  return Array.from(new Set(recommendations)) // Remove duplicatas
}

function generateFollowUpPlan(analyses: any[]): string {
  return `
Plano de acompanhamento:

1. Consulta de retorno em 30 dias para avaliação de progresso
2. Reavaliação laboratorial em 60-90 dias conforme indicações
3. Monitoramento contínuo de sintomas através do portal do paciente
4. Ajustes do protocolo terapêutico conforme resposta individual
5. Acompanhamento nutricional e de estilo de vida

Contato para dúvidas: Sempre disponível através do portal ou agendamento de consulta.
  `.trim()
} 