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
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo fornecido' },
        { status: 400 }
      )
    }

    // Validar tipos de arquivo
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    const invalidFiles = files.filter(file => !validTypes.includes(file.type))
    
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: 'Apenas arquivos PDF, PNG e JPG são aceitos' },
        { status: 400 }
      )
    }

    // Simular processamento dos arquivos
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Mock de texto extraído (simulando OCR/processamento)
    const extractedText = generateMockLabData(files)

    return NextResponse.json({
      success: true,
      filesProcessed: files.length,
      extractedText,
      message: 'Arquivos processados com sucesso'
    })

  } catch (error: any) {
    console.error('Erro no upload de exames:', error)
    return NextResponse.json(
      { error: 'Erro no processamento dos arquivos' },
      { status: 500 }
    )
  }
}

function generateMockLabData(files: File[]): string {
  // Simular diferentes tipos de exames baseado no número e tipo de arquivos
  const hasMultipleFiles = files.length > 1
  const hasPDF = files.some(f => f.type === 'application/pdf')
  
  let mockData = `LABORATÓRIO CLÍNICO - EXAMES PROCESSADOS VIA IA
Data da Coleta: ${new Date().toLocaleDateString('pt-BR')}
Paciente: [Nome extraído dos arquivos]

=== HEMOGRAMA COMPLETO ===
Hemácias: 4.1 milhões/mm³ (VR: 4.0-5.0)
Hemoglobina: 12.2 g/dL (VR: 12.0-16.0)
Hematócrito: 37% (VR: 36-46)
Leucócitos: 6.500/mm³ (VR: 4.000-10.000)
Plaquetas: 280.000/mm³ (VR: 150.000-450.000)

=== PERFIL TIREOIDIANO ===
TSH: 2.8 mUI/L (VR: 0.4-4.0)
T4 Livre: 1.1 ng/dL (VR: 0.8-1.8)
T3: 150 ng/dL (VR: 80-180)

=== VITAMINAS E MINERAIS ===
Vitamina D (25-OH): 28 ng/mL (VR: 30-100)
Vitamina B12: 380 pg/mL (VR: 200-900)
Ácido Fólico: 8.5 ng/mL (VR: 3.0-20.0)
Ferro: 75 μg/dL (VR: 60-150)
Ferritina: 18 ng/mL (VR: 15-200)

=== PERFIL LIPÍDICO ===
Colesterol Total: 195 mg/dL (VR: <200)
HDL: 38 mg/dL (VR: >40)
LDL: 125 mg/dL (VR: <130)
Triglicérides: 160 mg/dL (VR: <150)

=== MARCADORES INFLAMATÓRIOS ===
Proteína C Reativa (PCR): 2.8 mg/L (VR: <3.0)
VHS: 25 mm/h (VR: <20)
Homocisteína: 14 μmol/L (VR: <15)`

  if (hasMultipleFiles) {
    mockData += `

=== HORMÔNIOS REPRODUTIVOS ===
FSH: 7.2 mUI/mL (VR: 2.0-12.0)
LH: 5.8 mUI/mL (VR: 1.0-12.0)
Estradiol: 120 pg/mL (VR: 30-400)
Progesterona: 8.5 ng/mL (VR: 0.2-25.0)

=== FUNÇÃO RENAL ===
Creatinina: 0.8 mg/dL (VR: 0.6-1.2)
Ureia: 28 mg/dL (VR: 10-50)
Clearance de Creatinina: 95 mL/min (VR: >60)`
  }

  if (hasPDF) {
    mockData += `

=== EXAME DE URINA ===
Cor: Amarelo claro
Aspecto: Límpido
Densidade: 1.018
pH: 6.0
Proteínas: Negativo
Glicose: Negativo
Cetona: Negativo
Sangue: Negativo

=== OBSERVAÇÕES CLÍNICAS ===
- Exames extraídos via OCR de ${files.length} arquivo(s)
- Processamento automático com IA
- Valores de referência podem variar entre laboratórios
- Consulte seu médico para interpretação adequada`
  }

  return mockData
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