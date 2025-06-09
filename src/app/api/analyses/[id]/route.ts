import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/db'
import Analysis from '@/models/Analysis'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await connectToDatabase()
    
    const resolvedParams = await params

    // Verificar se o ID é válido
    if (!ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const analysis = await Analysis.findById(resolvedParams.id)
      .populate('patient', 'name dateOfBirth')
      .populate('professional', 'name email')
      .populate('company', 'name')
    
    if (!analysis) {
      return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    // Verificar se o usuário tem acesso a esta análise (mesma empresa)
    if (session.user.role !== 'superadmin' && analysis.company.toString() !== session.user.company) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Erro ao buscar análise:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'professional' && session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await connectToDatabase()
    
    const resolvedParams = await params

    // Verificar se o ID é válido
    if (!ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const analysis = await Analysis.findById(resolvedParams.id)
    
    if (!analysis) {
      return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    // Verificar se o usuário tem acesso a esta análise (mesma empresa)
    if (session.user.role !== 'superadmin' && analysis.company.toString() !== session.user.company) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()

    // Campos que podem ser atualizados
    const updateFields: any = {}

    if (body.inputData) updateFields.inputData = body.inputData
    if (body.result) updateFields.result = body.result
    if (body.status) updateFields.status = body.status
    if (body.aiMetadata) updateFields.aiMetadata = body.aiMetadata
    if (body.professionalReview) updateFields.professionalReview = body.professionalReview

    const updatedAnalysis = await Analysis.findByIdAndUpdate(
      resolvedParams.id,
      updateFields,
      { new: true }
    )
      .populate('patient', 'name dateOfBirth')
      .populate('professional', 'name email')
      .populate('company', 'name')

    return NextResponse.json(updatedAnalysis)
  } catch (error) {
    console.error('Erro ao atualizar análise:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await connectToDatabase()
    
    const resolvedParams = await params

    // Verificar se o ID é válido
    if (!ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const analysis = await Analysis.findById(resolvedParams.id)
    
    if (!analysis) {
      return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    // Verificar se o usuário tem acesso a esta análise (mesma empresa)
    if (session.user.role !== 'superadmin' && analysis.company.toString() !== session.user.company) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await Analysis.findByIdAndDelete(resolvedParams.id)

    return NextResponse.json({ message: 'Análise deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar análise:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 