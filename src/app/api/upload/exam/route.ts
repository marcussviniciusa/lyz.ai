import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import MinIOService from '@/lib/minio'
import User from '@/models/User'
import Patient from '@/models/Patient'
import mongoose from 'mongoose'

// Schema para metadados de exames
const ExamSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  examType: {
    type: String,
    enum: ['hemograma', 'bioquimica', 'hormonal', 'vitaminas', 'tireoide', 'inflamatorio', 'imunologico', 'urina', 'fezes', 'outros'],
    default: 'outros'
  },
  examDate: {
    type: Date
  },
  processed: {
    type: Boolean,
    default: false
  },
  extractedData: {
    type: mongoose.Schema.Types.Mixed
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'processed', 'error'],
    default: 'uploaded'
  },
  processingNotes: {
    type: String
  }
}, {
  timestamps: true
})

// Índices para performance
ExamSchema.index({ patientId: 1, companyId: 1 })
ExamSchema.index({ examType: 1 })
ExamSchema.index({ processed: 1 })
ExamSchema.index({ createdAt: -1 })

const Exam = mongoose.models.Exam || mongoose.model('Exam', ExamSchema)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    // Buscar usuário
    const user = await User.findOne({ email: session.user?.email })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const patientId = formData.get('patientId') as string
    const examType = formData.get('examType') as string || 'outros'
    const examDate = formData.get('examDate') as string

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
    }

    if (!patientId) {
      return NextResponse.json({ error: 'ID da paciente é obrigatório' }, { status: 400 })
    }

    // Verificar se a paciente existe e pertence à empresa do usuário
    const patient = await Patient.findOne({
      _id: patientId,
      companyId: user.company
    })

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrada' }, { status: 404 })
    }

    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de arquivo não suportado. Use PDF, JPG ou PNG.' 
      }, { status: 400 })
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'Arquivo muito grande. Máximo 10MB.' 
      }, { status: 400 })
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `exam_${patientId}_${timestamp}_${randomSuffix}.${fileExtension}`

    // Upload para MinIO
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await MinIOService.uploadFile(buffer, file.name, {
      folder: `exams/${user.company}/${patientId}`,
      filename: fileName,
      contentType: file.type
    })

    // Salvar metadados no MongoDB
    const exam = new Exam({
      patientId,
      companyId: user.company,
      fileName,
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type,
      filePath: uploadResult.key,
      examType,
      examDate: examDate ? new Date(examDate) : undefined,
      uploadedBy: user._id,
      status: 'uploaded'
    })

    await exam.save()

    return NextResponse.json({
      success: true,
      exam: {
        _id: exam._id,
        fileName: exam.originalName,
        fileSize: exam.fileSize,
        fileType: exam.fileType,
        examType: exam.examType,
        examDate: exam.examDate,
        uploadedAt: exam.createdAt,
        processed: exam.processed,
        status: exam.status
      }
    })

  } catch (error) {
    console.error('Erro no upload de exame:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const user = await User.findOne({ email: session.user?.email })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const url = new URL(request.url)
    const patientId = url.searchParams.get('patientId')

    const query: any = { companyId: user.company }
    if (patientId) {
      query.patientId = patientId
    }

    const exams = await Exam.find(query)
      .populate('patientId', 'name')
      .sort({ createdAt: -1 })

    const formattedExams = exams.map(exam => ({
      _id: exam._id,
      fileName: exam.originalName,
      fileSize: exam.fileSize,
      fileType: exam.fileType,
      examType: exam.examType,
      examDate: exam.examDate,
      uploadedAt: exam.createdAt,
      processed: exam.processed,
      status: exam.status,
      extractedData: exam.extractedData,
      patientName: exam.patientId?.name
    }))

    return NextResponse.json({
      exams: formattedExams
    })

  } catch (error) {
    console.error('Erro ao buscar exames:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 