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

    console.log('🔍 API Análise [ID] - Debug:')
    console.log('- Analysis ID:', resolvedParams.id)
    console.log('- User ID:', session.user.id)
    console.log('- User Role:', session.user.role)
    console.log('- User Company:', session.user.company)

    const analysis = await Analysis.findById(resolvedParams.id)
      .populate('patient', 'name dateOfBirth')
      .populate('professional', 'name email')
      .populate('company', 'name')
    
    if (!analysis) {
      console.log('❌ Análise não encontrada')
      return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    console.log('📊 Dados da análise encontrada:')
    console.log('- Analysis Company (raw):', analysis.company)
    console.log('- Analysis Company tipo:', typeof analysis.company)
    
    // Obter o ID da empresa da análise
    let analysisCompanyId = null
    if (analysis.company) {
      // Se company foi populado, pegar o _id
      if (typeof analysis.company === 'object' && analysis.company._id) {
        analysisCompanyId = analysis.company._id.toString()
      } else {
        // Se é ObjectId direto
        analysisCompanyId = analysis.company.toString()
      }
    }

    console.log('- Analysis Company ID extraído:', analysisCompanyId)
    console.log('- User Company ID:', session.user.company)
    console.log('- Empresas são iguais?', analysisCompanyId === session.user.company)

    // Verificar se o usuário tem acesso a esta análise (mesma empresa)
    if (session.user.role !== 'superadmin' && analysisCompanyId !== session.user.company) {
      console.log('❌ Acesso negado - empresas diferentes')
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    console.log('✅ Acesso permitido - retornando análise')
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