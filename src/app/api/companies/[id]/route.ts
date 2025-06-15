import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Company from '@/models/Company'
import mongoose from 'mongoose'

// Função para garantir ObjectId válido
function ensureValidObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id)
  }
  // Se não for válido, gerar um ObjectId mock para desenvolvimento
  return new mongoose.Types.ObjectId()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Superadmin pode ver qualquer empresa, outros usuários só a própria
    if (session.user.role !== 'superadmin' && session.user.company !== id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: 'ID inválido' }, { status: 400 })
    }

    await dbConnect()

    const company = await Company.findById(id)
      .populate('approvedBy', 'name email')
      .select('-settings.aiProviders.openai.apiKey -settings.aiProviders.anthropic.apiKey -settings.aiProviders.google.apiKey')

    if (!company) {
      return Response.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    return Response.json({
      success: true,
      company: company
    })

  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
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

    const { id } = await params

    // Superadmin pode editar qualquer empresa, outros usuários só a própria
    if (session.user.role !== 'superadmin' && session.user.company !== id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: 'ID inválido' }, { status: 400 })
    }

    await dbConnect()

    const body = await request.json()

    // Verificar se CNPJ já existe em outra empresa (se fornecido)
    if (body.cnpj) {
      const existingCompany = await Company.findOne({ 
        cnpj: body.cnpj,
        _id: { $ne: id }
      })
      if (existingCompany) {
        return Response.json(
          { error: 'CNPJ já cadastrado em outra empresa' },
          { status: 400 }
        )
      }
    }

    // Campos que podem ser atualizados
    const updateData: Record<string, any> = {}
    
    if (body.name) updateData.name = body.name
    if (body.cnpj !== undefined) updateData.cnpj = body.cnpj
    if (body.address) updateData.address = body.address
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.email !== undefined) updateData.email = body.email
    if (body.website !== undefined) updateData.website = body.website
    
    // Apenas superadmin pode alterar status e settings
    if (session.user.role === 'superadmin') {
      if (body.status !== undefined) {
        updateData.status = body.status
        
        // Se aprovando, definir dados de aprovação
        if (body.status === 'approved') {
          updateData.approvedBy = ensureValidObjectId(session.user.id)
          updateData.approvedAt = new Date()
          updateData.rejectionReason = undefined
        }
        
        // Se rejeitando, definir motivo
        if (body.status === 'rejected' && body.rejectionReason) {
          updateData.rejectionReason = body.rejectionReason
          updateData.approvedBy = undefined
          updateData.approvedAt = undefined
        }
      }
      
      if (body.settings) updateData.settings = body.settings
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

    return Response.json({
      success: true,
      company: company
    })

  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    
    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map(err => err.message)
      return Response.json(
        { error: 'Dados inválidos', details: errors },
        { status: 400 }
      )
    }

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

    // Apenas superadmin pode deletar empresas
    if (session.user.role !== 'superadmin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: 'ID inválido' }, { status: 400 })
    }

    await dbConnect()

    const company = await Company.findByIdAndDelete(id)

    if (!company) {
      return Response.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    return Response.json({
      success: true,
      message: 'Empresa deletada com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar empresa:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}