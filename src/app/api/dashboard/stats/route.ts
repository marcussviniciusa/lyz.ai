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

    // Definir filtros baseados no papel do usuário
    let companyFilter = {}
    let documentFilter = {}
    let isSuperAdmin = user.role === 'superadmin'

    if (isSuperAdmin) {
      console.log('[Dashboard] Superadmin detectado - buscando dados globais')
      // Superadmin vê dados globais (sem filtro de empresa)
      companyFilter = {}
      documentFilter = {}
    } else {
      // Outros usuários veem apenas dados da sua empresa
      const companyId = ensureValidObjectId(user.company, 'companyId')
      console.log('[Dashboard] Usuário regular - CompanyId processado:', companyId)
      companyFilter = { company: new mongoose.Types.ObjectId(companyId) }
      documentFilter = { companyId: companyId }
    }

    // Obter estatísticas gerais com try/catch individual
    console.log('[Dashboard] Coletando estatísticas...')
    
    let totalPatients = 0
    let totalAnalyses = 0
    let totalDocuments = 0
    let totalUsers = 0
    let company = null

    try {
      totalPatients = await Patient.countDocuments(companyFilter)
      console.log('[Dashboard] Total de pacientes:', totalPatients)
    } catch (error) {
      console.error('[Dashboard] Erro ao contar pacientes:', error)
    }

    try {
      totalAnalyses = await Analysis.countDocuments(companyFilter)
      console.log('[Dashboard] Total de análises:', totalAnalyses)
    } catch (error) {
      console.error('[Dashboard] Erro ao contar análises:', error)
    }

    try {
      if (isSuperAdmin) {
        // Para superadmin, usar RAGDocument se existir, senão Document
        try {
          const RAGDocument = mongoose.models.RAGDocument || mongoose.model('RAGDocument', new mongoose.Schema({}, { strict: false }))
          totalDocuments = await RAGDocument.countDocuments({})
          console.log('[Dashboard] Total de documentos RAG (superadmin):', totalDocuments)
        } catch {
          totalDocuments = await Document.countDocuments({})
          console.log('[Dashboard] Total de documentos globais (superadmin):', totalDocuments)
        }
      } else {
        totalDocuments = await Document.countDocuments(documentFilter)
        console.log('[Dashboard] Total de documentos da empresa:', totalDocuments)
      }
    } catch (error) {
      console.error('[Dashboard] Erro ao contar documentos:', error)
    }

    try {
      if (isSuperAdmin) {
        totalUsers = await User.countDocuments({})
        console.log('[Dashboard] Total de usuários globais (superadmin):', totalUsers)
      } else {
        totalUsers = await User.countDocuments(companyFilter)
        console.log('[Dashboard] Total de usuários da empresa:', totalUsers)
      }
    } catch (error) {
      console.error('[Dashboard] Erro ao contar usuários:', error)
    }

    try {
      if (!isSuperAdmin && user.company) {
        company = await Company.findById(user.company)
        console.log('[Dashboard] Empresa encontrada:', company?._id || 'Não encontrada')
      } else {
        console.log('[Dashboard] Superadmin ou usuário sem empresa - pulando busca de empresa')
      }
    } catch (error) {
      console.error('[Dashboard] Erro ao buscar empresa:', error)
    }

    // Análises por tipo (últimos 30 dias) com tratamento de erro
    let analysesByType = []
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const matchFilter = {
        createdAt: { $gte: thirtyDaysAgo },
        ...companyFilter
      }

      analysesByType = await Analysis.aggregate([
        { $match: matchFilter },
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

      const matchFilter = {
        createdAt: { $gte: sevenDaysAgo },
        ...companyFilter
      }

      dailyAnalyses = await Analysis.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ])
      console.log('[Dashboard] Análises diárias:', dailyAnalyses.length)
    } catch (error) {
      console.error('[Dashboard] Erro na agregação de análises diárias:', error)
    }

    // Status dos documentos RAG com tratamento de erro
    let documentStats = []
    try {
      if (isSuperAdmin) {
        // Para superadmin, tentar RAGDocument primeiro
        try {
          const RAGDocument = mongoose.models.RAGDocument || mongoose.model('RAGDocument', new mongoose.Schema({}, { strict: false }))
          documentStats = await RAGDocument.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ])
        } catch {
          documentStats = await Document.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ])
        }
      } else {
        documentStats = await Document.aggregate([
          { $match: documentFilter },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
      }
      console.log('[Dashboard] Estatísticas de documentos:', documentStats.length)
    } catch (error) {
      console.error('[Dashboard] Erro na agregação de documentos:', error)
    }

    // Pacientes com análises recentes com tratamento de erro
    let recentPatients = []
    try {
      recentPatients = await Patient.find(companyFilter)
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
      const analysisFilter = {
        status: 'completed',
        ...companyFilter
      }

      recentAnalyses = await Analysis.find(analysisFilter)
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