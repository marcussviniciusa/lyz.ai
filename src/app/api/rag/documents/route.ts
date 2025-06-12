import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { RAGDocument } from '@/models/RAGDocument'
import RAGService from '@/lib/ragService'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status') 
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Função para garantir ObjectId válido
    const ensureValidObjectId = (value: any, fieldName: string): string => {
      if (!value) {
        console.warn(`${fieldName} não fornecido, usando ObjectId fixo para desenvolvimento`)
        return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
      }
      
      // Se já é um ObjectId válido, retorna como string
      if (mongoose.Types.ObjectId.isValid(value)) {
        return value.toString()
      }
      
      // Se é uma string simples (como "1"), usar ObjectId fixo para manter consistência
      console.warn(`${fieldName} inválido (${value}), usando ObjectId fixo para desenvolvimento`)
      return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
    }

    // Garantir companyId válido
    const companyId = ensureValidObjectId(session.user?.company, 'companyId')

    console.log('📋 Listagem RAG - IDs processados:', { 
      originalCompany: session.user?.company,
      processedCompany: companyId
    })

    // Construir filtro
    const filter: any = { 
      companyId: companyId
    }
    
    if (category && category !== 'all') {
      filter.category = category
    }
    
    if (status && status !== 'all') {
      filter.status = status
    }

    // Buscar documentos com paginação
    const skip = (page - 1) * limit
    const [documents, total, stats] = await Promise.all([
      RAGDocument.find(filter)
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RAGDocument.countDocuments(filter),
      RAGService.getDocumentStats(companyId)
    ])

    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc._id,
        fileName: doc.originalFileName,
        fileSize: doc.fileSize,
        category: doc.category,
        status: doc.status,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.createdAt,
        processingMetadata: doc.processingMetadata
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    })

  } catch (error: any) {
    console.error('Erro ao listar documentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID do documento é obrigatório' },
        { status: 400 }
      )
    }

    // Garantir companyId válido
    const ensureValidObjectId = (value: any, fieldName: string): string => {
      if (!value) {
        console.warn(`${fieldName} não fornecido, usando ObjectId fixo para desenvolvimento`)
        return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
      }
      
      if (mongoose.Types.ObjectId.isValid(value)) {
        return value.toString()
      }
      
      console.warn(`${fieldName} inválido (${value}), usando ObjectId fixo para desenvolvimento`)
      return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
    }

    const companyId = ensureValidObjectId(session.user?.company, 'companyId')

    const success = await RAGService.deleteDocument(documentId, companyId)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Documento deletado com sucesso'
      })
    } else {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

  } catch (error: any) {
    console.error('Erro ao deletar documento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 