import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Analysis from '@/models/Analysis'
import User from '@/models/User'

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

    const user = await User.findOne({ email: session.user?.email })
    if (!user) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const resolvedParams = await params
    const planId = resolvedParams.id
    const body = await request.json()
    const { method, scheduledFor } = body

    // Extrair o ID do paciente do planId (formato: plan_{patientId})
    const patientId = planId.replace('plan_', '')

    // Buscar todas as análises do paciente
    const analyses = await Analysis.find({
      patient: patientId,
      companyId: user.companyId,
      status: { $in: ['completed', 'approved'] }
    })

    if (analyses.length === 0) {
      return Response.json({ error: 'Nenhuma análise encontrada para este paciente' }, { status: 404 })
    }

    // Atualizar status de entrega nas análises
    const deliveryData = {
      deliveryMethod: method,
      deliveredAt: scheduledFor ? new Date(scheduledFor) : new Date(),
      deliveredBy: user._id,
      deliveryStatus: 'delivered'
    }

    await Analysis.updateMany(
      {
        patient: patientId,
        companyId: user.companyId
      },
      {
        $set: {
          deliveryInfo: deliveryData,
          updatedAt: new Date()
        }
      }
    )

    // Simular envio baseado no método
    let deliveryMessage = ''
    switch (method) {
      case 'email':
        // Aqui você integraria com um serviço de email como SendGrid, Nodemailer, etc.
        await sendEmailDelivery(analyses, patientId)
        deliveryMessage = 'Plano enviado por e-mail com sucesso'
        break
      
      case 'app':
        // Aqui você notificaria o portal do paciente
        await notifyPatientPortal(analyses, patientId)
        deliveryMessage = 'Plano disponibilizado no portal do paciente'
        break
      
      case 'printed':
        // Aqui você enviaria para impressão
        await schedulePrinting(analyses, patientId)
        deliveryMessage = 'Plano enviado para impressão'
        break
      
      default:
        deliveryMessage = 'Método de entrega não reconhecido'
    }

    return Response.json({
      success: true,
      message: deliveryMessage,
      deliveredAt: deliveryData.deliveredAt,
      method: method
    })

  } catch (error) {
    console.error('Erro na entrega do plano:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Funções auxiliares para entrega
async function sendEmailDelivery(analyses: any[], patientId: string) {
  // Implementar integração com serviço de email
  console.log(`Enviando plano por email para paciente ${patientId}`)
  
  // Exemplo de estrutura para integração:
  /*
  const emailContent = generateEmailContent(analyses)
  await emailService.send({
    to: patient.email,
    subject: 'Seu Plano de Tratamento Personalizado',
    html: emailContent,
    attachments: [
      {
        filename: 'plano-tratamento.pdf',
        content: await generatePDFBuffer(analyses)
      }
    ]
  })
  */
}

async function notifyPatientPortal(analyses: any[], patientId: string) {
  // Implementar notificação no portal do paciente
  console.log(`Disponibilizando plano no portal para paciente ${patientId}`)
  
  // Exemplo de estrutura:
  /*
  await PatientNotification.create({
    patientId,
    type: 'treatment_plan_ready',
    message: 'Seu plano de tratamento personalizado está disponível',
    data: analyses,
    read: false,
    createdAt: new Date()
  })
  */
}

async function schedulePrinting(analyses: any[], patientId: string) {
  // Implementar envio para impressão
  console.log(`Agendando impressão do plano para paciente ${patientId}`)
  
  // Exemplo de estrutura:
  /*
  await PrintQueue.create({
    patientId,
    content: await generatePrintableContent(analyses),
    priority: 'normal',
    scheduledFor: new Date(),
    status: 'queued'
  })
  */
} 