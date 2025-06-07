import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AIService from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { patientId, labData, symptoms, analysisType } = body

    if (!patientId || !labData) {
      return NextResponse.json(
        { error: 'Dados de paciente e exames laboratoriais são obrigatórios' },
        { status: 400 }
      )
    }

    // O prompt será construído automaticamente pelo AIService

    try {
      // Configurar provedor de IA (usando OpenAI como padrão)
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

      // Gerar análise usando o serviço de IA
      const response = await AIService.generateAnalysis(provider, promptData)
      const analysis = response.content

      // TODO: Salvar análise no banco de dados
      // const savedAnalysis = await saveAnalysis({
      //   type: 'laboratory',
      //   patientId,
      //   input: { labData, symptoms, analysisType },
      //   output: analysis,
      //   userId: session.user.id,
      //   companyId: session.user.company
      // })

      return NextResponse.json({
        success: true,
        analysis,
        analysisId: `lab_${Date.now()}`, // Temporary ID
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