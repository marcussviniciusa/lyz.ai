import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/db'
import GlobalAIConfig, { getDefaultConfig } from '@/models/GlobalAIConfig'

// GET - Buscar configuração global
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é super admin
    if (session.user?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado - Apenas Super Admin' }, { status: 403 })
    }

    await connectToDatabase()

    let config = await GlobalAIConfig.findOne()
    
    // Se não existe configuração, criar uma padrão
    if (!config) {
      const defaultConfig = getDefaultConfig()
      config = new GlobalAIConfig({
        ...defaultConfig,
        lastUpdatedBy: session.user.id,
        version: '1.0.0'
      })
      await config.save()
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Erro ao buscar configuração global:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configuração global
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é super admin
    if (session.user?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado - Apenas Super Admin' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validar dados básicos
    const requiredFields = ['laboratory', 'tcm', 'chronology', 'ifm', 'treatmentPlan']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Campo obrigatório: ${field}` }, { status: 400 })
      }
    }

    await connectToDatabase()

    // Atualizar ou criar configuração
    const updatedConfig = await GlobalAIConfig.findOneAndUpdate(
      {},
      {
        ...body,
        lastUpdatedBy: session.user.id,
        version: incrementVersion(body.version || '1.0.0')
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    )

    return NextResponse.json(updatedConfig)
  } catch (error) {
    console.error('Erro ao atualizar configuração global:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Reinicializar configuração para padrões
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é super admin
    if (session.user?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado - Apenas Super Admin' }, { status: 403 })
    }

    await connectToDatabase()

    // Deletar configuração existente
    await GlobalAIConfig.deleteOne({})

    // Criar nova configuração padrão
    const defaultConfig = getDefaultConfig()
    const newConfig = new GlobalAIConfig({
      ...defaultConfig,
      lastUpdatedBy: session.user.id,
      version: '1.0.0'
    })
    
    await newConfig.save()

    return NextResponse.json(newConfig)
  } catch (error) {
    console.error('Erro ao reinicializar configuração global:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função utilitária para incrementar versão
function incrementVersion(version: string): string {
  const parts = version.split('.')
  const patch = parseInt(parts[2] || '0') + 1
  return `${parts[0]}.${parts[1]}.${patch}`
} 