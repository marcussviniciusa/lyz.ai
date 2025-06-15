import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/db'
import User from '@/models/User'
import Company from '@/models/Company'
import { validateCursEducaUser } from '@/lib/curseduca-service'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { name, email, password, companyName } = await request.json()

    // Validações básicas
    if (!name || !email || !password || !companyName) {
      return NextResponse.json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      }, { status: 400 })
    }

    // 1. Validar no CursEduca
    console.log('[CursEduca] Validando email:', email)
    const cursEducaUser = await validateCursEducaUser(email)
    
    if (!cursEducaUser.success) {
      return NextResponse.json({
        success: false,
        message: 'Email não encontrado no CursEduca'
      }, { status: 400 })
    }

    // 2. Verificar se usuário já existe no sistema
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Este email já possui uma conta no sistema'
      }, { status: 400 })
    }

    // 3. Verificar se empresa já existe
    const existingCompany = await Company.findOne({ name: companyName })
    if (existingCompany) {
      return NextResponse.json({
        success: false,
        message: 'Já existe uma empresa com este nome'
      }, { status: 400 })
    }

    // 4. Criar empresa primeiro
    const company = new Company({
      name: companyName,
      status: 'approved', // Aprovação automática para CursEduca
      createdAt: new Date(),
      updatedAt: new Date()
    })

    let savedCompany
    try {
      savedCompany = await company.save()
      console.log('Empresa criada:', savedCompany._id)
    } catch (error) {
      console.error('Erro ao criar empresa:', error)
      return NextResponse.json({
        success: false,
        message: 'Erro ao criar empresa'
      }, { status: 500 })
    }

    // 5. Criar usuário admin
    const hashedPassword = await bcrypt.hash(password, 12)
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      company: savedCompany._id,
      curseduca_id: cursEducaUser.data?.id || null,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    let savedUser
    try {
      savedUser = await user.save()
      console.log('Usuário criado:', savedUser._id)
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      
      // Cleanup: remover empresa criada
      try {
        await Company.findByIdAndDelete(savedCompany._id)
        console.log('Empresa removida após erro na criação do usuário')
      } catch (cleanupError) {
        console.error('Erro no cleanup da empresa:', cleanupError)
      }
      
      return NextResponse.json({
        success: false,
        message: 'Erro ao criar usuário'
      }, { status: 500 })
    }

    // 6. Buscar dados para retorno (sem senha)
    const createdUser = await User.findById(savedUser._id).select('-password').populate('company', 'name')
    
    if (!createdUser) {
      return NextResponse.json({
        success: false,
        message: 'Erro ao recuperar dados do usuário criado'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso! Você pode fazer login agora.',
      user: {
        _id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        company: {
          _id: createdUser.company._id,
          name: createdUser.company.name
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro no registro com Curseduca:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor. Tente novamente mais tarde.'
    }, { status: 500 })
  }
} 