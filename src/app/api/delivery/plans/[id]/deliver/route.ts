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

    const { deliveryMethod, customMessage } = await request.json()

    if (!deliveryMethod || !['email', 'sms', 'portal'].includes(deliveryMethod)) {
      return NextResponse.json(
        { error: 'Método de entrega inválido' },
        { status: 400 }
      )
    }

    await dbConnect()

    const analysisId = params.id
    const userCompanyId = session.user.company

    // Buscar a análise de plano de tratamento
    const treatmentPlan = await Analysis.findOne({
      _id: analysisId,
      company: userCompanyId,
      type: 'treatment',
      status: 'completed',
      'professionalReview.reviewed': true,
      'professionalReview.approved': true
    }).populate('patient', 'name email phone')

    if (!treatmentPlan) {
      return NextResponse.json(
        { error: 'Plano de tratamento não encontrado ou não aprovado' },
        { status: 404 }
      )
    }

    // Atualizar informações de entrega
    if (!treatmentPlan.deliveryInfo) {
      treatmentPlan.deliveryInfo = {}
    }
    
    treatmentPlan.deliveryInfo.deliveredAt = new Date()
    treatmentPlan.deliveryInfo.deliveryMethod = deliveryMethod
    treatmentPlan.deliveryInfo.deliveryMessage = customMessage
    treatmentPlan.deliveryInfo.deliveredBy = session.user.id

    await treatmentPlan.save()

    // Aqui você pode implementar o envio real por email/SMS
    // Por exemplo, usando Nodemailer para email ou Twilio para SMS
    await sendDeliveryNotification(treatmentPlan, deliveryMethod, customMessage)

    return NextResponse.json({
      message: 'Plano entregue com sucesso',
      delivery: {
        _id: treatmentPlan._id,
        patientName: treatmentPlan.patient.name,
        deliveryMethod,
        deliveredAt: treatmentPlan.deliveryInfo.deliveredAt,
        deliveredBy: session.user.name
      }
    })

  } catch (error) {
    console.error('Erro ao entregar plano:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para enviar notificações
async function sendDeliveryNotification(
  treatmentPlan: any, 
  deliveryMethod: string, 
  customMessage: string
) {
  const patient = treatmentPlan.patient
  
  try {
    switch (deliveryMethod) {
      case 'email':
        // Implementar envio por email
        console.log(`Enviando plano por email para: ${patient.email}`)
        console.log(`Mensagem personalizada: ${customMessage}`)
        // Aqui você integraria com Nodemailer ou serviço de email
        break
        
      case 'sms':
        // Implementar envio por SMS
        console.log(`Enviando plano por SMS para: ${patient.phone}`)
        console.log(`Mensagem personalizada: ${customMessage}`)
        // Aqui você integraria com Twilio ou serviço de SMS
        break
        
      case 'portal':
        // Marcar como disponível no portal do paciente
        console.log(`Plano disponibilizado no portal para: ${patient.name}`)
        console.log(`Mensagem personalizada: ${customMessage}`)
        // Aqui você criaria uma notificação no portal
        break
        
      default:
        console.log('Método de entrega não implementado')
    }
  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    // Não falhar a operação principal se o envio falhar
  }
} 