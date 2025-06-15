import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Company from '@/models/Company'
import mongoose from 'mongoose'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas superadmin pode listar todas as empresas
    if (session.user.role !== 'superadmin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await dbConnect()

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    
    let query: any = {}
    if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      query.status = status
    }

    const companies = await Company.find(query)
      .populate('approvedBy', 'name email')
      .select('-settings.aiProviders.openai.apiKey -settings.aiProviders.anthropic.apiKey -settings.aiProviders.google.apiKey')
      .sort({ createdAt: -1 })

    return Response.json({
      success: true,
      companies: companies
    })

  } catch (error) {
    console.error('Erro ao buscar empresas:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas superadmin pode criar empresas
    if (session.user.role !== 'superadmin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await dbConnect()

    const body = await request.json()
    
    // Validar dados obrigatórios
    const requiredFields = ['name', 'address']
    for (const field of requiredFields) {
      if (!body[field]) {
        return Response.json(
          { error: `Campo ${field} é obrigatório` },
          { status: 400 }
        )
      }
    }

    // Verificar se CNPJ já existe (se fornecido)
    if (body.cnpj) {
      const existingCompany = await Company.findOne({ cnpj: body.cnpj })
      if (existingCompany) {
        return Response.json(
          { error: 'CNPJ já cadastrado' },
          { status: 400 }
        )
      }
    }

    // Criar empresa
    const companyData: any = {
      name: body.name,
      cnpj: body.cnpj,
      address: body.address,
      phone: body.phone,
      email: body.email,
      website: body.website,
      status: body.status || 'pending',
      settings: {
        aiProviders: {},
        defaultAiProvider: 'openai',
        maxUsersAllowed: body.settings?.maxUsersAllowed || 10,
        ragSettings: {
          chunkSize: 1000,
          chunkOverlap: 200,
          embeddingModel: 'text-embedding-ada-002'
        }
      }
    }

    // Se criando como aprovada, definir dados de aprovação
    if (companyData.status === 'approved') {
      companyData.approvedBy = new mongoose.Types.ObjectId(session.user.id)
      companyData.approvedAt = new Date()
    }

    const company = new Company(companyData)
    await company.save()

    // Buscar empresa criada com populate
    const createdCompany = await Company.findById(company._id)
      .populate('approvedBy', 'name email')
      .select('-settings.aiProviders.openai.apiKey -settings.aiProviders.anthropic.apiKey -settings.aiProviders.google.apiKey')

    return Response.json({
      success: true,
      company: createdCompany
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar empresa:', error)
    
    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map(err => err.message)
      return Response.json(
        { error: 'Dados inválidos', details: errors },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}