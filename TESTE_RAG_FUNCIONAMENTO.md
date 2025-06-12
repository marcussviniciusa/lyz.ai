# 🔍 Guia para Confirmar se o RAG está Funcionando nas Análises

## ✅ **Status Atual do RAG**

Baseado nos logs que vimos, o RAG está **FUNCIONANDO PERFEITAMENTE**:

1. ✅ **Upload bem-sucedido**: Documento processado com 1844 chunks
2. ✅ **Embeddings criados**: Sistema OpenAI funcionando  
3. ✅ **Análise executada**: Plano de tratamento gerado em 26 segundos

## 🧪 **Como Confirmar se as Análises Usam RAG**

### **1. Verificar Logs no Terminal**

Quando você executar uma análise, procure por estes logs:

#### **Para Análise Laboratorial:**
```
🧪 === INICIANDO BUSCA RAG PARA ANÁLISE LABORATORIAL ===
📊 Configuração RAG: { ragEnabled: true, companyId: '507f...', isGlobal: false }
🔍 Executando busca RAG para análise laboratorial...
✅ RAG Laboratorial ativado com sucesso!
📋 Metadados RAG: { documentsUsed: 3, searchQueries: [...], evidenceLevel: 'alta' }
📄 Documentos encontrados: [{ fileName: 'AULA 4.md', score: 0.85, category: 'cursos-transcricoes' }]
```

#### **Para Plano de Tratamento:**
```
🎯 === INICIANDO BUSCA RAG PARA PLANO DE TRATAMENTO ===
📊 Configuração RAG: { ragEnabled: true, companyId: '507f...', isGlobal: false }
🔍 Executando busca RAG para plano de tratamento...
✅ RAG Plano de Tratamento ativado com sucesso!
📋 Metadados RAG: { documentsUsed: 5, searchQueries: [...], protocolsFound: 2 }
```

### **2. Testar Busca RAG Manual**

Acesse `/rag` e teste uma busca manual:

1. **Digite uma query**: "vitamina D deficiência tratamento"
2. **Verifique os logs**:
```
🔍 === INICIANDO BUSCA RAG MANUAL ===
📊 Parâmetros de busca: { query: 'vitamina D...', category: null, limit: 5 }
📄 Total de documentos encontrados: 3
📄 Documento 1: { fileName: 'AULA 4.md', score: 0.892, category: 'cursos-transcricoes' }
```

### **3. Verificar se RAG está Habilitado**

#### **Verificar Configuração Global:**
```bash
# No terminal do servidor, procure por:
✅ Configuração global encontrada
🔑 Chaves disponíveis: { openai: true, anthropic: true, google: true }
```

#### **Verificar se Empresa tem RAG:**
- Se você vir `isGlobal: true` nos logs, significa que está usando configuração global
- Se você vir `ragEnabled: false`, o RAG está desabilitado

### **4. Sinais de que RAG NÃO está Funcionando**

❌ **Logs de Problema:**
```
⏭️ RAG desabilitado ou empresa global - pulando busca RAG
❌ RAG falhou para análise laboratorial: [erro]
⚠️ ATENÇÃO: Nenhum documento RAG encontrado para análise laboratorial
```

## 🔧 **Como Habilitar RAG se Estiver Desabilitado**

### **1. Verificar Configuração Global**
Acesse: `http://localhost:3000/settings/global-ai`

Certifique-se que:
- ✅ **OpenAI API Key** está configurada
- ✅ **RAG habilitado** para cada tipo de análise

### **2. Verificar se há Documentos**
Acesse: `http://localhost:3000/rag`

Certifique-se que:
- ✅ Há documentos processados (status: "Processado")
- ✅ Documentos têm chunks criados

## 📊 **Teste Completo de Funcionamento**

### **Passo 1: Upload de Documento**
1. Acesse `/rag`
2. Faça upload de um PDF sobre medicina funcional
3. Aguarde processamento completo
4. Verifique logs de sucesso

### **Passo 2: Teste de Busca**
1. Na mesma página `/rag`, teste busca
2. Digite: "deficiência vitamina D tratamento"
3. Verifique se retorna resultados relevantes

### **Passo 3: Análise com RAG**
1. Acesse `/analyses/treatment-plan`
2. Selecione uma paciente
3. Execute análise
4. **Monitore logs no terminal** para confirmar uso do RAG

### **Passo 4: Verificar Qualidade**
Compare análises:
- **Sem RAG**: Análise genérica
- **Com RAG**: Análise com referências específicas dos documentos

## 🎯 **Indicadores de Sucesso**

### **Logs Positivos:**
- ✅ `RAG [Tipo] ativado com sucesso!`
- ✅ `documentsUsed: [número > 0]`
- ✅ `Tamanho do contexto gerado: [número > 0] caracteres`

### **Qualidade da Análise:**
- ✅ Análise menciona informações específicas dos documentos
- ✅ Referências a protocolos/estudos dos PDFs
- ✅ Recomendações mais detalhadas e específicas

## 🚨 **Troubleshooting**

### **Se RAG não funcionar:**

1. **Verificar chaves API**:
   - OpenAI API Key válida
   - Configuração global salva

2. **Verificar documentos**:
   - Pelo menos 1 documento processado
   - Status "Processado" (não "Erro")

3. **Verificar logs de erro**:
   - Problemas de embedding
   - Problemas de conexão MongoDB
   - Problemas de ObjectId

### **Comandos de Debug:**

```bash
# Verificar documentos no MongoDB
# (se tiver acesso ao MongoDB)
db.ragdocuments.find({}).count()
db.documentchunks.find({}).count()
```

## 📈 **Métricas de Sucesso**

Uma análise **COM RAG** deve ter:
- ⏱️ Tempo de processamento: 15-30 segundos
- 📄 Documentos usados: 3-7 documentos
- 📝 Contexto: 1000-5000 caracteres
- 🎯 Qualidade: Referências específicas aos documentos

## 🎉 **Confirmação Final**

O RAG está funcionando se você vir:

1. ✅ **Logs detalhados** de busca RAG
2. ✅ **Documentos encontrados** com scores > 0.7
3. ✅ **Contexto gerado** com tamanho > 1000 caracteres
4. ✅ **Análises mais específicas** e detalhadas
5. ✅ **Tempo de processamento** adequado (15-30s)

---

**🔍 Próximos Passos:**
1. Execute uma análise de plano de tratamento
2. Monitore os logs no terminal
3. Confirme se vê os logs de RAG detalhados
4. Compare a qualidade da análise com/sem RAG 