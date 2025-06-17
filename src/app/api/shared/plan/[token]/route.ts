import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import DeliveryPlan from '@/models/DeliveryPlan'
import bcrypt from 'bcryptjs'

// POST - Acessar plano compartilhado (com ou sem senha)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { password } = await request.json()

    await connectDB()

    // Buscar plano pelo token
    const plan = await DeliveryPlan.findOne({
      'shareLink.token': token,
      'shareLink.isActive': true
    })
    .populate('patient', 'name email')
    .populate('professional', 'name email')
    .populate('analyses')

    if (!plan) {
      return NextResponse.json(
        { error: 'Link não encontrado ou expirado' },
        { status: 404 }
      )
    }

    // Verificar se o link expirou
    const now = new Date()
    if (plan.shareLink.expiresAt && new Date(plan.shareLink.expiresAt) < now) {
      // Desativar link expirado
      plan.shareLink.isActive = false
      await plan.save()

      return NextResponse.json(
        { error: 'Link expirado' },
        { status: 410 }
      )
    }

    // Se não é público, verificar senha
    if (!plan.shareLink.isPublic) {
      if (!password) {
        return NextResponse.json(
          { error: 'Senha requerida', needsPassword: true },
          { status: 401 }
        )
      }

      if (!plan.shareLink.password) {
        return NextResponse.json(
          { error: 'Configuração de senha inválida' },
          { status: 500 }
        )
      }

      const isPasswordValid = await bcrypt.compare(password, plan.shareLink.password)
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Senha incorreta' },
          { status: 401 }
        )
      }
    }

    // Incrementar contador de acesso
    plan.shareLink.accessCount = (plan.shareLink.accessCount || 0) + 1
    plan.shareLink.lastAccessed = new Date()
    await plan.save()

    // Preparar dados do plano para retorno (sem dados sensíveis)
    const planData = {
      _id: plan._id,
      patient: {
        name: plan.patient.name,
        email: plan.patient.email
      },
      professional: {
        name: plan.professional.name,
        email: plan.professional.email
      },
      analyses: plan.analyses.map((analysis: any) => ({
        _id: analysis._id,
        type: analysis.type,
        status: analysis.status,
        createdAt: analysis.createdAt,
        result: analysis.result ? {
          rawOutput: analysis.result.rawOutput
        } : undefined
      })),
      title: plan.title,
      description: plan.description,
      status: plan.status,
      createdAt: plan.createdAt,
      shareLink: {
        isPublic: plan.shareLink.isPublic,
        hasPassword: !plan.shareLink.isPublic && !!plan.shareLink.password,
        expiresAt: plan.shareLink.expiresAt,
        accessCount: plan.shareLink.accessCount
      }
    }

    return NextResponse.json({
      success: true,
      plan: planData
    })

  } catch (error) {
    console.error('Erro ao acessar plano compartilhado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 