import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Company, { ICompany } from '@/models/Company';
import GlobalAIConfig, { IGlobalAIConfig } from '@/models/GlobalAIConfig';

export interface AIProvider {
  name: 'openai' | 'anthropic' | 'google';
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIAnalysisContext {
  patientData: any;
  examData?: any;
  previousAnalyses?: any[];
  ragContext?: string;
}

export class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private google: GoogleGenerativeAI | null = null;
  private globalConfig: IGlobalAIConfig | null = null;

  constructor(private company: ICompany) {
    this.initializeProviders();
  }

  private initializeProviders() {
    if (this.company.settings.aiProviders.openai?.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.company.settings.aiProviders.openai.apiKey,
      });
    }

    if (this.company.settings.aiProviders.anthropic?.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: this.company.settings.aiProviders.anthropic.apiKey,
      });
    }

    if (this.company.settings.aiProviders.google?.apiKey) {
      this.google = new GoogleGenerativeAI(this.company.settings.aiProviders.google.apiKey);
    }
  }

  private async loadGlobalConfig(): Promise<IGlobalAIConfig> {
    if (!this.globalConfig) {
      console.log('🔍 Buscando configuração global no banco...');
      this.globalConfig = await GlobalAIConfig.findOne();
      
      if (!this.globalConfig) {
        console.log('❌ Nenhuma configuração global encontrada, criando padrão...');
        const { getDefaultConfig } = await import('@/models/GlobalAIConfig');
        const defaultConfig = getDefaultConfig();
        const newConfig = new GlobalAIConfig({
          ...defaultConfig,
          lastUpdatedBy: 'system',
          version: '1.0.0'
        });
        this.globalConfig = await newConfig.save();
        console.log('✅ Configuração padrão criada');
      } else {
        console.log('✅ Configuração global encontrada');
        console.log('🔑 Chaves disponíveis:', {
          openai: !!this.globalConfig.apiKeys?.openai,
          anthropic: !!this.globalConfig.apiKeys?.anthropic,
          google: !!this.globalConfig.apiKeys?.google
        });
      }
      
      // Inicializar provedores com as chaves da configuração global
      this.initializeProvidersFromGlobalConfig();
    }
    return this.globalConfig!;
  }

  private initializeProvidersFromGlobalConfig() {
    if (!this.globalConfig?.apiKeys) return;

    if (this.globalConfig.apiKeys.openai) {
      this.openai = new OpenAI({
        apiKey: this.globalConfig.apiKeys.openai,
      });
    }

    if (this.globalConfig.apiKeys.anthropic) {
      this.anthropic = new Anthropic({
        apiKey: this.globalConfig.apiKeys.anthropic,
      });
    }

    if (this.globalConfig.apiKeys.google) {
      this.google = new GoogleGenerativeAI(this.globalConfig.apiKeys.google);
    }
  }

  private async getProviderForAnalysis(analysisType: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatmentPlan'): Promise<AIProvider> {
    const config = await this.loadGlobalConfig();
    const analysisConfig = config[analysisType];

    if (!analysisConfig) {
      throw new Error(`Configuração não encontrada para análise: ${analysisType}`);
    }

    return {
      name: analysisConfig.provider,
      model: analysisConfig.model,
      temperature: analysisConfig.temperature,
      maxTokens: analysisConfig.maxTokens,
    };
  }

  async generateAnalysis(
    analysisType: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatmentPlan',
    context: AIAnalysisContext,
    systemPrompt?: string,
    userPrompt?: string
  ): Promise<string> {
    const config = await this.loadGlobalConfig();
    const analysisConfig = config[analysisType];
    
    // Usar prompts da configuração global se não fornecidos
    const finalSystemPrompt = systemPrompt || analysisConfig.systemPrompt;
    let finalUserPrompt = userPrompt || analysisConfig.userPromptTemplate;
    
    // Processar template do userPrompt com dados reais
    finalUserPrompt = this.processPromptTemplate(finalUserPrompt, context);
    
    const provider = await this.getProviderForAnalysis(analysisType);
    
    // Atualizar contadores de uso
    await this.updateUsageTracking(analysisType, provider);

    switch (provider.name) {
      case 'openai':
        return this.generateWithOpenAI(provider, finalSystemPrompt, finalUserPrompt);
      case 'anthropic':
        return this.generateWithAnthropic(provider, finalSystemPrompt, finalUserPrompt);
      case 'google':
        return this.generateWithGoogle(provider, finalSystemPrompt, finalUserPrompt);
      default:
        throw new Error(`Provider ${provider.name} não está configurado`);
    }
  }

  private processPromptTemplate(template: string, context: AIAnalysisContext): string {
    let processedTemplate = template;

    // Substituir placeholders de dados da paciente
    if (context.patientData) {
      const patient = context.patientData;
      
      // Informações básicas
      processedTemplate = processedTemplate
        .replace(/\{\{patientName\}\}/g, patient.name || 'Não informado')
        .replace(/\{\{patientAge\}\}/g, patient.age?.toString() || 'Não informado')
        .replace(/\{\{height\}\}/g, patient.height?.toString() || 'Não informado')
        .replace(/\{\{weight\}\}/g, patient.weight?.toString() || 'Não informado');

      // História menstrual
      const menstrualHistory = patient.menstrualHistory || {};
      processedTemplate = processedTemplate
        .replace(/\{\{menarche\}\}/g, menstrualHistory.menarche?.toString() || 'Não informado')
        .replace(/\{\{cycleLength\}\}/g, menstrualHistory.cycleLength?.toString() || 'Não informado')
        .replace(/\{\{menstruationLength\}\}/g, menstrualHistory.menstruationLength?.toString() || 'Não informado')
        .replace(/\{\{lastMenstruation\}\}/g, menstrualHistory.lastMenstruation ? new Date(menstrualHistory.lastMenstruation).toLocaleDateString('pt-BR') : 'Não informado')
        .replace(/\{\{menopausalStatus\}\}/g, menstrualHistory.menopausalStatus || 'Não informado')
        .replace(/\{\{contraceptiveUse\}\}/g, menstrualHistory.contraceptiveUse || 'Nenhum');

      // Sintomas principais
      const symptomsText = patient.mainSymptoms?.map((s: any) => `${s.symptom} (prioridade ${s.priority})`).join(', ') || 'Nenhum sintoma principal registrado';
      processedTemplate = processedTemplate.replace(/\{\{mainSymptoms\}\}/g, symptomsText);

      // Histórico médico
      const medicalHistory = patient.medicalHistory || {};
      processedTemplate = processedTemplate
        .replace(/\{\{personalHistory\}\}/g, medicalHistory.personalHistory || 'Não informado')
        .replace(/\{\{familyHistory\}\}/g, medicalHistory.familyHistory || 'Não informado')
        .replace(/\{\{allergies\}\}/g, medicalHistory.allergies?.join(', ') || 'Nenhuma alergia conhecida')
        .replace(/\{\{previousTreatments\}\}/g, medicalHistory.previousTreatments?.join(', ') || 'Nenhum tratamento anterior registrado');

      // Medicamentos
      const medicationsText = patient.medications?.map((m: any) => `${m.name} - ${m.dosage} (${m.frequency}) - ${m.type}`).join('\n') || 'Nenhum medicamento ou suplemento atual';
      processedTemplate = processedTemplate.replace(/\{\{medications\}\}/g, medicationsText);

      // Estilo de vida
      const lifestyle = patient.lifestyle || {};
      processedTemplate = processedTemplate
        .replace(/\{\{sleepQuality\}\}/g, lifestyle.sleepQuality || 'Não informado')
        .replace(/\{\{sleepHours\}\}/g, lifestyle.sleepHours?.toString() || 'Não informado')
        .replace(/\{\{exerciseFrequency\}\}/g, lifestyle.exerciseFrequency || 'Não informado')
        .replace(/\{\{exerciseType\}\}/g, lifestyle.exerciseType || 'Não especificado')
        .replace(/\{\{stressLevel\}\}/g, lifestyle.stressLevel || 'Não informado')
        .replace(/\{\{nutritionQuality\}\}/g, lifestyle.nutritionQuality || 'Não informado')
        .replace(/\{\{relationshipQuality\}\}/g, lifestyle.relationshipQuality || 'Não informado');

      // Objetivos de tratamento
      const treatmentGoals = patient.treatmentGoals || {};
      processedTemplate = processedTemplate
        .replace(/\{\{goals\}\}/g, treatmentGoals.goals?.join(', ') || 'Não definido')
        .replace(/\{\{expectations\}\}/g, treatmentGoals.expectations || 'Não informado')
        .replace(/\{\{additionalNotes\}\}/g, treatmentGoals.additionalNotes || 'Nenhuma nota adicional');

      // Campos antigos (compatibilidade)
      processedTemplate = processedTemplate
        .replace(/\{\{lifeCycle\}\}/g, patient.lifeCycle || 'Não informado')
        .replace(/\{\{menstrualCycle\}\}/g, patient.menstrualCycle || 'Não informado')
        .replace(/\{\{relevantHistory\}\}/g, patient.relevantHistory || 'Não informado')
        .replace(/\{\{constitution\}\}/g, patient.constitution || 'Não informado')
        .replace(/\{\{sleepQuality\}\}/g, lifestyle.sleepQuality || patient.sleepQuality || 'Não informado')
        .replace(/\{\{stressLevel\}\}/g, lifestyle.stressLevel || patient.stressLevel || 'Não informado')
        .replace(/\{\{digestion\}\}/g, patient.digestion || 'Não informado')
        .replace(/\{\{menstrualPattern\}\}/g, patient.menstrualPattern || 'Não informado')
        .replace(/\{\{emotionalHistory\}\}/g, patient.emotionalHistory || 'Não informado');
    }

    // Substituir dados de exames
    if (context.examData) {
      const examDataString = typeof context.examData === 'string' 
        ? context.examData 
        : JSON.stringify(context.examData, null, 2);
      processedTemplate = processedTemplate.replace(/\{\{examData\}\}/g, examDataString);
    }

    // Substituir observações de MTC
    if (context.examData) {
      const tcmObservations = typeof context.examData === 'string'
        ? context.examData
        : JSON.stringify(context.examData, null, 2);
      processedTemplate = processedTemplate.replace(/\{\{tcmObservations\}\}/g, tcmObservations);
    }

    // Substituir dados de análises anteriores
    if (context.previousAnalyses) {
      const previousAnalysesString = context.previousAnalyses
        .map(analysis => `${analysis.type}: ${analysis.result?.rawOutput || ''}`)
        .join('\n\n');
      processedTemplate = processedTemplate
        .replace(/\{\{previousAnalyses\}\}/g, previousAnalysesString)
        .replace(/\{\{clinicalHistory\}\}/g, previousAnalysesString)
        .replace(/\{\{integratedAnalyses\}\}/g, previousAnalysesString)
        .replace(/\{\{clinicalSynthesis\}\}/g, previousAnalysesString)
        .replace(/\{\{completeSynthesis\}\}/g, previousAnalysesString);
    }

    // Substituir contexto RAG
    processedTemplate = processedTemplate.replace(/\{\{ragContext\}\}/g, context.ragContext || '');

    // Substituir placeholders genéricos
    processedTemplate = processedTemplate
      .replace(/\{\{patientData\}\}/g, JSON.stringify(context.patientData, null, 2))
      .replace(/\{\{therapeuticGoals\}\}/g, 'Objetivos definidos com base na análise clínica')
      .replace(/\{\{patientPreferences\}\}/g, 'Preferências a serem definidas em consulta');

    return processedTemplate;
  }

  // Método para obter configurações de análise específica
  async getAnalysisConfig(analysisType: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatmentPlan') {
    const config = await this.loadGlobalConfig();
    return config[analysisType];
  }

  private async generateWithOpenAI(
    provider: AIProvider,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI não está configurado');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: provider.temperature || 0.7,
        max_tokens: provider.maxTokens || 2000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      // Se é erro de cota esgotada, retornar análise demo
      if (error?.status === 429 || error?.code === 'insufficient_quota') {
        console.log('❌ Cota OpenAI esgotada:', error.message);
        throw new Error('OpenAI sem cota disponível. Configure outro provider.');
      }
      throw error;
    }
  }

  private async generateWithAnthropic(
    provider: AIProvider,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic não está configurado');
    }

    const response = await this.anthropic.messages.create({
      model: provider.model,
      max_tokens: provider.maxTokens || 2000,
      temperature: provider.temperature || 0.7,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  private async generateWithGoogle(
    provider: AIProvider,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (!this.google) {
      throw new Error('Google não está configurado');
    }

    const model = this.google.getGenerativeModel({ 
      model: provider.model,
      generationConfig: {
        temperature: provider.temperature || 0.7,
        maxOutputTokens: provider.maxTokens || 2000,
      }
    });

    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  private async updateUsageTracking(analysisType: string, provider: AIProvider) {
    // Só atualizar usage tracking se a company tem um _id válido (não é um mock)
    if (!this.company._id || typeof this.company._id === 'string') {
      console.log('Skipping usage tracking for mock company');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      await Company.findByIdAndUpdate(this.company._id, {
        $inc: {
          [`usageTracking.${analysisType}.totalAnalyses`]: 1,
          [`usageTracking.${analysisType}.byProvider.${provider.name}`]: 1,
          [`usageTracking.${analysisType}.daily.${today}`]: 1,
        },
        $set: {
          [`usageTracking.${analysisType}.lastUsed`]: new Date(),
        }
      });
    } catch (error) {
      console.log('Error updating usage tracking:', error);
      // Não falhar a análise por erro no tracking
    }
  }

  // Método para gerar embeddings (usado no sistema RAG)
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI necessário para gerar embeddings');
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  // Factory method para criar uma instância do serviço
  static async create(companyId: string): Promise<AIService> {
    let company: ICompany;
    
    if (companyId === 'global') {
      // Para superadmin ou casos onde não há company específica, criar um mock
      company = {
        _id: 'global',
        name: 'Global',
        settings: {
          aiProviders: {
            openai: { apiKey: '' },
            anthropic: { apiKey: '' },
            google: { apiKey: '' }
          }
        }
      } as unknown as ICompany;
    } else {
      const foundCompany = await Company.findById(companyId);
      if (!foundCompany) {
        throw new Error('Empresa não encontrada');
      }
      company = foundCompany;
    }
    
    return new AIService(company);
  }
} 