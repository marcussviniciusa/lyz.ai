import { NextRequest, NextResponse } from 'next/server'
// import { getServerSession } from 'next-auth/next'
// import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/db'
import Patient from '@/models/Patient'
import mongoose from 'mongoose'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Temporariamente desabilitando autenticação para teste
    // const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    // }

    console.log('🔍 Buscando paciente com ID:', id)
    
    await connectToDatabase()
    console.log('✅ Conectado ao banco de dados')

    // Verificar se o ID é válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('❌ ID inválido:', id)
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    console.log('🔍 Buscando no banco...')
    const patient = await Patient.findById(id)
    console.log('📊 Resultado da busca:', patient ? 'Encontrado' : 'Não encontrado')
    
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    console.log('✅ Retornando dados do paciente:', patient.name)
    return NextResponse.json(patient)
  } catch (error) {
    console.error('❌ Erro ao buscar paciente:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Temporariamente desabilitando autenticação para teste
    // const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    // }

    // if (session.user.role !== 'professional' && session.user.role !== 'admin' && session.user.role !== 'superadmin') {
    //   return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    // }

    await connectToDatabase()

    // Verificar se o ID é válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const patient = await Patient.findById(id)
    
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Verificar se o usuário tem acesso a este paciente (mesma empresa)
    // if (session.user.role !== 'superadmin' && patient.companyId.toString() !== session.user.companyId) {
    //   return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    // }

    const body = await request.json()

    // Campos que podem ser atualizados
    const updateFields = {
      name: body.name,
      birthDate: body.birthDate,
      age: body.age,
      height: body.height,
      weight: body.weight,
      menstrualHistory: body.menstrualHistory,
      mainSymptoms: body.mainSymptoms,
      medicalHistory: body.medicalHistory,
      medications: body.medications,
      lifestyle: body.lifestyle,
      treatmentGoals: body.treatmentGoals,
      updatedAt: new Date()
    }

    // Remover campos undefined
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key as keyof typeof updateFields] === undefined) {
        delete updateFields[key as keyof typeof updateFields]
      }
    })

    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    )

    return NextResponse.json(updatedPatient)
  } catch (error) {
    console.error('Erro ao atualizar paciente:', error)
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
  const { id } = await params
  try {
    console.log('🗑️ API DELETE chamada para paciente ID:', id)
    console.log('📊 Request method:', request.method)
    console.log('🕐 Timestamp:', new Date().toISOString())
    
    // Temporariamente desabilitando autenticação para teste
    // const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    // }

    // if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
    //   return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    // }

    await connectToDatabase()
    console.log('✅ Conectado ao banco de dados')

    // Verificar se o ID é válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('❌ ID inválido:', id)
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    console.log('🔍 Buscando paciente no banco...')
    const patient = await Patient.findById(id)
    
    if (!patient) {
      console.log('❌ Paciente não encontrado')
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    console.log('👤 Paciente encontrado:', patient.name)
    console.log('🗑️ Marcando paciente como inativo...')

    // Verificar se o usuário tem acesso a este paciente (mesma empresa)
    // if (session.user.role !== 'superadmin' && patient.companyId.toString() !== session.user.companyId) {
    //   return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    // }

    // Fazer soft delete - marcar como inativo ao invés de deletar
    const updatedPatient = await Patient.findByIdAndUpdate(id, { 
      isActive: false,
      updatedAt: new Date()
    }, { new: true })
    console.log('✅ Paciente marcado como inativo com sucesso')
    console.log('📊 Status do paciente após atualização:', updatedPatient?.isActive)

    return NextResponse.json({ message: 'Paciente deletado com sucesso' })
  } catch (error) {
    console.error('❌ Erro ao deletar paciente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}