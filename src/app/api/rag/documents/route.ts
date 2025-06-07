import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import MinIOService from '@/lib/minio'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'

    try {
      // Listar arquivos na pasta rag-documents
      const files = await MinIOService.listFiles('rag-documents/')
      
      // Por enquanto, retornar lista simples
      // TODO: Implementar busca por categoria e metadados do banco de dados
      const documents = files.map(fileName => ({
        id: fileName,
        name: fileName.split('/').pop() || fileName,
        category: 'research', // Default por enquanto
        size: 0, // Será obtido dos metadados
        uploadDate: new Date().toISOString(), // Placeholder
        status: 'uploaded'
      }))

      return NextResponse.json({
        documents,
        total: documents.length,
        message: documents.length === 0 ? 'Nenhum documento encontrado' : undefined
      })

    } catch (minioError: any) {
      console.error('Erro ao listar documentos:', minioError)
      return NextResponse.json({
        documents: [],
        total: 0,
        message: 'Erro ao acessar armazenamento'
      })
    }

  } catch (error: any) {
    console.error('Erro na API de documentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 