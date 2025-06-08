import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import RAGService from '@/lib/ragService'

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

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria é obrigatória' },
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

    try {
      // Processar documento com RAG completo
      const buffer = Buffer.from(await file.arrayBuffer())
      
      const documentId = await RAGService.processDocument({
        fileBuffer: buffer,
        fileName,
        originalFileName: file.name,
        mimeType: file.type,
        category,
        companyId: session.user.company,
        uploadedBy: session.user.id
      })

      return NextResponse.json({
        success: true,
        documentId,
        fileName,
        originalFileName: file.name,
        fileSize: file.size,
        category,
        message: 'Documento enviado e processamento RAG iniciado com sucesso!'
      })

    } catch (error: any) {
      console.error('Erro no processamento RAG:', error)
      
      // Retornar erro mais específico
      if (error.message.includes('OpenAI')) {
        return NextResponse.json(
          { error: 'Erro na configuração da IA. Verifique as chaves da API.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || 'Erro ao processar documento' },
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