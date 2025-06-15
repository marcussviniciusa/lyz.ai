import dbConnect from '@/lib/db'
import Company from '@/models/Company'
import mongoose from 'mongoose'

export async function POST(request: Request) {
  try {
    await dbConnect()

    const body = await request.json()
    
    // Validar dados obrigatórios
    const requiredFields = ['name', 'contactPerson']
    for (const field of requiredFields) {
      if (!body[field]) {
        return Response.json(
          { error: `Campo ${field} é obrigatório` },
          { status: 400 }
        )
      }
    }

    // Validar campos da pessoa de contato
    const requiredContactFields = ['name', 'email', 'phone', 'position']
    for (const field of requiredContactFields) {
      if (!body.contactPerson[field]) {
        return Response.json(
          { error: `Campo pessoa de contato.${field} é obrigatório` },
          { status: 400 }
        )
      }
    }

    // Verificar se email da pessoa de contato já existe em alguma empresa
    const existingEmail = await Company.findOne({ 
      'metadata.contactPerson.email': body.contactPerson.email 
    })
    if (existingEmail) {
      return Response.json(
        { error: 'Email já cadastrado. Se você já possui cadastro, entre em contato conosco.' },
        { status: 400 }
      )
    }

    // Criar empresa com status pendente
    const companyData = {
      name: body.name,
      website: body.website || '',
      status: 'pending', // Sempre pendente para cadastros públicos
      settings: {
        aiProviders: {},
        defaultAiProvider: 'openai',
        maxUsersAllowed: 10,
        ragSettings: {
          chunkSize: 1000,
          chunkOverlap: 200,
          embeddingModel: 'text-embedding-ada-002'
        }
      },
      // Armazenar dados da pessoa de contato e descrição em um campo temporário
      // que pode ser usado pelo admin durante a aprovação
      metadata: {
        contactPerson: body.contactPerson,
        description: body.description || '',
        registrationDate: new Date(),
        registrationSource: 'public_form'
      }
    }

    const company = new Company(companyData)
    await company.save()

    // TODO: Enviar email de notificação para admins sobre nova empresa pendente
    // TODO: Enviar email de confirmação para a empresa

    return Response.json({
      success: true,
      message: 'Solicitação de cadastro enviada com sucesso',
      company: {
        _id: company._id,
        name: company.name,
        status: company.status,
        createdAt: company.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao registrar empresa:', error)
    
    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map(err => err.message)
      return Response.json(
        { error: 'Dados inválidos', details: errors },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Erro interno do servidor. Tente novamente mais tarde.' },
      { status: 500 }
    )
  }
}