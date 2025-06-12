import { AIService } from './ai-service';
import { RAGService } from './rag-service';
import RAGAnalysisService from './ragAnalysisService';
import { generatePrompt } from './prompts';
import Analysis from '@/models/Analysis';
import Patient from '@/models/Patient';
import User from '@/models/User';
import mongoose from 'mongoose';

export interface AnalysisResult {
  id: string;
  type: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatmentPlan';
  content: string;
  status: 'completed' | 'error';
  createdAt: Date;
  tokensUsed?: number;
  processingTime?: number;
  analysis?: any; // Dados estruturados específicos por tipo de análise
  aiMetadata?: any; // Metadados da IA
  ragMetadata?: any; // Metadados do RAG
}

export class AnalysisService {
  private aiService!: AIService;
  private ragService!: RAGService;

  constructor(
    private companyId: string,
    private userId: string,
    private patientId: string
  ) {}

  async initialize() {
    this.aiService = await AIService.create(this.companyId);
    this.ragService = new RAGService(this.aiService);
  }

  /**
   * Executa análise laboratorial
   */
  async runLaboratoryAnalysis(examData: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Inicializar serviços
      await this.initialize();
      
      const patient = await Patient.findById(this.patientId);
      if (!patient) throw new Error('Paciente não encontrada');

      // Obter configuração da análise laboratorial
      const analysisConfig = await this.aiService.getAnalysisConfig('laboratory');

      // Buscar contexto RAG inteligente se habilitado
      let ragContext = '';
      let ragMetadata: any = {};
      
      console.log('🧪 === INICIANDO BUSCA RAG PARA ANÁLISE LABORATORIAL ===');
      console.log('📊 Configuração RAG:', { 
        ragEnabled: analysisConfig.ragEnabled, 
        companyId: this.companyId,
        isGlobal: this.companyId === 'global'
      });
      
      // TEMPORÁRIO: Permitir RAG para empresa global para testes
      if (analysisConfig.ragEnabled) {
        try {
          console.log('🔍 Executando busca RAG para análise laboratorial...');
          
          // Se empresa for global, usar um ObjectId fixo para desenvolvimento
          const searchCompanyId = this.companyId === 'global' ? '507f1f77bcf86cd799439011' : this.companyId;
          
          const ragResult = await RAGAnalysisService.searchRelevantContext(
            'laboratory',
            examData,
            searchCompanyId,
            patient,
            5
          );
          
          ragContext = ragResult.contextSummary;
          ragMetadata = {
            documentsUsed: ragResult.relevantDocuments.length,
            searchQueries: ragResult.searchQueries,
            evidenceLevel: ragResult.specificContext?.evidenceLevel || 'baixa'
          };
          
          console.log('✅ RAG Laboratorial ativado com sucesso!');
          console.log('📋 Metadados RAG:', ragMetadata);
          console.log('📄 Documentos encontrados:', ragResult.relevantDocuments.map(doc => ({
            fileName: doc.fileName,
            score: doc.score,
            category: doc.category
          })));
          console.log('🔍 Queries de busca utilizadas:', ragResult.searchQueries);
          console.log('📝 Tamanho do contexto gerado:', ragContext.length, 'caracteres');
          
          if (ragResult.relevantDocuments.length === 0) {
            console.log('⚠️ ATENÇÃO: Nenhum documento RAG encontrado para análise laboratorial');
          }
          
        } catch (error) {
          console.log('❌ RAG falhou para análise laboratorial:', error instanceof Error ? error.message : error);
          console.log('🔄 Continuando análise sem contexto RAG...');
          ragContext = '';
        }
      } else {
        console.log('⏭️ RAG desabilitado - pulando busca RAG');
      }

      console.log('🤖 Iniciando geração de análise laboratorial com IA...');
      console.log('📊 Dados para IA:', {
        patientName: patient.name,
        examDataKeys: Object.keys(examData),
        ragContextSize: ragContext.length,
        hasRAGContext: ragContext.length > 0
      });

      // Executar análise usando configurações globais com contexto RAG
      const content = await this.aiService.generateAnalysis(
        'laboratory',
        { patientData: patient, examData, ragContext }
      );

      const processingTime = Date.now() - startTime;

      // Salvar análise no banco
      const analysis = new Analysis({
        patient: this.patientId,
        professional: this.userId,
        company: this.companyId === 'global' ? new mongoose.Types.ObjectId() : this.companyId,
        type: 'laboratory',
        status: 'completed',
        inputData: {
          laboratoryManualData: JSON.stringify(examData)
        },
        result: {
          rawOutput: content,
          laboratoryAnalysis: {
            interpretation: content,
            alteredValues: [],
            functionalMedicineComparison: [],
            recommendations: []
          }
        },
        aiMetadata: {
          provider: analysisConfig.provider,
          model: analysisConfig.model,
          promptVersion: '1.0',
          tokensUsed: 0,
          processingTime,
          cost: 0
        }
      });

      await analysis.save();
      
      console.log('💾 Análise laboratorial salva com sucesso');
      console.log('🧪 === BUSCA RAG PARA ANÁLISE LABORATORIAL CONCLUÍDA ===');

      return {
        id: analysis._id.toString(),
        type: 'laboratory',
        content,
        status: 'completed',
        createdAt: analysis.createdAt,
        processingTime,
        ragMetadata
      };

    } catch (error) {
      console.error('❌ Erro na análise laboratorial:', error);
      throw error;
    }
  }

  /**
   * Executa análise de MTC
   */
  async runTCMAnalysis(tcmData: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Inicializar serviços
      await this.initialize();
      
      const patient = await Patient.findById(this.patientId);
      if (!patient) throw new Error('Paciente não encontrada');

      // Obter configuração da análise de MTC
      const analysisConfig = await this.aiService.getAnalysisConfig('tcm');

      // Buscar contexto RAG inteligente se habilitado
      let ragContext = '';
      let ragMetadata: any = {};
      // TEMPORÁRIO: Permitir RAG para empresa global para testes
      if (analysisConfig.ragEnabled) {
        try {
          // Se empresa for global, usar um ObjectId fixo para desenvolvimento
          const searchCompanyId = this.companyId === 'global' ? '507f1f77bcf86cd799439011' : this.companyId;
          
          const ragResult = await RAGAnalysisService.searchRelevantContext(
            'tcm',
            tcmData,
            searchCompanyId,
            patient,
            5
          );
          ragContext = ragResult.contextSummary;
          ragMetadata = {
            documentsUsed: ragResult.relevantDocuments.length,
            searchQueries: ragResult.searchQueries,
            evidenceLevel: ragResult.specificContext?.evidenceLevel || 'baixa'
          };
          console.log('🎯 RAG MTC ativado:', ragMetadata);
        } catch (error) {
          console.log('RAG falhou, continuando análise sem contexto RAG:', error instanceof Error ? error.message : error);
          ragContext = '';
        }
      }

      // Executar análise usando configurações globais com contexto RAG
      const content = await this.aiService.generateAnalysis(
        'tcm',
        { patientData: patient, examData: tcmData, ragContext }
      );

      const processingTime = Date.now() - startTime;

      // Fazer parsing da resposta para extrair seções estruturadas
      const parsedAnalysis = this.parseTCMAnalysis(content);

      // Salvar análise no banco
      const analysis = new Analysis({
        patient: this.patientId,
        professional: this.userId,
        company: this.companyId === 'global' ? new mongoose.Types.ObjectId() : this.companyId,
        type: 'tcm',
        status: 'completed',
        inputData: {
          tongueObservation: tcmData.lingualObservation,
          patterns: tcmData.patterns || '',
          treatmentPrinciples: tcmData.treatmentPrinciples || '',
          additionalObservations: tcmData.additionalNotes || ''
        },
        result: {
          rawOutput: content,
          tcmAnalysis: {
            energeticDiagnosis: parsedAnalysis.energeticDiagnosis,
            phytotherapyRecommendations: parsedAnalysis.herbalRecommendations,
            acupunctureRecommendations: { 
              points: parsedAnalysis.acupuncturePoints.map(point => `${point.name}: ${point.indication}`), 
              frequency: '2-3x por semana', 
              duration: '6-8 semanas' 
            },
            lifestyleRecommendations: parsedAnalysis.lifestyleRecommendations
          }
        },
        aiMetadata: {
          provider: analysisConfig.provider,
          model: analysisConfig.model,
          promptVersion: '1.0',
          tokensUsed: 0,
          processingTime,
          cost: 0
        }
      });

      await analysis.save();

      return {
        id: analysis._id.toString(),
        type: 'tcm',
        content,
        status: 'completed',
        createdAt: analysis.createdAt,
        processingTime,
        ragMetadata,
        // Estrutura esperada pelo frontend
        analysis: {
          energeticDiagnosis: parsedAnalysis.energeticDiagnosis,
          herbalRecommendations: parsedAnalysis.herbalRecommendations,
          acupuncturePoints: parsedAnalysis.acupuncturePoints,
          generalRecommendations: parsedAnalysis.lifestyleRecommendations
        },
        aiMetadata: {
          provider: analysisConfig.provider,
          model: analysisConfig.model,
          totalTokens: 0,
          cost: 0
        }
      };

    } catch (error) {
      console.error('Erro na análise de MTC:', error);
      throw error;
    }
  }

  /**
   * Faz parsing da resposta da IA para extrair seções estruturadas
   */
  private parseTCMAnalysis(content: string) {
    console.log('🔍 Iniciando parsing TCM da resposta:', content.substring(0, 200) + '...');
    
    // Regex patterns mais flexíveis para capturar diferentes formatos
    const patterns = {
      // Capturar qualquer seção de diagnóstico/identificação de padrões
      energeticDiagnosis: /(?:### Diagnóstico de Medicina Tradicional Chinesa|# Diagnóstico e Tratamento|## 2\. IDENTIFICAÇÃO DE PADRÕES)[\s\S]*?(?=(?:#### 3\.|### 3\.|## 3\.)|$)/i,
      
      // Capturar seções de fitoterapia
      herbalSection: /(?:#### 3\. Tratamento Fitoterápico|### 3\.1 Fórmulas Fitoterápicas|## 3\. TRATAMENTO PERSONALIZADO[\s\S]*?### 3\.1 Fórmulas Fitoterápicas)[\s\S]*?(?=(?:####|###|## |$))/i,
      
      // Capturar seções de acupuntura
      acupunctureSection: /(?:#### 4\. Pontos de Acupuntura|### 3\.2 Pontos de Acupuntura)[\s\S]*?(?=(?:####|###|## |$))/i,
      
      // Capturar seções de estilo de vida
      lifestyleSection: /(?:#### 5\. Modificações de Estilo de Vida|### 3\.3 Modificações de Estilo de Vida)[\s\S]*?(?=(?:####|###|## |$))/i
    };

    const extractHerbalRecommendations = (text: string) => {
      const herbs: any[] = [];
      console.log('🌿 Extraindo recomendações fitoterápicas de:', text.substring(0, 100));
      
      // Buscar por padrões de fórmulas mais simples
      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Procurar por padrões de numeração "1. **Nome**:" - mais permissivo
        if (line.match(/^\d+\.\s*\*\*(.*?)\*\*/)) {
          const match = line.match(/^\d+\.\s*\*\*(.*?)\*\*:?\s*(.*)?/);
          if (match && match[1]) {
            const name = match[1].trim();
            let description = match[2] ? match[2].trim() : '';
            
            // Tentar pegar descrição da próxima linha se não houver
            if (!description && i + 1 < lines.length) {
              description = lines[i + 1].trim();
            }
            
            // Filtrar nomes válidos de fórmulas - MENOS restritivo
            if (!herbs.find(h => h.name === name) && 
                name.length > 3 && 
                name.length < 80 &&
                !name.includes('Fitoterápicas') &&
                !name.includes('Sugeridas')) {
              herbs.push({
                name: name,
                dosage: "Conforme orientação profissional",
                benefits: description.substring(0, 200) + (description.length > 200 ? "..." : "") || "Fórmula específica para o caso"
              });
            }
          }
        }
        
        // Procurar padrões específicos como "Fórmula \"Nome\""
        if (line.toLowerCase().includes('fórmula') && (line.includes('"') || line.includes('"') || line.includes('"'))) {
          const match = line.match(/fórmula\s*["""]([^"""]+)["""]/i);
          if (match && match[1]) {
            const name = match[1].trim();
            if (!herbs.find(h => h.name === name) && name.length > 3 && name.length < 50) {
              herbs.push({
                name: name,
                dosage: "Conforme orientação profissional",
                benefits: "Fórmula específica recomendada pela análise TCM"
              });
            }
          }
        }

        // Procurar padrões mais simples - nome em negrito
        if (line.includes('**') && !line.includes('Fórmulas') && !line.includes('Sugeridas')) {
          const match = line.match(/\*\*([^*]+)\*\*/);
          if (match && match[1]) {
            const name = match[1].trim();
            // Verificar se parece um nome de fórmula (tem letras chinesas ou nomes de plantas)
            const chinesePattern = /[A-Z][a-z]+\s+[A-Z][a-z]+|[A-Za-z]+\s+(Tang|Wan|San|Yin|Decoction)/i;
            if (!herbs.find(h => h.name === name) && 
                name.length > 3 && 
                name.length < 50 &&
                (chinesePattern.test(name) || name.includes('Tang') || name.includes('Wan') || name.includes('San'))) {
              herbs.push({
                name: name,
                dosage: "Conforme orientação profissional",
                benefits: "Fórmula específica para o padrão energético identificado"
              });
            }
          }
        }
      }
      
      console.log('🌿 Fórmulas extraídas:', herbs.length);
      return herbs;
    };

    const extractAcupuncturePoints = (text: string) => {
      const points: any[] = [];
      console.log('📍 Extraindo pontos de acupuntura de:', text.substring(0, 100));
      
      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Procurar por padrões como "- **Ponto:**" ou "**Ponto:**"
        if (line.includes('**') && line.includes(':')) {
          const match1 = line.match(/\*\*(.*?)\*\*.*?:\s*(.*)/);
          if (match1 && match1[1]) {
            const pointName = match1[1].trim();
            const indication = match1[2] ? match1[2].trim() : 'Indicação específica';
            
            if (!points.find(p => p.name === pointName) && pointName.length > 2) {
              points.push({
                name: pointName,
                indication: indication.substring(0, 100) + (indication.length > 100 ? "..." : "")
              });
            }
          }
        }
        
        // Procurar padrões como "- Nome (Código):"
        if (line.includes('(') && line.includes(')') && line.includes(':')) {
          const match2 = line.match(/(.*?)\s*\((.*?)\):\s*(.*)/);
          if (match2 && match2[1]) {
            const pointName = `${match2[1].trim()} (${match2[2].trim()})`;
            const indication = match2[3] ? match2[3].trim() : 'Indicação específica';
            
            if (!points.find(p => p.name === pointName)) {
              points.push({
                name: pointName,
                indication: indication.substring(0, 100) + (indication.length > 100 ? "..." : "")
              });
            }
          }
        }
      }
      
      console.log('📍 Pontos extraídos:', points.length);
      return points;
    };

    const extractLifestyleRecommendations = (text: string) => {
      const recommendations: string[] = [];
      console.log('🎯 Extraindo recomendações de estilo de vida de:', text.substring(0, 100));
      
      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Procurar por padrões como "- **Categoria:**" ou "**Categoria:**"
        if (line.includes('**') && line.includes(':')) {
          const match1 = line.match(/\*\*(.*?)\*\*.*?:\s*(.*)/);
          if (match1 && match1[1]) {
            const title = match1[1].trim();
            let desc = match1[2] ? match1[2].trim() : '';
            
            // Se a descrição parece incompleta, tentar pegar da próxima linha
            if (desc.length > 10 && !desc.endsWith('.') && !desc.endsWith('!') && !desc.endsWith('?')) {
              const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
              if (nextLine && !nextLine.startsWith('-') && !nextLine.includes('**')) {
                desc += ' ' + nextLine;
              }
            }
            
            if (title.length > 5) {
              const recommendation = desc ? `${title}: ${desc}` : title;
              if (!recommendations.includes(recommendation)) {
                recommendations.push(recommendation);
              }
            }
          }
        }
        
        // Procurar padrões como "- Descrição simples"
        if (line.startsWith('-') && !line.includes('**')) {
          let desc = line.substring(1).trim();
          
          // Se parece incompleto, tentar pegar da próxima linha
          if (desc.length > 15 && !desc.endsWith('.') && !desc.endsWith('!') && !desc.endsWith('?')) {
            const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
            if (nextLine && !nextLine.startsWith('-') && !nextLine.includes('**') && nextLine.length > 0) {
              desc += ' ' + nextLine;
            }
          }
          
          if (desc.length > 10 && !recommendations.includes(desc)) {
            recommendations.push(desc);
          }
        }
      }
      
      // Se não encontrou recomendações específicas, usar padrão
      if (recommendations.length === 0) {
        recommendations.push(
          'Mantenha regularidade nos horários de sono',
          'Pratique exercícios leves e regulares',
          'Alimente-se de forma equilibrada',
          'Evite alimentos muito frios ou crus'
        );
      }
      
      console.log('🎯 Recomendações extraídas:', recommendations.length);
      return recommendations;
    };

    // Extrair seções usando os novos padrões
    const energeticMatch = content.match(patterns.energeticDiagnosis);
    const herbalMatch = content.match(patterns.herbalSection);
    const acupunctureMatch = content.match(patterns.acupunctureSection);
    const lifestyleMatch = content.match(patterns.lifestyleSection);

    console.log('📊 Seções encontradas:', {
      energetic: !!energeticMatch,
      herbal: !!herbalMatch,
      acupuncture: !!acupunctureMatch,
      lifestyle: !!lifestyleMatch
    });

    const acupuncturePointsData = acupunctureMatch ? extractAcupuncturePoints(acupunctureMatch[0]) : extractAcupuncturePoints(content);
    const lifestyleData = lifestyleMatch ? extractLifestyleRecommendations(lifestyleMatch[0]) : extractLifestyleRecommendations(content);
    
    const result = {
      energeticDiagnosis: energeticMatch ? energeticMatch[0] : content,
      herbalRecommendations: herbalMatch ? extractHerbalRecommendations(herbalMatch[0]) : extractHerbalRecommendations(content),
      acupuncturePoints: acupuncturePointsData, // Manter como objetos para o frontend
      lifestyleRecommendations: lifestyleData,
      generalRecommendations: lifestyleData // Adicionar campo que o frontend espera
    };

    console.log('✅ Parsing TCM concluído:', {
      energeticLength: result.energeticDiagnosis.length,
      herbsCount: result.herbalRecommendations.length,
      pointsCount: result.acupuncturePoints.length,
      lifestyleCount: result.lifestyleRecommendations.length
    });

    return result;
  }

  /**
   * Executa análise de cronologia
   */
  async runChronologyAnalysis(): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Inicializar serviços
      await this.initialize();
      
      const patient = await Patient.findById(this.patientId);
      if (!patient) throw new Error('Paciente não encontrada');

      // Buscar análises anteriores
      const previousAnalyses = await Analysis.find({
        patient: this.patientId,
        status: 'completed',
        type: { $in: ['laboratory', 'tcm'] }
      }).sort({ createdAt: 1 });

      // Obter configuração da análise de cronologia
      const analysisConfig = await this.aiService.getAnalysisConfig('chronology');

      // Buscar contexto RAG inteligente para cronologia
      let ragContext = '';
      let ragMetadata: any = {};
      // TEMPORÁRIO: Permitir RAG para empresa global para testes
      if (analysisConfig.ragEnabled) {
        try {
          // Se empresa for global, usar um ObjectId fixo para desenvolvimento
          const searchCompanyId = this.companyId === 'global' ? '507f1f77bcf86cd799439011' : this.companyId;
          
          const ragResult = await RAGAnalysisService.searchRelevantContext(
            'chronology',
            { previousAnalyses, patientHistory: patient },
            searchCompanyId,
            patient,
            5
          );
          ragContext = ragResult.contextSummary;
          ragMetadata = {
            documentsUsed: ragResult.relevantDocuments.length,
            searchQueries: ragResult.searchQueries,
            evidenceLevel: ragResult.specificContext?.evidenceLevel || 'baixa'
          };
          console.log('🎯 RAG Cronologia ativado:', ragMetadata);
        } catch (error) {
          console.log('RAG falhou, continuando análise sem contexto RAG:', error instanceof Error ? error.message : error);
          ragContext = '';
        }
      }

      // Executar análise usando configurações globais com contexto RAG
      const content = await this.aiService.generateAnalysis(
        'chronology',
        { patientData: patient, previousAnalyses, ragContext }
      );

      const processingTime = Date.now() - startTime;

      const analysis = new Analysis({
        patient: this.patientId,
        professional: this.userId,
        company: this.companyId === 'global' ? new mongoose.Types.ObjectId() : this.companyId,
        type: 'chronology',
        status: 'completed',
        inputData: {
          // Para cronologia não precisamos de dados de entrada específicos
        },
        result: {
          rawOutput: content,
          chronologyAnalysis: {
            timeline: [],
            patterns: [],
            criticalMoments: []
          }
        },
        aiMetadata: {
          provider: analysisConfig.provider,
          model: analysisConfig.model,
          promptVersion: '1.0',
          tokensUsed: 0,
          processingTime,
          cost: 0
        }
      });

      await analysis.save();

      return {
        id: analysis._id.toString(),
        type: 'chronology',
        content,
        status: 'completed',
        createdAt: analysis.createdAt,
        processingTime,
      };

    } catch (error) {
      console.error('Erro na análise de cronologia:', error);
      throw error;
    }
  }

  /**
   * Executa análise IFM (Medicina Funcional)
   */
  async runIFMAnalysis(): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Inicializar serviços
      await this.initialize();
      
      const patient = await Patient.findById(this.patientId);
      if (!patient) throw new Error('Paciente não encontrada');

      const previousAnalyses = await Analysis.find({
        patient: this.patientId,
        status: 'completed',
        type: { $in: ['laboratory', 'tcm', 'chronology'] }
      }).sort({ createdAt: 1 });

      // Obter configuração da análise IFM
      const analysisConfig = await this.aiService.getAnalysisConfig('ifm');

      // Buscar contexto RAG especializado para matriz IFM
      let ragContext = '';
      let ragMetadata: any = {};
      // TEMPORÁRIO: Permitir RAG para empresa global para testes
      if (analysisConfig.ragEnabled) {
        try {
          // Se empresa for global, usar um ObjectId fixo para desenvolvimento
          const searchCompanyId = this.companyId === 'global' ? '507f1f77bcf86cd799439011' : this.companyId;
          
          const ragResult = await RAGAnalysisService.searchRelevantContext(
            'ifm',
            { previousAnalyses, systemsData: patient },
            searchCompanyId,
            patient,
            6
          );
          ragContext = ragResult.contextSummary;
          ragMetadata = {
            documentsUsed: ragResult.relevantDocuments.length,
            searchQueries: ragResult.searchQueries,
            evidenceLevel: ragResult.specificContext?.evidenceLevel || 'baixa',
            protocolsFound: ragResult.specificContext?.protocols?.length || 0
          };
          console.log('🎯 RAG Matriz IFM ativado:', ragMetadata);
        } catch (error) {
          console.log('RAG falhou, continuando análise sem contexto RAG:', error instanceof Error ? error.message : error);
          ragContext = '';
        }
      }

      // Executar análise usando configurações globais com contexto RAG
      const content = await this.aiService.generateAnalysis(
        'ifm',
        { patientData: patient, previousAnalyses, ragContext }
      );

      const processingTime = Date.now() - startTime;

      const analysis = new Analysis({
        patient: this.patientId,
        professional: this.userId,
        company: this.companyId === 'global' ? new mongoose.Types.ObjectId() : this.companyId,
        type: 'ifm',
        status: 'completed',
        inputData: {
          // Para IFM não precisamos de dados de entrada específicos
        },
        result: {
          rawOutput: content,
          ifmAnalysis: {
            systemsAssessment: [],
            rootCauses: [],
            systemicConnections: [],
            treatmentPriorities: []
          }
        },
        aiMetadata: {
          provider: analysisConfig.provider,
          model: analysisConfig.model,
          promptVersion: '1.0',
          tokensUsed: 0,
          processingTime,
          cost: 0
        }
      });

      await analysis.save();

      return {
        id: analysis._id.toString(),
        type: 'ifm',
        content,
        status: 'completed',
        createdAt: analysis.createdAt,
        processingTime,
      };

    } catch (error) {
      console.error('Erro na análise IFM:', error);
      throw error;
    }
  }

  /**
   * Executa análise do plano de tratamento
   */
  async runTreatmentPlanAnalysis(): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Inicializar serviços
      await this.initialize();
      
      const patient = await Patient.findById(this.patientId);
      if (!patient) throw new Error('Paciente não encontrada');

      const user = await User.findById(this.userId);
      if (!user) throw new Error('Usuário não encontrado');

      const previousAnalyses = await Analysis.find({
        patient: this.patientId,
        status: 'completed',
        type: { $in: ['laboratory', 'tcm', 'chronology', 'ifm'] }
      }).sort({ createdAt: 1 });

      // Obter configuração da análise de plano de tratamento
      const analysisConfig = await this.aiService.getAnalysisConfig('treatmentPlan');

      // Buscar contexto RAG especializado para plano de tratamento
      let ragContext = '';
      let ragMetadata: any = {};
      
      console.log('🎯 === INICIANDO BUSCA RAG PARA PLANO DE TRATAMENTO ===');
      console.log('📊 Configuração RAG:', { 
        ragEnabled: analysisConfig.ragEnabled, 
        companyId: this.companyId,
        isGlobal: this.companyId === 'global'
      });
      
      // TEMPORÁRIO: Permitir RAG para empresa global para testes
      if (analysisConfig.ragEnabled) {
        try {
          console.log('🔍 Executando busca RAG para plano de tratamento...');
          
          // Se empresa for global, usar um ObjectId fixo para desenvolvimento
          const searchCompanyId = this.companyId === 'global' ? '507f1f77bcf86cd799439011' : this.companyId;
          
          const ragResult = await RAGAnalysisService.searchRelevantContext(
            'treatment-plan',
            { 
              previousAnalyses, 
              specialization: user.specialization,
              treatmentGoals: patient.treatmentGoals 
            },
            searchCompanyId,
            patient,
            7
          );
          
          ragContext = ragResult.contextSummary;
          ragMetadata = {
            documentsUsed: ragResult.relevantDocuments.length,
            searchQueries: ragResult.searchQueries,
            evidenceLevel: ragResult.specificContext?.evidenceLevel || 'baixa',
            protocolsFound: ragResult.specificContext?.protocols?.length || 0,
            clinicalRecommendations: ragResult.specificContext?.clinicalRecommendations?.length || 0
          };
          
          console.log('✅ RAG Plano de Tratamento ativado com sucesso!');
          console.log('📋 Metadados RAG:', ragMetadata);
          console.log('📄 Documentos encontrados:', ragResult.relevantDocuments.map(doc => ({
            fileName: doc.fileName,
            score: doc.score,
            category: doc.category
          })));
          console.log('🔍 Queries de busca utilizadas:', ragResult.searchQueries);
          console.log('📝 Tamanho do contexto gerado:', ragContext.length, 'caracteres');
          
          if (ragResult.relevantDocuments.length === 0) {
            console.log('⚠️ ATENÇÃO: Nenhum documento RAG encontrado para plano de tratamento');
          }
          
        } catch (error) {
          console.log('❌ RAG falhou para plano de tratamento:', error instanceof Error ? error.message : error);
          console.log('🔄 Continuando análise sem contexto RAG...');
          ragContext = '';
        }
      } else {
        console.log('⏭️ RAG desabilitado - pulando busca RAG');
      }

      console.log('🤖 Iniciando geração de análise com IA...');
      console.log('📊 Dados para IA:', {
        patientName: patient.name,
        previousAnalysesCount: previousAnalyses.length,
        ragContextSize: ragContext.length,
        hasRAGContext: ragContext.length > 0
      });

      // Executar análise usando configurações globais com contexto RAG
      const content = await this.aiService.generateAnalysis(
        'treatmentPlan',
        { patientData: patient, previousAnalyses, ragContext }
      );

      const processingTime = Date.now() - startTime;

      // Salvar análise no banco
      const analysis = new Analysis({
        patient: this.patientId,
        professional: this.userId,
        company: this.companyId === 'global' ? new mongoose.Types.ObjectId() : this.companyId,
        type: 'treatment',
        status: 'completed',
        inputData: { 
          previousAnalyses: previousAnalyses.map(a => a._id),
          professionalType: user.specialization || 'medico',
          therapeuticGoals: patient.treatmentGoals
        },
        result: {
          rawOutput: content,
          treatmentPlan: {
            executiveSummary: content,
            diagnosticSynthesis: '',
            therapeuticObjectives: [],
            interventions: [],
            followUpSchedule: [],
            expectedOutcomes: [],
            contraindications: [],
            patientGuidelines: []
          }
        },
        aiMetadata: {
          provider: analysisConfig.provider,
          model: analysisConfig.model,
          promptVersion: '1.0',
          tokensUsed: 0,
          processingTime,
          cost: 0
        }
      });

      await analysis.save();
      
      console.log('💾 Análise de plano de tratamento salva com sucesso');
      console.log('🎯 === BUSCA RAG PARA PLANO DE TRATAMENTO CONCLUÍDA ===');

      return {
        id: analysis._id.toString(),
        type: 'treatmentPlan',
        content,
        status: 'completed',
        createdAt: analysis.createdAt,
        processingTime,
        ragMetadata
      };

    } catch (error) {
      console.error('❌ Erro na análise de plano de tratamento:', error);
      throw error;
    }
  }

  /**
   * Executa o fluxo completo das 5 análises
   */
  async runCompleteAnalysisFlow(examData?: any, tcmData?: any): Promise<{
    laboratory?: AnalysisResult;
    tcm?: AnalysisResult;
    chronology: AnalysisResult;
    ifm: AnalysisResult;
    treatmentPlan: AnalysisResult;
  }> {
    await this.initialize();

    const results: any = {};

    try {
      // 1. Análise Laboratorial (se tiver dados)
      if (examData) {
        results.laboratory = await this.runLaboratoryAnalysis(examData);
      }

      // 2. Análise de MTC (se tiver dados)
      if (tcmData) {
        results.tcm = await this.runTCMAnalysis(tcmData);
      }

      // 3. Cronologia (sempre executar)
      results.chronology = await this.runChronologyAnalysis();

      // 4. Matriz IFM (sempre executar)
      results.ifm = await this.runIFMAnalysis();

      // 5. Plano de Tratamento (sempre executar)
      results.treatmentPlan = await this.runTreatmentPlanAnalysis();

      return results;

    } catch (error) {
      console.error('Erro no fluxo completo de análises:', error);
      throw error;
    }
  }

  /**
   * Busca análises existentes para uma paciente
   */
  async getPatientAnalyses(): Promise<AnalysisResult[]> {
    const analyses = await Analysis.find({
      patient: this.patientId,
      status: 'completed'
    }).sort({ createdAt: -1 });

    return analyses.map(analysis => ({
      id: analysis._id.toString(),
      type: analysis.type as any,
      content: analysis.result?.rawOutput || '',
      status: analysis.status as any,
      createdAt: analysis.createdAt,
      processingTime: analysis.aiMetadata?.processingTime,
    }));
  }

  /**
   * Regenera uma análise específica
   */
  async regenerateAnalysis(
    analysisType: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatmentPlan',
    additionalData?: any
  ): Promise<AnalysisResult> {
    await this.initialize();

    switch (analysisType) {
      case 'laboratory':
        return this.runLaboratoryAnalysis(additionalData);
      case 'tcm':
        return this.runTCMAnalysis(additionalData);
      case 'chronology':
        return this.runChronologyAnalysis();
      case 'ifm':
        return this.runIFMAnalysis();
      case 'treatmentPlan':
        return this.runTreatmentPlanAnalysis();
      default:
        throw new Error(`Tipo de análise não suportado: ${analysisType}`);
    }
  }
}

// Factory function para facilitar o uso
export function createAnalysisService(
  companyId: string,
  userId: string,
  patientId: string
): AnalysisService {
  return new AnalysisService(companyId, userId, patientId);
} 