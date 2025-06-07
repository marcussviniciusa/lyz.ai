import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import mongoose from 'mongoose'

// Schema para configurações do sistema
const SystemSettingsSchema = new mongoose.Schema({
  aiProvider: {
    type: String,
    enum: ['openai', 'anthropic', 'gemini'],
    default: 'openai'
  },
  defaultModel: {
    type: String,
    default: 'gpt-4'
  },
  maxTokensPerAnalysis: {
    type: Number,
    default: 8000
  },
  enableEmailNotifications: {
    type: Boolean,
    default: true
  },
  enableSmsNotifications: {
    type: Boolean,
    default: false
  },
  dataRetentionDays: {
    type: Number,
    default: 365
  },
  maxFileUploadSize: {
    type: Number,
    default: 10 // MB
  },
  allowedFileTypes: [{
    type: String
  }],
  securitySettings: {
    forcePasswordReset: {
      type: Boolean,
      default: false
    },
    sessionTimeoutMinutes: {
      type: Number,
      default: 480
    },
    maxLoginAttempts: {
      type: Number,
      default: 5
    }
  },
  billingSettings: {
    defaultPlan: {
      type: String,
      enum: ['basic', 'professional', 'enterprise'],
      default: 'basic'
    },
    enableUsageTracking: {
      type: Boolean,
      default: true
    },
    autoUpgradeThreshold: {
      type: Number,
      default: 90
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
})

const SystemSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema)

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await dbConnect()

    // Buscar configurações do sistema (deve haver apenas uma)
    let settings = await SystemSettings.findOne()

    // Se não existir, criar com valores padrão
    if (!settings) {
      settings = new SystemSettings({
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
        updatedBy: session.user.id
      })
      await settings.save()
    }

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const settingsData = await req.json()

    // Validações básicas
    if (settingsData.maxTokensPerAnalysis && settingsData.maxTokensPerAnalysis < 1000) {
      return NextResponse.json(
        { error: 'Máximo de tokens deve ser pelo menos 1000' }, 
        { status: 400 }
      )
    }

    if (settingsData.dataRetentionDays && settingsData.dataRetentionDays < 30) {
      return NextResponse.json(
        { error: 'Retenção de dados deve ser pelo menos 30 dias' }, 
        { status: 400 }
      )
    }

    if (settingsData.maxFileUploadSize && settingsData.maxFileUploadSize > 100) {
      return NextResponse.json(
        { error: 'Tamanho máximo de upload não pode exceder 100MB' }, 
        { status: 400 }
      )
    }

    await dbConnect()

    // Buscar configurações existentes ou criar nova
    let settings = await SystemSettings.findOne()

    if (settings) {
      // Atualizar configurações existentes
      Object.assign(settings, settingsData)
      settings.updatedAt = new Date()
      settings.updatedBy = session.user.id
    } else {
      // Criar novas configurações
      settings = new SystemSettings({
        ...settingsData,
        updatedBy: session.user.id
      })
    }

    await settings.save()

    return NextResponse.json({
      message: 'Configurações salvas com sucesso',
      settings
    })

  } catch (error) {
    console.error('Erro ao salvar configurações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
} 