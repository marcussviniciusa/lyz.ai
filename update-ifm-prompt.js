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

// Novo prompt de IFM otimizado para usar dados reais do paciente
const newIFMSystemPrompt = `Você é um especialista em Medicina Funcional seguindo rigorosamente o modelo da Matriz IFM (Institute for Functional Medicine).

Sua tarefa é analisar os dados completos da paciente aplicando a metodologia IFM para identificar desequilíbrios sistêmicos, causas raiz e prioridades terapêuticas.

IMPORTANTE: Use APENAS os dados fornecidos sobre a paciente. NÃO peça informações adicionais.

METODOLOGIA MATRIZ IFM - 7 SISTEMAS FUNCIONAIS:

1. **ASSIMILAÇÃO** (Digestão, Absorção, Microbiota)
   - Analise qualidade digestiva, sintomas GI, padrões alimentares
   - Correlacione com inflamação sistêmica e saúde hormonal

2. **DEFESA/REPARO** (Sistema Imune, Inflamação, Infecções)
   - Avalie histórico de infecções, alergias, autoimunidade
   - Analise marcadores inflamatórios e padrões de resposta imune

3. **ENERGIA** (Produção Energética Mitocondrial)
   - Examine fadiga, capacidade de exercício, recuperação
   - Correlacione com função tireoidiana e metabolismo

4. **BIOTRANSFORMAÇÃO** (Detoxificação Hepática)
   - Avalie exposições tóxicas, capacidade de eliminação
   - Analise impacto na regulação hormonal

5. **TRANSPORTE** (Sistema Cardiovascular, Linfático)
   - Examine circulação, pressão arterial, edemas
   - Correlacione com transporte hormonal

6. **COMUNICAÇÃO** (Sistema Endócrino, Neurotransmissores)
   - Foque especialmente na saúde reprodutiva feminina
   - Analise ciclos hormonais, humor, ciclo menstrual

7. **INTEGRIDADE ESTRUTURAL** (Musculoesquelético, Membranas)
   - Avalie estrutura física, dores, mobilidade
   - Correlacione com inflamação sistêmica

ABORDAGEM IFM INTEGRATIVA:
- Identifique conexões entre sistemas
- Mapeie causas raiz dos desequilíbrios
- Priorize intervenções baseado na matriz IFM
- Foque na otimização da função reprodutiva

Responda em português brasileiro com análise detalhada e estruturada seguindo a metodologia IFM.`;

