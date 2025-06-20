import { Client } from 'minio'
import crypto from 'crypto'

let minioClient: Client | null = null

function getMinioClient(): Client {
  if (!minioClient) {
    if (!process.env.MINIO_ENDPOINT) {
      throw new Error('MINIO_ENDPOINT não configurado')
    }
    
    minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: parseInt(process.env.MINIO_PORT!) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    })
  }
  return minioClient
}

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'lyz-ai-files'

// Inicializar bucket se não existir
async function ensureBucketExists() {
  try {
    const client = getMinioClient()
    const exists = await client.bucketExists(BUCKET_NAME)
    if (!exists) {
      await client.makeBucket(BUCKET_NAME, 'us-east-1')
      console.log(`Bucket ${BUCKET_NAME} criado com sucesso`)
    }
  } catch (error) {
    console.error('Erro ao verificar/criar bucket:', error)
  }
}

export interface UploadResult {
  key: string
  url: string
  size: number
}

export interface UploadOptions {
  folder?: string
  filename?: string
  contentType?: string
}

export class MinIOService {
  /**
   * Upload de arquivo para MinIO
   */
  static async uploadFile(
    buffer: Buffer, 
    originalName: string, 
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const { folder = 'uploads', filename, contentType } = options
    
    // Gerar nome único do arquivo
    const extension = originalName.split('.').pop()
    const uniqueName = filename || `${crypto.randomUUID()}.${extension}`
    const key = `${folder}/${uniqueName}`
    
    try {
      // Upload do arquivo
      const client = getMinioClient()
      await client.putObject(
        BUCKET_NAME, 
        key, 
        buffer, 
        buffer.length,
        contentType ? { 'Content-Type': contentType } : undefined
      )
      
      // Gerar URL de acesso
      const url = await this.getFileUrl(key)
      
      return {
        key,
        url,
        size: buffer.length
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      throw new Error('Falha no upload do arquivo')
    }
  }
  
  /**
   * Obter URL assinada para acesso ao arquivo
   */
  static async getFileUrl(key: string, expiry: number = 24 * 60 * 60): Promise<string> {
    try {
      const client = getMinioClient()
      return await client.presignedGetObject(BUCKET_NAME, key, expiry)
    } catch (error) {
      console.error('Erro ao gerar URL:', error)
      throw new Error('Falha ao gerar URL do arquivo')
    }
  }
  
  /**
   * Obter conteúdo do arquivo como buffer
   */
  static async getFileBuffer(key: string): Promise<Buffer> {
    try {
      const client = getMinioClient()
      const stream = await client.getObject(BUCKET_NAME, key)
      const chunks: Buffer[] = []
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
      })
    } catch (error) {
      console.error('Erro ao obter arquivo:', error)
      throw new Error('Falha ao obter arquivo')
    }
  }
  
  /**
   * Deletar arquivo
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const client = getMinioClient()
      await client.removeObject(BUCKET_NAME, key)
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error)
      throw new Error('Falha ao deletar arquivo')
    }
  }
  
  /**
   * Listar arquivos em uma pasta
   */
  static async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      const client = getMinioClient()
      const objectsStream = client.listObjects(BUCKET_NAME, prefix, true)
      const files: string[] = []
      
      return new Promise((resolve, reject) => {
        objectsStream.on('data', (obj) => {
          if (obj.name) files.push(obj.name)
        })
        objectsStream.on('end', () => resolve(files))
        objectsStream.on('error', reject)
      })
    } catch (error) {
      console.error('Erro ao listar arquivos:', error)
      throw new Error('Falha ao listar arquivos')
    }
  }
  
  /**
   * Verificar se arquivo existe
   */
  static async fileExists(key: string): Promise<boolean> {
    try {
      const client = getMinioClient()
      await client.statObject(BUCKET_NAME, key)
      return true
    } catch (error) {
      return false
    }
  }
  
  /**
   * Obter metadados do arquivo
   */
  static async getFileStats(key: string): Promise<any> {
    try {
      const client = getMinioClient()
      return await client.statObject(BUCKET_NAME, key)
    } catch (error) {
      console.error('Erro ao obter metadados:', error)
      throw new Error('Falha ao obter metadados do arquivo')
    }
  }
}

export default MinIOService 