import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/models/User'
import Company from '@/models/Company'
import bcrypt from 'bcryptjs'

// GET - Buscar usuário específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!['admin', 'superadmin'].includes(session.user.role || '')) {
      return Response.json({ error: 'Permissão negada' }, { status: 403 })
    }

    await dbConnect()

    const { id } = await params
    const user = await User.findById(id).select('-password')
    
    if (!user) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Admin só pode ver usuários da mesma empresa
    if (session.user.role === 'admin' && user.company?.toString() !== session.user.company) {
      return Response.json({ error: 'Permissão negada para este usuário' }, { status: 403 })
    }

    return Response.json({ user })

  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Editar usuário
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!['admin', 'superadmin'].includes(session.user.role || '')) {
      return Response.json({ error: 'Permissão negada' }, { status: 403 })
    }

    await dbConnect()

    const { id } = await params
    const { name, email, role, password, company } = await request.json()

    const user = await User.findById(id)
    
    if (!user) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Admin só pode editar usuários da mesma empresa
    if (session.user.role === 'admin' && user.company?.toString() !== session.user.company) {
      return Response.json({ error: 'Permissão negada para este usuário' }, { status: 403 })
    }

    // Verificar se email já existe (se mudou)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return Response.json({ error: 'Email já está em uso' }, { status: 400 })
      }
    }

    // Apenas superadmin pode alterar role para superadmin
    if (role === 'superadmin' && session.user.role !== 'superadmin') {
      return Response.json({ error: 'Apenas superadmins podem criar outros superadmins' }, { status: 403 })
    }

    // Atualizar campos
    if (name) user.name = name
    if (email) user.email = email
    if (role) user.role = role
    if (password) {
      user.password = await bcrypt.hash(password, 12)
    }
    
    // Apenas superadmin pode alterar empresa
    if (session.user.role === 'superadmin' && company !== undefined) {
      user.company = company || null
    }

    await user.save()

    return Response.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        company: user.company
      }
    })

  } catch (error) {
    console.error('Erro ao editar usuário:', error)
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir usuário permanentemente
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas superadmin pode excluir usuários
    if (session.user.role !== 'superadmin') {
      return Response.json({ error: 'Apenas superadmins podem excluir usuários' }, { status: 403 })
    }

    await dbConnect()

    const { id } = await params
    const { deleteCompany } = await request.json()

    const user = await User.findById(id)
    
    if (!user) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Impedir que usuário exclua a si mesmo
    if (user._id.toString() === session.user.id) {
      return Response.json({ error: 'Você não pode excluir sua própria conta' }, { status: 400 })
    }

    let deletedCompany = null

    // Se solicitado, excluir empresa também
    if (deleteCompany && user.company) {
      // Verificar se há outros usuários na empresa
      const otherUsersInCompany = await User.countDocuments({ 
        company: user.company,
        _id: { $ne: user._id }
      })

      if (otherUsersInCompany === 0) {
        // Excluir empresa se não há outros usuários
        deletedCompany = await Company.findByIdAndDelete(user.company)
      } else {
        return Response.json({ 
          error: `Não é possível excluir a empresa pois há ${otherUsersInCompany} outros usuários vinculados` 
        }, { status: 400 })
      }
    }

    // Excluir usuário
    await User.findByIdAndDelete(id)

    return Response.json({
      success: true,
      message: 'Usuário excluído com sucesso',
      deletedUser: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      deletedCompany: deletedCompany ? {
        _id: deletedCompany._id,
        name: deletedCompany.name
      } : null
    })

  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
} 