require('dotenv').config();
const mongoose = require('mongoose');

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

// Novo prompt de cronologia otimizado para usar dados reais do paciente
const newChronologySystemPrompt = `Você é um especialista em medicina funcional e saúde da mulher, especializado em análise cronológica de histórias clínicas.

Sua tarefa é analisar os dados completos da paciente e criar uma cronologia detalhada de sua saúde, identificando padrões temporais, correlações hormonais e momentos críticos.

IMPORTANTE: Use APENAS os dados fornecidos sobre a paciente. NÃO peça informações adicionais.

DIRETRIZES PARA ANÁLISE CRONOLÓGICA:

1. ANÁLISE DOS DADOS DISPONÍVEIS:
   - Examine cuidadosamente todos os dados da paciente fornecidos
   - Historico médico pessoal e familiar
   - Sintomas principais e suas prioridades
   - História menstrual completa
   - Medicamentos e suplementos atuais
   - Estilo de vida (sono, exercício, stress, nutrição)
   - Objetivos de tratamento

2. CRONOLOGIA BASEADA EM DADOS REAIS:
   - Use a idade atual e história menstrual para criar timeline
   - Correlacione sintomas com fases hormonais
   - Analise impacto de medicamentos e tratamentos anteriores
   - Identifique padrões de estilo de vida

3. IDENTIFICAÇÃO DE PADRÕES:
   - Padrões cíclicos relacionados ao ciclo menstrual
   - Correlações entre estilo de vida e sintomas
   - Resposta a tratamentos anteriores

4. MOMENTOS CRÍTICOS NA HISTÓRIA:
   - Início dos sintomas principais
   - Mudanças no padrão menstrual
   - Introdução/retirada de medicamentos
   - Eventos de vida relacionados ao estilo de vida

Responda em português brasileiro com análise detalhada e estruturada.`;

const newChronologyUserTemplate = `DADOS COMPLETOS DA PACIENTE:

INFORMAÇÕES BÁSICAS:
- Nome: {{patientName}}
- Idade: {{patientAge}} anos
- Altura: {{height}} cm
- Peso: {{weight}} kg

SINTOMAS PRINCIPAIS:
{{mainSymptoms}}

HISTÓRIA MENSTRUAL:
- Menarca: {{menarche}} anos
- Ciclo: {{cycleLength}} dias  
- Duração menstruação: {{menstruationLength}} dias
- Última menstruação: {{lastMenstruation}}
- Status menopausal: {{menopausalStatus}}
- Uso de contraceptivos: {{contraceptiveUse}}

HISTÓRICO MÉDICO:
- História pessoal: {{personalHistory}}
- História familiar: {{familyHistory}}
- Alergias: {{allergies}}
- Tratamentos anteriores: {{previousTreatments}}

MEDICAMENTOS E SUPLEMENTOS ATUAIS:
{{medications}}

ESTILO DE VIDA:
- Qualidade do sono: {{sleepQuality}} ({{sleepHours}} horas/noite)
- Exercício: {{exerciseFrequency}} - {{exerciseType}}
- Nível de stress: {{stressLevel}}
- Qualidade nutricional: {{nutritionQuality}}
- Qualidade dos relacionamentos: {{relationshipQuality}}

OBJETIVOS DE TRATAMENTO:
- Metas: {{goals}}
- Expectativas: {{expectations}}
- Notas adicionais: {{additionalNotes}}

ANÁLISES ANTERIORES:
{{previousAnalyses}}

CONTEXTO CIENTÍFICO ADICIONAL:
{{ragContext}}

Com base em TODOS estes dados fornecidos, crie uma análise cronológica detalhada da saúde desta paciente, incluindo:

1. **CRONOLOGIA DE SAÚDE**
   - Timeline desde a menarca até a situação atual
   - Correlação entre fases da vida e sintomas
   - Impacto de medicações e tratamentos

2. **PADRÕES IDENTIFICADOS**
   - Padrões cíclicos relacionados ao ciclo menstrual
   - Correlações entre estilo de vida e sintomas
   - Fatores desencadeantes e aliviadores

3. **MOMENTOS CRÍTICOS**
   - Eventos que marcaram mudanças na saúde
   - Janelas de oportunidade terapêutica
   - Pontos de inflexão na evolução dos sintomas

4. **ANÁLISE HORMONAL TEMPORAL**
   - Correlação entre fases hormonais e sintomas
   - Impacto de contraceptivos (se aplicável)
   - Transições hormonais relevantes

5. **PROGNÓSTICO E RECOMENDAÇÕES**
   - Tendências identificadas nos padrões
   - Janelas terapêuticas futuras
   - Intervenções baseadas na cronologia

Forneça uma análise completa e estruturada em português brasileiro.`;

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

// Executar se chamado diretamente
if (require.main === module) {
  console.log('🚀 Script de atualização do prompt de cronologia iniciado...');
  updateChronologyPrompt();
}

module.exports = { updateChronologyPrompt }; 