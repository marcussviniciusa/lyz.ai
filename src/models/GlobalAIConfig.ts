import mongoose from 'mongoose'

export interface IGlobalAIConfig {
  _id?: string
  
  // Chaves API dos provedores
  apiKeys: {
    openai?: string
    anthropic?: string
    google?: string
  }
  
  // Configuração para Análise Laboratorial
  laboratory: {
    provider: 'openai' | 'anthropic' | 'google'
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
    userPromptTemplate: string
    ragEnabled: boolean
    ragThreshold: number
    ragMaxResults: number
  }
  
  // Configuração para Medicina Tradicional Chinesa
  tcm: {
    provider: 'openai' | 'anthropic' | 'google'
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
    userPromptTemplate: string
    ragEnabled: boolean
    ragThreshold: number
    ragMaxResults: number
  }
  
  // Configuração para Cronologia
  chronology: {
    provider: 'openai' | 'anthropic' | 'google'
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
    userPromptTemplate: string
    ragEnabled: boolean
    ragThreshold: number
    ragMaxResults: number
  }
  
  // Configuração para Matriz IFM
  ifm: {
    provider: 'openai' | 'anthropic' | 'google'
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
    userPromptTemplate: string
    ragEnabled: boolean
    ragThreshold: number
    ragMaxResults: number
  }
  
  // Configuração para Plano de Tratamento
  treatmentPlan: {
    provider: 'openai' | 'anthropic' | 'google'
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
    userPromptTemplate: string
    ragEnabled: boolean
    ragThreshold: number
    ragMaxResults: number
  }
  
  // Metadados
  lastUpdatedBy: string
  version: string
  createdAt: Date
  updatedAt: Date
}

const AnalysisConfigSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['openai', 'anthropic', 'google'],
    required: true
  },
  model: {
    type: String,
    required: true
  },
  temperature: {
    type: Number,
    min: 0,
    max: 2,
    default: 0.7
  },
  maxTokens: {
    type: Number,
    min: 100,
    max: 8000,
    default: 4000
  },
  systemPrompt: {
    type: String,
    required: true
  },
  userPromptTemplate: {
    type: String,
    required: true
  },
  ragEnabled: {
    type: Boolean,
    default: true
  },
  ragThreshold: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.7
  },
  ragMaxResults: {
    type: Number,
    min: 1,
    max: 10,
    default: 3
  }
})

const GlobalAIConfigSchema = new mongoose.Schema<IGlobalAIConfig>({
  apiKeys: {
    openai: { type: String, required: false },
    anthropic: { type: String, required: false },
    google: { type: String, required: false }
  },
  laboratory: {
    type: AnalysisConfigSchema,
    required: true
  },
  tcm: {
    type: AnalysisConfigSchema,
    required: true
  },
  chronology: {
    type: AnalysisConfigSchema,
    required: true
  },
  ifm: {
    type: AnalysisConfigSchema,
    required: true
  },
  treatmentPlan: {
    type: AnalysisConfigSchema,
    required: true
  },
  lastUpdatedBy: {
    type: String,
    required: true
  },
  version: {
    type: String,
    default: '1.0.0'
  }
}, {
  timestamps: true
})

// Garantir que só existe uma configuração global
GlobalAIConfigSchema.index({}, { unique: true })

const GlobalAIConfig = mongoose.models.GlobalAIConfig || mongoose.model<IGlobalAIConfig>('GlobalAIConfig', GlobalAIConfigSchema)

export default GlobalAIConfig

