import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AIService from '@/lib/ai'
import RAGAnalysisService from '@/lib/ragAnalysisService'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { patientId, labData, symptoms, analysisType, useRAG = true } = body

    if (!patientId || !labData) {
      return NextResponse.json(
        { error: 'Dados de paciente e exames laboratoriais são obrigatórios' },
        { status: 400 }
      )
    }

    try {
      let result

      if (useRAG) {
        // Usar análise enriquecida com RAG
        result = await RAGAnalysisService.generateEnhancedAnalysis({
          type: 'laboratory',
          inputData: { labData, symptoms, analysisType },
          patientData: { id: patientId },
          companyId: session.user?.company || 'default'
        })
      } else {
        // Usar análise padrão sem RAG
        const provider = {
          provider: 'openai' as const,
          model: 'gpt-4o-mini',
          apiKey: process.env.OPENAI_API_KEY || ''
        }

        const promptData = {
          type: 'laboratory' as const,
          inputData: { labData, symptoms, analysisType },
          patientData: { id: patientId }
        }

        const response = await AIService.generateAnalysis(provider, promptData)
        result = {
          analysis: response.content,
          metadata: {
            enhancedWithRAG: false,
            documentsUsed: 0,
            processingTime: response.tokensUsed
          }
        }
      }

      // TODO: Salvar análise no banco de dados
      // const savedAnalysis = await saveAnalysis({
      //   type: 'laboratory',
      //   patientId,
      //   input: { labData, symptoms, analysisType },
      //   output: result.analysis,
      //   userId: session.user.id,
      //   companyId: session.user.company,
      //   ragMetadata: result.metadata
      // })

      return NextResponse.json({
        success: true,
        analysis: result.analysis,
        analysisId: `lab_${Date.now()}`, // Temporary ID
        metadata: result.metadata,
        ragContext: result.ragContext || null,
        message: 'Análise laboratorial concluída com sucesso'
      })

    } catch (aiError: any) {
      console.error('Erro na análise de IA:', aiError)
      return NextResponse.json(
        { error: 'Erro no processamento da análise. Tente novamente.' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Erro na API de análise laboratorial:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Funções auxiliares removidas - o AIService agora gerencia os prompts automaticamente 