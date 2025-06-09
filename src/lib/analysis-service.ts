import { AIService } from './ai-service';
import { RAGService } from './rag-service';
import { generatePrompt } from './prompts';
import Analysis from '@/models/Analysis';
import Patient from '@/models/Patient';
import User from '@/models/User';

export interface AnalysisResult {
  id: string;
  type: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatmentPlan';
  content: string;
  status: 'completed' | 'error';
  createdAt: Date;
  tokensUsed?: number;
  processingTime?: number;
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
      // Buscar dados da paciente
      const patient = await Patient.findById(this.patientId);
      if (!patient) throw new Error('Paciente não encontrada');

      // Obter configuração da análise laboratorial
      const analysisConfig = await this.aiService.getAnalysisConfig('laboratory');

      // Gerar contexto RAG se habilitado
      let ragContext = '';
      if (analysisConfig.ragEnabled) {
        ragContext = await this.ragService.generateContext(
          `exames laboratoriais ${patient.mainSymptoms?.join(' ')} medicina funcional`,
          'laboratory',
          this.companyId
        );
      }

      // Executar análise usando configurações globais
      const content = await this.aiService.generateAnalysis(
        'laboratory',
        { patientData: patient, examData, ragContext }
      );

      // Salvar análise no banco
      const analysis = new Analysis({
        patientId: this.patientId,
        userId: this.userId,
        companyId: this.companyId,
        type: 'laboratory',
        input: { examData },
        output: { content },
        status: 'completed',
        processingTime: Date.now() - startTime,
      });

      await analysis.save();

