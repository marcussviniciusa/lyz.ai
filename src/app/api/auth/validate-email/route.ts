import { NextRequest, NextResponse } from 'next/server'
import { validateCursEducaUser, checkCursEducaConfig } from '@/lib/curseduca-service'
import dbConnect from '@/lib/db'
import User from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    // Verificar configuração do Curseduca
    if (!checkCursEducaConfig()) {
      return NextResponse.json(
        { 
          error: 'Configuração do Curseduca não encontrada. Contate o administrador.',
          code: 'CURSEDUCA_CONFIG_ERROR'
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { email } = body

    // Validar entrada
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    // Conectar ao banco para verificar se o usuário já existe
    await dbConnect()
    
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { 
          error: 'Este email já possui uma conta no sistema. Faça login em vez de criar uma nova conta.',
          code: 'USER_ALREADY_EXISTS'
        },
        { status: 409 }
      )
    }

    // Validar com Curseduca
    const cursEducaResult = await validateCursEducaUser(email)
    
    if (!cursEducaResult.success) {
      return NextResponse.json(
        { 
          error: cursEducaResult.message || 'Email não encontrado no Curseduca',
          code: 'USER_NOT_FOUND_IN_CURSEDUCA'
        },
        { status: 404 }
      )
    }

    // Retornar dados do usuário validado
    return NextResponse.json({
      success: true,
      message: 'Email validado com sucesso',
      userData: cursEducaResult.data
    })

  } catch (error) {
    console.error('Erro na validação do email:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor. Tente novamente mais tarde.',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    )
  }
} 