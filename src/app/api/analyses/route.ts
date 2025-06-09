import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/db'
import Analysis from '@/models/Analysis'
import Patient from '@/models/Patient'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Construir query
    const query: any = {}

    // Filtrar por empresa do usuário (exceto superadmin)
    if (session.user.role !== 'superadmin') {
      query.company = new ObjectId(session.user.company)
    }

    // Filtro por paciente
    if (patientId) {
      if (!ObjectId.isValid(patientId)) {
        return NextResponse.json({ error: 'ID do paciente inválido' }, { status: 400 })
      }

      // Verificar se o usuário tem acesso ao paciente
      const patient = await Patient.findById(patientId)
      if (!patient) {
        return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
      }

      if (session.user.role !== 'superadmin' && patient.company.toString() !== session.user.company) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }

      query.patient = new ObjectId(patientId)
    }

    // Filtros adicionais
    if (type) {
      query.type = type
    }

    if (status) {
      query.status = status
    }

    // Paginação
    const skip = (page - 1) * limit

    const [analyses, total] = await Promise.all([
      Analysis.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('patient', 'name')
        .populate('professional', 'name email')
        .populate('company', 'name'),
      Analysis.countDocuments(query)
    ])

    return NextResponse.json({
      data: analyses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar análises:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'professional' && session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await connectToDatabase()

    const body = await request.json()

    // Verificar campos obrigatórios
    if (!body.patientId || !body.type || !body.title) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: patientId, type, title' },
        { status: 400 }
      )
    }

    // Verificar se o ID do paciente é válido
    if (!ObjectId.isValid(body.patientId)) {
      return NextResponse.json({ error: 'ID do paciente inválido' }, { status: 400 })
    }

    // Verificar se o paciente existe e se o usuário tem acesso
    const patient = await Patient.findById(body.patientId)
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    if (session.user.role !== 'superadmin' && patient.company?.toString() !== session.user.company) {
      return NextResponse.json({ error: 'Acesso negado ao paciente' }, { status: 403 })
    }

    // Validar tipo de análise
    const validTypes = ['laboratory', 'tcm', 'chronology', 'ifm', 'treatment']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: 'Tipo de análise inválido' },
        { status: 400 }
      )
    }

    // Criar ObjectId válido para professional
    let professionalId: ObjectId;
    if (ObjectId.isValid(session.user.id)) {
      professionalId = new ObjectId(session.user.id);
    } else {
      // Se o ID não for um ObjectId válido, criar um ObjectId padrão temporário
      professionalId = new ObjectId();
    }

    // Criar ObjectId válido para company
    let companyId: ObjectId;
    if (session.user.role === 'superadmin') {
      companyId = patient.company;
    } else if (session.user.company && ObjectId.isValid(session.user.company)) {
      companyId = new ObjectId(session.user.company);
    } else {
      // Criar um ObjectId padrão se não tiver company
      companyId = new ObjectId();
    }

    const analysisData = {
      patient: new ObjectId(body.patientId),
      professional: professionalId,
      company: companyId,
      type: body.type,
      status: 'pending',
      inputData: body.inputData || {},
      result: {
        rawOutput: ''
      },
      aiMetadata: {
        provider: 'openai', // Valor padrão
        model: 'gpt-4o-mini', // Valor padrão
        promptVersion: '1.0', // Valor padrão obrigatório
        tokensUsed: 0,
        processingTime: 0,
        cost: 0
      }
    }

    const analysis = new Analysis(analysisData)
    await analysis.save()

    // Retornar apenas dados essenciais sem populate para evitar erro BSON
    const responseData = {
      _id: analysis._id.toString(),
      patient: analysis.patient.toString(),
      professional: analysis.professional.toString(),
      company: analysis.company.toString(),
      type: analysis.type,
      status: analysis.status,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt
    }

    return NextResponse.json(responseData, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar análise:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 