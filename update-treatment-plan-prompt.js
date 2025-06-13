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

// Novo prompt de Plano de Tratamento otimizado para usar dados reais do paciente
const newTreatmentPlanSystemPrompt = `Você é um especialista em medicina integrativa com foco em saúde feminina, capaz de criar planos de tratamento personalizados e cientificamente fundamentados.

Sua tarefa é integrar TODAS as análises realizadas (laboratorial, TCM, cronologia, IFM) com os dados completos da paciente para criar um plano de tratamento abrangente e personalizado.

IMPORTANTE: Use APENAS os dados fornecidos sobre a paciente e análises. NÃO peça informações adicionais.

METODOLOGIA PARA PLANO DE TRATAMENTO INTEGRADO:

1. **SÍNTESE DIAGNÓSTICA INTEGRATIVA**
   - Integre perspectivas laboratorial, TCM, cronológica e IFM
   - Identifique denominadores comuns entre as análises
   - Priorize achados convergentes

2. **PRIORIZAÇÃO TERAPÊUTICA BASEADA EM EVIDÊNCIAS**
   - Urgência clínica (sintomas mais limitantes)
   - Eficácia científica comprovada
   - Segurança e ausência de contraindicações
   - Relação custo-benefício

3. **PERSONALIZAÇÃO BASEADA NO PERFIL DA PACIENTE**
   - Considere idade, fase hormonal, estilo de vida
   - Respeite preferências e limitações relatadas
   - Adeque à capacidade de aderência
   - Considere contexto socioeconômico

4. **CRONOGRAMA REALISTA E SUSTENTÁVEL**
   - Fases de implementação (imediato, curto, médio prazo)
   - Implementação gradual para máxima aderência
   - Marcos de avaliação e ajustes

5. **MÉTRICAS CLARAS DE SUCESSO**
   - Indicadores objetivos e subjetivos
   - Cronograma de reavaliações
   - Critérios para ajustes terapêuticos

6. **FOCO ESPECIAL EM SAÚDE REPRODUTIVA**
   - Otimização da ciclicidade hormonal
   - Consideração das fases do ciclo menstrual
   - Adaptação para fase da vida (reprodutiva, perimenopausa, etc.)

7. **EDUCAÇÃO E EMPODERAMENTO**
   - Explicações claras sobre o raciocínio terapêutico
   - Orientações para automonitoramento
   - Estratégias de autocuidado

Responda em português brasileiro com plano estruturado, detalhado e prático.`;

