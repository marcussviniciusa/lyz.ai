import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { createAnalysisService } from '@/lib/analysis-service';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Buscar usuário
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { patientId, analysisType, examData, tcmData } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: 'ID da paciente é obrigatório' },
        { status: 400 }
      );
    }

    // Criar serviço de análise
    const companyId = user.company ? user.company.toString() : 'global';
    const analysisService = createAnalysisService(
      companyId,
      user._id.toString(),
      patientId
    );

    let result;

    switch (analysisType) {
      case 'laboratory':
        if (!examData) {
          return NextResponse.json(
            { error: 'Dados de exames são obrigatórios para análise laboratorial' },
            { status: 400 }
          );
        }
        result = await analysisService.runLaboratoryAnalysis(examData);
        break;

      case 'tcm':
        if (!tcmData) {
          return NextResponse.json(
            { error: 'Dados de MTC são obrigatórios para análise de MTC' },
            { status: 400 }
          );
        }
        result = await analysisService.runTCMAnalysis(tcmData);
        break;

      case 'chronology':
        result = await analysisService.runChronologyAnalysis();
        break;

      case 'ifm':
        result = await analysisService.runIFMAnalysis();
        break;

      case 'treatmentPlan':
        result = await analysisService.runTreatmentPlanAnalysis();
        break;

      case 'complete':
        result = await analysisService.runCompleteAnalysisFlow(examData, tcmData);
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de análise não suportado' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao executar análise:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 