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

    // Configurar Puppeteer com timeouts aumentados
    let browser
    let page
    
    try {
      // Configuração do Puppeteer para produção com Chrome
      const launchConfig: any = {
        headless: true,
        protocolTimeout: 300000, // 5 minutos
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
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-software-rasterizer',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-crash-upload',
          '--no-default-browser-check',
          '--no-pings',
          '--disable-breakpad',
          '--disable-crash-reporter',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-ipc-flooding-protection',
          '--enable-logging=stderr',
          '--log-level=3',
          '--user-data-dir=/tmp/chrome-user-data',
          '--data-path=/tmp/chrome-data',
          '--disk-cache-dir=/tmp/chrome-cache',
          '--homedir=/tmp'
        ]
      }
      
      // Usar Chrome do sistema se disponível (Docker)
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
        console.log('🔍 Usando Chrome do sistema:', process.env.PUPPETEER_EXECUTABLE_PATH)
      } else {
        // Fallback para desenvolvimento local - tentar encontrar Chrome
        const possibleExecutables = [
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          '/snap/bin/chromium'
        ]
        
        for (const path of possibleExecutables) {
          try {
            const fs = require('fs')
            if (fs.existsSync(path)) {
              launchConfig.executablePath = path
              console.log('🔍 Chrome encontrado em:', path)
              break
            }
          } catch (e) {
            // Continua para próximo path
          }
        }
      }
      
      browser = await puppeteer.launch(launchConfig)
      
      page = await browser.newPage()
    } catch (error) {
      console.error('❌ Erro ao inicializar Puppeteer:', error)
      if (browser) await browser.close()
      return Response.json(
        { 
          error: 'Erro ao inicializar navegador',
          details: 'Falha ao inicializar o sistema de geração de PDF. Tente novamente.'
        },
        { status: 500 }
      )
    }
    
    // Configurar viewport otimizado para PDF
    await page.setViewport({ 
      width: 1200, 
      height: 1600,
      deviceScaleFactor: 1 
    })

    // Configurar timeouts
    page.setDefaultTimeout(120000)
    page.setDefaultNavigationTimeout(120000)

    // URL da página
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const pageUrl = `${baseUrl}/delivery/plans/${planId}?print=true&pdf-access=true`
    
    console.log('🌐 Navegando para:', pageUrl)
    
    try {
      // Navegar para a página
      await page.goto(pageUrl, {
        waitUntil: 'networkidle0',
        timeout: 120000
      })
      
      console.log('✅ Página carregada')
      
      // Aguardar carregamento inicial
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Aguardar elemento principal estar pronto
      await page.waitForSelector('[data-pdf-ready="true"]', { timeout: 60000 })
      console.log('✅ Elemento data-pdf-ready encontrado')
      
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
    
    console.log('📄 Aplicando estilos de impressão...')

    // Primeiro, vamos verificar e ajustar o conteúdo da página
    const contentInfo = await page.evaluate(() => {
      // Aguardar que todo o conteúdo markdown seja renderizado
      const markdownElements = document.querySelectorAll('.markdown-content')
      const analysisElements = document.querySelectorAll('.analysis-section')
      
      // Forçar exibição de todo conteúdo
      const hiddenElements = document.querySelectorAll('.hidden, [style*="display: none"], [style*="display:none"]')
      hiddenElements.forEach(el => {
        const element = el as HTMLElement
        if (!element.classList.contains('no-print')) {
          element.style.display = 'block'
          element.style.visibility = 'visible'
        }
      })
      
      // Remover limitações de altura
      document.body.style.height = 'auto'
      document.body.style.minHeight = 'auto'
      document.body.style.maxHeight = 'none'
      document.body.style.overflow = 'visible'
      
      // Ajustar container principal
      const mainContainer = document.querySelector('[data-pdf-ready]') as HTMLElement
      if (mainContainer) {
        mainContainer.style.height = 'auto'
        mainContainer.style.minHeight = 'auto'
        mainContainer.style.maxHeight = 'none'
      }
      
      return {
        totalHeight: Math.max(document.body.scrollHeight, document.body.offsetHeight),
        contentLength: document.body.textContent?.length || 0,
        markdownCount: markdownElements.length,
        analysisCount: analysisElements.length
      }
    })
    
    console.log('📊 Informações do conteúdo:', contentInfo)

    // Aplicar estilos otimizados para capturar todo o conteúdo
    await page.addStyleTag({
      content: `
        @page {
          size: A4;
          margin: 20mm 15mm;
        }
        
        @media print, screen {
          * {
            box-shadow: none !important;
            text-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            background: white !important;
            color: black !important;
            font-family: 'Times New Roman', serif !important;
            font-size: 12px !important;
            line-height: 1.6 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          
          .container, .max-w-4xl, .mx-auto, [data-pdf-ready] {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
          }
          
          /* Título principal */
          h1 { 
            font-size: 24px !important; 
            font-weight: bold !important;
            margin: 0 0 20px 0 !important; 
            text-align: center !important;
            color: #1a365d !important;
            page-break-after: avoid !important;
            border-bottom: 2px solid #e2e8f0 !important;
            padding-bottom: 10px !important;
          }
          
          /* Subtítulos principais */
          h2 { 
            font-size: 18px !important; 
            font-weight: bold !important;
            margin: 25px 0 15px 0 !important; 
            color: #2d3748 !important;
            page-break-after: avoid !important;
            border-left: 4px solid #4299e1 !important;
            padding-left: 10px !important;
          }
          
          /* Subtítulos secundários */
          h3 { 
            font-size: 16px !important; 
            font-weight: bold !important;
            margin: 20px 0 12px 0 !important; 
            color: #2d3748 !important;
            page-break-after: avoid !important;
          }
          
          /* Subtítulos terciários */
          h4, h5, h6 { 
            font-size: 14px !important; 
            font-weight: bold !important;
            margin: 15px 0 10px 0 !important; 
            color: #4a5568 !important;
            page-break-after: avoid !important;
          }
          
          /* Parágrafos */
          p { 
            margin: 10px 0 !important; 
            text-align: justify !important;
            orphans: 2 !important;
            widows: 2 !important;
            text-indent: 0 !important;
          }
          
          /* Listas */
          ul, ol { 
            margin: 12px 0 12px 25px !important; 
            padding-left: 0 !important;
            list-style: none !important; /* Remove bullets automáticos */
          }
          
          li { 
            margin: 8px 0 !important; 
            orphans: 2 !important;
            widows: 2 !important;
            line-height: 1.5 !important;
            list-style: none !important; /* Remove bullets automáticos */
            position: relative !important;
          }
          
          /* Remove todos os bullets automáticos do CSS */
          .markdown-content ul {
            list-style-type: none !important;
            list-style: none !important;
          }
          
          .markdown-content li {
            list-style-type: none !important;
            list-style: none !important;
          }
          
          .markdown-content li::before {
            content: none !important;
          }
          
          .markdown-content li::marker {
            content: none !important;
          }
          
          /* Cards e containers */
          .card, .Card, .border, .bg-white {
            border: 1px solid #e2e8f0 !important;
            margin-bottom: 20px !important;
            padding: 15px !important;
            background: white !important;
            page-break-inside: auto !important;
            border-radius: 0 !important;
          }
          
          /* Seções de análise */
          .analysis-section {
            margin-bottom: 25px !important;
            page-break-inside: auto !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding-bottom: 15px !important;
          }
          
          /* Conteúdo markdown */
          .markdown-content {
            color: black !important;
            page-break-inside: auto !important;
          }
          
          .markdown-content > * {
            page-break-inside: auto !important;
          }
          
          /* Informações do cabeçalho do plano */
          .plan-header {
            text-align: center !important;
            margin-bottom: 30px !important;
            padding: 20px !important;
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
          }
          
          /* Informações de paciente e profissional */
          .patient-info, .professional-info {
            margin: 15px 0 !important;
            padding: 10px !important;
            background: #f7fafc !important;
            border-left: 3px solid #4299e1 !important;
          }
          
          /* Seções numeradas */
          .numbered-section {
            margin: 20px 0 !important;
            padding: 15px !important;
            background: #fafafa !important;
            border: 1px solid #e8e8e8 !important;
          }
          
          /* Status de análise */
          .analysis-status {
            display: inline-block !important;
            padding: 4px 8px !important;
            background: #c6f6d5 !important;
            color: #22543d !important;
            border-radius: 0 !important;
            font-size: 10px !important;
            font-weight: bold !important;
          }
          
          /* Data e hora */
          .datetime {
            font-size: 11px !important;
            color: #718096 !important;
            font-style: italic !important;
          }
          
          /* Remover elementos desnecessários */
          button, .button, [role="button"], .no-print {
            display: none !important;
          }
          
          /* Forçar visibilidade */
          .hidden {
            display: block !important;
            visibility: visible !important;
          }
          
          /* Espaçamentos consistentes */
          .space-y-4 > *, .space-y-2 > *, .space-y-6 > * {
            margin-bottom: 15px !important;
            display: block !important;
          }
          
          /* Remover flexbox que pode causar problemas */
          .flex {
            display: block !important;
          }
          
          .grid {
            display: block !important;
          }
          
          /* Quebras de página estratégicas */
          .major-section {
            page-break-before: auto !important;
          }
          
          /* Melhorar contraste para impressão */
          strong, b {
            font-weight: bold !important;
            color: #1a202c !important;
          }
          
          em, i {
            font-style: italic !important;
          }
          
          /* Tabelas (se existirem) */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 15px 0 !important;
          }
          
          th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px !important;
            text-align: left !important;
          }
          
          th {
            background: #f7fafc !important;
            font-weight: bold !important;
          }
        }
      `
    })

    // Aguardar estabilização e renderização completa
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Verificar altura final após aplicação dos estilos
    const finalHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      )
    })
    
    console.log('📏 Altura final da página:', finalHeight, 'px')

    console.log('📄 Gerando PDF...')

    // Gerar PDF com altura dinâmica baseada no conteúdo
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
        <div style="font-size: 9px; width: 100%; text-align: center; color: #666; padding: 5mm 0;">
          <span>Lyz.ai - Sistema de Análises Médicas</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9px; width: 100%; text-align: center; color: #666; padding: 5mm 0;">
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span> - Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      `,
      timeout: 120000,
      preferCSSPageSize: true,
      omitBackground: false
    })
    
    await browser.close()
    
    console.log('✅ PDF gerado com sucesso, tamanho:', pdfBuffer.length, 'bytes')

    // Salvar PDF no MinIO
    try {
      const fileName = `${crypto.randomUUID()}.pdf`
      
      console.log('💾 Salvando PDF no MinIO...')
      const key = `delivery-plans-pages/${fileName}`
      const uploadResult = await MinIOService.uploadFile(
        Buffer.from(pdfBuffer),
        key,
        {
          folder: 'delivery-plans-pages',
          contentType: 'application/pdf'
        }
      )

      console.log('✅ PDF salvo no MinIO:', key)

      // Atualizar plano com informações do arquivo
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

      console.log('✅ Plano atualizado com informações do PDF')

      // Retornar o PDF diretamente para download
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': pdfBuffer.length.toString()
        }
      })

    } catch (minioError) {
      console.error('❌ Erro ao salvar PDF no MinIO:', minioError)
      
      // Se falhar no MinIO, ainda retornar o PDF gerado
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="plano-${plan.patient.name.replace(/\s+/g, '-')}.pdf"`,
          'Content-Length': pdfBuffer.length.toString()
        }
      })
    }
    
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