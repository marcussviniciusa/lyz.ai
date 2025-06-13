import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import DeliveryPlan from '@/models/DeliveryPlan'
import User from '@/models/User'
import mongoose from 'mongoose'
import jsPDF from 'jspdf'

// Função para renderizar markdown simples para texto
function markdownToText(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/^\s*[-•]\s+/gm, '• ') // Normaliza bullets
    .replace(/^\s*\d+\.\s+/gm, (match) => match) // Mantém numeração
    .trim()
}

// Função para processar dados de análise
function extractAnalysisContent(analysis: any): { title: string; content: string } {
  const typeLabels: Record<string, string> = {
    laboratory: 'Análise Laboratorial',
    tcm: 'Medicina Tradicional Chinesa',
    chronology: 'Cronologia de Saúde',
    ifm: 'Matriz de Medicina Funcional',
    treatment: 'Plano de Tratamento',
    treatmentPlan: 'Plano de Tratamento'
  }

  const title = typeLabels[analysis.type] || analysis.type
  let content = ''

  if (analysis.result?.rawOutput) {
    try {
      // Tentar parsear como JSON primeiro
      const parsed = JSON.parse(analysis.result.rawOutput)
      
      if (typeof parsed === 'object') {
        // Se for objeto, extrair campos relevantes
        if (parsed.summary) content += `Resumo: ${parsed.summary}\n\n`
        if (parsed.analysis) content += `${parsed.analysis}\n\n`
        if (parsed.recommendations) content += `Recomendações: ${parsed.recommendations}\n\n`
        if (parsed.conclusion) content += `Conclusão: ${parsed.conclusion}\n\n`
        
        // Se não encontrou campos específicos, converter objeto para texto
        if (!content) {
          content = JSON.stringify(parsed, null, 2)
        }
      } else {
        content = String(parsed)
      }
    } catch {
      // Se não for JSON, usar como texto direto
      content = String(analysis.result.rawOutput)
    }
  }

  return { title, content: markdownToText(content) }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Aguardar params conforme Next.js 15
    const resolvedParams = await params
    const planId = resolvedParams.id
    
    console.log('🎯 Gerando PDF para plano:', planId)

    await dbConnect()

    const user = await User.findOne({ email: session.user?.email })
    if (!user) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Validar se é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return Response.json({ error: 'ID do plano inválido' }, { status: 400 })
    }

    // Buscar o plano
    const query: any = { _id: planId }
    
    // Filtrar por empresa (exceto superadmin)
    if (session.user.role !== 'superadmin') {
      query.company = user.company
    }

    const plan = await DeliveryPlan.findOne(query)
      .populate('patient', 'name email phone age')
      .populate('professional', 'name email')
      .populate('company', 'name')
      .populate('analyses', 'type status createdAt result.rawOutput')

    if (!plan) {
      return Response.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    console.log('📄 Dados do plano carregados, gerando PDF...')

    // Criar PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - (margin * 2)
    let currentY = margin

    // Função para adicionar nova página se necessário
    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - margin) {
        pdf.addPage()
        currentY = margin
        return true
      }
      return false
    }

    // Função para adicionar texto com quebra de linha
    const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      pdf.setFontSize(fontSize)
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal')
      
      const lines = pdf.splitTextToSize(text, contentWidth)
      const lineHeight = fontSize * 0.4
      
      checkPageBreak(lines.length * lineHeight + 5)
      
      lines.forEach((line: string) => {
        pdf.text(line, margin, currentY)
        currentY += lineHeight
      })
      
      currentY += 5 // Espaço extra após o texto
    }

    // Header do PDF
    pdf.setFillColor(59, 130, 246) // bg-blue-600
    pdf.rect(0, 0, pageWidth, 30, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Lyz.ai - Sistema de Análises Médicas', margin, 20)
    
    currentY = 40
    pdf.setTextColor(0, 0, 0)

    // Título do plano
    addText(plan.title, 16, true)
    
    if (plan.description) {
      addText(plan.description, 12)
    }

    // Informações do paciente
    addText('INFORMAÇÕES DO PACIENTE', 14, true)
    addText(`Nome: ${plan.patient.name}`)
    addText(`Email: ${plan.patient.email}`)
    if (plan.patient.phone) {
      addText(`Telefone: ${plan.patient.phone}`)
    }
    if (plan.patient.age) {
      addText(`Idade: ${plan.patient.age} anos`)
    }

    currentY += 10

    // Informações do profissional
    addText('PROFISSIONAL RESPONSÁVEL', 14, true)
    addText(`Nome: ${plan.professional.name}`)
    addText(`Email: ${plan.professional.email}`)

    currentY += 10

    // Análises
    if (plan.analyses && plan.analyses.length > 0) {
      addText('ANÁLISES REALIZADAS', 14, true)
      
      plan.analyses.forEach((analysis: any, index: number) => {
        const { title, content } = extractAnalysisContent(analysis)
        
        // Título da análise
        addText(`${index + 1}. ${title}`, 12, true)
        
        // Conteúdo da análise
        if (content) {
          // Dividir conteúdo em parágrafos menores para melhor formatação
          const paragraphs = content.split('\n\n').filter(p => p.trim())
          
          paragraphs.forEach(paragraph => {
            if (paragraph.trim()) {
              addText(paragraph.trim(), 10)
            }
          })
        } else {
          addText('Análise em processamento ou sem conteúdo disponível.', 10)
        }
        
        currentY += 5
      })
    }

    // Footer
    const now = new Date()
    const footerText = `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`
    
    pdf.setFontSize(8)
    pdf.setTextColor(128, 128, 128)
    pdf.text(footerText, margin, pageHeight - 10)

    // Gerar buffer do PDF
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))
    
    console.log('✅ PDF gerado com sucesso, tamanho:', pdfBuffer.length, 'bytes')

    // Retornar o PDF
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="plano-integrado-${plan.patient.name.replace(/\s+/g, '-')}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error)
    return Response.json(
      { 
        error: 'Erro interno ao gerar PDF',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}