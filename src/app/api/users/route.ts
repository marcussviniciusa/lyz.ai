import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/models/User'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.role || !['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await dbConnect()

    let users
    
    // Superadmin vê todos os usuários, admin vê apenas da sua empresa
    if (session.user.role === 'superadmin') {
      users = await User.find({}).select('-password -__v').populate('company', 'name').sort({ createdAt: -1 })
    } else {
      // Admin - filtrar apenas usuários da mesma empresa
      users = await User.find({ 
        company: session.user.company 
      }).select('-password -__v').populate('company', 'name').sort({ createdAt: -1 })
    }

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.role || !['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { name, email, role, password, company } = await req.json()

    // Validações
    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' }, 
        { status: 400 }
      )
    }

    if (role === 'superadmin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Apenas superadmins podem criar outros superadmins' }, 
        { status: 403 }
      )
    }

    await dbConnect()

    // Verificar se o email já existe
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já está em uso' }, 
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Determinar empresa do usuário
    let userCompany
    if (session.user.role === 'superadmin') {
      // Superadmin pode especificar empresa ou deixar sem empresa
      userCompany = company || null
    } else {
      // Admin só pode criar usuários na sua própria empresa
      userCompany = session.user.company
    }

    // Criar usuário
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      company: userCompany,
      active: true,
      createdBy: session.user.id
    })

    await user.save()

    return NextResponse.json(
      { 
        message: 'Usuário criado com sucesso',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt
        }
      }, 
      { status: 201 }
    )

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
} 