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

    // Apenas superadmin pode ativar/desativar usuários
    if (session.user.role !== 'superadmin') {
      return Response.json({ error: 'Permissão negada' }, { status: 403 })
    }

    await dbConnect()

    const { id } = await params

    const user = await User.findById(id)
    
    if (!user) {
      return Response.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Alternar status ativo
    user.isActive = !user.isActive
    await user.save()

    return Response.json({
      success: true,
      message: `Usuário ${user.isActive ? 'ativado' : 'desativado'} com sucesso`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
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