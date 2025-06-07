import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Company from '@/models/Company'
import connectDB from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await connectDB()
    
    const company = await Company.findOne({ 
      $or: [
        { owner: session.user.id },
        { 'members.user': session.user.id }
      ]
    })

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      providers: company.settings?.aiProviders || []
    })
  } catch (error) {
    console.error('Erro ao buscar configurações de IA:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { providers } = await request.json()

    if (!Array.isArray(providers)) {
      return NextResponse.json({ error: 'Formato inválido de provedores' }, { status: 400 })
    }

    await connectDB()
    
    const company = await Company.findOne({ 
      $or: [
        { owner: session.user.id },
        { 'members.user': session.user.id, 'members.role': { $in: ['admin', 'superadmin'] } }
      ]
    })

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada ou sem permissão' }, { status: 404 })
    }

    // Validar configurações dos provedores
    for (const provider of providers) {
      if (!provider.provider || typeof provider.enabled !== 'boolean') {
        return NextResponse.json({ error: 'Configuração de provedor inválida' }, { status: 400 })
      }
      
      if (provider.enabled && !provider.apiKey) {
        return NextResponse.json({ 
          error: `API Key obrigatória para o provedor ${provider.provider}` 
        }, { status: 400 })
      }
    }

    // Atualizar configurações na empresa
    await Company.findByIdAndUpdate(company._id, {
      $set: {
        'settings.aiProviders': providers,
        'settings.updatedAt': new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas com sucesso'
    })
  } catch (error) {
    console.error('Erro ao salvar configurações de IA:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 