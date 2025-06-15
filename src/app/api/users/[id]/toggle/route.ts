import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
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

    // Apenas admin ou superadmin podem ativar/desativar usuários
    if (!['admin', 'superadmin'].includes(session.user.role || '')) {
      return Response.json({ error: 'Permissão negada' }, { status: 403 })
    }

    await dbConnect()

    const { id } = await params
    const { active } = await request.json()

    const user = await User.findById(id)
    
    if (!user) {
      return Response.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Admin só pode alterar usuários da mesma empresa
    if (session.user.role === 'admin' && user.company?.toString() !== session.user.company) {
      return Response.json({ error: 'Permissão negada para este usuário' }, { status: 403 })
    }

    // Impedir que usuário desative a si mesmo
    if (user._id.toString() === session.user.id) {
      return Response.json({ error: 'Você não pode desativar sua própria conta' }, { status: 400 })
    }

    // Alterar status ativo
    user.active = active
    await user.save()

    return Response.json({
      success: true,
      message: `Usuário ${user.active ? 'ativado' : 'desativado'} com sucesso`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        active: user.active
      }
    })

  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 