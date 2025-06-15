import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateCursEducaUser, checkCursEducaConfig, testCursEducaConnection } from '@/lib/curseduca-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar se o usuário é superadmin
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const testEmail = searchParams.get('email')

    // Verificar configuração
    const configValid = checkCursEducaConfig()
    
    const result = {
      timestamp: new Date().toISOString(),
      config: {
        valid: configValid,
        url: process.env.CURSEDUCA_API_URL || 'NÃO CONFIGURADO',
        apiKey: process.env.CURSEDUCA_API_KEY ? '***CONFIGURADO***' : 'NÃO CONFIGURADO'
      },
      connectivity: null as boolean | null,
      emailTest: null as any
    }

    if (!configValid) {
      return NextResponse.json({
        success: false,
        message: 'Configuração inválida do Curseduca',
        result
      })
    }

    // Testar conectividade
    try {
      result.connectivity = await testCursEducaConnection()
    } catch (error) {
      result.connectivity = false
    }

    // Testar validação de email se fornecido
    if (testEmail) {
      try {
        result.emailTest = await validateCursEducaUser(testEmail)
      } catch (error: any) {
        result.emailTest = {
          success: false,
          message: error.message,
          error: true
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Teste concluído',
      result
    })

  } catch (error: any) {
    console.error('Erro no teste do Curseduca:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar se o usuário é superadmin
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório para teste' },
        { status: 400 }
      )
    }

    // Testar validação específica
    const result = await validateCursEducaUser(email)

    return NextResponse.json({
      success: true,
      message: `Teste de validação para ${email}`,
      result
    })

  } catch (error: any) {
    console.error('Erro no teste de validação:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message
      },
      { status: 500 }
    )
  }
} 