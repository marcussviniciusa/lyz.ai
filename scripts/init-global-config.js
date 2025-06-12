#!/usr/bin/env node

/**
 * Script para inicializar configurações globais de IA
 * Usa a chave OpenAI do .env.local para criar configuração global
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const mongoose = require('mongoose');

// Configuração padrão
const defaultConfig = {
  apiKeys: {
    openai: process.env.OPENAI_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    google: process.env.GOOGLE_AI_API_KEY || ''
  },
  googleVision: {
    enabled: false,
    projectId: '',
    clientEmail: '',
    privateKey: ''
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
    userPromptTemplate: `Analise os seguintes dados laboratoriais de uma paciente:

{patientData}

Exames laboratoriais:
{labData}

Forneça uma análise detalhada incluindo:
1. **Resumo Executivo**: Principais achados e preocupações
2. **Análise por Sistema**: Avaliação detalhada de cada marcador
3. **Correlações Clínicas**: Relação entre achados e sintomas
4. **Recomendações**: Sugestões terapêuticas e investigações adicionais
5. **Monitoramento**: Exames de acompanhamento sugeridos`,
    ragEnabled: true,
    ragThreshold: 0.7,
    ragMaxResults: 3
  },
  tcm: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4000,
    systemPrompt: `Você é um especialista em Medicina Tradicional Chinesa (MTC) com foco em saúde feminina e ginecologia.`,
    userPromptTemplate: `Analise o caso clínico sob a perspectiva da MTC: {patientData}`,
    ragEnabled: true,
    ragThreshold: 0.7,
    ragMaxResults: 3
  },
  chronology: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.5,
    maxTokens: 4000,
    systemPrompt: `Você é um especialista em criar cronologias de saúde detalhadas para medicina funcional.`,
    userPromptTemplate: `Crie uma cronologia de saúde para: {patientData}`,
    ragEnabled: true,
    ragThreshold: 0.7,
    ragMaxResults: 3
  },
  ifm: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.6,
    maxTokens: 4000,
    systemPrompt: `Você é um especialista em Medicina Funcional usando a Matriz IFM.`,
    userPromptTemplate: `Analise usando a Matriz IFM: {patientData}`,
    ragEnabled: true,
    ragThreshold: 0.7,
    ragMaxResults: 3
  },
  treatmentPlan: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 4000,
    systemPrompt: `Você é um especialista em criar planos de tratamento personalizados em medicina funcional.`,
    userPromptTemplate: `Crie um plano de tratamento para: {patientData}`,
    ragEnabled: true,
    ragThreshold: 0.7,
    ragMaxResults: 3
  },
  lastUpdatedBy: 'script-init',
  version: '1.0.0'
};

async function initGlobalConfig() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lyz-ai');
    console.log('✅ MongoDB conectado');

    // Definir schema
    const GlobalAIConfigSchema = new mongoose.Schema({}, { strict: false });
    const GlobalAIConfig = mongoose.model('GlobalAIConfig', GlobalAIConfigSchema);

    // Verificar se já existe configuração
    const existingConfig = await GlobalAIConfig.findOne();
    
    if (existingConfig) {
      console.log('⚠️  Configuração global já existe');
      console.log('📋 OpenAI Key configurada:', existingConfig.apiKeys?.openai ? 'SIM' : 'NÃO');
      
      // Atualizar chave OpenAI se não existir
      if (!existingConfig.apiKeys?.openai && defaultConfig.apiKeys.openai) {
        await GlobalAIConfig.findByIdAndUpdate(existingConfig._id, {
          'apiKeys.openai': defaultConfig.apiKeys.openai
        });
        console.log('✅ Chave OpenAI atualizada na configuração existente');
      }
    } else {
      console.log('🆕 Criando nova configuração global...');
      await GlobalAIConfig.create(defaultConfig);
      console.log('✅ Configuração global criada com sucesso');
    }

    console.log('🎯 Configuração finalizada!');
    console.log('📝 Chave OpenAI:', defaultConfig.apiKeys.openai ? 'CONFIGURADA' : 'NÃO ENCONTRADA');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB desconectado');
    process.exit(0);
  }
}

initGlobalConfig(); 