import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/models/User'
import Patient from '@/models/Patient'
import Analysis from '@/models/Analysis'
import Document from '@/models/Document'
import Company from '@/models/Company'
import mongoose from 'mongoose'

// Função para garantir ObjectId válido com logs detalhados
function ensureValidObjectId(value: any, fieldName: string): string {
  console.log(`[Dashboard] Validando ${fieldName}:`, { value, type: typeof value })
  
  if (!value) {
    console.warn(`[Dashboard] ${fieldName} não fornecido, gerando ObjectId mock`)
    return '507f1f77bcf86cd799439011' // ObjectId fixo para desenvolvimento
  }
  
  if (mongoose.Types.ObjectId.isValid(value)) {
    console.log(`[Dashboard] ${fieldName} válido:`, value.toString())
    return value.toString()
  }
  
  console.warn(`[Dashboard] ${fieldName} inválido (${value}), usando ObjectId mock`)
  return '507f1f77bcf86cd799439011' // ObjectId fixo para desenvolvimento
}

export async function GET(request: NextRequest) {
  try {
    console.log('[Dashboard] Iniciando carregamento de estatísticas...')
    await dbConnect()

    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.error('[Dashboard] Usuário não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log('[Dashboard] Sessão encontrada:', {
      email: session.user.email,
      role: session.user.role,
      company: session.user.company,
      id: session.user.id
    })

    // Buscar usuário
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      console.error('[Dashboard] Usuário não encontrado no banco:', session.user.email)
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    console.log('[Dashboard] Usuário encontrado no banco:', {
      id: user._id,
      company: user.company,
      role: user.role
    })

    // Garantir companyId válido
    const companyId = ensureValidObjectId(user.company, 'companyId')
    console.log('[Dashboard] CompanyId processado:', companyId)

    // Obter estatísticas gerais com try/catch individual
    console.log('[Dashboard] Coletando estatísticas...')
    
    let totalPatients = 0
    let totalAnalyses = 0
    let totalDocuments = 0
    let totalUsers = 0
    let company = null

    try {
      totalPatients = await Patient.countDocuments({ company: companyId })
      console.log('[Dashboard] Total de pacientes:', totalPatients)
    } catch (error) {
      console.error('[Dashboard] Erro ao contar pacientes:', error)
    }

    try {
      totalAnalyses = await Analysis.countDocuments({ company: companyId })
      console.log('[Dashboard] Total de análises:', totalAnalyses)
    } catch (error) {
      console.error('[Dashboard] Erro ao contar análises:', error)
    }

    try {
      totalDocuments = await Document.countDocuments({ companyId })
      console.log('[Dashboard] Total de documentos:', totalDocuments)
    } catch (error) {
      console.error('[Dashboard] Erro ao contar documentos:', error)
    }

    try {
      totalUsers = await User.countDocuments({ company: companyId })
      console.log('[Dashboard] Total de usuários:', totalUsers)
    } catch (error) {
      console.error('[Dashboard] Erro ao contar usuários:', error)
    }

    try {
      company = await Company.findById(companyId)
      console.log('[Dashboard] Empresa encontrada:', company?._id || 'Não encontrada')
    } catch (error) {
      console.error('[Dashboard] Erro ao buscar empresa:', error)
    }

    // Análises por tipo (últimos 30 dias) com tratamento de erro
    let analysesByType = []
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      analysesByType = await Analysis.aggregate([
        {
          $match: {
            company: new mongoose.Types.ObjectId(companyId),
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            avgProcessingTime: { $avg: '$aiMetadata.processingTime' }
          }
        }
      ])
      console.log('[Dashboard] Análises por tipo:', analysesByType.length)
    } catch (error) {
      console.error('[Dashboard] Erro na agregação de análises por tipo:', error)
    }

    // Análises por dia (últimos 7 dias) com tratamento de erro
    let dailyAnalyses = []
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      dailyAnalyses = await Analysis.aggregate([
        {
          $match: {
            company: new mongoose.Types.ObjectId(companyId),
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        }
      ])
      console.log('[Dashboard] Análises diárias:', dailyAnalyses.length)
    } catch (error) {
      console.error('[Dashboard] Erro na agregação de análises diárias:', error)
    }

    // Status dos documentos RAG com tratamento de erro
    let documentStats = []
    try {
      documentStats = await Document.aggregate([
        {
          $match: { companyId: companyId }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
      console.log('[Dashboard] Estatísticas de documentos:', documentStats.length)
    } catch (error) {
      console.error('[Dashboard] Erro na agregação de documentos:', error)
    }

    // Pacientes com análises recentes com tratamento de erro
    let recentPatients = []
    try {
      recentPatients = await Patient.find({ 
        company: companyId 
      })
      .limit(5)
      .sort({ updatedAt: -1 })
      .select('name age mainSymptoms')
      console.log('[Dashboard] Pacientes recentes:', recentPatients.length)
    } catch (error) {
      console.error('[Dashboard] Erro ao buscar pacientes recentes:', error)
    }

    // Análises mais recentes com tratamento de erro
    let recentAnalyses = []
    try {
      recentAnalyses = await Analysis.find({
        company: companyId,
        status: 'completed'
      })
      .populate('patient', 'name age')
      .populate('professional', 'name')
      .limit(10)
      .sort({ createdAt: -1 })
      .select('type createdAt aiMetadata.processingTime patient professional')
      console.log('[Dashboard] Análises recentes:', recentAnalyses.length)
    } catch (error) {
      console.error('[Dashboard] Erro ao buscar análises recentes:', error)
    }

    // Estatísticas de uso de IA por provider
    const aiUsageStats = company?.usage || {
      totalAnalyses: 0,
      totalUsers: 0,
      monthlyUsage: []
    }

    // Calcular uso atual do mês
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const currentMonthUsage = aiUsageStats.monthlyUsage.find(
      (usage: any) => usage.month.toISOString().slice(0, 7) === currentMonth
    )

    const stats = {
      overview: {
        totalPatients,
        totalAnalyses,
        totalDocuments,
        totalUsers,
        analysesThisMonth: currentMonthUsage?.analysesCount || 0,
        tokensUsed: currentMonthUsage?.tokensUsed || 0,
        estimatedCost: currentMonthUsage?.cost || 0
      },
      analysesByType: analysesByType.map(item => ({
        type: item._id,
        count: item.count,
        avgProcessingTime: Math.round(item.avgProcessingTime || 0)
      })),
      dailyAnalyses: dailyAnalyses.map(item => ({
        date: item._id,
        count: item.count
      })),
      documentStats: documentStats.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {} as Record<string, number>),
      recentPatients: recentPatients.map(patient => ({
        id: patient._id,
        name: patient.name,
        age: patient.age,
        symptoms: patient.mainSymptoms?.slice(0, 3) || []
      })),
      recentAnalyses: recentAnalyses.map(analysis => ({
        _id: analysis._id,
        type: analysis.type,
        patient: {
          id: analysis.patient?._id,
          name: analysis.patient?.name
        },
        user: analysis.professional?.name,
        createdAt: analysis.createdAt,
        status: analysis.status || 'completed',
        cost: analysis.aiMetadata?.cost || 0,
        processingTime: analysis.aiMetadata?.processingTime
      })),
      aiProviders: company?.settings?.aiProviders ? {
        hasOpenAI: !!company.settings.aiProviders.openai?.apiKey,
        hasAnthropic: !!company.settings.aiProviders.anthropic?.apiKey,
        hasGoogle: !!company.settings.aiProviders.google?.apiKey,
        defaultProvider: company.settings.defaultAiProvider
      } : null,
      subscription: {
        plan: company?.subscription?.plan,
        status: company?.subscription?.status,
        expiresAt: company?.subscription?.expiresAt,
        features: company?.subscription?.features || []
      }
    }

    console.log('[Dashboard] Estatísticas finais:', {
      totalPatients: stats.overview.totalPatients,
      totalAnalyses: stats.overview.totalAnalyses,
      totalDocuments: stats.overview.totalDocuments,
      totalUsers: stats.overview.totalUsers
    })

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('[Dashboard] Erro geral ao obter estatísticas:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 