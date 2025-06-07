import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Patient from '@/models/Patient'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    // Filtros baseados na empresa do usuário (por enquanto simples)
    const query: any = {
      isActive: true
    }

    // TODO: Implementar filtro por empresa quando o sistema de autenticação estiver completo
    // Por enquanto, mostrar todos os pacientes para debug
    console.log('Session user:', session.user)
    console.log('Query:', query)

    // Filtro de busca
    if (search) {
      query.name = { $regex: search, $options: 'i' }
    }

    const skip = (page - 1) * limit

    const patients = await Patient.find(query)
      .populate('professional', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Patient.countDocuments(query)

    return NextResponse.json({
      patients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Erro ao buscar pacientes:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const {
      name,
      age,
      height,
      weight,
      menstrualHistory,
      mainSymptoms = [],
      medicalHistory,
      medications = [],
      lifestyle,
      treatmentGoals
    } = body

    // Validações básicas
    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    if (!age) {
      return NextResponse.json(
        { error: 'Idade é obrigatória' },
        { status: 400 }
      )
    }

    // Validar sintomas (máximo 5)
    if (mainSymptoms.length > 5) {
      return NextResponse.json(
        { error: 'Máximo de 5 sintomas principais permitidos' },
        { status: 400 }
      )
    }

    // Gerar ObjectIds temporários para desenvolvimento
    const mongoose = require('mongoose')
    const companyId = new mongoose.Types.ObjectId() // Temporário - será substituído por company real
    const professionalId = new mongoose.Types.ObjectId() // Temporário - será substituído por user real

    // Criar nova paciente
    const patient = new Patient({
      name,
      age,
      height,
      weight,
      menstrualHistory: {
        menarche: menstrualHistory?.menarche || 12,
        cycleLength: menstrualHistory?.cycleLength || 28,
        menstruationLength: menstrualHistory?.menstruationLength || 5,
        lastMenstruation: menstrualHistory?.lastMenstruation ? new Date(menstrualHistory.lastMenstruation) : new Date(),
        menopausalStatus: menstrualHistory?.menopausalStatus || 'pre',
        contraceptiveUse: menstrualHistory?.contraceptiveUse || 'none'
      },
      mainSymptoms: mainSymptoms || [],
      medicalHistory: {
        personalHistory: medicalHistory?.personalHistory || 'Não informado',
        familyHistory: medicalHistory?.familyHistory || 'Não informado',
        allergies: medicalHistory?.allergies || [],
        previousTreatments: medicalHistory?.previousTreatments || []
      },
      medications: medications || [],
      lifestyle: {
        sleepQuality: lifestyle?.sleepQuality || 'regular',
        sleepHours: lifestyle?.sleepHours || 8,
        exerciseFrequency: lifestyle?.exerciseFrequency || 'regular',
        exerciseType: lifestyle?.exerciseType || 'cardio',
        stressLevel: lifestyle?.stressLevel || 'moderate',
        nutritionQuality: lifestyle?.nutritionQuality || 'regular',
        relationshipQuality: lifestyle?.relationshipQuality || 'regular'
      },
      treatmentGoals: {
        goals: treatmentGoals?.goals || ['Não especificado'],
        expectations: treatmentGoals?.expectations || 'Melhoria geral da saúde',
        additionalNotes: treatmentGoals?.additionalNotes || ''
      },
      company: companyId, // ObjectId temporário
      professional: professionalId, // ObjectId temporário
      isActive: true
    })

    await patient.save()

    const savedPatient = await Patient.findById(patient._id)
      .populate('professional', 'name email')
      .lean()

    return NextResponse.json(
      { patient: savedPatient },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Erro ao criar paciente:', error)
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: `Erro de validação: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 