      return {
        id: analysis._id.toString(),
        type: 'laboratory',
        content,
        status: 'completed',
        createdAt: analysis.createdAt,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error('Erro na análise laboratorial:', error);
      
      // Salvar erro no banco
      const analysis = new Analysis({
        patientId: this.patientId,
        userId: this.userId,
        companyId: this.companyId,
        type: 'laboratory',
        input: { examData },
        output: { error: error instanceof Error ? error.message : 'Erro desconhecido' },
        status: 'error',
        processingTime: Date.now() - startTime,
      });

      await analysis.save();

      throw error;
    }
  }

  /**
   * Executa análise de MTC
   */
  async runTCMAnalysis(tcmData: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      const patient = await Patient.findById(this.patientId);
      if (!patient) throw new Error('Paciente não encontrada');

      // Obter configuração da análise de MTC
      const analysisConfig = await this.aiService.getAnalysisConfig('tcm');

      // Gerar contexto RAG se habilitado
      let ragContext = '';
      if (analysisConfig.ragEnabled) {
        ragContext = await this.ragService.generateContext(
          `medicina tradicional chinesa ${patient.mainSymptoms?.join(' ')} acupuntura fitoterapia`,
          'tcm',
          this.companyId
        );
      }

      // Executar análise usando configurações globais
      const content = await this.aiService.generateAnalysis(
        'tcm',
        { patientData: patient, examData: tcmData, ragContext }
      );

      const analysis = new Analysis({
        patientId: this.patientId,
        userId: this.userId,
        companyId: this.companyId,
        type: 'tcm',
        input: { tcmData },
        output: { content },
        status: 'completed',
        processingTime: Date.now() - startTime,
      });

      await analysis.save();

      return {
        id: analysis._id.toString(),
        type: 'tcm',
        content,
        status: 'completed',
        createdAt: analysis.createdAt,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error('Erro na análise de MTC:', error);
      throw error;
    }
  }

  /**
   * Executa análise de cronologia
   */
  async runChronologyAnalysis(): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      const patient = await Patient.findById(this.patientId);
      if (!patient) throw new Error('Paciente não encontrada');

      // Buscar análises anteriores
      const previousAnalyses = await Analysis.find({
        patientId: this.patientId,
        status: 'completed',
        type: { $in: ['laboratory', 'tcm'] }
      }).sort({ createdAt: 1 });

      // Obter configuração da análise de cronologia
      const analysisConfig = await this.aiService.getAnalysisConfig('chronology');

      // Gerar contexto RAG se habilitado
      let ragContext = '';
      if (analysisConfig.ragEnabled) {
        ragContext = await this.ragService.generateContext(
          `cronologia saúde feminina ciclo menstrual ${patient.mainSymptoms?.join(' ')}`,
          'chronology',
          this.companyId
        );
      }

      // Executar análise usando configurações globais
      const content = await this.aiService.generateAnalysis(
        'chronology',
        { patientData: patient, previousAnalyses, ragContext }
      );

      const analysis = new Analysis({
        patientId: this.patientId,
        userId: this.userId,
        companyId: this.companyId,
        type: 'chronology',
        input: { previousAnalysesIds: previousAnalyses.map(a => a._id) },
        output: { content },
        status: 'completed',
        processingTime: Date.now() - startTime,
      });

      await analysis.save();

      return {
        id: analysis._id.toString(),
        type: 'chronology',
        content,
        status: 'completed',
        createdAt: analysis.createdAt,
        processingTime: Date.now() - startTime,
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
      const patient = await Patient.findById(this.patientId);
      if (!patient) throw new Error('Paciente não encontrada');

      const previousAnalyses = await Analysis.find({
        patientId: this.patientId,
        status: 'completed',
        type: { $in: ['laboratory', 'tcm', 'chronology'] }
      }).sort({ createdAt: 1 });

      // Obter configuração da análise IFM
      const analysisConfig = await this.aiService.getAnalysisConfig('ifm');

      // Gerar contexto RAG se habilitado
      let ragContext = '';
      if (analysisConfig.ragEnabled) {
        ragContext = await this.ragService.generateContext(
          `medicina funcional matriz IFM sistemas ${patient.mainSymptoms?.join(' ')}`,
          'ifm',
          this.companyId
        );
      }

      // Executar análise usando configurações globais
      const content = await this.aiService.generateAnalysis(
        'ifm',
        { patientData: patient, previousAnalyses, ragContext }
      );

      const analysis = new Analysis({
        patientId: this.patientId,
        userId: this.userId,
        companyId: this.companyId,
        type: 'ifm',
        input: { previousAnalysesIds: previousAnalyses.map(a => a._id) },
        output: { content },
        status: 'completed',
        processingTime: Date.now() - startTime,
      });

      await analysis.save();

      return {
        id: analysis._id.toString(),
        type: 'ifm',
        content,
        status: 'completed',
        createdAt: analysis.createdAt,
        processingTime: Date.now() - startTime,
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
      const patient = await Patient.findById(this.patientId);
      if (!patient) throw new Error('Paciente não encontrada');

      const user = await User.findById(this.userId);
      if (!user) throw new Error('Usuário não encontrado');

      const previousAnalyses = await Analysis.find({
        patientId: this.patientId,
        status: 'completed',
        type: { $in: ['laboratory', 'tcm', 'chronology', 'ifm'] }
      }).sort({ createdAt: 1 });

      // Obter configuração da análise de plano de tratamento
      const analysisConfig = await this.aiService.getAnalysisConfig('treatmentPlan');

      // Gerar contexto RAG se habilitado
      let ragContext = '';
      if (analysisConfig.ragEnabled) {
        ragContext = await this.ragService.generateContext(
          `plano tratamento ${user.specialization} ${patient.mainSymptoms?.join(' ')}`,
          'treatmentPlan',
          this.companyId
        );
      }

      // Executar análise usando configurações globais
      const content = await this.aiService.generateAnalysis(
        'treatmentPlan',
        { patientData: patient, previousAnalyses, ragContext }
      );

      const analysis = new Analysis({
        patientId: this.patientId,
        userId: this.userId,
        companyId: this.companyId,
        type: 'treatmentPlan',
        input: { 
          previousAnalysesIds: previousAnalyses.map(a => a._id),
          professionalType: user.specialization 
        },
        output: { content },
        status: 'completed',
        processingTime: Date.now() - startTime,
      });

      await analysis.save();

      return {
        id: analysis._id.toString(),
        type: 'treatmentPlan',
        content,
        status: 'completed',
        createdAt: analysis.createdAt,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error('Erro na análise do plano de tratamento:', error);
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
      patientId: this.patientId,
      status: 'completed'
    }).sort({ createdAt: -1 });

    return analyses.map(analysis => ({
      id: analysis._id.toString(),
      type: analysis.type as any,
      content: analysis.output?.content || '',
      status: analysis.status as any,
      createdAt: analysis.createdAt,
      processingTime: analysis.processingTime,
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