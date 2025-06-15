import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/models/User'
import Patient from '@/models/Patient'
import Analysis from '@/models/Analysis'
import Document from '@/models/Document'
import Company from '@/models/Company'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar usuário
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const companyId = user.company

    // Obter estatísticas gerais
    const [
      totalPatients,
      totalAnalyses,
      totalDocuments,
      totalUsers,
      company
    ] = await Promise.all([
      Patient.countDocuments({ company: companyId }),
      Analysis.countDocuments({ company: companyId }),
      Document.countDocuments({ companyId }),
      User.countDocuments({ company: companyId }),
      Company.findById(companyId)
    ])

    // Análises por tipo (últimos 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const analysesByType = await Analysis.aggregate([
      {
        $match: {
          company: companyId,
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

    // Análises por dia (últimos 7 dias)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const dailyAnalyses = await Analysis.aggregate([
      {
        $match: {
          company: companyId,
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

    // Status dos documentos RAG
    const documentStats = await Document.aggregate([
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

    // Pacientes com análises recentes
    const recentPatients = await Patient.find({ 
      company: companyId 
    })
    .limit(5)
    .sort({ updatedAt: -1 })
    .select('name age mainSymptoms')

    // Análises mais recentes
    const recentAnalyses = await Analysis.find({
      company: companyId,
      status: 'completed'
    })
    .populate('patient', 'name age')
    .populate('professional', 'name')
    .limit(10)
    .sort({ createdAt: -1 })
    .select('type createdAt aiMetadata.processingTime patient professional')

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

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 