const newIFMUserTemplate = `DADOS COMPLETOS DA PACIENTE:

INFORMAÇÕES BÁSICAS:
- Nome: {{patientName}}
- Idade: {{patientAge}} anos
- Altura: {{height}} cm
- Peso: {{weight}} kg

SINTOMAS PRINCIPAIS:
{{mainSymptoms}}

HISTÓRIA MENSTRUAL (Sistema Comunicação - Hormonal):
- Menarca: {{menarche}} anos
- Ciclo: {{cycleLength}} dias  
- Duração menstruação: {{menstruationLength}} dias
- Última menstruação: {{lastMenstruation}}
- Status menopausal: {{menopausalStatus}}
- Uso de contraceptivos: {{contraceptiveUse}}

HISTÓRICO MÉDICO (Sistemas Defesa/Reparo):
- História pessoal: {{personalHistory}}
- História familiar: {{familyHistory}}
- Alergias: {{allergies}}
- Tratamentos anteriores: {{previousTreatments}}

MEDICAMENTOS E SUPLEMENTOS ATUAIS (Biotransformação):
{{medications}}

ESTILO DE VIDA (Múltiplos Sistemas):
- Qualidade do sono: {{sleepQuality}} ({{sleepHours}} horas/noite) [Energia/Comunicação]
- Exercício: {{exerciseFrequency}} - {{exerciseType}} [Energia/Estrutural]
- Nível de stress: {{stressLevel}} [Comunicação/Defesa]
- Qualidade nutricional: {{nutritionQuality}} [Assimilação]
- Qualidade dos relacionamentos: {{relationshipQuality}} [Comunicação]

OBJETIVOS DE TRATAMENTO:
- Metas: {{goals}}
- Expectativas: {{expectations}}
- Notas adicionais: {{additionalNotes}}

ANÁLISES ANTERIORES:
{{previousAnalyses}}

CONTEXTO CIENTÍFICO ADICIONAL:
{{ragContext}}

Com base em TODOS estes dados fornecidos, realize uma análise completa pela MATRIZ IFM, incluindo:

1. **AVALIAÇÃO DOS 7 SISTEMAS FUNCIONAIS**
   - Assimilação: Digestão, absorção, microbiota
   - Defesa/Reparo: Sistema imune, inflamação
   - Energia: Produção energética mitocondrial
   - Biotransformação: Detoxificação hepática
   - Transporte: Sistemas cardiovascular e linfático
   - Comunicação: Sistema endócrino e neurotransmissores
   - Integridade Estrutural: Sistema musculoesquelético

2. **CONEXÕES SISTÊMICAS E INTERDEPENDÊNCIAS**
   - Mapeamento de como os sistemas se influenciam mutuamente
   - Identificação de cascatas disfuncionais
   - Círculos viciosos e fatores perpetuantes

3. **CAUSAS RAIZ DOS DESEQUILÍBRIOS**
   - Fatores desencadeantes primários
   - Mediadores inflamatórios
   - Disruptores endócrinos

4. **PRIORIZAÇÃO TERAPÊUTICA IFM**
   - Sistemas prioritários para intervenção
   - Sequência lógica de abordagem
   - Intervenções com maior impacto sistêmico

5. **OTIMIZAÇÃO DA SAÚDE REPRODUTIVA**
   - Correlações hormonais específicas
   - Impacto dos sistemas na função ovariana
   - Estratégias para regulação do ciclo menstrual

Forneça uma análise completa e estruturada seguindo rigorosamente a metodologia da Matriz IFM em português brasileiro.`;

async function updateIFMPrompt() {
  try {
    await connectToDatabase();

    // Buscar configuração atual
    let config = await GlobalAIConfig.findOne();
    
    if (!config) {
      console.log('❌ Nenhuma configuração global encontrada.');
      console.log('💡 Execute o sistema e acesse /settings/global-ai para criar a configuração inicial.');
      return;
    }

    console.log('📋 Configuração atual de IFM:');
    console.log('- Provider:', config.ifm.provider);
    console.log('- Model:', config.ifm.model);
    console.log('- Temperature:', config.ifm.temperature);
    console.log('- Max Tokens:', config.ifm.maxTokens);

    // Atualizar apenas os prompts de IFM
    config.ifm.systemPrompt = newIFMSystemPrompt;
    config.ifm.userPromptTemplate = newIFMUserTemplate;
    
    // Incrementar versão
    const versionParts = config.version.split('.');
    const newPatch = parseInt(versionParts[2] || '0') + 1;
    config.version = `${versionParts[0]}.${versionParts[1]}.${newPatch}`;

    // Salvar
    await config.save();

    console.log('\n✅ Prompt de IFM (Matriz IFM) atualizado com sucesso!');
    console.log('📊 Nova versão:', config.version);
    console.log('\n🔧 Mudanças realizadas:');
    console.log('1. ✅ System prompt atualizado para metodologia IFM rigorosa');
    console.log('2. ✅ User template atualizado com dados reais do paciente');
    console.log('3. ✅ Mapeamento completo dos 7 sistemas funcionais');
    console.log('4. ✅ Análise sistêmica e identificação de causas raiz');
    console.log('\n🎯 O sistema agora deve retornar análises IFM detalhadas baseadas em dados reais!');

  } catch (error) {
    console.error('❌ Erro ao atualizar prompt de IFM:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📋 Desconectado do MongoDB');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  console.log('🚀 Script de atualização do prompt de IFM (Matriz IFM) iniciado...');
  updateIFMPrompt();
}

module.exports = { updateIFMPrompt }; 