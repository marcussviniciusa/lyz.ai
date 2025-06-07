import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/db'
import Analysis from '@/models/Analysis'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await connectToDatabase()

    // Verificar se o ID é válido
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const analysis = await Analysis.findById(params.id)
      .populate('patientId', 'name dateOfBirth')
      .populate('createdBy', 'name email')
      .populate('reviewedBy', 'name email')
    
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
  { params }: { params: { id: string } }
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

    // Verificar se o ID é válido
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const analysis = await Analysis.findById(params.id)
    
    if (!analysis) {
      return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    // Verificar se o usuário tem acesso a esta análise (mesma empresa)
    if (session.user.role !== 'superadmin' && analysis.companyId.toString() !== session.user.companyId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()

    // Campos que podem ser atualizados
    const updateFields: any = {
      updatedAt: new Date()
    }

    if (body.title) updateFields.title = body.title
    if (body.description) updateFields.description = body.description
    if (body.input) updateFields.input = body.input
    if (body.output) updateFields.output = body.output
    if (body.status) updateFields.status = body.status
    if (body.notes) updateFields.notes = body.notes
    if (body.aiMetadata) updateFields.aiMetadata = body.aiMetadata

    const updatedAnalysis = await Analysis.findByIdAndUpdate(
      params.id,
      updateFields,
      { new: true }
    )
      .populate('patientId', 'name dateOfBirth')
      .populate('createdBy', 'name email')
      .populate('reviewedBy', 'name email')

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
  { params }: { params: { id: string } }
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

    // Verificar se o ID é válido
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const analysis = await Analysis.findById(params.id)
    
    if (!analysis) {
      return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    // Verificar se o usuário tem acesso a esta análise (mesma empresa)
    if (session.user.role !== 'superadmin' && analysis.companyId.toString() !== session.user.companyId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await Analysis.findByIdAndDelete(params.id)

    return NextResponse.json({ message: 'Análise deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar análise:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 