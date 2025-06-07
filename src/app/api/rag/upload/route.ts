import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import MinIOService from '@/lib/minio'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo fornecido' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use PDF, DOC, DOCX, TXT ou MD' },
        { status: 400 }
      )
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 10MB' },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`
    const bucketName = 'rag-documents'

    try {
      // Upload para MinIO
      const buffer = Buffer.from(await file.arrayBuffer())
      
      const uploadResult = await MinIOService.uploadFile(
        buffer,
        file.name,
        {
          folder: 'rag-documents',
          filename: fileName,
          contentType: file.type
        }
      )

      // TODO: Aqui você adicionaria o processamento RAG
      // - Extrair texto do documento
      // - Dividir em chunks
      // - Gerar embeddings
      // - Salvar no banco de dados
      
      // Por enquanto, retornar sucesso simples
      return NextResponse.json({
        success: true,
        fileName,
        fileKey: uploadResult.key,
        fileUrl: uploadResult.url,
        fileSize: uploadResult.size,
        message: 'Arquivo enviado com sucesso. Processamento RAG será implementado.'
      })

    } catch (minioError: any) {
      console.error('Erro no MinIO:', minioError)
      return NextResponse.json(
        { error: 'Erro ao armazenar arquivo' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Simular lista de documentos por enquanto
    return NextResponse.json({
      documents: [],
      message: 'Listagem de documentos será implementada quando houver dados'
    })

  } catch (error: any) {
    console.error('Erro ao listar documentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 