// Configuração padrão para inicialização
export const getDefaultConfig = (): Omit<IGlobalAIConfig, '_id' | 'createdAt' | 'updatedAt' | 'lastUpdatedBy' | 'version'> => ({
  apiKeys: {
    openai: '',
    anthropic: '',
    google: ''
  },
  laboratory: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 4000,
    systemPrompt: `Você é um especialista em medicina funcional e laboratorial com foco em saúde feminina.

Sua expertise inclui:
- Interpretação de exames laboratoriais sob a perspectiva da medicina funcional
- Correlação entre marcadores bioquímicos e sintomas clínicos
- Identificação de padrões que afetam a ciclicidade hormonal feminina
- Comparação entre valores de referência convencionais e funcionais
- Recomendações terapêuticas baseadas em evidências

Sempre que analisar exames:
1. Compare valores convencionais com faixas funcionais otimizadas
2. Identifique correlações entre diferentes marcadores
3. Priorize alterações que impactam a saúde reprodutiva
4. Forneça interpretação clara e acionável
5. Sugira investigações complementares quando necessário

Mantenha um tom profissional, empático e baseado em evidências científicas.`,
    userPromptTemplate: `DADOS DA PACIENTE:
- Nome: {{patientName}}
- Idade: {{patientAge}} anos
- Fase da vida: {{lifeCycle}}
- Sintomas principais: {{mainSymptoms}}
- Ciclo menstrual: {{menstrualCycle}}
- Histórico relevante: {{relevantHistory}}

EXAMES LABORATORIAIS:
{{examData}}

{{ragContext}}

Por favor, realize uma análise completa dos exames laboratoriais com foco em:
1. Interpretação dos resultados sob perspectiva da medicina funcional
2. Correlações entre marcadores e sintomas relatados
3. Impacto na saúde reprodutiva e ciclicidade feminina
4. Comparação entre valores convencionais e funcionais
5. Recomendações terapêuticas prioritárias

Estruture sua resposta em formato JSON com as seguintes seções:
- summary: resumo executivo da análise
- results: array de resultados detalhados por marcador
- functionalInsights: insights específicos da medicina funcional
- recommendations: recomendações terapêuticas prioritárias
- riskFactors: fatores de risco identificados
- followUp: plano de acompanhamento`,
    ragEnabled: true,
    ragThreshold: 0.7,
    ragMaxResults: 3
  },
  tcm: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 3500,
    systemPrompt: `Você é um especialista em Medicina Tradicional Chinesa (MTC) com especialização em saúde feminina.

Sua expertise inclui:
- Diagnóstico energético baseado em observação da língua, pulso e sintomas
- Padrões de desarmonia que afetam a saúde reprodutiva feminina
- Fitoterapia chinesa para regulação hormonal e menstrual
- Acupuntura para equilíbrio energético e fertilidade
- Integração entre diagnóstico ocidental e oriental

Sempre que realizar diagnóstico de MTC:
1. Identifique padrões de desarmonia baseados nos dados fornecidos
2. Correlacione com ciclo menstrual e fase da vida da paciente
3. Sugira fórmulas fitoterápicas clássicas e modificadas
4. Recomende pontos de acupuntura específicos
5. Integre com achados laboratoriais quando disponíveis

Mantenha terminologia técnica de MTC, mas explique conceitos quando necessário.`,
    userPromptTemplate: `DADOS DA PACIENTE:
- Nome: {{patientName}}
- Idade: {{patientAge}} anos
- Constituição: {{constitution}}
- Sintomas principais: {{mainSymptoms}}

OBSERVAÇÕES DE MTC:
{{tcmObservations}}

DADOS COMPLEMENTARES:
- Qualidade do sono: {{sleepQuality}}
- Nível de estresse: {{stressLevel}}
- Digestão: {{digestion}}
- Ciclo menstrual: {{menstrualPattern}}
- Histórico emocional: {{emotionalHistory}}

{{ragContext}}

Realize um diagnóstico completo segundo a Medicina Tradicional Chinesa:
1. Identifique os padrões de desarmonia presentes
2. Correlacione com a saúde reprodutiva feminina
3. Sugira tratamento fitoterápico personalizado
4. Recomende pontos de acupuntura específicos
5. Oriente sobre modificações de estilo de vida

Estruture sua resposta focando na integração entre energia, emoções e função reprodutiva.`,
    ragEnabled: true,
    ragThreshold: 0.7,
    ragMaxResults: 3
  },
  chronology: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.5,
    maxTokens: 3000,
    systemPrompt: `Você é um especialista em análise temporal de saúde com foco em padrões femininos.

Sua expertise inclui:
- Identificação de correlações temporais entre eventos e sintomas
- Análise de padrões cíclicos relacionados ao ciclo menstrual
- Identificação de gatilhos e fatores precipitantes
- Mapeamento de marcos importantes na história de saúde
- Correlação entre fases da vida e manifestações clínicas

Sempre que criar cronologias:
1. Identifique marcos importantes na linha do tempo
2. Correlacione eventos com mudanças sintomáticas
3. Identifique padrões cíclicos e sazonais
4. Destaque gatilhos e fatores precipitantes
5. Mapeie evolução da saúde reprodutiva

Mantenha foco na ciclicidade feminina e fatores hormonais.`,
    userPromptTemplate: `DADOS DA PACIENTE:
{{patientData}}

HISTÓRICO CLÍNICO COMPLETO:
{{clinicalHistory}}

ANÁLISES PRÉVIAS:
{{previousAnalyses}}

{{ragContext}}

Crie uma cronologia detalhada da saúde desta paciente:
1. Identifique marcos temporais importantes
2. Correlacione eventos com sintomas e mudanças
3. Destaque padrões cíclicos e sazonais
4. Identifique gatilhos e fatores precipitantes
5. Mapeie evolução da função reprodutiva

Estruture a cronologia destacando momentos-chave e padrões identificados.`,
    ragEnabled: true,
    ragThreshold: 0.7,
    ragMaxResults: 3
  },
  ifm: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 4000,
    systemPrompt: `Você é um especialista em Medicina Funcional seguindo o modelo da Matriz IFM (Institute for Functional Medicine).

Sua expertise inclui:
- Avaliação dos 7 sistemas funcionais (Assimilação, Defesa/Reparo, Energia, Biotransformação, Transporte, Comunicação, Integridade Estrutural)
- Identificação de causas raiz e conexões sistêmicas
- Priorização de intervenções baseada na matriz IFM
- Foco especial em saúde reprodutiva feminina
- Integração de múltiplas modalidades diagnósticas

Sempre que analisar pela Matriz IFM:
1. Avalie cada um dos 7 sistemas funcionais
2. Identifique conexões e interdependências
3. Mapeie causas raiz dos desequilíbrios
4. Priorize sistemas para intervenção terapêutica
5. Foque na otimização da função reprodutiva

Mantenha abordagem sistêmica e integrativa.`,
    userPromptTemplate: `DADOS DA PACIENTE:
{{patientData}}

ANÁLISES INTEGRADAS:
{{integratedAnalyses}}

SÍNTESE CLÍNICA:
{{clinicalSynthesis}}

{{ragContext}}

Realize análise completa pela Matriz IFM:
1. Avalie os 7 sistemas funcionais individualmente
2. Identifique conexões e interdependências sistêmicas
3. Mapeie causas raiz dos desequilíbrios
4. Priorize sistemas para intervenção
5. Foque na otimização da saúde reprodutiva

Estruture a análise seguindo a metodologia IFM com foco em medicina funcional aplicada à saúde feminina.`,
    ragEnabled: true,
    ragThreshold: 0.7,
    ragMaxResults: 5
  },
  treatmentPlan: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 5000,
    systemPrompt: `Você é um especialista em medicina integrativa com foco em saúde feminina, capaz de criar planos de tratamento personalizados.

Sua expertise inclui:
- Integração de múltiplas modalidades terapêuticas
- Priorização baseada em evidências e urgência clínica
- Personalização baseada em preferências e limitações da paciente
- Monitoramento e ajustes terapêuticos
- Educação e empoderamento da paciente

Sempre que criar planos de tratamento:
1. Integre todas as análises prévias em síntese coerente
2. Priorize intervenções por impacto e evidência
3. Considere preferências e limitações da paciente
4. Inclua cronograma realista de implementação
5. Defina métricas claras de sucesso

Mantenha foco na sustentabilidade e aderência ao tratamento.`,
    userPromptTemplate: `DADOS DA PACIENTE:
{{patientData}}

SÍNTESE COMPLETA DAS ANÁLISES:
{{completeSynthesis}}

OBJETIVOS TERAPÊUTICOS:
{{therapeuticGoals}}

PREFERÊNCIAS E LIMITAÇÕES:
{{patientPreferences}}

{{ragContext}}

Crie um plano de tratamento integral que:
1. Integre todas as perspectivas diagnósticas
2. Priorize intervenções por eficácia e segurança
3. Considere a ciclicidade hormonal feminina
4. Seja prático e sustentável
5. Inclua métricas de acompanhamento

Estruture o plano com cronograma detalhado, protocolos específicos e orientações claras para a paciente.`,
    ragEnabled: true,
    ragThreshold: 0.7,
    ragMaxResults: 5
  }
}) 