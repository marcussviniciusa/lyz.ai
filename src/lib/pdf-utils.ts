/**
 * Processador de PDFs para extração de texto
 * Usa pdf-parse para extrair texto diretamente quando possível
 */
export class PDFProcessor {
  /**
   * Extrai texto de um PDF usando pdf-parse como fallback
   */
  static async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      // Importar pdf-parse dinamicamente para evitar problemas de SSR
      const pdfParse = await import('pdf-parse')
      const data = await pdfParse.default(pdfBuffer)
      return data.text
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error)
      throw new Error('Falha na extração de texto do PDF')
    }
  }

  /**
   * Verifica se um arquivo é um PDF
   */
  static isPDF(file: File): boolean {
    return file.type === 'application/pdf'
  }

  /**
   * Verifica se um buffer é um PDF
   */
  static isPDFBuffer(buffer: Buffer): boolean {
    // Verifica a assinatura do PDF (%PDF-)
    const signature = buffer.slice(0, 5).toString()
    return signature === '%PDF-'
  }

  /**
   * Converte um File em Buffer
   */
  static async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Detecta se o conteúdo é texto puro ou precisa de OCR
   */
  static async hasExtractableText(pdfBuffer: Buffer): Promise<boolean> {
    try {
      const text = await this.extractTextFromPDF(pdfBuffer)
      // Se conseguir extrair texto e tiver conteúdo significativo, não precisa de OCR
      const significantText = text.trim().replace(/\s+/g, ' ')
      return significantText.length > 50 // Pelo menos 50 caracteres
    } catch (error) {
      return false
    }
  }

  /**
   * Processa um PDF: extrai texto ou prepara para OCR
   */
  static async processPDF(pdfBuffer: Buffer): Promise<{
    text: string
    needsOCR: boolean
    error?: string
  }> {
    try {
      // Primeiro tenta extrair texto diretamente
      const hasText = await this.hasExtractableText(pdfBuffer)
      
      if (hasText) {
        const text = await this.extractTextFromPDF(pdfBuffer)
        return {
          text,
          needsOCR: false
        }
      } else {
        // PDF é provavelmente uma imagem escaneada, precisa de OCR
        return {
          text: '',
          needsOCR: true
        }
      }
    } catch (error: any) {
      console.error('Erro ao processar PDF:', error)
      return {
        text: '',
        needsOCR: true,
        error: error.message
      }
    }
  }
}

/**
 * Utilitários para validação de arquivos
 */
export class FileValidator {
  static readonly ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png'
  ]

  static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  static validateFile(file: File): { isValid: boolean; error?: string } {
    // Verificar tipo
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `Tipo de arquivo não suportado: ${file.type}. Aceitos: PDF, JPG, PNG`
      }
    }

    // Verificar tamanho
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `Arquivo muito grande: ${Math.round(file.size / 1024 / 1024)}MB. Máximo: 10MB`
      }
    }

    return { isValid: true }
  }

  static validateFiles(files: File[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (files.length === 0) {
      errors.push('Nenhum arquivo selecionado')
    }

    if (files.length > 5) {
      errors.push('Máximo de 5 arquivos permitidos')
    }

    files.forEach((file, index) => {
      const validation = this.validateFile(file)
      if (!validation.isValid) {
        errors.push(`Arquivo ${index + 1}: ${validation.error}`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Processador de arquivos para exames laboratoriais
 */
export class ExamFileProcessor {
  /**
   * Processa múltiplos arquivos e prepara para OCR/extração
   */
  static async processFiles(files: File[]): Promise<{
    processedFiles: Array<{
      name: string
      type: string
      buffer: Buffer
      text?: string
      needsOCR: boolean
    }>
    errors: string[]
  }> {
    const processedFiles: any[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        const buffer = await PDFProcessor.fileToBuffer(file)
        
        if (PDFProcessor.isPDF(file)) {
          // Processar PDF
          const pdfResult = await PDFProcessor.processPDF(buffer)
          
          processedFiles.push({
            name: file.name,
            type: file.type,
            buffer,
            text: pdfResult.text,
            needsOCR: pdfResult.needsOCR
          })

          if (pdfResult.error) {
            errors.push(`${file.name}: ${pdfResult.error}`)
          }
        } else {
          // Arquivo de imagem - sempre precisa de OCR
          processedFiles.push({
            name: file.name,
            type: file.type,
            buffer,
            needsOCR: true
          })
        }
      } catch (error: any) {
        errors.push(`${file.name}: ${error.message}`)
      }
    }

    return {
      processedFiles,
      errors
    }
  }
} 