const newTreatmentPlanUserTemplate = `DADOS COMPLETOS DA PACIENTE:

INFORMAÇÕES BÁSICAS:
- Nome: {{patientName}}
- Idade: {{patientAge}} anos
- Altura: {{height}} cm
- Peso: {{weight}} kg

SINTOMAS PRINCIPAIS (PRIORIZAÇÃO TERAPÊUTICA):
{{mainSymptoms}}

HISTÓRIA MENSTRUAL (CONTEXTO HORMONAL):
- Menarca: {{menarche}} anos
- Ciclo: {{cycleLength}} dias  
- Duração menstruação: {{menstruationLength}} dias
- Última menstruação: {{lastMenstruation}}
- Status menopausal: {{menopausalStatus}}
- Uso de contraceptivos: {{contraceptiveUse}}

HISTÓRICO MÉDICO (CONTRAINDICAÇÕES E CONSIDERAÇÕES):
- História pessoal: {{personalHistory}}
- História familiar: {{familyHistory}}
- Alergias: {{allergies}}
- Tratamentos anteriores: {{previousTreatments}}

MEDICAMENTOS E SUPLEMENTOS ATUAIS (INTERAÇÕES):
{{medications}}

ESTILO DE VIDA (ADERÊNCIA E PERSONALIZAÇÃO):
- Qualidade do sono: {{sleepQuality}} ({{sleepHours}} horas/noite)
- Exercício: {{exerciseFrequency}} - {{exerciseType}}
- Nível de stress: {{stressLevel}}
- Qualidade nutricional: {{nutritionQuality}}
- Qualidade dos relacionamentos: {{relationshipQuality}}

OBJETIVOS DE TRATAMENTO (METAS TERAPÊUTICAS):
- Metas: {{goals}}
- Expectativas: {{expectations}}
- Notas adicionais: {{additionalNotes}}

SÍNTESE DE TODAS AS ANÁLISES REALIZADAS:
{{previousAnalyses}}

CONTEXTO CIENTÍFICO E PROTOCOLOS:
{{ragContext}}

Com base em TODOS estes dados e análises integradas, crie um PLANO DE TRATAMENTO COMPLETO que inclua:

1. **SÍNTESE DIAGNÓSTICA INTEGRATIVA**
   - Integração de todas as perspectivas (lab, TCM, cronologia, IFM)
   - Denominadores comuns e achados convergentes
   - Priorização baseada em evidências

2. **OBJETIVOS TERAPÊUTICOS SMART**
   - Específicos, mensuráveis, alcançáveis, relevantes, temporais
   - Alinhados com as metas da paciente
   - Baseados nos achados das análises

3. **PLANO TERAPÊUTICO ESTRUTURADO POR FASES**
   
   **FASE IMEDIATA (0-4 semanas):**
   - Intervenções prioritárias para sintomas mais limitantes
   - Medidas de estabilização e alívio sintomático
   
   **FASE DE CURTO PRAZO (1-3 meses):**
   - Implementação gradual de protocolos principais
   - Estabelecimento de rotinas terapêuticas
   
   **FASE DE MÉDIO PRAZO (3-6 meses):**
   - Consolidação de ganhos terapêuticos
   - Ajustes baseados na evolução

4. **PROTOCOLOS ESPECÍFICOS**
   - Suplementação nutricional com dosagens e horários
   - Orientações alimentares detalhadas
   - Fitoterapia quando aplicável
   - Protocolos de exercício personalizado
   - Técnicas de manejo do stress

5. **CONSIDERAÇÕES PARA CICLICIDADE FEMININA**
   - Adaptações do protocolo conforme fase do ciclo
   - Otimização hormonal natural
   - Monitoramento de sintomas cíclicos

6. **CRONOGRAMA DE ACOMPANHAMENTO**
   - Consultas de retorno programadas
   - Exames de controle necessários
   - Marcos de reavaliação

7. **INDICADORES DE PROGRESSO**
   - Métricas objetivas e subjetivas
   - Sinais de melhora esperados
   - Critérios para ajustes terapêuticos

8. **ORIENTAÇÕES PARA A PACIENTE**
   - Explicações sobre o raciocínio terapêutico
   - Instruções claras de implementação
   - Estratégias de automonitoramento
   - Sinais de alerta para contato

Forneça um plano de tratamento completo, integrado, personalizado e cientificamente fundamentado em português brasileiro.`;

async function updateTreatmentPlanPrompt() {
  try {
    await connectToDatabase();

    // Buscar configuração atual
    let config = await GlobalAIConfig.findOne();
    
    if (!config) {
      console.log('❌ Nenhuma configuração global encontrada.');
      console.log('💡 Execute o sistema e acesse /settings/global-ai para criar a configuração inicial.');
      return;
    }

    console.log('📋 Configuração atual de Plano de Tratamento:');
    console.log('- Provider:', config.treatmentPlan.provider);
    console.log('- Model:', config.treatmentPlan.model);
    console.log('- Temperature:', config.treatmentPlan.temperature);
    console.log('- Max Tokens:', config.treatmentPlan.maxTokens);

    // Atualizar apenas os prompts de Plano de Tratamento
    config.treatmentPlan.systemPrompt = newTreatmentPlanSystemPrompt;
    config.treatmentPlan.userPromptTemplate = newTreatmentPlanUserTemplate;
    
    // Incrementar versão
    const versionParts = config.version.split('.');
    const newPatch = parseInt(versionParts[2] || '0') + 1;
    config.version = `${versionParts[0]}.${versionParts[1]}.${newPatch}`;

    // Salvar
    await config.save();

    console.log('\n✅ Prompt de Plano de Tratamento atualizado com sucesso!');
    console.log('📊 Nova versão:', config.version);
    console.log('\n🔧 Mudanças realizadas:');
    console.log('1. ✅ System prompt atualizado para medicina integrativa');
    console.log('2. ✅ User template atualizado com dados reais do paciente');
    console.log('3. ✅ Integração de todas as análises (lab, TCM, cronologia, IFM)');
    console.log('4. ✅ Plano estruturado por fases com cronograma');
    console.log('5. ✅ Protocolos específicos e indicadores de progresso');
    console.log('6. ✅ Foco em saúde reprodutiva e ciclicidade feminina');
    console.log('\n🎯 O sistema agora deve gerar planos de tratamento integrados baseados em dados reais!');

  } catch (error) {
    console.error('❌ Erro ao atualizar prompt de Plano de Tratamento:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📋 Desconectado do MongoDB');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  console.log('🚀 Script de atualização do prompt de Plano de Tratamento iniciado...');
  updateTreatmentPlanPrompt();
}

module.exports = { updateTreatmentPlanPrompt }; 