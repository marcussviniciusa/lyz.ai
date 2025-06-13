import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Analysis from '@/models/Analysis'
import User from '@/models/User'
import Patient from '@/models/Patient'
import DeliveryPlan from '@/models/DeliveryPlan'
import { generateIntegratedPlanPDF } from '@/lib/generate-plan-pdf'
import MinIOService from '@/lib/minio'
import mongoose from 'mongoose'

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

    // Buscar planos de entrega salvos no banco
    const query: any = {}
    
    // Filtrar por empresa (exceto superadmin)
    if (session.user.role !== 'superadmin') {
      query.company = user.company
    }

    const plans = await DeliveryPlan.find(query)
      .populate('patient', 'name email phone')
      .populate('professional', 'name email')
      .populate('company', 'name')
      .populate('analyses', 'type status createdAt')
      .sort({ createdAt: -1 })

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
    const { analysisIds, patientId } = body
    
    if (!Array.isArray(analysisIds) || !patientId) {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    
    // Buscar análises selecionadas
    const analyses = await Analysis.find({ 
      _id: { $in: analysisIds }, 
      patient: patientId 
    }).populate('patient', 'name')
    
    if (!analyses || analyses.length === 0) {
      return Response.json({ error: 'Nenhuma análise encontrada' }, { status: 404 })
    }

    // Buscar dados do paciente
    const patient = await Patient.findById(patientId)
    if (!patient) {
      return Response.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }
    
    // Preparar dados do profissional
    const professional = {
      name: user.name || 'Profissional',
      email: user.email
    }
    
    // Título do plano
    const title = `Plano Integrado - ${patient.name}`
    
    // Gerar PDF real
    const pdfBuffer = await generateIntegratedPlanPDF(patient, analyses, professional)
    
    // Converter Uint8Array para Buffer se necessário
    const buffer = Buffer.from(pdfBuffer)
    
    // Upload para MinIO
    const fileName = `plano-${patient.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`
    const uploadResult = await MinIOService.uploadFile(
      buffer,
      fileName,
      { 
        folder: 'delivery-plans', 
        contentType: 'application/pdf',
        filename: fileName
      }
    )
    
    // Criar ObjectIds válidos
    const professionalId = mongoose.Types.ObjectId.isValid(user._id) 
      ? user._id 
      : new mongoose.Types.ObjectId()
    
    const companyId = user.company && mongoose.Types.ObjectId.isValid(user.company)
      ? user.company
      : new mongoose.Types.ObjectId()
    
    // Salvar plano no banco
    const deliveryPlan = new DeliveryPlan({
      patient: new mongoose.Types.ObjectId(patientId),
      professional: professionalId,
      company: companyId,
      analyses: analysisIds.map(id => new mongoose.Types.ObjectId(id)),
      pdfFile: {
        key: uploadResult.key,
        url: uploadResult.url,
        size: uploadResult.size,
        generatedAt: new Date()
      },
      title: `Plano Integrado - ${patient.name}`,
      description: `Plano de tratamento baseado em ${analyses.length} análise(s)`,
      status: 'generated'
    })
    
    await deliveryPlan.save()
    
    return Response.json({ 
      success: true, 
      planId: deliveryPlan._id,
      pdfUrl: uploadResult.url,
      message: 'Plano gerado e salvo com sucesso'
    })
    
  } catch (error) {
    console.error('Erro ao gerar plano PDF:', error)
    return Response.json({ 
      error: 'Erro ao gerar plano PDF',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
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