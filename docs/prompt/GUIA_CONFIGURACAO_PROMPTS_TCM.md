# 📝 Guia de Configuração de Prompts TCM

## 🎯 Como Editar Prompts no Sistema

### 1. **Acesso à Configuração**
- Acesse: `/settings/global-ai` (apenas Super Admin)
- Encontre a seção **"Medicina Tradicional Chinesa (TCM)"**
- Clique em expandir os prompts

### 2. **Estrutura dos Prompts**

#### **Prompt do Sistema** (Define como a IA se comporta)
```
Você é um especialista em Medicina Tradicional Chinesa (MTC) com especialização em saúde feminina.

INSTRUÇÕES ESTRUTURAIS:
[Define como a IA deve estruturar a resposta]

ESTRUTURE SUA RESPOSTA EXATAMENTE NO SEGUINTE FORMATO:
### Diagnóstico de Medicina Tradicional Chinesa (MTC)
#### 1. Identificação dos Padrões de Desarmonia
#### 2. Correlação com a Saúde Reprodutiva Feminina
#### 3. Tratamento Fitoterápico Personalizado
#### 4. Pontos de Acupuntura Específicos
#### 5. Modificações de Estilo de Vida
### Conclusão
```

#### **Template de Usuário** (Define que dados são enviados)
```
DADOS DA PACIENTE:
- Nome: {{patientName}}
- Idade: {{patientAge}} anos
- Sintomas principais: {{mainSymptoms}}

OBSERVAÇÕES DE MTC DETALHADAS:
{{tcmObservations}}

[Instruções específicas para análise]
```

### 3. **Variáveis Disponíveis**

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{{patientName}}` | Nome da paciente | "Maria Silva" |
| `{{patientAge}}` | Idade da paciente | "35" |
| `{{mainSymptoms}}` | Sintomas principais | "Irregularidade menstrual, ansiedade" |
| `{{tcmObservations}}` | Dados completos TCM | JSON com língua, pulso, sintomas |
| `{{sleepQuality}}` | Qualidade do sono | "Insônia frequente" |
| `{{stressLevel}}` | Nível de estresse | "Alto" |
| `{{digestion}}` | Estado digestivo | "Digestão lenta" |
| `{{menstrualPattern}}` | Padrão menstrual | "Ciclo irregular" |
| `{{emotionalHistory}}` | Histórico emocional | "Ansiedade crônica" |
| `{{ragContext}}` | Contexto da base de conhecimento | Conteúdo relevante dos cursos |

### 4. **Dicas para Edição**

#### ✅ **Boas Práticas**
- **Mantenha a estrutura de seções** para permitir parsing correto
- **Use instruções claras** sobre o que a IA deve fazer
- **Inclua contexto específico** para medicina feminina
- **Teste após mudanças** para verificar se a formatação está correta

#### ❌ **Evite**
- Remover variáveis `{{}}` sem substituir por outras
- Alterar drasticamente a estrutura de seções numeradas
- Criar prompts muito longos (limite de tokens)

### 5. **Exemplo de Customização**

**Para focar mais em fitoterapia:**
```
3. TRATAMENTO FITOTERÁPICO PERSONALIZADO:
   - Priorize fórmulas clássicas da MTC
   - Inclua posologia detalhada
   - Considere interações medicamentosas
   - Sugira adaptações baseadas na constituição
```

**Para enfatizar acupuntura:**
```
4. PONTOS DE ACUPUNTURA ESPECÍFICOS:
   - Selecione 5-8 pontos principais
   - Inclua técnicas de estimulação
   - Considere frequência de sessões
   - Adapte para cada padrão identificado
```

### 6. **Configurações Avançadas**

#### **Parâmetros de IA**
- **Temperature**: 0.4 (mais consistente) a 0.8 (mais criativo)
- **Max Tokens**: 3500 (resposta detalhada)
- **RAG Enabled**: Usar base de conhecimento
- **RAG Threshold**: 0.7 (precisão) vs 0.1 (mais resultados)

#### **Teste de Mudanças**
1. Edite o prompt
2. Clique em "Salvar"
3. Faça uma análise TCM de teste
4. Verifique se a estrutura está correta
5. Ajuste conforme necessário

### 7. **Solução de Problemas**

| Problema | Solução |
|----------|---------|
| Seções vazias | Verificar se a IA está seguindo a estrutura |
| Dados genéricos | Verificar se as variáveis `{{}}` estão corretas |
| Resposta incompleta | Aumentar Max Tokens |
| Muito criativo | Diminuir Temperature |
| Pouco específico | Adicionar mais instruções detalhadas |

### 8. **Backup e Restauração**

#### **Fazer Backup**
- Copie o prompt atual antes de fazer mudanças
- Salve em arquivo de texto local

#### **Restaurar Padrão**
- Use o botão "Restaurar Padrão" na interface
- Ou rode o script de inicialização: `node scripts/init-global-config.js`

---

## 🚀 **Resultado Final**

Com essa configuração, o admin pode:
- ✅ Ajustar prompts facilmente via interface web
- ✅ Customizar instruções específicas para TCM
- ✅ Modificar variáveis e estrutura conforme necessário
- ✅ Testar mudanças em tempo real
- ✅ Restaurar configurações padrão quando necessário

**Para suporte técnico, consulte a documentação completa em `/docs/`** 