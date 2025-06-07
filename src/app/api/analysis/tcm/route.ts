import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AIService from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { patientId, tcmData } = await request.json();

    if (!patientId || !tcmData) {
      return NextResponse.json(
        { error: 'Dados de paciente e observação MTC são obrigatórios' },
        { status: 400 }
      );
    }

    try {
      // Configurar provedor de IA (usando OpenAI como padrão)
      const provider = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY || ''
      };

      const promptData = {
        type: 'tcm' as const,
        inputData: { tcmData },
        patientData: { id: patientId }
      };

      // Gerar análise usando o serviço de IA
      const response = await AIService.generateAnalysis(provider, promptData);
      const analysis = response.content;

      // Estruturar resultado para MTC
      const analysisResult = {
        energeticDiagnosis: extractSection(analysis, 'DIAGNÓSTICO ENERGÉTICO'),
        herbalRecommendations: extractSection(analysis, 'RECOMENDAÇÕES FITOTERAPÊUTICAS'),
        acupuncturePoints: extractSection(analysis, 'PONTOS DE ACUPUNTURA'),
        dietaryGuidance: extractSection(analysis, 'ORIENTAÇÕES DIETÉTICAS'),
        fullAnalysis: analysis
      };

      // TODO: Salvar análise no banco de dados
      // const savedAnalysis = await saveAnalysis({
      //   type: 'tcm',
      //   patientId,
      //   input: { tcmData },
      //   output: analysisResult,
      //   userId: session.user.id,
      //   companyId: session.user.company
      // })

      return NextResponse.json({
        success: true,
        ...analysisResult,
        analysisId: `tcm_${Date.now()}`, // Temporary ID
        message: 'Análise de MTC concluída com sucesso'
      });

    } catch (aiError: any) {
      console.error('Erro na análise de IA:', aiError);
      return NextResponse.json(
        { error: 'Erro no processamento da análise. Tente novamente.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Erro na API de análise MTC:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função auxiliar para extrair seções do resultado
function extractSection(content: string, sectionTitle: string): string {
  const sections = content.split(/\d+\.\s*/);
  const section = sections.find(s => 
    s.toUpperCase().includes(sectionTitle.toUpperCase())
  );
  
  if (section) {
    return section
      .replace(new RegExp(sectionTitle + ':?', 'i'), '')
      .trim()
      .split('\n\n')[0] || section.trim();
  }
  
  return 'Seção não encontrada na análise.';
} 