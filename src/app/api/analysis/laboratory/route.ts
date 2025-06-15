import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import GlobalAIConfig from '@/models/GlobalAIConfig'
import Company from '@/models/Company'
import { AIService } from '@/lib/ai-service'
import { AnalysisService } from '@/lib/analysis-service'
import Analysis from '@/models/Analysis'
import Patient from '@/models/Patient'
import mongoose from 'mongoose'

interface LabResult {
  name: string
  value: string
  unit: string
  referenceRange: string
  functionalRange?: string
  status: 'normal' | 'borderline' | 'abnormal' | 'optimal'
  interpretation: string
  priority: 'low' | 'medium' | 'high'
}

interface AnalysisResult {
  summary: string
  results: LabResult[]
  recommendations: string[]
  functionalInsights: string[]
  riskFactors: string[]
  followUp: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔬 Iniciando análise laboratorial')
    console.log('🕐 Timestamp:', new Date().toISOString())

    // Temporariamente desabilitado para testes
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    // }

    const body = await request.json()
    const { patientId, examData, symptoms } = body

    console.log('📊 Dados recebidos:')
    console.log('- Patient ID:', patientId)
    console.log('- Exam Data Length:', examData?.length || 0)
    console.log('- Has Symptoms:', !!symptoms)

    if (!patientId || !examData) {
      console.log('❌ Dados obrigatórios ausentes')
      return NextResponse.json(
        { error: 'Dados de paciente e exames laboratoriais são obrigatórios' },
        { status: 400 }
      )
    }

    // Conectar ao banco
    await connectToDatabase()

