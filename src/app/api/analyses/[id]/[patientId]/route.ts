import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAnalysisService } from '@/lib/analysis-service';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    await connectDB();

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

    const { patientId } = params;

    if (!patientId) {
      return NextResponse.json(
        { error: 'ID da paciente é obrigatório' },
        { status: 400 }
      );
    }

    // Criar serviço de análise
    const analysisService = createAnalysisService(
      user.companyId.toString(),
      user._id.toString(),
      patientId
    );

    // Buscar análises da paciente
    const analyses = await analysisService.getPatientAnalyses();

    return NextResponse.json({
      success: true,
      data: analyses
    });

  } catch (error) {
    console.error('Erro ao buscar análises:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 