import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Patient from '@/models/Patient';
import Analysis from '@/models/Analysis';
import Company from '@/models/Company';
import User from '@/models/User';
import aiProvider from '@/lib/ai';

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

    // Configurar prompts para o plano de tratamento
    const systemPrompt = `Você é um especialista em medicina funcional, medicina tradicional chinesa e medicina integrativa, especializado em saúde da mulher e análise de ciclicidade. Sua tarefa é criar um plano de tratamento abrangente e personalizado integrando todas as análises realizadas.

METODOLOGIA:
1. Síntese diagnóstica integrativa combinando todas as análises
2. Identificação de prioridades terapêuticas hierarquizadas
3. Estruturação em fases de tratamento (estabilização, otimização, manutenção)
4. Plano nutricional detalhado e personalizado
5. Protocolo de suplementação baseado em evidências
6. Recomendações de estilo de vida específicas
7. Cronograma de acompanhamento e monitoramento
8. Orientações para a paciente
9. Critérios de sucesso e ajustes

RESPONDA EM PORTUGUÊS e estruture sua resposta em JSON seguindo EXATAMENTE esta estrutura:

{
  "diagnosticSynthesis": {
    "primaryDiagnosis": "Diagnóstico principal integrado",
    "contributingFactors": ["fator1", "fator2"],
    "rootCauses": ["causa raiz 1", "causa raiz 2"],
    "systemsInvolved": ["sistema1", "sistema2"],
    "prognosis": "Prognóstico baseado em todas as análises"
  },
  "therapeuticPriorities": [
    {
      "priority": 1,
      "intervention": "Intervenção prioritária",
      "rationale": "Justificativa baseada nas análises",
      "timeline": "tempo estimado",
      "successMetrics": ["métrica1", "métrica2"]
    }
  ],
  "treatmentPhases": {
    "stabilization": {
      "duration": "duração da fase",
      "objectives": ["objetivo1", "objetivo2"],
      "interventions": ["intervenção1", "intervenção2"],
      "monitoring": "frequência de acompanhamento"
    },
    "optimization": {
      "duration": "duração da fase",
      "objectives": ["objetivo1", "objetivo2"],
      "interventions": ["intervenção1", "intervenção2"],
      "monitoring": "frequência de acompanhamento"
    },
    "maintenance": {
      "duration": "duração da fase",
      "objectives": ["objetivo1", "objetivo2"],
      "interventions": ["intervenção1", "intervenção2"],
      "monitoring": "frequência de acompanhamento"
    }
  },
  "nutritionalPlan": {
    "dietaryPattern": "Padrão alimentar recomendado",
    "macronutrients": {
      "carbohydrates": "% e especificações",
      "proteins": "% e especificações", 
      "fats": "% e especificações"
    },
    "foodsToInclude": ["alimento1", "alimento2"],
    "foodsToAvoid": ["alimento1", "alimento2"],
    "mealTiming": "Horários e frequência das refeições",
    "hydration": "Recomendações de hidratação",
    "specialConsiderations": "Considerações especiais baseadas na ciclicidade"
  },
  "supplementProtocol": [
    {
      "supplement": "Nome do suplemento",
      "dosage": "Dosagem",
      "timing": "Quando tomar",
      "duration": "Duração do uso",
      "purpose": "Objetivo/indicação",
      "monitoring": "O que monitorar"
    }
  ],
  "lifestyleRecommendations": {
    "exercise": {
      "type": "Tipo de exercício",
      "frequency": "Frequência",
      "intensity": "Intensidade",
      "cyclicConsiderations": "Adaptações ao ciclo menstrual"
    },
    "stressManagement": {
      "techniques": ["técnica1", "técnica2"],
      "frequency": "Frequência recomendada",
      "resources": ["recurso1", "recurso2"]
    },
    "sleepHygiene": {
      "recommendations": ["recomendação1", "recomendação2"],
      "cyclicAdaptations": "Adaptações ao ciclo"
    },
    "environmentalFactors": ["fator1", "fator2"]
  },
  "followUpSchedule": {
    "shortTerm": {
      "timeframe": "1-4 semanas",
      "objectives": ["objetivo1", "objetivo2"],
      "assessments": ["avaliação1", "avaliação2"]
    },
    "mediumTerm": {
      "timeframe": "1-3 meses", 
      "objectives": ["objetivo1", "objetivo2"],
      "assessments": ["avaliação1", "avaliação2"]
    },
    "longTerm": {
      "timeframe": "3-6 meses",
      "objectives": ["objetivo1", "objetivo2"],
      "assessments": ["avaliação1", "avaliação2"]
    }
  },
  "patientEducation": {
    "keyPoints": ["ponto1", "ponto2"],
    "resources": ["recurso1", "recurso2"],
    "selfMonitoring": ["o que observar1", "o que observar2"],
    "warningSignals": ["sinal de alerta1", "sinal de alerta2"]
  },
  "integrationSummary": "Resumo de como as diferentes análises foram integradas no plano"
}`;

    const userPrompt = `Baseado nas seguintes análises da paciente ${patient.name}, crie um plano de tratamento integrado e personalizado:

DADOS DA PACIENTE:
${JSON.stringify(analysisData.patient, null, 2)}

ANÁLISE LABORATORIAL:
${analysisData.labAnalysis ? JSON.stringify(analysisData.labAnalysis, null, 2) : 'Não realizada'}

ANÁLISE DE MEDICINA TRADICIONAL CHINESA:
${analysisData.tcmAnalysis ? JSON.stringify(analysisData.tcmAnalysis, null, 2) : 'Não realizada'}

ANÁLISE DE CRONOLOGIA:
${analysisData.chronologyAnalysis ? JSON.stringify(analysisData.chronologyAnalysis, null, 2) : 'Não realizada'}

ANÁLISE DA MATRIZ IFM:
${analysisData.ifmAnalysis ? JSON.stringify(analysisData.ifmAnalysis, null, 2) : 'Não realizada'}

OBJETIVOS DO TRATAMENTO:
${JSON.stringify(treatmentGoals, null, 2)}

PREFERÊNCIAS DA PACIENTE:
${JSON.stringify(preferences, null, 2)}

Crie um plano de tratamento que:
1. Integre todas as perspectivas diagnósticas
2. Priorize intervenções baseadas na eficácia e segurança
3. Considere a ciclicidade hormonal feminina
4. Seja prático e exequível
5. Inclua métricas claras de sucesso
6. Respeite as preferências da paciente`;

    // Chamar IA
    const startTime = Date.now();
    const aiResponse = await openaiProvider.generateResponse(
      systemPrompt,
      userPrompt,
      company.aiConfig?.model || 'gpt-4o-mini',
      {
        temperature: company.aiConfig?.creativity || 0.7,
        maxTokens: company.aiConfig?.maxTokens || 4000
      }
    );
    const endTime = Date.now();

    let analysis;
    try {
      analysis = JSON.parse(aiResponse.content);
    } catch (error: any) {
      console.error('Erro ao parsear resposta da IA:', error);
      return NextResponse.json({ error: 'Erro ao processar resposta da IA' }, { status: 500 });
    }

    // Calcular custos
    const totalTokens = aiResponse.promptTokens + aiResponse.completionTokens;
    const cost = openaiProvider.calculateCost(
      company.aiConfig?.model || 'gpt-4o-mini',
      aiResponse.promptTokens,
      aiResponse.completionTokens
    );

    // Salvar resultado
    const treatmentPlan = new TreatmentPlan({
      patientId,
      companyId: user.companyId,
      userId: user._id,
      analysis,
      aiMetadata: {
        model: company.aiConfig?.model || 'gpt-4o-mini',
        promptTokens: aiResponse.promptTokens,
        completionTokens: aiResponse.completionTokens,
        totalTokens,
        cost,
        processingTime: endTime - startTime
      },
      status: 'pending_review',
      treatmentGoals,
      preferences
    });

    await treatmentPlan.save();

    // Atualizar custos da empresa
    if (company.usage) {
      company.usage.totalCost += cost;
      company.usage.totalTokens += totalTokens;
      await company.save();
    }

    return NextResponse.json({
      success: true,
      analysis,
      aiMetadata: {
        model: company.aiConfig?.model || 'gpt-4o-mini',
        totalTokens,
        cost,
        processingTime: endTime - startTime
      },
      createdAt: treatmentPlan.createdAt,
      id: treatmentPlan._id
    });

  } catch (error) {
    console.error('Erro na análise de plano de tratamento:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 