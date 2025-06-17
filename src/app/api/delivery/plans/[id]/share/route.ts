import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import DeliveryPlan from '@/models/DeliveryPlan'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// POST - Criar ou atualizar link de compartilhamento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const {
      isPublic,
      password,
      expirationHours
    } = await request.json()

    if (!expirationHours || expirationHours < 1) {
      return NextResponse.json(
        { error: 'Tempo de expiração deve ser maior que 0' },
        { status: 400 }
      )
    }

    await connectDB()

    const plan = await DeliveryPlan.findById(id)
    if (!plan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem acesso a este plano
    if (plan.professional.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado a este plano' },
        { status: 403 }
      )
    }

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex')

    // Calcular data de expiração
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expirationHours)

    // Preparar dados do shareLink
    const shareLinkData: any = {
      token,
      isPublic: Boolean(isPublic),
      expiresAt,
      createdAt: new Date(),
      accessCount: 0,
      isActive: true
    }

    // Se não for público e tem senha, hash da senha
    if (!isPublic && password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      shareLinkData.password = hashedPassword
    }

    // Atualizar o plano com o novo link
    plan.shareLink = shareLinkData
    await plan.save()

    // Construir URL do link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/shared/plan/${token}`

    return NextResponse.json({
      success: true,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
      isPublic,
      hasPassword: !isPublic && !!password
    })

  } catch (error) {
    console.error('Erro ao criar link de compartilhamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Obter status do link de compartilhamento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 401 }
      )
    }

    const { id } = await params

    await connectDB()

    const plan = await DeliveryPlan.findById(id)
    if (!plan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem acesso a este plano
    if (plan.professional.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado a este plano' },
        { status: 403 }
      )
    }

    // Verificar se existe link ativo
    if (!plan.shareLink || !plan.shareLink.isActive) {
      return NextResponse.json({
        hasActiveLink: false
      })
    }

    // Verificar se não expirou
    const now = new Date()
    const isExpired = plan.shareLink.expiresAt && new Date(plan.shareLink.expiresAt) < now

    if (isExpired) {
      // Desativar link expirado
      plan.shareLink.isActive = false
      await plan.save()

      return NextResponse.json({
        hasActiveLink: false,
        expired: true
      })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/shared/plan/${plan.shareLink.token}`

    return NextResponse.json({
      hasActiveLink: true,
      shareUrl,
      expiresAt: plan.shareLink.expiresAt,
      isPublic: plan.shareLink.isPublic,
      hasPassword: !plan.shareLink.isPublic && !!plan.shareLink.password,
      accessCount: plan.shareLink.accessCount,
      lastAccessed: plan.shareLink.lastAccessed,
      createdAt: plan.shareLink.createdAt
    })

  } catch (error) {
    console.error('Erro ao buscar status do link:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Revogar link de compartilhamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 401 }
      )
    }

    const { id } = await params

    await connectDB()

    const plan = await DeliveryPlan.findById(id)
    if (!plan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem acesso a este plano
    if (plan.professional.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado a este plano' },
        { status: 403 }
      )
    }

    // Desativar o link
    if (plan.shareLink) {
      plan.shareLink.isActive = false
    }
    await plan.save()

    return NextResponse.json({
      success: true,
      message: 'Link de compartilhamento revogado'
    })

  } catch (error) {
    console.error('Erro ao revogar link:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 