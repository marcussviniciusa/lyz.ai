import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { provider, config } = await request.json()

    if (!provider || !config) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    if (!config.apiKey) {
      return NextResponse.json({ error: 'API Key obrigatória' }, { status: 400 })
    }

    const startTime = Date.now()
    let testResult: any

    try {
      switch (provider) {
        case 'openai':
          testResult = await testOpenAI(config)
          break
        case 'anthropic':
          testResult = await testAnthropic(config)
          break
        case 'google':
          testResult = await testGoogle(config)
          break
        default:
          return NextResponse.json({ error: 'Provedor não suportado' }, { status: 400 })
      }

      const responseTime = Date.now() - startTime

      return NextResponse.json({
        success: true,
        provider,
        responseTime,
        message: testResult.message,
        model: testResult.model
      })
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      console.error(`Erro ao testar ${provider}:`, error)
      
      return NextResponse.json({
        success: false,
        provider,
        responseTime,
        error: error.message || 'Erro desconhecido'
      })
    }
  } catch (error) {
    console.error('Erro no teste de provedor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function testOpenAI(config: any) {
  const openai = new OpenAI({
    apiKey: config.apiKey
  })

  const response = await openai.chat.completions.create({
    model: config.model || 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: 'Responda apenas "Teste OK" para confirmar que a conexão está funcionando.'
      }
    ],
    max_tokens: 10,
    temperature: 0
  })

  const message = response.choices[0]?.message?.content
  if (!message || !message.includes('Teste OK')) {
    throw new Error('Resposta inesperada do modelo')
  }

  return {
    message: 'Conexão OpenAI funcionando',
    model: config.model
  }
}

async function testAnthropic(config: any) {
  const anthropic = new Anthropic({
    apiKey: config.apiKey
  })

  const response = await anthropic.messages.create({
    model: config.model || 'claude-3-5-sonnet-20241022',
    max_tokens: 10,
    messages: [
      {
        role: 'user',
        content: 'Responda apenas "Teste OK" para confirmar que a conexão está funcionando.'
      }
    ]
  })

  const message = response.content[0]?.type === 'text' ? response.content[0].text : ''
  if (!message || !message.includes('Teste OK')) {
    throw new Error('Resposta inesperada do modelo')
  }

  return {
    message: 'Conexão Anthropic funcionando',
    model: config.model
  }
}

async function testGoogle(config: any) {
  const genAI = new GoogleGenerativeAI(config.apiKey)
  const model = genAI.getGenerativeModel({ model: config.model || 'gemini-1.5-pro' })

  const prompt = 'Responda apenas "Teste OK" para confirmar que a conexão está funcionando.'
  const result = await model.generateContent(prompt)
  const response = await result.response
  const message = response.text()

  if (!message || !message.includes('Teste OK')) {
    throw new Error('Resposta inesperada do modelo')
  }

  return {
    message: 'Conexão Google funcionando',
    model: config.model
  }
} 