    // Verificar se a paciente existe
    const patient = await Patient.findById(patientId)
    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrada' },
        { status: 404 }
      )
    }

    // Processar dados reais dos exames
    console.log('🧪 Iniciando processamento de dados dos exames')
    const analysisData = await processRealExamData(examData, symptoms)
    console.log('✅ Dados processados com sucesso')
    console.log('📈 Resultados extraídos:', analysisData.results?.length || 0)
    
    const analysisResults = {
      summary: analysisData.summary,
      results: analysisData.results,
      recommendations: analysisData.recommendations,
      functionalInsights: analysisData.functionalInsights,
      riskFactors: analysisData.riskFactors,
      followUp: analysisData.followUp
    }

    // Salvar a análise no banco de dados
    // Primeiro, verificar se já existe uma análise pendente para este paciente
    let analysis = await Analysis.findOne({
      patient: patientId,
      type: 'laboratory',
      status: 'pending'
    }).sort({ createdAt: -1 }) // Pegar a mais recente

    if (analysis) {
      // Atualizar análise existente
      console.log('📝 Atualizando análise existente:', analysis._id.toString())
      analysis.status = 'completed'
      analysis.inputData = {
        laboratoryManualData: examData
      }
      analysis.result = {
        rawOutput: JSON.stringify(analysisResults),
        laboratoryAnalysis: {
          interpretation: analysisResults.summary,
          alteredValues: analysisResults.results.filter(r => r.status !== 'normal').map(r => ({
            parameter: r.name,
            value: r.value,
            referenceRange: r.referenceRange,
            interpretation: r.interpretation,
            priority: r.priority
          })),
          functionalMedicineComparison: analysisResults.results.map(r => ({
            parameter: r.name,
            conventionalRange: r.referenceRange,
            functionalRange: r.functionalRange || 'N/A',
            status: r.status
          })),
          recommendations: analysisResults.recommendations
        }
      }
      analysis.aiMetadata = analysisData.aiMetadata || {
        provider: 'openai',
        model: 'gpt-4o-mini',
        promptVersion: '1.0',
        tokensUsed: 0,
        processingTime: 0,
        cost: 0
      }
      analysis.updatedAt = new Date()
      
      await analysis.save()
      console.log('✅ Análise existente atualizada com sucesso. ID:', analysis._id.toString())
    } else {
      // Criar nova análise se não existir
      analysis = new Analysis({
        patient: patientId,
        professional: new mongoose.Types.ObjectId(), // Mock user ID para agora
        company: new mongoose.Types.ObjectId(), // Mock company ID para agora  
        type: 'laboratory',
        status: 'completed',
        inputData: {
          laboratoryManualData: examData
        },
        result: {
          rawOutput: JSON.stringify(analysisResults),
          laboratoryAnalysis: {
            interpretation: analysisResults.summary,
            alteredValues: analysisResults.results.filter(r => r.status !== 'normal').map(r => ({
              parameter: r.name,
              value: r.value,
              referenceRange: r.referenceRange,
              interpretation: r.interpretation,
              priority: r.priority
            })),
            functionalMedicineComparison: analysisResults.results.map(r => ({
              parameter: r.name,
              conventionalRange: r.referenceRange,
              functionalRange: r.functionalRange || 'N/A',
              status: r.status
            })),
            recommendations: analysisResults.recommendations
          }
        },
        // Usar metadados reais da análise
        aiMetadata: analysisData.aiMetadata || {
          provider: 'openai',
          model: 'gpt-4o-mini',
          promptVersion: '1.0',
          tokensUsed: 0,
          processingTime: 0,
          cost: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })

      console.log('💾 Criando nova análise no banco de dados')
      await analysis.save()
      console.log('✅ Nova análise criada com sucesso. ID:', analysis._id.toString())
    }

    // Retornar resultados com ID da análise salva
    return NextResponse.json({
      ...analysisResults,
      analysisId: analysis._id.toString()
    })

  } catch (error: any) {
    console.error('Erro na API de análise laboratorial:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function processRealExamData(examData: string, symptoms?: string): Promise<AnalysisResult & { aiMetadata?: any }> {
  // Extrair valores reais dos dados do exame
  const extractedResults = extractLabValues(examData)
  
  if (extractedResults.length === 0) {
    // Se não conseguir extrair dados reais, retornar erro
    throw new Error('Não foi possível extrair dados válidos dos exames fornecidos. Verifique o formato dos dados.')
  }

  // Buscar configurações de IA para análise laboratorial
  await connectToDatabase()
  const globalConfig = await GlobalAIConfig.findOne()
  
  if (!globalConfig?.laboratory) {
    // Fallback para análise simples se não há configuração de IA
    return {
      ...generateSimpleAnalysis(extractedResults, symptoms),
      aiMetadata: {
        provider: 'openai',
        model: 'fallback-simple',
        promptVersion: '1.0',
        tokensUsed: 0,
        processingTime: 0,
        cost: 0
      }
    }
  }

  // Usar IA configurada para gerar análise completa
  const { analysis: aiAnalysis, metadata } = await generateAIAnalysis(extractedResults, symptoms, globalConfig.laboratory, globalConfig.apiKeys)
  
  return {
    summary: aiAnalysis.summary,
    results: extractedResults, // Manter os resultados extraídos reais
    recommendations: aiAnalysis.recommendations,
    functionalInsights: aiAnalysis.functionalInsights,
    riskFactors: aiAnalysis.riskFactors,
    followUp: aiAnalysis.followUp,
    aiMetadata: metadata
  }
}

function extractLabValues(examData: string): LabResult[] {
  console.log('🔍 Iniciando extração de valores laboratoriais')
  console.log('📄 Total de caracteres no examData:', examData.length)
  
  const results: LabResult[] = []
  const lines = examData.split('\n')
  console.log('📝 Total de linhas para analisar:', lines.length)
  
  // Lista expandida de marcadores laboratoriais (incluindo nomes completos hormonais)
  const validLabMarkers = [
    'tsh', 't4', 't3', 'vitamina d', 'vitamina b12', 'ferritina', 'ferro', 'hemoglobina', 'hematócrito',
    'glicose', 'hba1c', 'insulina', 'colesterol', 'hdl', 'ldl', 'triglicerídeos', 'triglicerides',
    'creatinina', 'ureia', 'ácido úrico', 'pcr', 'vhs', 'calcium', 'cálcio', 'magnésio', 'zinco',
    'homocisteína', 'homocisteina', 'folato', 'b12', 'cortisol', 'testosterona', 'estradiol',
    'progesterona', 'prolactina', 'lh', 'fsh', 'dhea', 'dheas', 'igf-1', 'shbg',
    'alt', 'ast', 'tgo', 'tgp', 'ggt', 'fosfatase alcalina', 'bilirrubina', 'albumina',
    'proteínas totais', 'globulinas', 'leucócitos', 'neutrófilos', 'linfócitos', 'monócitos',
    'eosinófilos', 'basófilos', 'plaquetas', 'rdw', 'vcm', 'chcm', 'hcm', 'testosterona livre',
    'estradiol livre', 't4 livre', 't3 livre', 'cortisol salivar', 'igf1', 'androstenediona',
    'hemácias', 'vpm', 'pdw', 'plcr', 'vldl', 'transaminase', 'oxalacetica', 'piruvica',
    // Nomes completos hormonais
    'hormônio tireoestimulante', 'tiroxina livre', 'folículo estimulante', 'luteinizante', 
    'sulfato de dehidroepiandrosterona', '25 hidroxi', 'cortisol basal', 'vitamina d - 25 hidroxi'
  ]
  
  // Palavras que devem ser ignoradas (dados administrativos e descritores)
  const ignoreTerms = [
    'cnes', 'crf', 'crm', 'crbm', 'idade', 'cadastro', 'data', 'desejável', 'limítrofe', 
    'alto', 'baixo', 'ótimo', 'muito alto', 'muito baixo', 'normal', 'anos', 'telefone',
    'endereço', 'cpf', 'rg', 'prontuário', 'código', 'número', 'nome', 'sexo', 'mulheres',
    'homens', 'masculino', 'feminino', 'adultos', 'crianças', 'pediatria', 'gestantes',
    'pós-menopausa', 'pré-menopausa', 'fase folicular', 'fase lútea', 'ovulação'
  ]
  
  // Padrões mais específicos para extrair valores laboratoriais
  const patterns = [
    // Formato: Nome: valor unidade (VR: referência)
    /^[-•*]?\s*([^:]+):\s*([0-9.,<>]+)\s*([a-zA-Z\/µμ%]*)\s*(?:\((?:VR?|Ref\.?|Referência)[:\s]*([^)]+)\))?/i,
    // Formato: Nome valor unidade VR: referência
    /^[-•*]?\s*([a-zA-Z\sáéíóúâêîôûãõç]+?)\s+([0-9.,<>]+)\s*([a-zA-Z\/µμ%]*)\s*(?:VR?|Ref\.?|Referência)[:\s]+([0-9.,<>\s-]+)/i,
    // Formato simples: Nome valor (sem unidade explícita)
    /^[-•*]?\s*([a-zA-Z\sáéíóúâêîôûãõç]+?):\s*([0-9.,<>]+)\s*$/i
  ]

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.length < 3) return

    // Pular linhas que claramente não são dados laboratoriais
    const lowerLine = trimmedLine.toLowerCase()
    
    if (ignoreTerms.some(term => lowerLine.includes(term))) return
    if (lowerLine.includes('laboratório') || lowerLine.includes('laudo') || lowerLine.includes('resultado')) return
    if (/^\d+\/\d+\/\d+/.test(trimmedLine)) return // Datas
    if (/^[\d\s\-\(\)]+$/.test(trimmedLine)) return // Apenas números e símbolos
    if (/\d+\s*a\s*\d+/.test(lowerLine)) return // Faixas como "11,0 a 50,0"
    if (/^\s*(homens?|mulheres?|masculino|feminino)\s*[:.]?\s*\d+/.test(lowerLine)) return // Descrições de gênero com valores

    // Primeiro, tentar detectar formato de tabela (nome em uma linha, valor na próxima)
    const cleanLine = trimmedLine.toLowerCase().trim()
    const isValidMarkerName = validLabMarkers.some(marker => 
      cleanLine.includes(marker) || marker.includes(cleanLine)
    )
    
    // Detectar nomes que terminam com ":" e limpar
    const nameWithColon = trimmedLine.match(/^(.+?):\s*$/)
    const nameToCheck = nameWithColon ? nameWithColon[1].toLowerCase().trim() : cleanLine
    
    // Filtros para evitar falsos positivos
    const isGoodMarkerName = validLabMarkers.some(marker => 
      nameToCheck.includes(marker) || marker.includes(nameToCheck)
    ) && nameToCheck.length > 3 && 
        !['valor', 'teste', 'exame', 'lab', 'sangue', 'método', 'material', 'resultado', 'série', 'contagem', 'frações', 'total'].includes(nameToCheck) &&
        !nameToCheck.includes('/mm') && 
        !nameToCheck.includes('série') &&
        !nameToCheck.includes('parelhas') &&
        !nameToCheck.includes('grupo') &&
        !nameToCheck.includes('transaminase') &&
        !/^\d+/.test(nameToCheck) // Não começar com número
    
    if (isGoodMarkerName) {
      // Verificar as próximas 5 linhas para encontrar um valor
      for (let i = 1; i <= 5 && lineIndex + i < lines.length; i++) {
        const nextLine = lines[lineIndex + i]?.trim()
        if (!nextLine) continue
        
        // Verificar formato "Resultado: valor"
        const resultMatch = nextLine.match(/^Resultado:\s*([0-9.,<>]+)\s*([a-zA-Z\/µμ%]+)?/)
        if (resultMatch) {
          const value = resultMatch[1]
          let unit = resultMatch[2] || ''
          let reference = 'N/A'
          
          // Buscar referência nas próximas linhas
          for (let j = i + 1; j <= i + 3 && lineIndex + j < lines.length; j++) {
            const refLine = lines[lineIndex + j]?.trim()
            if (refLine && refLine.includes(':')) {
              const refMatch = refLine.match(/([0-9.,<>\s\-]+(?:[a-zA-Z\/µμ%]*))/)
              if (refMatch) {
                reference = refMatch[1].trim()
                break
              }
            }
          }
          
          // Limpar nome removendo ":" do final se presente
          const cleanName = nameWithColon ? nameWithColon[1].trim() : trimmedLine.trim()
          
          // Verificar se já temos esse marcador (evitar duplicações)
          const alreadyExists = results.some(r => 
            r.name.toLowerCase().includes(cleanName.toLowerCase()) || 
            cleanName.toLowerCase().includes(r.name.toLowerCase())
          )
          
          if (!alreadyExists) {
            const labResult: LabResult = {
              name: cleanName,
              value: value.trim(),
              unit: unit.trim(),
              referenceRange: reference.trim(),
              functionalRange: getFunctionalRange(cleanName),
              status: analyzeStatus(cleanName, value.trim(), reference),
              interpretation: generateInterpretation(cleanName, value.trim(), reference),
              priority: assessPriority(cleanName, value.trim(), reference)
            }
            
            results.push(labResult)
          }
          return // Sair do loop para esta linha
        }
        
        // Verificar se a próxima linha contém um valor numérico simples
        const numericMatch = nextLine.match(/^([0-9.,<>]+)$/)
        if (numericMatch) {
          const value = numericMatch[1]
          
          // Buscar unidade e referência na linha seguinte
          let unit = ''
          let reference = 'N/A'
          
          if (lineIndex + i + 1 < lines.length) {
            const unitLine = lines[lineIndex + i + 1]?.trim()
            if (unitLine) {
              // Melhor parsing de unidade e referência
              // Múltiplos formatos: "g/dL 12,0 -16,0g/dL", "mg/dLDesejável: < 200,0 mg/dL", etc.
              
              // Primeiro extrair a unidade básica (mg/dL, g/dL, %, etc.)
              const basicUnitMatch = unitLine.match(/^(mg\/dL|g\/dL|%|\/mm3?|U\/L|nmol\/L|ng\/dL|pg\/mL|µ[Uu]I\/mL)/i)
              if (basicUnitMatch) {
                unit = basicUnitMatch[1]
                
                // Extrair referência do resto da linha
                const restOfLine = unitLine.substring(basicUnitMatch[0].length)
                
                // Limpar referência removendo texto descriptivo
                const cleanRef = restOfLine.replace(/desejável|ótimo|alto|baixo|limítrofe|muito\s+alto|muito\s+baixo|superior|inferior|adultos/gi, '')
                                          .replace(/[:]/g, '')
                                          .trim()
                
                // Extrair apenas números, faixas e símbolos relevantes
                const refMatch = cleanRef.match(/([<>]?\s*[\d.,\s\-]+(?:\s*mg\/dL|g\/dL|%|\s*\/mm|U\/L)*)/i)
                if (refMatch) {
                  reference = refMatch[1].trim()
                }
              } else {
                // Fallback para casos não cobertos
                const unitRefMatch = unitLine.match(/^([a-zA-Z\/µμ%]+)(.+)$/)
                if (unitRefMatch) {
                  unit = unitRefMatch[1].replace(/desejável|ótimo|alto|baixo|limítrofe|muito|adultos/gi, '').trim()
                  const refPart = unitRefMatch[2]
                  const cleanRef = refPart.replace(/desejável|ótimo|alto|baixo|limítrofe|muito\s+alto|muito\s+baixo|superior|inferior|adultos/gi, '')
                                          .replace(/[:]/g, '')
                                          .trim()
                  const refMatch = cleanRef.match(/([<>]?\s*[\d.,\s\-]+)/i)
                  if (refMatch) {
                    reference = refMatch[1].trim()
                  }
                }
              }
            }
          }
          
          // Limpar nome removendo ":" do final se presente
          const cleanName = nameWithColon ? nameWithColon[1].trim() : trimmedLine.trim()
          
          // Verificar se já temos esse marcador (evitar duplicações)
          const alreadyExists = results.some(r => 
            r.name.toLowerCase().includes(cleanName.toLowerCase()) || 
            cleanName.toLowerCase().includes(r.name.toLowerCase())
          )
          
          if (!alreadyExists) {
            const labResult: LabResult = {
              name: cleanName,
              value: value.trim(),
              unit: unit.trim(),
              referenceRange: reference.trim(),
              functionalRange: getFunctionalRange(cleanName),
              status: analyzeStatus(cleanName, value.trim(), reference),
              interpretation: generateInterpretation(cleanName, value.trim(), reference),
              priority: assessPriority(cleanName, value.trim(), reference)
            }
            
            results.push(labResult)
          }
          return // Sair do loop para esta linha
        }
      }
    }

    // Se não detectou formato de tabela, tentar padrões tradicionais
    for (const pattern of patterns) {
      const match = trimmedLine.match(pattern)
      if (match) {
        const [, name, value, unit, reference] = match
        
        if (name && value && name.length > 2) {
          const cleanName = name.trim().toLowerCase()
          
          // Pular se for apenas descritor de gênero
          if (/^(homens?|mulheres?|masculino|feminino)$/i.test(cleanName)) return
          
          // Pular se o valor termina com "a" (indicando faixa: "11,0a" = "11,0 a ...")
          if (value.endsWith('a') && value.length > 1) return
          
          // Verificar se é um marcador laboratorial válido
          const isValidMarker = validLabMarkers.some(marker => 
            cleanName.includes(marker) || marker.includes(cleanName)
          )
          
          // Validação adicional: o nome deve ser substancial (não apenas uma palavra comum)
          const hasSubstantialName = cleanName.length > 3 && 
            !['valor', 'teste', 'exame', 'lab', 'sangue'].includes(cleanName)
          
          if (isValidMarker && hasSubstantialName) {
            const labResult: LabResult = {
              name: name.trim(),
              value: value.trim(),
              unit: (unit || '').trim(),
              referenceRange: (reference || 'N/A').trim(),
              functionalRange: getFunctionalRange(name.trim()),
              status: analyzeStatus(name.trim(), value.trim(), reference),
              interpretation: generateInterpretation(name.trim(), value.trim(), reference),
              priority: assessPriority(name.trim(), value.trim(), reference)
            }
            
            results.push(labResult)
            break // Para de tentar outros padrões se encontrou um match
          }
        }
      }
    }
  })

  // Remover duplicatas baseadas no nome
  const uniqueResults: LabResult[] = []
  const seenNames = new Set<string>()
  
  results.forEach(result => {
    const normalizedName = result.name.toLowerCase().trim()
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName)
      uniqueResults.push(result)
    }
  })

  console.log('📊 Extração finalizada:')
  console.log('- Total de resultados extraídos:', results.length)
  console.log('- Resultados únicos:', uniqueResults.length)
  console.log('- Resultados válidos:', uniqueResults.filter(r => r.value && r.name).length)
  
  if (uniqueResults.length > 0) {
    console.log('📋 Primeiros 3 resultados:')
    uniqueResults.slice(0, 3).forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.name}: ${result.value}${result.unit} (${result.status})`)
    })
  } else {
    console.log('⚠️ Nenhum resultado válido extraído dos dados fornecidos')
  }

  return uniqueResults
}

function getFunctionalRange(testName: string): string {
  const name = testName.toLowerCase()
  
  if (name.includes('tsh')) return '1.0-2.0'
  if (name.includes('t4') && name.includes('livre')) return '1.2-1.5'
  if (name.includes('vitamina d')) return '50-80'
  if (name.includes('b12')) return '500-800'
  if (name.includes('ferritina')) return '50-150'
  if (name.includes('hdl')) return '>60'
  if (name.includes('homocisteina')) return '<7'
  if (name.includes('pcr') || name.includes('proteina c')) return '<1.0'
  if (name.includes('shbg')) return '30-120 nmol/L'
  if (name.includes('testosterona livre')) return '0.3-3.0 ng/dL'
  if (name.includes('testosterona') && !name.includes('livre')) return '15-70 ng/dL'
  if (name.includes('estradiol')) return '20-200 pg/mL'
  if (name.includes('progesterona')) return '5-20 ng/mL (fase lútea)'
  if (name.includes('fsh') || name.includes('folículo')) return '3-8 mUI/mL (fase folicular)'
  if (name.includes('lh') || name.includes('luteinizante')) return '2-10 mUI/mL (fase folicular)'
  if (name.includes('dhea') || name.includes('dehidroepiandrosterona')) return '50-250 µg/dL'
  if (name.includes('vitamina d') || name.includes('25 hidroxi')) return '30-60 ng/mL'
  
  return 'N/A'
}

function analyzeStatus(testName: string, value: string, reference?: string): 'normal' | 'borderline' | 'abnormal' | 'optimal' {
  const numericValue = parseFloat(value.replace(/[<>]/g, ''))
  if (isNaN(numericValue)) return 'normal'
  
  const name = testName.toLowerCase()
  
  // Análise específica baseada no teste
  if (name.includes('tsh')) {
    if (numericValue >= 1.0 && numericValue <= 2.0) return 'optimal'
    if (numericValue > 2.0 && numericValue <= 4.0) return 'borderline'
    return 'abnormal'
  }
  
  if (name.includes('vitamina d')) {
    if (numericValue >= 50 && numericValue <= 80) return 'optimal'
    if (numericValue >= 30 && numericValue < 50) return 'borderline'
    return 'abnormal'
  }
  
  if (name.includes('ferritina')) {
    if (numericValue >= 50 && numericValue <= 150) return 'optimal'
    if (numericValue >= 15 && numericValue < 50) return 'borderline'
    return 'abnormal'
  }
  
  if (name.includes('colesterol total')) {
    if (numericValue < 200) return 'optimal'
    if (numericValue >= 200 && numericValue < 240) return 'borderline'
    return 'abnormal'
  }
  
  if (name.includes('ldl')) {
    if (numericValue < 100) return 'optimal'
    if (numericValue >= 100 && numericValue < 160) return 'borderline'
    return 'abnormal'
  }
  
  if (name.includes('hdl')) {
    if (numericValue >= 60) return 'optimal'
    if (numericValue >= 40 && numericValue < 60) return 'borderline'
    return 'abnormal'
  }
  
  // Para outros testes, usar análise genérica baseada na referência
  if (reference && reference !== 'N/A') {
    const refParts = reference.match(/([0-9.,]+)\s*-\s*([0-9.,]+)/)
    if (refParts) {
      const [, minRef, maxRef] = refParts
      const minValue = parseFloat(minRef)
      const maxValue = parseFloat(maxRef)
      
      if (numericValue >= minValue && numericValue <= maxValue) return 'normal'
      return 'abnormal'
    }
  }
  
  return 'normal'
}

function generateInterpretation(testName: string, value: string, reference?: string): string {
  const name = testName.toLowerCase()
  const numericValue = parseFloat(value.replace(/[<>]/g, ''))
  
  if (name.includes('tsh')) {
    if (numericValue > 2.0) return 'TSH elevado pode indicar início de hipotireoidismo'
    if (numericValue < 1.0) return 'TSH baixo, investigar hipertireoidismo'
    return 'TSH dentro da faixa funcional ideal'
  }
  
  if (name.includes('vitamina d')) {
    if (numericValue < 30) return 'Deficiência de vitamina D, necessita suplementação'
    if (numericValue < 50) return 'Vitamina D insuficiente para função ótima'
    return 'Vitamina D em níveis funcionais adequados'
  }
  
  if (name.includes('ferritina')) {
    if (numericValue < 15) return 'Ferritina muito baixa, risco de anemia'
    if (numericValue < 50) return 'Reservas de ferro baixas, pode causar fadiga'
    return 'Reservas de ferro adequadas'
  }
  
  if (name.includes('shbg')) {
    if (numericValue < 30) return 'SHBG baixo, pode indicar resistência insulínica'
    if (numericValue > 120) return 'SHBG elevado, pode afetar disponibilidade hormonal'
    return 'SHBG em faixa adequada'
  }
  
  if (name.includes('testosterona livre')) {
    if (numericValue < 0.3) return 'Testosterona livre baixa, pode causar fadiga e baixa libido'
    if (numericValue > 3.0) return 'Testosterona livre elevada'
    return 'Testosterona livre em faixa adequada'
  }
  
  if (name.includes('vitamina d')) {
    if (numericValue < 20) return 'Deficiência severa de vitamina D, necessita suplementação urgente'
    if (numericValue < 30) return 'Insuficiência de vitamina D, necessita suplementação'
    return 'Vitamina D em níveis adequados'
  }
  
  if (name.includes('estradiol')) {
    if (numericValue < 20) return 'Estradiol baixo, pode indicar fase folicular inicial'
    if (numericValue > 200) return 'Estradiol elevado, pode indicar pico ovulatório'
    return 'Estradiol em faixa normal para mulher em idade reprodutiva'
  }
  
  if (name.includes('progesterona')) {
    if (numericValue < 1.5) return 'Progesterona baixa, sugere fase folicular ou anovulação'
    if (numericValue > 5) return 'Progesterona elevada, sugere fase lútea'
    return 'Progesterona em faixa normal'
  }
  
  if (name.includes('cortisol')) {
    if (numericValue < 7) return 'Cortisol baixo, investigar insuficiência adrenal'
    if (numericValue > 20) return 'Cortisol elevado, pode indicar estresse ou síndrome de Cushing'
    return 'Cortisol em faixa normal'
  }
  
  return `Valor: ${value} (Referência: ${reference || 'N/A'})`
}

function assessPriority(testName: string, value: string, reference?: string): 'low' | 'medium' | 'high' {
  const status = analyzeStatus(testName, value, reference)
  
  if (status === 'abnormal') return 'high'
  if (status === 'borderline') return 'medium'
  return 'low'
}

function generateRealSummary(results: LabResult[], symptoms?: string): string {
  const abnormalCount = results.filter(r => r.status === 'abnormal').length
  const borderlineCount = results.filter(r => r.status === 'borderline').length
  const totalTests = results.length
  
  let summary = `Análise de ${totalTests} marcador(es) laboratorial(is) concluída. `
  
  if (abnormalCount > 0) {
    summary += `Identificadas ${abnormalCount} alteração(ões) significativa(s) e ${borderlineCount} marcador(es) limítrofe(s). `
  } else if (borderlineCount > 0) {
    summary += `Identificados ${borderlineCount} marcador(es) em faixa limítrofe que merecem atenção. `
  } else {
    summary += `Todos os marcadores dentro dos parâmetros analisados. `
  }

  summary += `Interpretação baseada em medicina funcional e valores de referência otimizados.`
  
  if (symptoms) {
    summary += ` Sintomas relatados foram considerados na análise.`
  }

  return summary
}

function generateRealRecommendations(results: LabResult[]): string[] {
  const recommendations: string[] = []
  
  results.forEach(result => {
    if (result.status === 'abnormal' || result.status === 'borderline') {
      const name = result.name.toLowerCase()
      
      if (name.includes('vitamina d')) {
        recommendations.push('Suplementação de Vitamina D3 com monitoramento')
      } else if (name.includes('ferritina') || name.includes('ferro')) {
        recommendations.push('Investigar causa da deficiência de ferro')
        recommendations.push('Suplementação de ferro com acompanhamento')
      } else if (name.includes('tsh')) {
        recommendations.push('Avaliação tireoidiana completa (T3, T4, anticorpos)')
      } else if (name.includes('b12')) {
        recommendations.push('Suplementação de vitamina B12')
      } else {
        recommendations.push(`Monitorar ${result.name} e considerar intervenção`)
      }
    }
  })

  if (recommendations.length === 0) {
    recommendations.push('Manter hábitos saudáveis atuais')
    recommendations.push('Reavaliação periódica preventiva')
  }

  return recommendations.slice(0, 6)
}

function generateRealFunctionalInsights(results: LabResult[]): string[] {
  const insights: string[] = []
  
  const hasNutritionalDeficiencies = results.some(r => 
    (r.name.toLowerCase().includes('vitamina') || r.name.toLowerCase().includes('ferro')) && 
    r.status !== 'optimal'
  )
  
  const hasHormonal = results.some(r => 
    r.name.toLowerCase().includes('tsh') && r.status !== 'optimal'
  )
  
  if (hasNutritionalDeficiencies) {
    insights.push('Deficiências nutricionais identificadas podem impactar energia e bem-estar')
  }
  
  if (hasHormonal) {
    insights.push('Alterações hormonais podem estar relacionadas aos sintomas apresentados')
  }
  
  if (results.length > 1) {
    insights.push('Análise integrativa permite identificar padrões entre diferentes marcadores')
  }
  
  insights.push('Medicina funcional considera valores ótimos além dos padrões convencionais')
  
  return insights.slice(0, 4)
}

function generateRealRiskFactors(results: LabResult[]): string[] {
  const risks: string[] = []
  
  results.forEach(result => {
    if (result.status === 'abnormal') {
      const name = result.name.toLowerCase()
      
      if (name.includes('vitamina d')) {
        risks.push('Deficiência de vitamina D aumenta risco de infecções')
      } else if (name.includes('ferro') || name.includes('ferritina')) {
        risks.push('Baixo ferro pode evoluir para anemia ferropriva')
      } else if (name.includes('tsh')) {
        risks.push('Alteração tireoidiana pode afetar metabolismo')
      }
    }
  })
  
  if (risks.length === 0) {
    risks.push('Perfil laboratorial atual não indica riscos imediatos')
  }
  
  return risks.slice(0, 5)
}

function generateRealFollowUp(results: LabResult[]): string {
  const highPriorityCount = results.filter(r => r.priority === 'high').length
  
  let followUp = ''
  
  if (highPriorityCount > 0) {
    followUp = `Reavaliação recomendada em 6-8 semanas para ${highPriorityCount} marcador(es) alterado(s). `
  } else {
    followUp = 'Acompanhamento de rotina em 3-6 meses. '
  }
  
  followUp += 'Correlacionar achados laboratoriais com quadro clínico. '
  followUp += 'Implementar mudanças gradualmente e monitorar resposta.'
  
  return followUp
}

async function generateAIAnalysis(results: LabResult[], symptoms: string = '', labConfig: any, apiKeys: any, companyId?: string) {
  // Obter company real do banco se possível, senão criar um mock temporário
  let company
  if (companyId) {
    company = await Company.findById(companyId)
  }
  
  // Se não encontrou company ou não foi fornecido companyId, usar mock
  if (!company) {
    company = { 
      _id: new mongoose.Types.ObjectId(), // ObjectId válido
      settings: { 
        aiProviders: {
          openai: apiKeys.openai ? { apiKey: apiKeys.openai } : undefined,
          anthropic: apiKeys.anthropic ? { apiKey: apiKeys.anthropic } : undefined,
          google: apiKeys.google ? { apiKey: apiKeys.google } : undefined
        }
      }
    }
  }
  
  const aiService = new AIService(company as any)
  
  // Preparar dados para a IA
  const resultsText = results.map(r => 
    `${r.name}: ${r.value}${r.unit} (Referência: ${r.referenceRange}, Status: ${r.status}, Prioridade: ${r.priority})`
  ).join('\n')
  
  const analysisData = {
    patientData: {
      context: 'Paciente feminina - medicina funcional',
      symptoms: symptoms || 'Não informados'
    },
    examData: resultsText,
    previousAnalyses: [],
    ragContext: ''
  }

  const startTime = Date.now()

  try {
    // Gerar análise com IA configurada
    const aiResponse = await aiService.generateAnalysis(
      'laboratory',
      analysisData
    )

    const processingTime = Date.now() - startTime

    // Parse da resposta da IA para extrair seções
    const analysis = parseAIResponse(aiResponse)

    // Retornar análise e metadados
    return {
      analysis,
      metadata: {
        provider: labConfig.provider || 'openai',
        model: labConfig.model || 'gpt-4o-mini',
        promptVersion: labConfig.promptVersion || '1.0',
        tokensUsed: 0, // TODO: implementar contagem real de tokens
        processingTime,
        cost: 0 // TODO: implementar cálculo real de custo
      }
    }
  } catch (error) {
    console.error('Erro na geração de análise com IA:', error)
    
    // Fallback para análise simples em caso de erro
    const simpleAnalysis = generateSimpleAnalysis(results, symptoms)
    
    return {
      analysis: {
        summary: simpleAnalysis.summary,
        recommendations: simpleAnalysis.recommendations,
        functionalInsights: simpleAnalysis.functionalInsights,
        riskFactors: simpleAnalysis.riskFactors,
        followUp: simpleAnalysis.followUp
      },
      metadata: {
        provider: 'openai',
        model: 'fallback-simple-error',
        promptVersion: '1.0',
        tokensUsed: 0,
        processingTime: Date.now() - startTime,
        cost: 0
      }
    }
  }
}

function generateSimpleAnalysis(results: LabResult[], symptoms?: string): AnalysisResult {
  const summary = generateRealSummary(results, symptoms)
  const recommendations = generateRealRecommendations(results)
  const functionalInsights = generateRealFunctionalInsights(results)
  const riskFactors = generateRealRiskFactors(results)
  const followUp = generateRealFollowUp(results)

  return {
    summary,
    results,
    recommendations,
    functionalInsights,
    riskFactors,
    followUp
  }
}

function parseAIResponse(aiResponse: string): Omit<AnalysisResult, 'results'> {
  // Parse estruturado da resposta da IA
  const sections = {
    summary: '',
    recommendations: [] as string[],
    functionalInsights: [] as string[],
    riskFactors: [] as string[],
    followUp: ''
  }

  // Limpar resposta da IA de possíveis artefatos
  const cleanResponse = aiResponse.trim()
  
  // Remover possíveis prefixos JSON malformados
  if (cleanResponse.startsWith('"results": [') || cleanResponse.includes('"results": [')) {
    // Se contém estrutura JSON malformada, usar fallback direto
    console.log('Resposta da IA malformada, usando análise padrão')
    return {
      summary: 'Análise laboratorial processada com base nos dados fornecidos.',
      recommendations: ['Acompanhar com profissional de saúde para interpretação detalhada.'],
      functionalInsights: ['Análise realizada considerando princípios da medicina funcional.'],
      riskFactors: ['Avaliar contexto clínico completo para identificação de riscos.'],
      followUp: 'Recomenda-se acompanhamento médico regular e reavaliação conforme necessário.'
    }
  }

  try {
    // Tentar parse JSON primeiro
    const parsed = JSON.parse(cleanResponse)
    if (parsed.summary) sections.summary = parsed.summary
    if (parsed.recommendations) sections.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [parsed.recommendations]
    if (parsed.functionalInsights) sections.functionalInsights = Array.isArray(parsed.functionalInsights) ? parsed.functionalInsights : [parsed.functionalInsights]
    if (parsed.riskFactors) sections.riskFactors = Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [parsed.riskFactors]
    if (parsed.followUp) sections.followUp = parsed.followUp
  } catch {
    // Parse por seções de texto se JSON falhar
    const lines = aiResponse.split('\n')
    let currentSection = ''
    
    lines.forEach(line => {
      const trimmed = line.trim()
      if (!trimmed) return
      
      if (trimmed.toLowerCase().includes('resumo') || trimmed.toLowerCase().includes('summary')) {
        currentSection = 'summary'
      } else if (trimmed.toLowerCase().includes('recomenda') || trimmed.toLowerCase().includes('recommendations')) {
        currentSection = 'recommendations'
      } else if (trimmed.toLowerCase().includes('insights') || trimmed.toLowerCase().includes('funcional')) {
        currentSection = 'functionalInsights'
      } else if (trimmed.toLowerCase().includes('risco') || trimmed.toLowerCase().includes('risk')) {
        currentSection = 'riskFactors'
      } else if (trimmed.toLowerCase().includes('acompanha') || trimmed.toLowerCase().includes('follow')) {
        currentSection = 'followUp'
      } else if (currentSection && trimmed.length > 10) {
        // Adicionar conteúdo à seção atual
        if (currentSection === 'summary' && !sections.summary) {
          sections.summary = trimmed
        } else if (currentSection === 'followUp' && !sections.followUp) {
          sections.followUp = trimmed
        } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
          const content = trimmed.replace(/^[-•*]\s*/, '')
          if (currentSection === 'recommendations') sections.recommendations.push(content)
          else if (currentSection === 'functionalInsights') sections.functionalInsights.push(content)
          else if (currentSection === 'riskFactors') sections.riskFactors.push(content)
        }
      }
    })
  }

  // Fallbacks se seções vazias
  if (!sections.summary) {
    sections.summary = 'Análise laboratorial processada com base nos dados fornecidos.'
  }
  
  if (sections.recommendations.length === 0) {
    sections.recommendations = ['Acompanhar com profissional de saúde para interpretação detalhada.']
  }
  
  if (sections.functionalInsights.length === 0) {
    sections.functionalInsights = ['Análise realizada considerando princípios da medicina funcional.']
  }
  
  if (sections.riskFactors.length === 0) {
    sections.riskFactors = ['Avaliar contexto clínico completo para identificação de riscos.']
  }
  
  if (!sections.followUp) {
    sections.followUp = 'Recomenda-se acompanhamento médico regular e reavaliação conforme necessário.'
  }

  return sections
}

 