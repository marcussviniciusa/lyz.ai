# 🔬 Como Usar o Google Vision na Análise Laboratorial

## **🎯 Fluxo de Uso Prático**

### **1. Acessar a Análise Laboratorial**
```
http://localhost:3000/analyses/laboratory
```

### **2. Selecionar Paciente**
- Escolha a paciente da lista
- Se não houver pacientes, cadastre um primeiro em `/patients/new`

### **3. Upload de Exames**
Formatos suportados:
- **PDF**: Exames escaneados ou nativos
- **PNG/JPG**: Fotos de exames

### **4. Processamento Automático**
O sistema irá:
1. **Validar** os arquivos (tipo e tamanho)
2. **Detectar** se é PDF com texto ou imagem
3. **Processar** via Google Vision (se configurado)
4. **Extrair** texto e dados estruturados
5. **Classificar** o tipo de exame automaticamente

## **📊 Indicadores Visuais**

### **Status de Processamento:**
- 🔍 **Google Vision API**: OCR real ativo
- 📄 **Modo Simulação**: Dados mockados
- ⚠️ **Fallback (Erro)**: Erro + dados simulados

### **Níveis de Confiança:**
- 🟢 **80-100%**: Excelente qualidade OCR
- 🟡 **60-79%**: Boa qualidade
- 🔴 **<60%**: Qualidade baixa

## **🎮 Cenários de Teste**

### **Cenário 1: Google Vision Configurado**
```bash
# Configure as variáveis de ambiente
GOOGLE_CLOUD_PROJECT_ID=seu-projeto
GOOGLE_CLOUD_CLIENT_EMAIL=service-account@projeto.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Resultado esperado:**
- Status: 🔍 Google Vision API
- Confiança: 80-95%
- Texto extraído real dos exames

### **Cenário 2: Google Vision NÃO Configurado**
```bash
# Sem configuração ou variáveis incorretas
```

**Resultado esperado:**
- Status: 📄 Modo Simulação
- Confiança: 50%
- Dados mockados baseados no nome do arquivo

### **Cenário 3: Erro de Processamento**
```bash
# Google Vision configurado mas com erro (quota, permissão, etc.)
```

**Resultado esperado:**
- Status: ⚠️ Fallback (Erro)
- Confiança: 30%
- Dados simulados + log do erro

## **💡 Dicas para Melhores Resultados**

### **📸 Qualidade da Imagem:**
- ✅ **Alta resolução** (mínimo 300 DPI)
- ✅ **Boa iluminação** e contraste
- ✅ **Texto legível** e não borrado
- ✅ **Orientação correta** da imagem

### **📄 PDFs:**
- ✅ **PDFs nativos** (texto selecionável) = melhor resultado
- ✅ **PDFs escaneados** = processados via OCR
- ✅ **Tamanho < 10MB** por arquivo

### **🏷️ Nomenclatura de Arquivos:**
O sistema detecta automaticamente baseado no nome:
- `hemograma.pdf` → Tipo: hemograma
- `tireoide_tsh.jpg` → Tipo: tireoide
- `vitamina_d_b12.png` → Tipo: vitaminas
- `hormonio_estradiol.pdf` → Tipo: hormonal

## **🔧 Troubleshooting**

### **❌ "Modo Simulação" aparecendo sempre**
**Causa**: Google Vision não configurado
**Solução**: 
1. Verifique variáveis de ambiente
2. Consulte `GOOGLE_VISION_SETUP.md`
3. Teste com `node src/scripts/test-vision.js`

### **❌ Erro "Service account not found"**
**Causa**: Credenciais inválidas
**Solução**:
1. Verifique email da service account
2. Confirme se a chave privada está correta
3. Teste no Google Cloud Console

### **❌ Texto extraído está incorreto**
**Causa**: Qualidade da imagem ou PDF
**Solução**:
1. Use imagens de alta qualidade
2. Melhore iluminação/contraste
3. Experimente diferentes formatos

### **❌ "Vision API not enabled"**
**Causa**: API não habilitada no projeto
**Solução**:
```bash
gcloud services enable vision.googleapis.com
```

## **📈 Exemplos de Resposta**

### **Upload Bem-sucedido:**
```json
{
  "success": true,
  "filesProcessed": 2,
  "extractedText": "LABORATÓRIO XYZ\nHEMOGRAMA COMPLETO\nHemácias: 4.2 milhões/mm³...",
  "confidence": 0.92,
  "method": "google_vision",
  "ocrResults": [
    {
      "fileName": "hemograma.pdf",
      "confidence": 0.95,
      "examType": "hemograma",
      "structuredData": {
        "exams": [
          {
            "name": "Hemácias",
            "value": "4.2",
            "unit": "milhões/mm³",
            "reference": "4.0-5.0"
          }
        ]
      }
    }
  ]
}
```

### **Modo Fallback:**
```json
{
  "success": true,
  "filesProcessed": 1,
  "extractedText": "=== EXAME PROCESSADO: exame.pdf ===\nTipo Detectado: geral...",
  "confidence": 0.5,
  "method": "fallback",
  "message": "Arquivos processados com dados simulados (Google Vision não configurado)"
}
```

## **⚡ Próximos Passos**

1. **Configure o Google Vision** seguindo `GOOGLE_VISION_SETUP.md`
2. **Teste com exames reais** da sua clínica
3. **Ajuste os prompts** de IA se necessário
4. **Configure alertas de custo** no Google Cloud
5. **Monitore a qualidade** dos resultados

## **💰 Estimativa de Custos**

### **Uso Típico de uma Clínica:**
- 100 exames/mês × $1.50/1000 = **$0.15/mês**
- 500 exames/mês × $1.50/1000 = **$0.75/mês**
- 1000 exames/mês × $1.50/1000 = **$1.50/mês**

**Primeiras 1.000 requisições/mês são GRATUITAS! 🎉**

---

**🚀 Comece agora mesmo!** O sistema está pronto para processar seus exames laboratoriais com precisão de IA! 