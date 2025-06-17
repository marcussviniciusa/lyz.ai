import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import RAGService from '@/lib/ragService'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas superadmin pode fazer upload no RAG
    if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado - apenas superadmin' }, { status: 403 })
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
        { status: 500 }
      )
    }

    // Função para garantir ObjectId válido
    const ensureValidObjectId = (value: any, fieldName: string, isSuperAdmin: boolean = false): string => {
      if (!value) {
        if (!isSuperAdmin) {
          console.warn(`${fieldName} não fornecido, usando ObjectId fixo para desenvolvimento`)
        }
        // Usar ObjectId fixo para desenvolvimento para manter consistência
        return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
      }
      
      // Se já é um ObjectId válido, retorna como string
      if (mongoose.Types.ObjectId.isValid(value)) {
        return value.toString()
      }
      
      // Se é uma string simples (como "1"), usar ObjectId fixo para manter consistência
      if (!isSuperAdmin) {
        console.warn(`${fieldName} inválido (${value}), usando ObjectId fixo para desenvolvimento`)
      }
      return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
    }

    // Garantir ObjectIds válidos
    // Para superadmin, usar ID GLOBAL FIXO para que documentos sirvam todo o sistema
    let companyId: string;
    let uploadedBy: string;
    
    if (session.user.role === 'superadmin') {
      // Usar ID GLOBAL FIXO para documentos que servem todo o sistema
      companyId = '000000000000000000000000'; // ID global fixo
      uploadedBy = ensureValidObjectId(session.user?.id, 'uploadedBy', true);
      console.log('🌐 SUPERADMIN: Documento será GLOBAL (disponível para todas as empresas)');
    } else {
      // Para outros usuários, usar empresa específica
      companyId = ensureValidObjectId(session.user?.company, 'companyId', false);
      uploadedBy = ensureValidObjectId(session.user?.id, 'uploadedBy', false);
      console.log('🏢 Documento será específico da empresa:', companyId);
    }

    console.log('📋 Upload RAG - IDs processados:', { 
      originalCompany: session.user?.company,
      originalUser: session.user?.id,
      processedCompany: companyId,
      processedUser: uploadedBy
    })

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
        companyId,
        uploadedBy
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