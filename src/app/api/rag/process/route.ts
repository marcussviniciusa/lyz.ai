import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIService } from '@/lib/ai-service';
import { RAGService } from '@/lib/rag-service';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Document from '@/models/Document';
import { MinIOService } from '@/lib/minio';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Buscar usuário
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Permissão negada. Apenas administradores podem processar documentos.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID do documento é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar documento
    const document = await Document.findById(documentId);
    if (!document) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o documento pertence à empresa do usuário
    if (document.companyId.toString() !== user.companyId.toString()) {
      return NextResponse.json(
        { error: 'Documento não pertence à sua empresa' },
        { status: 403 }
      );
    }

    // Verificar se já está processado
    if (document.status === 'processed') {
      return NextResponse.json(
        { error: 'Documento já foi processado' },
        { status: 400 }
      );
    }

    // Marcar como processando
    await Document.findByIdAndUpdate(documentId, {
      status: 'processing',
      processedAt: new Date()
    });

    let content = '';

    try {
      // Se o documento tem conteúdo de texto, usar diretamente
      if (document.content) {
        content = document.content;
      }
      // Se é um arquivo, baixar do MinIO e extrair texto
      else if (document.fileUrl) {
        const fileBuffer = await MinIOService.getFileBuffer(document.fileUrl);
        
        // Para PDFs, seria necessário usar uma biblioteca como pdf-parse
        // Para simplicidade, vamos assumir que é texto
        content = fileBuffer.toString('utf-8');
      } else {
        throw new Error('Documento não tem conteúdo ou arquivo');
      }

      // Inicializar serviços de IA e RAG
      const aiService = await AIService.create(user.companyId.toString());
      const ragService = new RAGService(aiService);

      // Processar documento (dividir em chunks e gerar embeddings)
      const chunks = await ragService.processDocument(
        documentId,
        content,
        {
          name: document.name,
          source: document.source || 'upload'
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Documento processado com sucesso',
        data: {
          documentId,
          chunksCount: chunks.length,
          status: 'processed'
        }
      });

    } catch (processingError) {
      // Marcar como erro
      await Document.findByIdAndUpdate(documentId, {
        status: 'error',
        errorMessage: processingError instanceof Error ? processingError.message : 'Erro desconhecido'
      });

      throw processingError;
    }

  } catch (error) {
    console.error('Erro ao processar documento:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// API para reprocessar um documento
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = await request.json();
    const { documentId } = body;

    const document = await Document.findById(documentId);
    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    if (document.companyId.toString() !== user.companyId.toString()) {
      return NextResponse.json({ error: 'Documento não pertence à sua empresa' }, { status: 403 });
    }

    // Inicializar serviços
    const aiService = await AIService.create(user.companyId.toString());
    const ragService = new RAGService(aiService);

    // Reprocessar documento
    const chunks = await ragService.reprocessDocument(documentId);

    return NextResponse.json({
      success: true,
      message: 'Documento reprocessado com sucesso',
      data: {
        documentId,
        chunksCount: chunks.length,
        status: 'processed'
      }
    });

  } catch (error) {
    console.error('Erro ao reprocessar documento:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 