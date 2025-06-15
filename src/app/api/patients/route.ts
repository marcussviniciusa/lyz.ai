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

    // Filtros baseados na empresa do usuário
    const query: any = {
      isActive: true
    }

    // Filtrar por empresa: superadmin vê todos, outros apenas da sua empresa
    if (session.user.role !== 'superadmin') {
      if (!session.user.company) {
        return NextResponse.json({ error: 'Usuário sem empresa associada' }, { status: 403 })
      }
      query.company = session.user.company
    }

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
      birthDate,
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

    // Calcular idade a partir da data de nascimento ou usar idade direta
    let calculatedAge = age
    if (birthDate && !age) {
      const birth = new Date(birthDate)
      const today = new Date()
      calculatedAge = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--
      }
    }

    if (!calculatedAge || calculatedAge <= 0) {
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
    
    // Usar dados reais da sessão
    let companyId = session.user.company
    let professionalId = session.user.id

    // Para superadmin que não tem empresa, permitir criar paciente sem empresa (para testes)
    if (session.user.role === 'superadmin' && !companyId) {
      companyId = new mongoose.Types.ObjectId() // Temporário apenas para superadmin
    }

    if (!companyId && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Usuário deve estar associado a uma empresa' },
        { status: 400 }
      )
    }

    // Preparar dados do paciente
    const patientData: any = {
      name,
      age: calculatedAge,
      company: companyId,
      professional: professionalId,
      isActive: true
    }

    // Adicionar campos opcionais apenas se fornecidos
    if (height) patientData.height = height
    if (weight) patientData.weight = weight

    // Adicionar histórico menstrual apenas se dados foram fornecidos
    if (menstrualHistory && (
      menstrualHistory.menarche || 
      menstrualHistory.cycleLength || 
      menstrualHistory.menstruationLength || 
      menstrualHistory.lastMenstruation || 
      menstrualHistory.menopausalStatus ||
      menstrualHistory.contraceptiveUse
    )) {
      patientData.menstrualHistory = {
        menarche: menstrualHistory.menarche || 12,
        cycleLength: menstrualHistory.cycleLength || 28,
        menstruationLength: menstrualHistory.menstruationLength || 5,
        lastMenstruation: menstrualHistory.lastMenstruation ? new Date(menstrualHistory.lastMenstruation) : new Date(),
        menopausalStatus: menstrualHistory.menopausalStatus || 'pre',
        contraceptiveUse: menstrualHistory.contraceptiveUse || 'none'
      }
    }

    // Adicionar sintomas principais apenas se fornecidos
    if (mainSymptoms && mainSymptoms.length > 0) {
      patientData.mainSymptoms = mainSymptoms
    }

    // Histórico médico sempre com dados padrão se não fornecido
    patientData.medicalHistory = {
      personalHistory: medicalHistory?.personalHistory || 'Não informado',
      familyHistory: medicalHistory?.familyHistory || 'Não informado',
      allergies: medicalHistory?.allergies || [],
      previousTreatments: medicalHistory?.previousTreatments || []
    }

    // Medicamentos apenas se fornecidos
    if (medications && medications.length > 0) {
      patientData.medications = medications
    }

    // Estilo de vida sempre com dados padrão se não fornecido
    patientData.lifestyle = {
      sleepQuality: lifestyle?.sleepQuality || 'regular',
      sleepHours: lifestyle?.sleepHours || 8,
      exerciseFrequency: lifestyle?.exerciseFrequency || 'regular',
      exerciseType: lifestyle?.exerciseType || 'cardio',
      stressLevel: lifestyle?.stressLevel || 'moderate',
      nutritionQuality: lifestyle?.nutritionQuality || 'regular',
      relationshipQuality: lifestyle?.relationshipQuality || 'regular'
    }

    // Objetivos de tratamento sempre com dados padrão se não fornecido
    patientData.treatmentGoals = {
      goals: treatmentGoals?.goals || ['Não especificado'],
      expectations: treatmentGoals?.expectations || 'Melhoria geral da saúde',
      additionalNotes: treatmentGoals?.additionalNotes || ''
    }

    // Criar nova paciente
    const patient = new Patient(patientData)

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