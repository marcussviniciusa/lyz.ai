import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Company from '@/models/Company'
import mongoose from 'mongoose'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas superadmin pode aprovar empresas
    if (session.user.role !== 'superadmin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: 'ID inválido' }, { status: 400 })
    }

    await dbConnect()

    const body = await request.json()
    const { action, rejectionReason } = body

    if (!['approve', 'reject', 'suspend'].includes(action)) {
      return Response.json({ error: 'Ação inválida' }, { status: 400 })
    }

    const updateData: Record<string, any> = {}

    switch (action) {
      case 'approve':
        updateData.status = 'approved'
        updateData.approvedBy = new mongoose.Types.ObjectId(session.user.id)
        updateData.approvedAt = new Date()
        updateData.rejectionReason = undefined
        break
        
      case 'reject':
        if (!rejectionReason) {
          return Response.json({ error: 'Motivo da rejeição é obrigatório' }, { status: 400 })
        }
        updateData.status = 'rejected'
        updateData.rejectionReason = rejectionReason
        updateData.approvedBy = undefined
        updateData.approvedAt = undefined
        break
        
      case 'suspend':
        updateData.status = 'suspended'
        if (rejectionReason) {
          updateData.rejectionReason = rejectionReason
        }
        break
    }

    const company = await Company.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('approvedBy', 'name email')
    .select('-settings.aiProviders.openai.apiKey -settings.aiProviders.anthropic.apiKey -settings.aiProviders.google.apiKey')

    if (!company) {
      return Response.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const actionMessages: Record<string, string> = {
      approve: 'aprovada',
      reject: 'rejeitada',
      suspend: 'suspensa'
    }

    return Response.json({
      success: true,
      message: `Empresa ${actionMessages[action]} com sucesso`,
      company: company
    })

  } catch (error) {
    console.error('Erro ao processar ação da empresa:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}