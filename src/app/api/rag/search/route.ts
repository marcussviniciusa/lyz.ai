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

    // Apenas superadmin pode buscar no RAG
    if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado - apenas superadmin' }, { status: 403 })
    }

    await dbConnect()

    const { query, category, limit = 5, threshold = 0.7 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query é obrigatória' },
        { status: 400 }
      )
    }

    // Função para garantir ObjectId válido
    const ensureValidObjectId = (value: any, fieldName: string, isSuperAdmin: boolean = false): string => {
      if (!value) {
        if (!isSuperAdmin) {
          console.warn(`${fieldName} não fornecido, usando ObjectId fixo para desenvolvimento`)
        }
        return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
      }
      
      if (mongoose.Types.ObjectId.isValid(value)) {
        return value.toString()
      }
      
      if (!isSuperAdmin) {
        console.warn(`${fieldName} inválido (${value}), usando ObjectId fixo para desenvolvimento`)
      }
      return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
    }

    const companyId = ensureValidObjectId(session.user?.company, 'companyId', session.user.role === 'superadmin')

    console.log('🔍 === INICIANDO BUSCA RAG MANUAL ===')
    console.log('📊 Parâmetros de busca:', { 
      query, 
      category, 
      limit, 
      threshold,
      companyId: session.user?.company,
      processedCompanyId: companyId
    })

    const results = await RAGService.searchDocuments({
      query,
      companyId,
      category,
      limit,
      threshold
    })

    console.log('📋 Resultados da busca RAG:')
    console.log(`📄 Total de documentos encontrados: ${results.length}`)
    results.forEach((result, index) => {
      console.log(`📄 Documento ${index + 1}:`, {
        fileName: result.fileName,
        score: result.score.toFixed(3),
        category: result.metadata?.category || 'N/A',
        contentPreview: result.content.substring(0, 100) + '...'
      })
    })

    if (results.length === 0) {
      console.log('⚠️ ATENÇÃO: Nenhum documento encontrado para a busca')
    }

    console.log('🔍 === BUSCA RAG MANUAL CONCLUÍDA ===')

    // Buscar estatísticas
    const stats = await RAGService.getDocumentStats(companyId)

    return NextResponse.json({
      results: results.map(result => ({
        content: result.content,
        fileName: result.fileName,
        score: result.score,
        documentId: result.documentId,
        chunkIndex: result.chunkIndex,
        metadata: result.metadata
      })),
      stats,
      searchMetadata: {
        query,
        category,
        limit,
        threshold,
        totalResults: results.length,
        companyId: companyId
      }
    })

  } catch (error: any) {
    console.error('❌ Erro na busca RAG:', error)
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

    // Apenas superadmin pode acessar busca RAG
    if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado - apenas superadmin' }, { status: 403 })
    }

    await dbConnect()

    // Função para garantir ObjectId válido
    const ensureValidObjectId = (value: any, fieldName: string, isSuperAdmin: boolean = false): string => {
      if (!value) {
        if (!isSuperAdmin) {
          console.warn(`${fieldName} não fornecido, usando ObjectId fixo para desenvolvimento`)
        }
        // Usar ObjectId fixo para desenvolvimento para manter consistência
        return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
      }
      
      if (mongoose.Types.ObjectId.isValid(value)) {
        return value.toString()
      }
      
      if (!isSuperAdmin) {
        console.warn(`${fieldName} inválido (${value}), usando ObjectId fixo para desenvolvimento`)
      }
      return '507f1f77bcf86cd799439011' // ObjectId fixo para dev
    }

    const companyId = ensureValidObjectId(session.user?.company, 'companyId', session.user.role === 'superadmin')

    // Buscar estatísticas de busca ou documentos recentes
    const stats = await RAGService.getDocumentStats(companyId)

    return NextResponse.json({
      searchEnabled: stats.documents.completed > 0,
      availableDocuments: stats.documents.completed,
      totalChunks: stats.chunks,
      categories: stats.categories,
      suggestions: [
        'Como tratar pacientes com diabetes tipo 2?',
        'Protocolos para hipertensão arterial',
        'Suplementação de vitamina D',
        'Medicina funcional para fadiga crônica',
        'Fitoterapia para ansiedade'
      ]
    })

  } catch (error: any) {
    console.error('Erro ao obter informações de busca:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 