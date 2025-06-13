import jsPDF from 'jspdf'

// Função para formatar tipo de análise
function formatAnalysisType(type: string): string {
  const types: Record<string, string> = {
    laboratory: 'Análise Laboratorial',
    tcm: 'Medicina Tradicional Chinesa',
    chronology: 'Cronologia de Saúde',
    ifm: 'Matriz de Medicina Funcional',
    treatment: 'Plano de Tratamento',
    treatmentPlan: 'Plano de Tratamento'
  }
  return types[type] || type
}

// Função para limpar texto de caracteres problemáticos
function cleanTextForPDF(text: string): string {
  if (!text) return ''
  
  return text
    // Remover emojis e caracteres especiais problemáticos
    .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '')
    .replace(/[\u2600-\u27BF]/g, '')
    // Remover outros caracteres problemáticos
    .replace(/[^\x00-\x7F\u00C0-\u017F\u0100-\u024F]/g, '')
    // Normalizar espaços
    .replace(/\s+/g, ' ')
    .trim()
}

// Função para extrair conteúdo da análise usando rawOutput
function extractAnalysisContent(analysis: any): string {
  try {
    // Usar sempre o rawOutput que é o conteúdo exato gerado pela IA
    if (analysis.result?.rawOutput) {
      return analysis.result.rawOutput
    }
    
    // Fallback para estruturas antigas
    if (!analysis.result) return 'Resultado não disponível'
    
    // Tentar extrair o conteúdo principal baseado no tipo
    switch (analysis.type) {
      case 'laboratory':
        return analysis.result.laboratoryAnalysis?.interpretation || 
               analysis.result.interpretation || 
               'Análise laboratorial em processamento'
      
      case 'tcm':
        return analysis.result.tcmAnalysis?.energeticDiagnosis || 
               analysis.result.energeticDiagnosis ||
               'Diagnóstico energético em processamento'
      
      case 'chronology':
        return analysis.result.chronologyAnalysis?.timeline || 
               analysis.result.timeline ||
               'Cronologia de saúde em processamento'
      
      case 'ifm':
        return analysis.result.ifmAnalysis?.systemicAssessment || 
               analysis.result.systemicAssessment ||
               'Avaliação sistêmica em processamento'
      
      case 'treatment':
      case 'treatmentPlan':
        return analysis.result.treatmentPlan?.executiveSummary || 
               analysis.result.executiveSummary ||
               'Plano de tratamento em processamento'
      
      default:
        // Fallback: tentar extrair qualquer texto disponível
        const resultStr = JSON.stringify(analysis.result, null, 2)
        return resultStr.length > 50 ? 
          resultStr.substring(0, 500) + '...' : 
          'Conteúdo da análise não disponível'
    }
  } catch {
    return 'Erro ao processar conteúdo da análise'
  }
}

// Interface para elementos processados
interface ProcessedElement {
  type: 'header' | 'paragraph' | 'list' | 'bold' | 'spacing'
  content: string
  level?: number
  indent?: number
}

