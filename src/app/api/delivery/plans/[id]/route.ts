import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import DeliveryPlan from '@/models/DeliveryPlan'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(request.url)
    const isPdfGeneration = url.searchParams.get('pdf-access') === 'true'
    
    // Se não for para geração de PDF, exigir autenticação normal
    if (!isPdfGeneration) {
      const session = await getServerSession(authOptions)
      
      if (!session) {
        return Response.json({ error: 'Não autorizado' }, { status: 401 })
      }

      await dbConnect()

      const user = await User.findOne({ email: session.user?.email })
      if (!user) {
        return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
      }

      const { id } = await params
      const planId = id

      // Validar se é um ObjectId válido
      if (!mongoose.Types.ObjectId.isValid(planId)) {
        return Response.json({ error: 'ID do plano inválido' }, { status: 400 })
      }

      // Buscar o plano
      const query: any = { _id: planId }
      
      // Filtrar por empresa (exceto superadmin)
      if (session.user.role !== 'superadmin') {
        query.company = user.company
      }

      const plan = await DeliveryPlan.findOne(query)
        .populate('patient', 'name email phone')
        .populate('professional', 'name email')
        .populate('company', 'name')
        .populate('analyses', 'type status createdAt result.rawOutput')

      if (!plan) {
        return Response.json({ error: 'Plano não encontrado' }, { status: 404 })
      }

      return Response.json({
        success: true,
        plan: plan
      })
    }
    
    // Para geração de PDF, permitir acesso sem autenticação
    console.log('🔓 Acesso para geração de PDF detectado')
    
    await dbConnect()

    const { id } = await params
    const planId = id

    // Validar se é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return Response.json({ error: 'ID do plano inválido' }, { status: 400 })
    }

    // Buscar o plano sem filtros de empresa para PDF
    const plan = await DeliveryPlan.findById(planId)
      .populate('analyses', 'type status createdAt result.rawOutput')

    if (!plan) {
      return Response.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    console.log('✅ Plano encontrado para geração de PDF:', plan.title)

    return Response.json({
      success: true,
      plan: plan
    })

  } catch (error) {
    console.error('Erro ao buscar plano:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const { id } = await params
    const planId = id
    const body = await request.json()

    // Validar se é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return Response.json({ error: 'ID do plano inválido' }, { status: 400 })
    }

    // Buscar o plano
    const query: any = { _id: planId }
    
    // Filtrar por empresa (exceto superadmin)
    if (session.user.role !== 'superadmin') {
      query.company = user.company
    }

    const plan = await DeliveryPlan.findOne(query)

    if (!plan) {
      return Response.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    // Campos que podem ser atualizados
    const allowedUpdates = ['status', 'deliveryMethod', 'deliveredAt', 'viewedAt', 'patientFeedback']
    const updates: any = {}

    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Atualizar timestamps automáticos
    if (body.status === 'delivered' && !plan.deliveredAt) {
      updates.deliveredAt = new Date()
    }

    if (body.status === 'viewed_by_patient' && !plan.viewedAt) {
      updates.viewedAt = new Date()
    }

    const updatedPlan = await DeliveryPlan.findByIdAndUpdate(
      planId,
      updates,
      { new: true }
    )
      .populate('patient', 'name email phone')
      .populate('professional', 'name email')
      .populate('company', 'name')
      .populate('analyses', 'type status createdAt result.rawOutput')

    return Response.json({
      success: true,
      plan: updatedPlan
    })

  } catch (error) {
    console.error('Erro ao atualizar plano:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas superadmin pode deletar planos
    if (session.user.role !== 'superadmin') {
      return Response.json({ error: 'Permissão negada' }, { status: 403 })
    }

    await dbConnect()

    const { id } = await params
    const planId = id

    // Validar se é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return Response.json({ error: 'ID do plano inválido' }, { status: 400 })
    }

    const plan = await DeliveryPlan.findById(planId)

    if (!plan) {
      return Response.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    // TODO: Remover arquivo do MinIO também
    // await MinIOService.deleteFile(plan.pdfFile.key)

    await DeliveryPlan.findByIdAndDelete(planId)

    return Response.json({
      success: true,
      message: 'Plano removido com sucesso'
    })

  } catch (error) {
    console.error('Erro ao remover plano:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 