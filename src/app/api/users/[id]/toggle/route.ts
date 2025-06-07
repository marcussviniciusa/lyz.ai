import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/models/User'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { active } = await req.json()
    const userId = params.id

    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'Status deve ser verdadeiro ou falso' }, 
        { status: 400 }
      )
    }

    await dbConnect()

    // Buscar o usuário
    const user = await User.findOne({
      _id: userId,
      company: session.user.companyId
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' }, 
        { status: 404 }
      )
    }

    // Não permitir que um usuário desative a si mesmo
    if (user._id.toString() === session.user.id) {
      return NextResponse.json(
        { error: 'Não é possível alterar seu próprio status' }, 
        { status: 400 }
      )
    }

    // Não permitir que admins alterem status de superadmins
    if (user.role === 'superadmin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado para alterar status de superadmin' }, 
        { status: 403 }
      )
    }

    // Atualizar status
    user.active = active
    await user.save()

    return NextResponse.json({
      message: `Usuário ${active ? 'ativado' : 'desativado'} com sucesso`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active
      }
    })

  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
} 