// Função para processar markdown e retornar elementos estruturados
function processMarkdownForPDF(content: string): Array<{
  type: 'header' | 'bold' | 'list' | 'paragraph'
  content: string
  level?: number
}> {
  const elements: Array<{
    type: 'header' | 'bold' | 'list' | 'paragraph'
    content: string
    level?: number
  }> = []
  
  // Validação robusta do conteúdo
  if (!content || typeof content !== 'string') {
    console.warn('processMarkdownForPDF: conteúdo inválido recebido:', typeof content, content)
    return elements
  }
  
  // Normalizar texto
  const normalizedText = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
  
  if (!normalizedText) {
    return elements
  }
  
  // Processar cada linha do conteúdo
  const lines = normalizedText.split('\n')
  let currentParagraph = ''
  let inList = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Pular linhas vazias, mas usar para finalizar parágrafos
    if (!line) {
      if (currentParagraph.trim()) {
        elements.push({
          type: 'paragraph',
          content: cleanTextForPDF(currentParagraph.trim())
        })
        currentParagraph = ''
      }
      inList = false
      continue
    }
    
    // Detectar headers (títulos numerados ou em maiúsculas)
    const headerMatch = line.match(/^(#{1,6})\s*(.+)$/) // Detecta ### ou #### no início
    const numberedHeaderMatch = line.match(/^(\d+\.?\d*\.?\s*)(.+)$/)
    const uppercaseHeaderMatch = line.match(/^([A-ZÁÊÇÕ][A-ZÁÊÇÕ\s]{8,})$/)
    
    if (headerMatch || (numberedHeaderMatch && /[A-ZÁÊÇÕ]/.test(numberedHeaderMatch[2])) || uppercaseHeaderMatch) {
      // Finalizar parágrafo anterior
      if (currentParagraph.trim()) {
        elements.push({
          type: 'paragraph',
          content: cleanTextForPDF(currentParagraph.trim())
        })
        currentParagraph = ''
      }
      
      // Determinar nível do header e conteúdo limpo
      let level = 1
      let headerContent = line
      
      if (headerMatch) {
        level = headerMatch[1].length
        headerContent = headerMatch[2].trim()
      } else if (numberedHeaderMatch) {
        // Determinar nível baseado na numeração
        const numbering = numberedHeaderMatch[1]
        if (numbering.includes('.') && numbering.split('.').length > 2) {
          level = 3
        } else if (numbering.includes('.')) {
          level = 2
        } else {
          level = 1
        }
        headerContent = `${numberedHeaderMatch[1]}${numberedHeaderMatch[2]}`
      } else if (uppercaseHeaderMatch) {
        level = 1
        headerContent = uppercaseHeaderMatch[1]
      }
      
      elements.push({
        type: 'header',
        level: Math.min(level, 3), // Limitar a 3 níveis
        content: cleanTextForPDF(headerContent)
      })
      
      inList = false
      continue
    }
    
    // Detectar itens de lista
    const listMatch = line.match(/^(\s*)([-•*]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      // Finalizar parágrafo anterior se não estiver em lista
      if (currentParagraph.trim() && !inList) {
        elements.push({
          type: 'paragraph',
          content: cleanTextForPDF(currentParagraph.trim())
        })
        currentParagraph = ''
      }
      
      elements.push({
        type: 'list',
        content: cleanTextForPDF(listMatch[3])
      })
      
      inList = true
      continue
    }
    
    // Detectar texto em negrito (palavras em maiúsculas ou entre **)
    const boldMatch = line.match(/^\*\*(.+)\*\*$/)
    const isUppercaseText = line.length < 100 && /^[A-ZÁÊÇÕ][A-Za-záêçõ\s:]+:?\s*$/.test(line)
    
    if (boldMatch || isUppercaseText) {
      // Finalizar parágrafo anterior
      if (currentParagraph.trim()) {
        elements.push({
          type: 'paragraph',
          content: cleanTextForPDF(currentParagraph.trim())
        })
        currentParagraph = ''
      }
      
      elements.push({
        type: 'bold',
        content: cleanTextForPDF(boldMatch ? boldMatch[1] : line)
      })
      
      inList = false
      continue
    }
    
    // Texto normal - adicionar ao parágrafo atual
    if (inList) {
      // Se estava em lista, finalizar e começar novo parágrafo
      inList = false
    }
    
    // Verificar se a linha atual deve ser continuação da anterior
    const shouldContinue = currentParagraph && 
                          !line.match(/^[A-ZÁÊÇÕ]/) && // Não começa com maiúscula (novo tópico)
                          !line.match(/^\d+\./) && // Não é item numerado
                          line.length > 20 // Linha tem conteúdo substancial
    
    if (shouldContinue) {
      currentParagraph += ' ' + line
    } else {
      // Finalizar parágrafo anterior se existir
      if (currentParagraph.trim()) {
        elements.push({
          type: 'paragraph',
          content: cleanTextForPDF(currentParagraph.trim())
        })
      }
      currentParagraph = line
    }
  }
  
  // Finalizar último parágrafo se existir
  if (currentParagraph.trim()) {
    elements.push({
      type: 'paragraph',
      content: cleanTextForPDF(currentParagraph.trim())
    })
  }
  
  return elements
}

// Função para quebrar texto em linhas respeitando largura
function splitTextToLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  if (!text) return []
  return doc.splitTextToSize(text, maxWidth)
}

// Função principal para gerar PDF com formatação robusta
export async function generateIntegratedPlanPDF(
  patient: any,
  analyses: any[],
  professional: any
): Promise<Uint8Array> {
  const doc = new jsPDF()
  
  // Configurações de página
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 30 // Margem fixa de 30px
  const maxWidth = pageWidth - (margin * 2)
  
  // Cores padronizadas
  const colors = {
    primary: [41, 128, 185] as [number, number, number], // Azul
    text: [44, 62, 80] as [number, number, number],      // Cinza escuro
    light: [149, 165, 166] as [number, number, number]   // Cinza claro
  }
  
  let yPosition = 50
  
  // Função para adicionar header da página
  function addPageHeader() {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...colors.light)
    doc.text('Lyz.ai - Sistema de Análises Médicas', margin, 20)
  }
  
  // Função para adicionar footer
  function addFooter() {
    const pageNumber = (doc as any).internal.getNumberOfPages()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...colors.light)
    
    const pageText = `Página ${pageNumber}`
    const dateText = `Gerado em ${new Date().toLocaleDateString('pt-BR')}`
    
    // Centralizar página e data no footer
    const pageTextWidth = doc.getTextWidth(pageText)
    const dateTextWidth = doc.getTextWidth(dateText)
    
    doc.text(pageText, (pageWidth - pageTextWidth) / 2, pageHeight - 10)
    doc.text(dateText, pageWidth - margin - dateTextWidth, pageHeight - 10)
  }
  
  // Função para verificar quebra de página
  function checkPageBreak(requiredSpace: number) {
    if (yPosition + requiredSpace > pageHeight - 40) {
      doc.addPage()
      yPosition = 50
      addPageHeader()
      addFooter()
    }
  }
  
  // Adicionar header e footer da primeira página
  addPageHeader()
  addFooter()
  
  // Título principal
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...colors.primary)
  doc.text(`Plano Integrado - ${patient.name}`, margin, yPosition)
  yPosition += 20
  
  // Subtítulo
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...colors.text)
  doc.text('Plano integrado baseado em análises multidisciplinares', margin, yPosition)
  yPosition += 30
  
  // Informações da paciente
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...colors.primary)
  doc.text('INFORMAÇÕES DA PACIENTE', margin, yPosition)
  yPosition += 15
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...colors.text)
  doc.text(`Nome: ${patient.name}`, margin, yPosition)
  yPosition += 12
  doc.text(`Email: ${patient.email || 'Não informado'}`, margin, yPosition)
  yPosition += 20
  
  // Informações do profissional
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...colors.primary)
  doc.text('PROFISSIONAL RESPONSÁVEL', margin, yPosition)
  yPosition += 15
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...colors.text)
  doc.text(`Nome: ${professional.name}`, margin, yPosition)
  yPosition += 12
  doc.text(`Email: ${professional.email}`, margin, yPosition)
  yPosition += 30
  
  // Processar cada análise
  analyses.forEach((analysis, index) => {
    console.log(`🔍 Processando análise ${index + 1}:`, {
      type: analysis.type,
      hasResult: !!analysis.result,
      resultKeys: analysis.result ? Object.keys(analysis.result) : [],
      resultType: typeof analysis.result
    })
    
    if (!analysis.result) {
      console.warn(`⚠️ Análise ${analysis.type} sem resultado`)
      return
    }
    
    // Extrair conteúdo baseado no tipo de análise
    let content = ''
    let analysisTitle = ''
    
    switch (analysis.type) {
      case 'laboratory':
        analysisTitle = 'Análise Laboratorial'
        content = analysis.result.laboratoryAnalysis?.fullAnalysis || 
                 analysis.result.laboratoryAnalysis?.interpretation ||
                 analysis.result.laboratoryAnalysis ||
                 analysis.result.analysis ||
                 ''
        break
        
      case 'tcm':
        analysisTitle = 'Medicina Tradicional Chinesa'
        content = analysis.result.tcmAnalysis?.fullAnalysis ||
                 analysis.result.tcmAnalysis?.energeticDiagnosis ||
                 analysis.result.tcmAnalysis ||
                 analysis.result.analysis ||
                 ''
        break
        
      case 'chronology':
        analysisTitle = 'Cronologia de Saúde'
        content = analysis.result.chronologyAnalysis?.fullAnalysis ||
                 analysis.result.chronologyAnalysis?.timeline ||
                 analysis.result.chronologyAnalysis ||
                 analysis.result.analysis ||
                 ''
        break
        
      case 'ifm':
        analysisTitle = 'Matriz de Medicina Funcional'
        content = analysis.result.ifmAnalysis?.fullAnalysis ||
                 analysis.result.ifmAnalysis?.systemicAssessment ||
                 analysis.result.ifmAnalysis ||
                 analysis.result.analysis ||
                 ''
        break
        
      case 'treatment':
      case 'treatmentPlan':
        analysisTitle = 'Plano de Tratamento'
        content = analysis.result.treatmentPlan?.fullAnalysis ||
                 analysis.result.treatmentPlan?.executiveSummary ||
                 analysis.result.treatmentPlan ||
                 analysis.result.analysis ||
                 ''
        break
        
      default:
        analysisTitle = formatAnalysisType(analysis.type)
        content = analysis.result.analysis || analysis.result || ''
    }
    
    // Garantir que content seja sempre uma string válida
    if (typeof content !== 'string') {
      if (content && typeof content === 'object') {
        // Se for um objeto, tentar extrair propriedades relevantes ou converter para JSON
        content = content.fullAnalysis || 
                 content.analysis || 
                 content.interpretation ||
                 content.timeline ||
                 content.systemicAssessment ||
                 content.energeticDiagnosis ||
                 content.executiveSummary ||
                 JSON.stringify(content, null, 2)
      } else {
        content = String(content || '')
      }
    }
    
    console.log(`📝 Conteúdo extraído para ${analysis.type}:`, {
      title: analysisTitle,
      contentType: typeof content,
      contentLength: content ? String(content).length : 0,
      contentPreview: content ? String(content).substring(0, 100) + '...' : 'VAZIO'
    })
    
    // Adicionar título da análise
    yPosition += 15
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...colors.primary)
    
    const titleLines = doc.splitTextToSize(`${index + 1}. ${analysisTitle}`, maxWidth)
    titleLines.forEach((line: string) => {
      if (yPosition > pageHeight - 50) {
        doc.addPage()
        yPosition = 50
        addPageHeader()
        addFooter()
      }
      doc.text(line, margin, yPosition)
      yPosition += 8
    })
    
    // Adicionar data da análise
    yPosition += 5
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...colors.light)
    
    const analysisDate = analysis.createdAt ? 
      `Realizada em: ${new Date(analysis.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}` : 
      'Data não disponível'
    
    doc.text(analysisDate, margin, yPosition)
    yPosition += 10
    
    // Processar e renderizar conteúdo
    const elements = processMarkdownForPDF(content)
    console.log(`🔧 Elementos processados para ${analysis.type}:`, elements.length)
    
    elements.forEach((element) => {
      switch (element.type) {
        case 'header':
          checkPageBreak(25)
          yPosition += 8 // Espaço antes do header
          
          // Tamanho da fonte baseado no nível
          let fontSize = 11
          if (element.level === 1) fontSize = 11
          else if (element.level === 2) fontSize = 10
          else if (element.level === 3) fontSize = 10
          
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(fontSize)
          doc.setTextColor(...colors.primary)
          
          // Quebrar texto se necessário
          const headerLines = doc.splitTextToSize(element.content, maxWidth)
          headerLines.forEach((line: string) => {
            checkPageBreak(15)
            doc.text(line, margin, yPosition)
            yPosition += fontSize + 2
          })
          
          yPosition += 4 // Espaço após header
          break
          
        case 'bold':
          checkPageBreak(15)
          yPosition += 2
          
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(...colors.text)
          
          const boldLines = doc.splitTextToSize(element.content, maxWidth)
          boldLines.forEach((line: string) => {
            checkPageBreak(12)
            doc.text(line, margin, yPosition)
            yPosition += 12
          })
          
          yPosition += 2
          break
          
        case 'list':
          checkPageBreak(15)
          
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.setTextColor(...colors.primary)
          
          // Bullet point
          doc.text('•', margin + 15, yPosition)
          
          doc.setTextColor(...colors.text)
          
          // Texto da lista com indentação fixa
          const listLines = doc.splitTextToSize(element.content, maxWidth - 30)
          listLines.forEach((line: string, lineIndex: number) => {
            checkPageBreak(12)
            doc.text(line, margin + 25, yPosition)
            if (lineIndex < listLines.length - 1) {
              yPosition += 12
            }
          })
          
          yPosition += 14 // Espaço após item da lista
          break
          
        case 'paragraph':
          checkPageBreak(20)
          
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.setTextColor(...colors.text)
          
          // Quebrar texto em linhas
          const paragraphLines = doc.splitTextToSize(element.content, maxWidth)
          paragraphLines.forEach((line: string) => {
            checkPageBreak(12)
            doc.text(line, margin, yPosition)
            yPosition += 12
          })
          
          yPosition += 8 // Espaço após parágrafo
          break
      }
    })
    
    yPosition += 15 // Espaço entre análises
  })
  
  return doc.output('arraybuffer') as Uint8Array
} 