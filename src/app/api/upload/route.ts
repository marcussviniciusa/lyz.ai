import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import MinIOService from '@/lib/minio'
import dbConnect from '@/lib/db'
import Document from '@/models/Document'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    // Obter dados do formulário
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const category = formData.get('category') as string || 'other'
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const tags = formData.get('tags') as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 })
    }

    const uploadResults = []
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    const maxSize = 50 * 1024 * 1024 // 50MB

    for (const file of files) {
      // Validações
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de arquivo não permitido: ${file.type}` },
          { status: 400 }
        )
      }

      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `Arquivo muito grande: ${file.name}` },
          { status: 400 }
        )
      }

      // Converter para buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Upload para MinIO
      const uploadResult = await MinIOService.uploadFile(
        buffer,
        file.name,
        {
          folder: `uploads/${session.user.id}`,
          contentType: file.type
        }
      )

      // Salvar metadados no banco
      const document = new Document({
        company: session.user.company,
        uploadedBy: session.user.id,
        filename: uploadResult.key.split('/').pop(),
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        storage: {
          provider: 'minio',
          bucket: process.env.MINIO_BUCKET_NAME || 'lyz-ai-files',
          key: uploadResult.key,
          url: uploadResult.url
        },
        metadata: {
          title: title || file.name,
          description,
          category,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          language: 'pt-BR'
        },
        processing: {
          status: 'pending'
        },
        ragSettings: {
          chunkSize: 1000,
          chunkOverlap: 200,
          embeddingModel: 'text-embedding-ada-002'
        }
      })

      await document.save()

      uploadResults.push({
        id: document._id,
        filename: document.filename,
        originalName: document.originalName,
        size: document.size,
        url: uploadResult.url,
        processingStatus: document.processing.status
      })

      // Aqui você pode adicionar o arquivo à fila de processamento RAG
      // await processDocumentQueue.add('process-document', { documentId: document._id })
    }

    return NextResponse.json({
      message: 'Upload realizado com sucesso',
      files: uploadResults
    })

  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Construir filtros
    const filters: any = {
      company: session.user.company,
      isActive: true
    }

    if (category && category !== 'all') {
      filters['metadata.category'] = category
    }

    // Buscar documentos
    const documents = await Document.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'name email')
      .lean()

    const total = await Document.countDocuments(filters)

    return NextResponse.json({
      documents,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: documents.length,
        totalDocuments: total
      }
    })

  } catch (error) {
    console.error('Erro ao buscar documentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 