# Sistema Lyz - Funcionalidades

## 🎯 O que é o Lyz

Plataforma digital para profissionais de saúde especializados em saúde feminina e ciclicidade. O sistema usa inteligência artificial para analisar dados médicos e criar planos de tratamento personalizados.

## 👥 Tipos de Usuários

- **Superadmin**: Configuração geral do sistema
- **Admin**: Gestão da empresa/clínica
- **Profissional**: Médico, nutricionista, terapeuta

## 🔧 Funcionalidades Principais

### Sistema de Login e Controle de Acesso
- Login com email e senha
- Controle de permissões por tipo de usuário
- Acesso restrito por empresa/clínica

### Dashboard Administrativo
- Visão geral de estatísticas de uso
- Controle de custos e consumo
- Gestão de usuários e empresas

### Arquitetura do Sistema
- **Banco de Dados**: MongoDB para armazenamento de dados estruturados
- **Armazenamento de Arquivos**: MinIO para gerenciamento de uploads e documentos
- **Escalabilidade**: Arquitetura distribuída e otimizada para performance

### Configuração de Inteligência Artificial
- **Gerenciamento de Provedores de IA**: OpenAI, Anthropic, Google
- **Modelos Disponíveis**:
  - **OpenAI**: GPT-4o-mini, GPT-4.5, GPT-4.1-mini
  - **Google**: Gemini 2.5 Flash Preview 05-20
  - **Anthropic**: Claude Sonnet 3.7, Claude Sonnet 4
- **Configuração de Chaves de API**: Cadastro seguro das chaves de acesso
- **Personalização por Análise**: Escolher qual IA usar para cada tipo de análise
- **Controle de Parâmetros**: Ajustar criatividade e tamanho das respostas
- **Monitoramento de Custos**: Acompanhar gastos por análise e período

### Sistema RAG (Retrieval-Augmented Generation)
- **Framework LangChain**: Integração com LangChain para processamento avançado
- **Gestão de Base de Conhecimento**: Interface administrativa para upload e gerenciamento de documentos
- **Upload de Documentos**: Administradores podem adicionar literatura médica, protocolos e guidelines
- **Processamento Automático**: Sistema processa documentos uploaded e cria embeddings
- **Busca Semântica Inteligente**: Recuperação de informações relevantes da base de dados
- **Contextualização Automática**: Enriquecimento das análises com conhecimento especializado

## 📋 As 5 Análises de IA

### 1. Análise Laboratorial
**O que faz:**
- Recebe upload de exames laboratoriais
- Identifica valores alterados
- Correlaciona diferentes marcadores
- Gera relatório com interpretação clínica

**Formulário de Entrada:**
- **Opção 1 - Upload de arquivos**: PDF, PNG, JPG (múltiplos arquivos aceitos simultaneamente)
- **Opção 2 - Inserção manual**: Campo de texto para inserir dados dos exames manualmente

**Resultado:**
- Tabela comparativa com interpretação dos exames laboratoriais usando parâmetros da medicina funcional
- Comparação entre valores de referência convencionais e funcionais
- Identificação de alterações significativas e pontos de atenção prioritários

### 2. Análise de Medicina Tradicional Chinesa
**O que faz:**
- Avalia características da língua
- Analisa padrões de pulso
- Integra com dados laboratoriais
- Sugere diagnóstico energético

**Formulário de Entrada:**
- **Observação da Língua:**
  - Cor (pálida, vermelha, púrpura, etc.)
  - Saburra (fina, grossa, branca, amarela, etc.)
  - Forma (inchada, fina, fissuras, etc.)
  - Umidade (seca, úmida, pegajosa, etc.)
  - Observações adicionais
- **Diagnóstico de Padrões**: Campo para identificação dos padrões de desarmonia
- **Princípios de Tratamento**: Estratégias terapêuticas segundo MTC
- **Observações Adicionais**: Notas complementares

**Resultado:**
- Diagnóstico segundo MTC
- Recomendações de fitoterapia
- Sugestões de acupuntura

### 3. Geração de Cronologia
**O que faz:**
- Cria linha do tempo da saúde da paciente
- Correlaciona eventos com sintomas
- Identifica padrões cíclicos
- Marca momentos importantes

**Formulário de Entrada:**
- **Integração automática** dos dados já coletados:
  - Dados da paciente (idade, histórico menstrual)
  - Resultados laboratoriais analisados
  - Observações de MTC
- **Eventos de saúde** identificados automaticamente
- **Correlações temporais** processadas pela IA

**Resultado:**
- Cronologia visual organizada
- Identificação de gatilhos
- Padrões mensais/anuais

### 4. Matriz IFM (Medicina Funcional)
**O que faz:**
- Analisa todos os sistemas corporais
- Identifica conexões entre problemas
- Prioriza quais sistemas tratar primeiro
- Mapeia causas raiz

**Formulário de Entrada:**
- **Síntese automática** de todas as análises anteriores
- **Sistemas corporais** avaliados automaticamente:
  - Assimilação (digestão e absorção)
  - Defesa e reparo (sistema imune)
  - Energia (produção de energia celular)
  - Biotransformação e eliminação (detoxificação)
  - Transporte (sistema cardiovascular)
  - Comunicação (hormônios e neurotransmissores)
  - Integridade estrutural (músculos, ossos)
- **Foco personalizado**: Especialização em ciclicidade feminina

**Resultado:**
- Mapa sistêmico da saúde
- Prioridades de tratamento
- Intervenções recomendadas

### 5. Plano de Tratamento Final
**O que faz:**
- Integra todas as análises anteriores
- Cria plano personalizado
- Adapta para tipo de profissional
- Define cronograma de acompanhamento

**Formulário de Entrada:**
- **Compilação total** de todas as etapas anteriores
- **Tipo de profissional** (médico/nutricionista vs outros)
- **Objetivos terapêuticos** específicos
- **Preferências da paciente** e limitações

**Resultado:**
- Plano completo de tratamento
- Prescrições específicas
- Cronograma de retornos

## 🔄 Fluxo de Trabalho

### 1. Cadastro da Paciente
**Formulário Completo de Dados:**

**Informações Básicas:**
- Nome completo (obrigatório)
- Idade (obrigatório)
- Altura e peso
- Dados antropométricos

**Histórico Menstrual:**
- Idade da menarca
- Duração do ciclo (dias)
- Duração da menstruação (dias)
- Data da última menstruação
- Status menopausal
- Uso de contraceptivos

**Sintomas Principais:**
- Lista de até 5 sintomas prioritários
- Ordenação por urgência/importância

**Histórico Médico:**
- Histórico médico pessoal
- Histórico familiar
- Alergias conhecidas
- Tratamentos anteriores

**Medicamentos e Suplementos:**
- Medicamentos atuais (nome, dosagem, frequência)
- Suplementos em uso

**Estilo de Vida:**
- Qualidade do sono (bom/regular/ruim)
- Horas de sono por noite
- Frequência de exercícios
- Tipo de exercício praticado
- Nível de estresse (baixo/moderado/alto)
- Qualidade da nutrição
- Qualidade dos relacionamentos

**Objetivos do Tratamento:**
- Metas terapêuticas específicas (obrigatório)
- Expectativas da paciente
- Observações adicionais

### 2. Upload de Exames
Anexar resultados laboratoriais

### 3. Análise Sequencial
Executar as 5 análises em ordem

### 4. Revisão Profissional
Validar e ajustar resultados

### 5. Entrega do Plano
Apresentar plano final à paciente