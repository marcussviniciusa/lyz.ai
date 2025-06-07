import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Company, { ICompany } from '@/models/Company';

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

  private getProviderForAnalysis(analysisType: string): AIProvider {
    // Usar o provider padrão da empresa por enquanto
    const defaultProvider = this.company.settings.defaultAiProvider as 'openai' | 'anthropic' | 'google';
    
    // Modelo padrão baseado no provider
    const defaultModels = {
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-sonnet-20240229',
      google: 'gemini-1.5-flash'
    };

    return {
      name: defaultProvider,
      model: defaultModels[defaultProvider],
      temperature: 0.7,
      maxTokens: 2000,
    };
  }

  async generateAnalysis(
    analysisType: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatmentPlan',
    context: AIAnalysisContext,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const provider = this.getProviderForAnalysis(analysisType);
    
    // Atualizar contadores de uso
    await this.updateUsageTracking(analysisType, provider);

    switch (provider.name) {
      case 'openai':
        return this.generateWithOpenAI(provider, systemPrompt, userPrompt);
      case 'anthropic':
        return this.generateWithAnthropic(provider, systemPrompt, userPrompt);
      case 'google':
        return this.generateWithGoogle(provider, systemPrompt, userPrompt);
      default:
        throw new Error(`Provider ${provider.name} não está configurado`);
    }
  }

  private async generateWithOpenAI(
    provider: AIProvider,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI não está configurado');
    }

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
    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Empresa não encontrada');
    }
    return new AIService(company);
  }
} 