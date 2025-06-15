import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Patient from '@/models/Patient';
import Analysis from '@/models/Analysis';
import Company from '@/models/Company';
import User from '@/models/User';
import { AIService } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await dbConnect();

    const { patientId, treatmentGoals, preferences } = await request.json();

    if (!patientId) {
      return NextResponse.json({ error: 'ID do paciente é obrigatório' }, { status: 400 });
    }

    // Buscar usuário e empresa
    const user = await User.findOne({ email: session.user?.email });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const company = await Company.findById(user.companyId);
    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // Verificar se o paciente pertence à empresa
    const patient = await Patient.findOne({ _id: patientId, companyId: user.companyId });
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    // Buscar todas as análises existentes do paciente
    const analyses = await Analysis.find({ patientId }).sort({ createdAt: -1 });
    const labAnalysis = analyses.find(a => a.type === 'laboratory');
    const tcmAnalysis = analyses.find(a => a.type === 'tcm');
    const chronologyAnalysis = analyses.find(a => a.type === 'chronology');
    const ifmAnalysis = analyses.find(a => a.type === 'ifm');

    // Estruturar dados para a IA
    const analysisData = {
      patient: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        mainSymptoms: patient.mainSymptoms,
        medicalHistory: patient.medicalHistory,
        currentMedications: patient.currentMedications,
        allergies: patient.allergies,
        lifestyle: patient.lifestyle
      },
      labAnalysis: labAnalysis?.analysis || null,
      tcmAnalysis: tcmAnalysis?.analysis || null,
      chronologyAnalysis: chronologyAnalysis?.analysis || null,
      ifmAnalysis: ifmAnalysis?.analysis || null,
      treatmentGoals: treatmentGoals || [],
      preferences: preferences || {}
    };

    // Inicializar AIService
    const aiService = new AIService(company);

    // Chamar IA
    const startTime = Date.now();
    const aiResponse = await aiService.generateAnalysis(
      'treatmentPlan',
      {
        patientData: analysisData.patient,
        previousAnalyses: [
          analysisData.labAnalysis,
          analysisData.tcmAnalysis,
          analysisData.chronologyAnalysis,
          analysisData.ifmAnalysis
        ].filter(Boolean)
      }
    );
    const endTime = Date.now();

    let analysis;
    try {
      analysis = JSON.parse(aiResponse);
    } catch (error: any) {
      console.error('Erro ao parsear resposta da IA:', error);
      return NextResponse.json({ error: 'Erro ao processar resposta da IA' }, { status: 500 });
    }

    // Salvar resultado
    const treatmentPlan = new Analysis({
      patientId,
      companyId: user.companyId,
      userId: user._id,
      type: 'treatment-plan',
      analysis,
      aiMetadata: {
        model: 'gpt-4o-mini',
        processingTime: endTime - startTime
      },
      status: 'completed'
    });

    await treatmentPlan.save();

    return NextResponse.json({
      success: true,
      analysis,
      aiMetadata: {
        model: 'gpt-4o-mini',
        processingTime: endTime - startTime
      },
      createdAt: treatmentPlan.createdAt,
      id: treatmentPlan._id
    });

  } catch (error: any) {
    console.error('Erro na análise de plano de tratamento:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 