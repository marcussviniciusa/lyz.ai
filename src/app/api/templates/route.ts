import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import AnalysisTemplate from '@/models/AnalysisTemplate'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const companyId = session.user?.company || 'default'
    
    const query: any = {
      companyId,
      isActive: true
    }
    
    if (type) {
      query.type = type
    }
    
    const templates = await AnalysisTemplate.find(query)
      .sort({ isDefault: -1, usageCount: -1, name: 1 })
      .populate('createdBy', 'name email')
    
    return NextResponse.json({
      success: true,
      templates
    })

  } catch (error: any) {
    console.error('Erro ao buscar templates:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()
    
    const body = await request.json()
    const {
      name,
      description,
      type,
      promptTemplate,
      systemPrompt,
      parameters,
      customFields,
      outputFormat,
      ragConfig,
      isDefault
    } = body

    // Validação básica
    if (!name || !description || !type || !promptTemplate) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, description, type, promptTemplate' },
        { status: 400 }
      )
    }

    const companyId = session.user?.company || 'default'
    const createdBy = session.user?.id || ''

    const template = await AnalysisTemplate.create({
      name,
      description,
      type,
      companyId,
      createdBy,
      promptTemplate,
      systemPrompt,
      parameters: {
        temperature: parameters?.temperature || 0.7,
        maxTokens: parameters?.maxTokens || 4000,
        model: parameters?.model || 'gpt-4o-mini'
      },
      customFields: customFields || [],
      outputFormat,
      ragConfig: {
        enabled: ragConfig?.enabled !== false,
        categories: ragConfig?.categories || [],
        threshold: ragConfig?.threshold || 0.7,
        maxResults: ragConfig?.maxResults || 3
      },
      isDefault: isDefault || false
    })

    return NextResponse.json({
      success: true,
      template,
      message: 'Template criado com sucesso'
    })

  } catch (error: any) {
    console.error('Erro ao criar template:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()
    
    const body = await request.json()
    const { templateId, ...updateData } = body

    if (!templateId) {
      return NextResponse.json(
        { error: 'ID do template é obrigatório' },
        { status: 400 }
      )
    }

    const companyId = session.user?.company || 'default'

    // Verificar se o template pertence à empresa do usuário
    const template = await AnalysisTemplate.findOne({
      _id: templateId,
      companyId
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar template
    const updatedTemplate = await AnalysisTemplate.findByIdAndUpdate(
      templateId,
      updateData,
      { new: true }
    )

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: 'Template atualizado com sucesso'
    })

  } catch (error: any) {
    console.error('Erro ao atualizar template:', error)
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
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json(
        { error: 'ID do template é obrigatório' },
        { status: 400 }
      )
    }

    const companyId = session.user?.company || 'default'

    // Verificar se o template pertence à empresa do usuário
    const template = await AnalysisTemplate.findOne({
      _id: templateId,
      companyId
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    // Não permitir exclusão de templates padrão
    if (template.isDefault) {
      return NextResponse.json(
        { error: 'Não é possível excluir template padrão' },
        { status: 400 }
      )
    }

    // Soft delete - marcar como inativo
    await AnalysisTemplate.findByIdAndUpdate(templateId, {
      isActive: false
    })

    return NextResponse.json({
      success: true,
      message: 'Template removido com sucesso'
    })

  } catch (error: any) {
    console.error('Erro ao remover template:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 