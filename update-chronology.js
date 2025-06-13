const mongoose = require('mongoose');

console.log('🚀 Script de atualização do prompt de cronologia iniciado...');

// Configuração de conexão MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lyz-ai';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

// Schema para GlobalAIConfig
const AnalysisConfigSchema = new mongoose.Schema({
  provider: String,
  model: String,
  temperature: Number,
  maxTokens: Number,
  systemPrompt: String,
  userPromptTemplate: String,
  ragEnabled: Boolean,
  ragThreshold: Number,
  ragMaxResults: Number
});

const GlobalAIConfigSchema = new mongoose.Schema({
  apiKeys: {
    openai: String,
    anthropic: String,
    google: String
  },
  googleVision: {
    enabled: Boolean,
    projectId: String,
    clientEmail: String,
    privateKey: String
  },
  laboratory: AnalysisConfigSchema,
  tcm: AnalysisConfigSchema,
  chronology: AnalysisConfigSchema,
  ifm: AnalysisConfigSchema,
  treatmentPlan: AnalysisConfigSchema,
  lastUpdatedBy: String,
  version: String
}, {
  timestamps: true
});

const GlobalAIConfig = mongoose.model('GlobalAIConfig', GlobalAIConfigSchema);

// Novo prompt de cronologia otimizado para retornar dados estruturados
const newChronologySystemPrompt = `Você é um especialista em medicina funcional e saúde da mulher, especializado em análise cronológica de histórias clínicas.

Sua tarefa é analisar a cronologia de eventos na vida de uma paciente e identificar padrões temporais, correlações hormonais e momentos críticos que influenciam sua saúde atual.

Analise os dados fornecidos e forneça uma análise estruturada seguindo EXATAMENTE o formato JSON especificado.

DIRETRIZES PARA ANÁLISE CRONOLÓGICA:

1. TIMELINE CONSOLIDADA:
   - Organize eventos por períodos históricos (infância, adolescência, idade reprodutiva, etc.)
   - Identifique fases hormonais (pré-menarca, menarca, ciclos regulares, irregularidades, etc.)
   - Correlacione eventos de vida com mudanças sintomáticas

2. IDENTIFICAÇÃO DE PADRÕES:
   - Padrões cíclicos relacionados ao ciclo menstrual
   - Gatilhos recorrentes de sintomas
   - Padrões de resposta a tratamentos

3. MOMENTOS CRÍTICOS:
   - Eventos que causaram mudanças significativas na saúde
   - Pontos de inflexão na progressão sintomática
   - Janelas de oportunidade terapêutica perdidas

4. CORRELAÇÕES HORMONAIS:
   - Relacione eventos com fases hormonais específicas
   - Identifique disruptores endócrinos
   - Analise impacto de contraceptivos hormonais

5. PROGNÓSTICO TEMPORAL:
   - Baseie-se em padrões históricos identificados
   - Considere fatores de progressão ou melhora
   - Identifique janelas terapêuticas futuras

Responda EXCLUSIVAMENTE em formato JSON válido, sem texto adicional.`;

const newChronologyUserTemplate = `DADOS DA PACIENTE:
- Nome: {{patientName}}
- Idade: {{patientAge}} anos
- Sintomas principais: {{mainSymptoms}}

HISTÓRICO MENSTRUAL:
- Menarca: {{menarche}} anos
- Ciclo: {{cycleLength}} dias
- Duração menstruação: {{menstruationLength}} dias
- Status menopausal: {{menopausalStatus}}
- Contraceptivos: {{contraceptiveUse}}

DADOS CRONOLÓGICOS:
{{chronologyData}}

{{ragContext}}

Forneça uma análise cronológica estruturada no seguinte formato JSON:

{
  "consolidatedTimeline": [
    {
      "period": "string (ex: 'Infância (0-12 anos)')",
      "phase": "string (ex: 'Pré-menarca')",
      "keyEvents": ["string"],
      "hormonalChanges": ["string"],
      "symptomChanges": ["string"],
      "treatmentResponses": ["string"]
    }
  ],
  "patterns": {
    "cyclicalPatterns": [
      {
        "pattern": "string",
        "frequency": "string",
        "description": "string",
        "relatedHormones": ["string"]
      }
    ],
    "triggerPatterns": [
      {
        "trigger": "string",
        "symptoms": ["string"],
        "timeframe": "string",
        "mechanism": "string"
      }
    ],
    "treatmentPatterns": [
      {
        "treatment": "string",
        "responseTime": "string",
        "effectiveness": "string",
        "bestResponders": "string"
      }
    ]
  },
  "criticalMoments": [
    {
      "date": "YYYY-MM-DD",
      "event": "string",
      "impact": "string",
      "cascadeEffects": ["string"],
      "recommendedIntervention": "string"
    }
  ],
  "hormonalCorrelations": [
    {
      "hormone": "string",
      "lifePhase": "string",
      "symptoms": ["string"],
      "interventions": ["string"]
    }
  ],
  "temporalPrognosis": {
    "shortTerm": "string (3-6 meses)",
    "mediumTerm": "string (6-12 meses)",
    "longTerm": "string (1-2 anos)",
    "keyMilestones": ["string"]
  },
  "therapeuticWindows": [
    {
      "period": "string",
      "opportunity": "string",
      "recommendedActions": ["string"],
      "expectedOutcomes": "string"
    }
  ],
  "chronologicalSynthesis": "string (síntese completa da análise cronológica)"
}`;

async function updateChronologyPrompt() {
  try {
    await connectToDatabase();

    // Buscar configuração atual
    let config = await GlobalAIConfig.findOne();
    
    if (!config) {
      console.log('❌ Nenhuma configuração global encontrada.');
      console.log('💡 Execute o sistema e acesse /settings/global-ai para criar a configuração inicial.');
      return;
    }

    console.log('📋 Configuração atual de cronologia:');
    console.log('- Provider:', config.chronology.provider);
    console.log('- Model:', config.chronology.model);
    console.log('- Temperature:', config.chronology.temperature);
    console.log('- Max Tokens:', config.chronology.maxTokens);

    // Atualizar apenas os prompts de cronologia
    config.chronology.systemPrompt = newChronologySystemPrompt;
    config.chronology.userPromptTemplate = newChronologyUserTemplate;
    
    // Incrementar versão
    const versionParts = config.version.split('.');
    const newPatch = parseInt(versionParts[2] || '0') + 1;
    config.version = `${versionParts[0]}.${versionParts[1]}.${newPatch}`;

    // Salvar
    await config.save();

    console.log('\n✅ Prompt de cronologia atualizado com sucesso!');
    console.log('📊 Nova versão:', config.version);
    console.log('\n🔧 Mudanças realizadas:');
    console.log('1. ✅ System prompt atualizado para análise estruturada');
    console.log('2. ✅ User template atualizado para retornar JSON estruturado');
    console.log('3. ✅ Frontend já configurado para exibir dados estruturados');
    console.log('\n🎯 O sistema agora deve retornar análises de cronologia bem formatadas!');

  } catch (error) {
    console.error('❌ Erro ao atualizar prompt de cronologia:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📋 Desconectado do MongoDB');
  }
}

// Executar a atualização
updateChronologyPrompt(); 