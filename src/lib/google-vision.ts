import { ImageAnnotatorClient } from '@google-cloud/vision'
import { connectToDatabase } from '@/lib/db'
import GlobalAIConfig from '@/models/GlobalAIConfig'

class GoogleVisionService {
  private client: ImageAnnotatorClient
  private initialized: boolean = false

  constructor() {
    // Inicialização será feita de forma assíncrona
    this.client = new ImageAnnotatorClient()
  }

  /**
   * Inicializa o cliente com configurações do banco de dados
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await connectToDatabase()
      const globalConfig = await GlobalAIConfig.findOne()
      
      const config: any = {}

      // Prioridade 1: Configurações do banco de dados
      if (globalConfig?.googleVision?.enabled && 
          globalConfig.googleVision.projectId && 
          globalConfig.googleVision.clientEmail && 
          globalConfig.googleVision.privateKey) {
        
        config.projectId = globalConfig.googleVision.projectId
        config.credentials = {
          client_email: globalConfig.googleVision.clientEmail,
          private_key: globalConfig.googleVision.privateKey.replace(/\\n/g, '\n')
        }
      } 
      // Prioridade 2: Variáveis de ambiente (fallback)
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        config.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS
      } else if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_PRIVATE_KEY && process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
        config.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
        config.credentials = {
          client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n')
        }
      }

      this.client = new ImageAnnotatorClient(config)
      this.initialized = true
    } catch (error) {
      console.error('Erro ao inicializar Google Vision:', error)
      this.initialized = false
    }
  }

  /**
   * Extrai texto de uma imagem usando OCR
   */
  async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    try {
      await this.initialize()
      
      const [result] = await this.client.textDetection({
        image: {
          content: imageBuffer
        }
      })

      const detections = result.textAnnotations
      if (!detections || detections.length === 0) {
        return ''
      }

      // O primeiro elemento contém todo o texto detectado
      return detections[0].description || ''
    } catch (error) {
      console.error('Erro ao extrair texto da imagem:', error)
      throw new Error('Falha na extração de texto da imagem')
    }
  }

  /**
   * Extrai texto de múltiplas imagens
   */
  async extractTextFromImages(imageBuffers: Buffer[]): Promise<string[]> {
    try {
      const promises = imageBuffers.map(buffer => this.extractTextFromImage(buffer))
      return await Promise.all(promises)
    } catch (error) {
      console.error('Erro ao extrair texto de múltiplas imagens:', error)
      throw new Error('Falha na extração de texto das imagens')
    }
  }

  /**
   * Detecta e extrai texto de documentos (melhor para PDFs convertidos em imagem)
   */
  async extractTextFromDocument(imageBuffer: Buffer): Promise<{
    text: string
    confidence: number
    pages: any[]
  }> {
    try {
      await this.initialize()
      
      const [result] = await this.client.documentTextDetection({
        image: {
          content: imageBuffer
        }
      })

      const fullText = result.fullTextAnnotation
      if (!fullText) {
        return {
          text: '',
          confidence: 0,
          pages: []
        }
      }

      return {
        text: fullText.text || '',
        confidence: this.calculateAverageConfidence(fullText),
        pages: fullText.pages || []
      }
    } catch (error) {
      console.error('Erro ao extrair texto do documento:', error)
      throw new Error('Falha na extração de texto do documento')
    }
  }

  /**
   * Processa exame laboratorial com inteligência contextual
   */
  async processLabExam(imageBuffer: Buffer): Promise<{
    rawText: string
    structuredData: any
    confidence: number
    examType: string
  }> {
    try {
      // Primeiro, extrai o texto usando detecção de documento para melhor precisão
      const documentResult = await this.extractTextFromDocument(imageBuffer)
      
      if (!documentResult.text) {
        // Fallback para detecção simples de texto
        const simpleText = await this.extractTextFromImage(imageBuffer)
        return {
          rawText: simpleText,
          structuredData: this.parseLabData(simpleText),
          confidence: 0.5,
          examType: this.detectExamType(simpleText)
        }
      }

      return {
        rawText: documentResult.text,
        structuredData: this.parseLabData(documentResult.text),
        confidence: documentResult.confidence,
        examType: this.detectExamType(documentResult.text)
      }
    } catch (error) {
      console.error('Erro ao processar exame laboratorial:', error)
      throw new Error('Falha no processamento do exame')
    }
  }

  /**
   * Calcula confiança média baseada nas detecções
   */
  private calculateAverageConfidence(fullText: any): number {
    if (!fullText.pages || fullText.pages.length === 0) return 0

    let totalConfidence = 0
    let wordCount = 0

    fullText.pages.forEach((page: any) => {
      page.blocks?.forEach((block: any) => {
        block.paragraphs?.forEach((paragraph: any) => {
          paragraph.words?.forEach((word: any) => {
            if (word.confidence !== undefined) {
              totalConfidence += word.confidence
              wordCount++
            }
          })
        })
      })
    })

    return wordCount > 0 ? totalConfidence / wordCount : 0
  }

  /**
   * Detecta o tipo de exame baseado no conteúdo
   */
  private detectExamType(text: string): string {
    const textLower = text.toLowerCase()
    
    if (textLower.includes('hemograma') || textLower.includes('hemacias') || textLower.includes('leucocitos')) {
      return 'hemograma'
    }
    if (textLower.includes('tsh') || textLower.includes('tireoide') || textLower.includes('t3') || textLower.includes('t4')) {
      return 'tireoide'
    }
    if (textLower.includes('glicose') || textLower.includes('insulina') || textLower.includes('hba1c')) {
      return 'bioquimica'
    }
    if (textLower.includes('colesterol') || textLower.includes('triglicerides') || textLower.includes('hdl')) {
      return 'lipidograma'
    }
    if (textLower.includes('vitamina') || textLower.includes('b12') || textLower.includes('acido folico')) {
      return 'vitaminas'
    }
    if (textLower.includes('estradiol') || textLower.includes('progesterona') || textLower.includes('testosterona')) {
      return 'hormonal'
    }
    if (textLower.includes('urina') || textLower.includes('urocultura')) {
      return 'urina'
    }
    
    return 'outros'
  }

  /**
   * Faz parsing básico dos dados laboratoriais
   */
  private parseLabData(text: string): any {
    const results: any = {
      exams: [],
      metadata: {
        laboratoryName: '',
        patientName: '',
        examDate: '',
        doctorName: ''
      }
    }

    const lines = text.split('\n')
    
    // Patterns comuns em exames
    const valuePattern = /([A-Za-zÀ-ÿ\s\-\(\)]+):\s*([0-9.,]+)\s*([A-Za-z\/\%µμ]*)\s*(?:\(([^)]+)\))?/g
    const referencePattern = /VR?\s*[:\-]?\s*([0-9.,\-\s<>]+)/i
    
    lines.forEach(line => {
      const trimmedLine = line.trim()
      
      // Extrair nome do laboratório
      if (trimmedLine.match(/laborat[óo]rio|lab\s/i) && !results.metadata.laboratoryName) {
        results.metadata.laboratoryName = trimmedLine
      }
      
      // Extrair data
      if (trimmedLine.match(/\d{2}\/\d{2}\/\d{4}/) && !results.metadata.examDate) {
        const dateMatch = trimmedLine.match(/\d{2}\/\d{2}\/\d{4}/)
        if (dateMatch) {
          results.metadata.examDate = dateMatch[0]
        }
      }
      
      // Extrair valores de exames
      let match
      while ((match = valuePattern.exec(trimmedLine)) !== null) {
        const [, name, value, unit, reference] = match
        
        results.exams.push({
          name: name.trim(),
          value: value.trim(),
          unit: unit?.trim() || '',
          reference: reference?.trim() || ''
        })
      }
    })

    return results
  }

  /**
   * Verifica se o serviço está configurado corretamente
   */
  async isConfigured(): Promise<boolean> {
    try {
      await connectToDatabase()
      const globalConfig = await GlobalAIConfig.findOne()
      
      // Verifica se está configurado no banco de dados
      const dbConfigured = !!(
        globalConfig?.googleVision?.enabled && 
        globalConfig.googleVision.projectId && 
        globalConfig.googleVision.clientEmail && 
        globalConfig.googleVision.privateKey
      )
      
      // Verifica se está configurado via variáveis de ambiente
      const envConfigured = !!(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        (process.env.GOOGLE_CLOUD_PROJECT_ID && 
         process.env.GOOGLE_CLOUD_PRIVATE_KEY && 
         process.env.GOOGLE_CLOUD_CLIENT_EMAIL)
      )
      
      return dbConfigured || envConfigured
    } catch (error) {
      console.error('Erro ao verificar configuração Google Vision:', error)
      return false
    }
  }
}

// Singleton instance
let visionService: GoogleVisionService | null = null

export function getGoogleVisionService(): GoogleVisionService {
  if (!visionService) {
    visionService = new GoogleVisionService()
  }
  return visionService
}

export default GoogleVisionService 