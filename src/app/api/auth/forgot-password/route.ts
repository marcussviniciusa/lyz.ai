import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { validateCursEducaUserByEmailAndName, checkCursEducaConfig } from '@/lib/curseduca-service'
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
    const { email, name } = body

    // Validar entrada
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email e nome são obrigatórios' },
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

    // Conectar ao banco
    await dbConnect()
    
    // Verificar se o usuário existe no sistema
    const existingUser = await User.findOne({ email })
    if (!existingUser) {
      return NextResponse.json(
        { 
          error: 'Este email não possui uma conta no sistema. Registre-se primeiro.',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Validar com Curseduca
    const cursEducaResult = await validateCursEducaUserByEmailAndName(email, name)
    
    if (!cursEducaResult.success) {
      return NextResponse.json(
        { 
          error: cursEducaResult.message || 'Email ou nome não conferem com o CursEduca',
          code: 'VALIDATION_FAILED'
        },
        { status: 400 }
      )
    }

    // Gerar nova senha temporária (8 caracteres alfanuméricos)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let temporaryPassword = ''
    for (let i = 0; i < 8; i++) {
      temporaryPassword += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10)

    // Atualizar senha do usuário
    await User.findByIdAndUpdate(existingUser._id, {
      password: hashedPassword,
      updatedAt: new Date()
    })

    console.log(`[ForgotPassword] Nova senha gerada para ${email}`)

    // Retornar a nova senha (em produção, isso seria enviado por email)
    return NextResponse.json({
      success: true,
      message: 'Nova senha gerada com sucesso',
      temporaryPassword: temporaryPassword,
      instructions: 'Use esta senha temporária para fazer login. Recomendamos alterar a senha após o primeiro acesso.'
    })

  } catch (error: any) {
    console.error('[ForgotPassword] Erro:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message
      },
      { status: 500 }
    )
  }
} 