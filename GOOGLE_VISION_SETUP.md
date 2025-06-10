# 🔍 Configuração do Google Vision API

Este guia explica como configurar o Google Vision API para processamento OCR de exames laboratoriais.

## **⚙️ NOVA CONFIGURAÇÃO PELA INTERFACE (RECOMENDADO)**

A partir de agora, você pode configurar o Google Vision diretamente na interface web!

### **Como configurar:**
1. Acesse `/settings/global-ai` no sistema
2. Vá na aba **"🔑 API Keys"**
3. Encontre a seção **"Google Vision OCR"**
4. Ative o switch e preencha os dados

### **Vantagens:**
- ✅ **Mais fácil** - sem editar arquivos `.env`
- ✅ **Centralizada** - junto com outras configurações de IA
- ✅ **Switch on/off** - habilitar/desabilitar facilmente
- ✅ **Validação** - feedback visual imediato

## **📋 Pré-requisitos**

1. Conta no Google Cloud Platform (GCP)
2. Projeto criado no GCP
3. Billing habilitado no projeto

## **🚀 Configuração Passo a Passo**

### **1. Habilitar a Vision API**

```bash
# Via gcloud CLI
gcloud services enable vision.googleapis.com

# Ou acesse: https://console.cloud.google.com/apis/library/vision.googleapis.com
```

### **2. Criar Service Account**

1. Acesse: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Clique em "Criar conta de serviço"
3. Nome: `lyz-ai-vision`
4. Descrição: `Service account para OCR de exames laboratoriais`
5. Clique em "Criar e continuar"

### **3. Atribuir Permissões**

Adicione as seguintes roles à service account:
- `Cloud Vision AI Service Agent`
- `Viewer` (opcional, para logs)

### **4. Gerar Chave de Acesso**

1. Na página da service account criada, vá em "Chaves"
2. Clique em "Adicionar chave" → "Criar nova chave"
3. Escolha formato JSON
4. Baixe o arquivo JSON

## **⚙️ Configuração no Projeto**

### **Opção 1: Arquivo de Credenciais (Desenvolvimento Local)**

1. Salve o arquivo JSON baixado em local seguro (ex: `./config/google-vision-key.json`)
2. Configure a variável de ambiente:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-vision-key.json
```

### **Opção 2: Credenciais Diretas (Produção/Vercel)**

Extraia as informações do arquivo JSON e configure:

```bash
GOOGLE_CLOUD_PROJECT_ID=seu-project-id
GOOGLE_CLOUD_CLIENT_EMAIL=lyz-ai-vision@seu-project.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_AQUI\n-----END PRIVATE KEY-----"
```

## **🧪 Testar a Configuração**

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Acesse a análise laboratorial: http://localhost:3000/analyses/laboratory

3. Faça upload de um exame em PDF/imagem

4. Verifique os logs para confirmar que o Google Vision está sendo usado:
```
Processando OCR para: exame.pdf
Método: 🔍 Google Vision API
Confiança: 85.2%
```

## **📊 Monitoramento de Custos**

### **Preços (referência, consulte documentação oficial):**
- **OCR Text Detection**: $1.50 por 1.000 imagens
- **Document Text Detection**: $1.50 por 1.000 imagens
- **Primeiras 1.000 unidades/mês**: GRATUITAS

### **Limites Recomendados:**
1. Configure alertas de billing no GCP
2. Defina quotas de API se necessário
3. Monitore uso mensal

## **🔒 Segurança**

### **Boas Práticas:**
1. **Nunca** commite arquivos de credenciais no Git
2. Use `.gitignore` para excluir arquivos de chave
3. Rotacione chaves periodicamente
4. Use princípio de menor privilégio
5. Configure IAM adequadamente

### **Variáveis de Ambiente Seguras:**
```bash
# .env.local (nunca commitar)
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/to/key.json

# Para produção, use credenciais diretas
GOOGLE_CLOUD_PROJECT_ID=...
GOOGLE_CLOUD_CLIENT_EMAIL=...
GOOGLE_CLOUD_PRIVATE_KEY=...
```

## **🛠️ Troubleshooting**

### **Erro: "Service account not found"**
- Verifique se a service account foi criada corretamente
- Confirme o email da service account

### **Erro: "Vision API not enabled"**
- Execute: `gcloud services enable vision.googleapis.com`
- Ou habilite via console web

### **Erro: "Insufficient permissions"**
- Verifique as roles atribuídas à service account
- Confirme que o billing está habilitado

### **Modo Fallback Ativo**
Se você ver "📄 Modo Simulação":
- O Google Vision não está configurado
- Verifique as variáveis de ambiente
- Teste a conexão com a API

## **📈 Monitoramento**

### **Logs do Sistema:**
```bash
# Logs de processamento
console.log('Processando OCR para:', fileName)
console.log('Confiança:', confidence)
console.log('Tipo detectado:', examType)
```

### **Dashboard do GCP:**
- Cloud Vision API usage
- Error rates
- Latency metrics
- Billing dashboard

## **🔄 Fallback e Recuperação**

O sistema implementa fallback automático:
1. **Google Vision disponível**: OCR real com alta precisão
2. **Google Vision indisponível**: Dados simulados para desenvolvimento
3. **Erro no processamento**: Fallback graceful com dados mock

## **📝 Exemplo de Resposta**

```json
{
  "success": true,
  "filesProcessed": 2,
  "extractedText": "HEMOGRAMA COMPLETO\nHemácias: 4.2 milhões/mm³...",
  "confidence": 0.87,
  "method": "google_vision",
  "ocrResults": [
    {
      "fileName": "hemograma.pdf",
      "confidence": 0.92,
      "examType": "hemograma",
      "structuredData": {...}
    }
  ]
}
```

## **🆘 Suporte**

- **Documentação oficial**: https://cloud.google.com/vision/docs
- **Pricing**: https://cloud.google.com/vision/pricing
- **Status da API**: https://status.cloud.google.com/

---

**💡 Dica**: Comece sempre com a conta gratuita para testar. As primeiras 1.000 requisições mensais são gratuitas! 