import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import DeliveryPlan from '@/models/DeliveryPlan'
import User from '@/models/User'
import mongoose from 'mongoose'
import puppeteer from 'puppeteer'
import { MinIOService } from '@/lib/minio'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aguardar params conforme Next.js 15
    const resolvedParams = await params
    const planId = resolvedParams.id
    
    console.log('🎯 Gerando PDF da página renderizada para plano:', planId)

    await dbConnect()

    // Validar se é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return Response.json({ error: 'ID do plano inválido' }, { status: 400 })
    }

    // Buscar o plano para verificar se existe (sem filtros de empresa para PDF)
    const plan = await DeliveryPlan.findById(planId)

    if (!plan) {
      return Response.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    // Verificar se já existe PDF da página salvo e ainda é válido
    const pageKey = `${plan.pdfPageFile?.key || ''}-page`
    if (plan.pdfPageFile?.key) {
      try {
        const pageFileExists = await MinIOService.fileExists(pageKey)
        if (pageFileExists) {
          console.log('📄 PDF da página já existe no MinIO, retornando URL existente')
          
          // Gerar nova URL assinada
          const newUrl = await MinIOService.getFileUrl(pageKey)
          
          // Retornar redirect para o arquivo
          return Response.redirect(newUrl)
        }
      } catch (error) {
        console.log('⚠️ Erro ao verificar arquivo da página existente, gerando novo:', error)
      }
    }

    console.log('📄 Gerando novo PDF da página renderizada...')

    // Configurar Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    })
    
    const page = await browser.newPage()
    
    // Configurar viewport maior para capturar mais conteúdo
    await page.setViewport({ 
      width: 1400, 
      height: 3000, // Altura muito maior
      deviceScaleFactor: 1.5 
    })

    // Configurar timeouts maiores
    page.setDefaultTimeout(120000) // 2 minutos
    page.setDefaultNavigationTimeout(120000)

    // URL da página
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const pageUrl = `${baseUrl}/delivery/plans/${planId}?print=true&pdf-access=true`
    
    console.log('🌐 Navegando para:', pageUrl)
    
    try {
      // Navegar para a página com timeout maior
      await page.goto(pageUrl, {
        waitUntil: 'networkidle0',
        timeout: 120000
      })
      
      console.log('✅ Página carregada')
      
      // Aguardar carregamento inicial
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Verificar se a página carregou corretamente
      const title = await page.title()
      console.log('📄 Título da página:', title)
      
      // Aguardar elemento principal estar pronto
      await page.waitForSelector('[data-pdf-ready="true"]', { timeout: 60000 })
      console.log('✅ Elemento data-pdf-ready encontrado')
      
      // Aguardar especificamente pelas seções de análise
      await page.waitForSelector('.analysis-section', { timeout: 60000 })
      console.log('✅ Seções de análise encontradas')
      
      // Aguardar pelo conteúdo markdown ser renderizado
      await page.waitForSelector('.markdown-content', { timeout: 60000 })
      console.log('✅ Conteúdo markdown encontrado')
      
      // Aguardar um tempo adicional para garantir renderização completa
      await new Promise(resolve => setTimeout(resolve, 15000)) // 15 segundos
      
    } catch (navigationError) {
      console.error('❌ Erro na navegação:', navigationError)
      await browser.close()
      
      return Response.json(
        { 
          error: 'Erro ao acessar a página',
          details: 'Não foi possível carregar a página do plano. Verifique se o plano existe.'
        },
        { status: 500 }
      )
    }
    
    console.log('📄 Preparando para gerar PDF da página...')

    // Debug: Verificar conteúdo inicial
    const initialContent = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body?.textContent?.substring(0, 200) || 'Sem conteúdo',
        hasDataPdfReady: !!document.querySelector('[data-pdf-ready]'),
        analysisCount: document.querySelectorAll('.analysis-section').length,
        styleCount: document.querySelectorAll('style').length,
        scriptCount: document.querySelectorAll('script').length
      }
    })
    console.log('🔍 Conteúdo inicial da página:', initialContent)

    // Limpar a página e preparar para captura de PDF
    await page.evaluate(() => {
      console.log('🧹 Iniciando limpeza da página...')
      
      // Remover todos os elementos <style> e <script>
      const styleTags = document.querySelectorAll('style, script, link[rel="stylesheet"]')
      console.log(`🗑️ Removendo ${styleTags.length} elementos de estilo/script`)
      styleTags.forEach(tag => tag.remove())

      // Encontrar container principal
      const container = document.querySelector('[data-pdf-ready]')
      console.log('📦 Container encontrado:', !!container)
      
      if (!container) {
        console.log('❌ Container [data-pdf-ready] não encontrado!')
        return
      }

      // Extrair dados essenciais
      const title = container.querySelector('h1')?.textContent || 'Plano Integrado'
      const analyses = Array.from(container.querySelectorAll('.analysis-section'))
      
      console.log(`📊 Dados extraídos: título="${title}", análises=${analyses.length}`)

      // Criar estrutura limpa
      const cleanHTML = `
        <div style="padding: 20px; font-family: 'Times New Roman', serif; font-size: 12px; line-height: 1.5; color: black; background: white;">
          <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 20px; text-align: center; color: black;">
            ${title}
          </h1>
          ${analyses.map((analysis, index) => {
            const analysisTitle = analysis.querySelector('h3')?.textContent || `Análise ${index + 1}`
            const markdownContent = analysis.querySelector('.markdown-content')
            const content = markdownContent ? markdownContent.innerHTML : 'Conteúdo não encontrado'
            
            return `
              <div style="margin-bottom: 30px; border: 1px solid #ccc; padding: 15px; background: white;">
                <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; color: black;">
                  ${index + 1}. ${analysisTitle}
                </h2>
                <div style="color: black; background: white;">
                  ${content}
                </div>
              </div>
            `
          }).join('')}
        </div>
      `

      // Substituir conteúdo da página
      document.body.innerHTML = cleanHTML
      console.log('✅ Página limpa e reestruturada')
    })

    // Aguardar estabilização após limpeza
    console.log('⏳ Aguardando estabilização...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Debug: Verificar conteúdo após limpeza
    const cleanedContent = await page.evaluate(() => {
      return {
        bodyText: document.body?.textContent?.substring(0, 500) || 'Sem conteúdo',
        bodyHTML: document.body?.innerHTML?.substring(0, 1000) || 'Sem HTML',
        height: document.body?.scrollHeight || 0
      }
    })
    console.log('🔍 Conteúdo após limpeza:', {
      textLength: cleanedContent.bodyText.length,
      htmlLength: cleanedContent.bodyHTML.length,
      height: cleanedContent.height,
      preview: cleanedContent.bodyText
    })

    // Obter métricas do conteúdo limpo
    const contentMetrics = await page.evaluate(() => {
      const body = document.body
      const height = Math.max(body.scrollHeight, body.offsetHeight)
      const textContent = body.textContent || ''
      
      return {
        contentHeight: height,
        totalTextLength: textContent.length,
        estimatedPages: Math.ceil(height / 842)
      }
    })

    console.log('📏 Métricas do conteúdo limpo:', contentMetrics)

    // Gerar PDF com configurações simples
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 9px; width: 100%; text-align: center; color: #666;">
          <span>Lyz.ai - Sistema de Análises Médicas</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9px; width: 100%; text-align: center; color: #666;">
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span> - Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      `,
      timeout: 120000,
      preferCSSPageSize: false
    })
    
    await browser.close()
    
    console.log('✅ PDF da página gerado com sucesso, tamanho:', pdfBuffer.length, 'bytes')

    // Salvar PDF da página no MinIO
    try {
      const fileName = `${crypto.randomUUID()}.pdf`
      
      console.log('💾 Salvando PDF da página no MinIO...')
      const key = `delivery-plans-pages/${fileName}`
      const uploadResult = await MinIOService.uploadFile(
        Buffer.from(pdfBuffer),
        key,
        {
          folder: 'delivery-plans-pages',
          contentType: 'application/pdf'
        }
      )

      console.log('✅ PDF da página salvo no MinIO:', key)

      // Atualizar plano com informações do arquivo da página (campo adicional)
      const now = new Date()
      await DeliveryPlan.findByIdAndUpdate(planId, {
        $set: {
          'pdfPageFile': {
            key,
            url: uploadResult.url,
            size: uploadResult.size,
            generatedAt: now,
            lastAccessed: now
          }
        }
      })

      console.log('✅ Plano atualizado com informações do PDF da página')

      // Retornar o PDF diretamente para download
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': pdfBuffer.length.toString()
        }
      })

    } catch (minioError) {
      console.error('❌ Erro ao salvar PDF da página no MinIO:', minioError)
      
      // Se falhar no MinIO, ainda retornar o PDF gerado
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="plano-pagina-${plan.patient.name.replace(/\s+/g, '-')}.pdf"`,
          'Content-Length': pdfBuffer.length.toString()
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF da página:', error)
    return Response.json(
      { 
        error: 'Erro interno ao gerar PDF da página',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 