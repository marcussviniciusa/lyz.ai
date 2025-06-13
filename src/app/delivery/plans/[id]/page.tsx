'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  ArrowLeft, 
  FileText, 
  User, 
  Clock,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react'

interface DeliveryPlan {
  _id: string
  patient: {
    _id: string
    name: string
    email: string
    phone?: string
  }
  professional: {
    _id: string
    name: string
    email: string
  }
  analyses: Array<{
    _id: string
    type: string
    status: string
    createdAt: string
    result?: {
      rawOutput: string
    }
  }>
  pdfFile: {
    key: string
    url: string
    size: number
    generatedAt: string
  }
  title: string
  description?: string
  status: string
  deliveryMethod?: string
  deliveredAt?: string
  viewedAt?: string
  createdAt: string
  updatedAt: string
}

const analysisTypeLabels: Record<string, string> = {
  laboratory: 'Análise Laboratorial',
  tcm: 'Medicina Tradicional Chinesa',
  chronology: 'Cronologia de Saúde',
  ifm: 'Matriz de Medicina Funcional',
  treatment: 'Plano de Tratamento',
  treatmentPlan: 'Plano de Tratamento'
}

const statusLabels: Record<string, { label: string; color: string }> = {
  generated: { label: 'Gerado', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800' },
  viewed_by_patient: { label: 'Visualizado', color: 'bg-purple-100 text-purple-800' },
  archived: { label: 'Arquivado', color: 'bg-gray-100 text-gray-800' }
}

// Função para renderizar markdown simples
function renderMarkdown(text: string): string {
  if (!text) return ''
  
  // Limpar o texto primeiro
  let cleanText = text.trim()
  
  // Dividir em parágrafos por quebras duplas
  const paragraphs = cleanText.split(/\n\s*\n/)
  const processedParagraphs: string[] = []
  
  paragraphs.forEach(paragraph => {
    if (!paragraph.trim()) return
    
    const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line)
    const processedLines: string[] = []
    
    lines.forEach(line => {
      // Headers
      if (line.startsWith('#### ')) {
        processedLines.push(`<h4 class="text-base font-semibold mt-6 mb-3 text-gray-900">${line.substring(5)}</h4>`)
      } else if (line.startsWith('### ')) {
        processedLines.push(`<h3 class="text-lg font-semibold mt-8 mb-4 text-gray-900">${line.substring(4)}</h3>`)
      } else if (line.startsWith('## ')) {
        processedLines.push(`<h2 class="text-xl font-semibold mt-8 mb-4 text-gray-900">${line.substring(3)}</h2>`)
      } else if (line.startsWith('# ')) {
        processedLines.push(`<h1 class="text-2xl font-bold mt-8 mb-6 text-gray-900">${line.substring(2)}</h1>`)
      }
      // Listas com bullet points
      else if (line.startsWith('• ') || line.startsWith('- ')) {
        const content = line.substring(2)
        const formattedContent = content
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>')
        processedLines.push(`<div class="ml-4 mb-2 flex items-start"><span class="text-blue-600 mr-3 mt-1 flex-shrink-0">•</span><div class="text-gray-700 leading-relaxed">${formattedContent}</div></div>`)
      }
      // Listas numeradas
      else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)/)
        if (match) {
          const [, number, content] = match
          const formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>')
          processedLines.push(`<div class="ml-4 mb-3 flex items-start"><span class="text-blue-600 mr-3 font-medium min-w-[1.5rem] flex-shrink-0">${number}.</span><div class="text-gray-700 leading-relaxed">${formattedContent}</div></div>`)
        }
      }
      // Conclusão ou seções especiais
      else if (line.toLowerCase().startsWith('conclusão')) {
        processedLines.push(`<div class="mt-8 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg"><h4 class="text-base font-semibold mb-2 text-blue-900">${line}</h4></div>`)
      }
      // Texto normal
      else {
        const formattedContent = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>')
        processedLines.push(`<p class="mb-3 text-gray-700 leading-relaxed">${formattedContent}</p>`)
      }
    })
    
    if (processedLines.length > 0) {
      processedParagraphs.push(`<div class="mb-4">${processedLines.join('')}</div>`)
    }
  })
  
  return processedParagraphs.join('')
}

// Função para renderizar resultados laboratoriais estruturados
function renderLaboratoryResults(rawOutput: string) {
  try {
    const data = JSON.parse(rawOutput)
    
    return (
      <div className="space-y-6">
        {/* Resumo */}
        {data.summary && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Resumo da Análise</h4>
            <p className="text-blue-800 text-sm">{data.summary}</p>
          </div>
        )}

        {/* Tabela de Resultados */}
        {data.results && data.results.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Resultados Laboratoriais</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Exame</th>
                    <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Resultado</th>
                    <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Ref. Convencional</th>
                    <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Ref. Funcional</th>
                    <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Prioridade</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Interpretação</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((result: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium">{result.name}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {result.value} {result.unit}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                        {result.referenceRange}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                        {result.functionalRange || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <Badge 
                          variant={result.status === 'normal' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {result.status}
                        </Badge>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <Badge 
                          variant={result.priority === 'high' ? 'destructive' : result.priority === 'medium' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {result.priority}
                        </Badge>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">
                        {result.interpretation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recomendações */}
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-3">Recomendações</h4>
            <ul className="space-y-2">
              {data.recommendations.map((rec: string, index: number) => (
                <li key={index} className="text-green-800 text-sm flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Insights Funcionais */}
        {data.functionalInsights && data.functionalInsights.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-3">Insights da Medicina Funcional</h4>
            <ul className="space-y-2">
              {data.functionalInsights.map((insight: string, index: number) => (
                <li key={index} className="text-purple-800 text-sm flex items-start gap-2">
                  <Eye className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fatores de Risco */}
        {data.riskFactors && data.riskFactors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-3">Fatores de Risco</h4>
            <ul className="space-y-2">
              {data.riskFactors.map((risk: string, index: number) => (
                <li key={index} className="text-red-800 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Acompanhamento */}
        {data.followUp && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Acompanhamento</h4>
            <p className="text-gray-800 text-sm">{data.followUp}</p>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Erro ao parse do resultado laboratorial:', error)
    return (
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
          {rawOutput}
        </pre>
      </div>
    )
  }
}

export default function DeliveryPlanPage() {
  const params = useParams()
  const router = useRouter()
  const [plan, setPlan] = useState<DeliveryPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadingPage, setDownloadingPage] = useState(false)
  const [isPrintMode, setIsPrintMode] = useState(false)
  
  useEffect(() => {
    // Detectar modo de impressão
    const urlParams = new URLSearchParams(window.location.search)
    setIsPrintMode(urlParams.get('print') === 'true')
    
    if (params.id) {
      loadPlan(params.id as string)
    }
  }, [params.id])

  const loadPlan = async (planId: string) => {
    try {
      setLoading(true)
      
      // Detectar se é para geração de PDF
      const urlParams = new URLSearchParams(window.location.search)
      const isPdfGeneration = urlParams.get('pdf-access') === 'true'
      
      const url = isPdfGeneration 
        ? `/api/delivery/plans/${planId}?pdf-access=true`
        : `/api/delivery/plans/${planId}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar plano')
      }
      
      const data = await response.json()
      setPlan(data.plan)
    } catch (error) {
      console.error('Erro ao carregar plano:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!plan) return
    
    setDownloading(true)
    try {
      const response = await fetch(`/api/delivery/plans/${plan._id}/pdf`)
      
      if (!response.ok) {
        throw new Error('Erro ao gerar PDF')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `plano-${plan.patient.name.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      // Recarregar dados do plano para atualizar informações do PDF
      await loadPlan(plan._id)
    } catch (error) {
      console.error('Erro ao baixar PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadPage = async () => {
    if (!plan) return
    
    setDownloadingPage(true)
    try {
      const response = await fetch(`/api/delivery/plans/${plan._id}/pdf-page`)
      
      if (!response.ok) {
        throw new Error('Erro ao gerar PDF da página')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `plano-pagina-${plan.patient.name.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      // Recarregar dados do plano para atualizar informações do PDF
      await loadPlan(plan._id)
    } catch (error) {
      console.error('Erro ao baixar PDF da página:', error)
      alert('Erro ao gerar PDF da página. Tente novamente.')
    } finally {
      setDownloadingPage(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Plano não encontrado</h1>
          <Button onClick={() => router.push('/delivery')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  const statusInfo = statusLabels[plan.status] || { label: plan.status, color: 'bg-gray-100 text-gray-800' }

  return (
    <>
      {/* CSS específico para modo de impressão */}
      {isPrintMode && (
        <style jsx global>{`
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              font-size: 12px !important;
              line-height: 1.5 !important;
              color: black !important;
            }
            
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            
            .container {
              max-width: none !important;
              padding: 10px !important;
              margin: 0 !important;
            }
            
            .card {
              box-shadow: none !important;
              border: 1px solid #e5e7eb !important;
              margin-bottom: 15px !important;
              background: white !important;
            }
            
            /* Permitir quebra natural de página */
            .analysis-section {
              page-break-inside: auto !important;
              break-inside: auto !important;
              margin-bottom: 20px !important;
              background: white !important;
            }
            
            /* Remover quebra forçada entre análises */
            .analysis-section:not(:last-child) {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            
            /* Permitir quebra dentro do conteúdo markdown */
            .markdown-content {
              page-break-inside: auto !important;
              break-inside: auto !important;
              orphans: 2 !important;
              widows: 2 !important;
            }
            
            /* Evitar quebra apenas em títulos */
            .markdown-content h1,
            .markdown-content h2,
            .markdown-content h3,
            .markdown-content h4 {
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-top: 15px !important;
              margin-bottom: 10px !important;
              color: black !important;
            }
            
            /* Garantir que parágrafos fluam naturalmente */
            .markdown-content p,
            .markdown-content div {
              page-break-inside: auto !important;
              break-inside: auto !important;
              margin-bottom: 8px !important;
              color: black !important;
            }
            
            /* Listas devem fluir naturalmente */
            .markdown-content ul,
            .markdown-content ol,
            .markdown-content li {
              page-break-inside: auto !important;
              break-inside: auto !important;
              color: black !important;
            }
            
            /* Garantir visibilidade de todos os elementos */
            .prose {
              max-width: none !important;
              color: black !important;
            }
            
            /* Forçar renderização de conteúdo dinâmico */
            [data-pdf-ready] {
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
            }
            
            /* Garantir que todo texto seja visível */
            span, p, div, h1, h2, h3, h4, h5, h6 {
              color: black !important;
              visibility: visible !important;
              opacity: 1 !important;
            }
            
            /* Remover transformações que podem afetar o layout */
            * {
              transform: none !important;
            }
            
            /* Garantir que elementos flexbox funcionem */
            .flex {
              display: flex !important;
            }
            
            .grid {
              display: grid !important;
            }
            
            /* Otimizar espaçamento */
            .space-y-8 > * + * {
              margin-top: 20px !important;
            }
            
            .space-y-4 > * + * {
              margin-top: 10px !important;
            }
            
            /* Garantir que bordas sejam visíveis */
            .border {
              border: 1px solid #e5e7eb !important;
            }
            
            .border-gray-200 {
              border-color: #e5e7eb !important;
            }
            
            /* Backgrounds para melhor legibilidade */
            .bg-gradient-to-r {
              background: #f8fafc !important;
            }
            
            .bg-blue-50 {
              background: #eff6ff !important;
            }
            
            .bg-white {
              background: white !important;
            }
          }
          
          .print-layout {
            background: white;
            min-height: 100vh;
            font-family: 'Times New Roman', serif;
            color: black;
          }
          
          .print-layout h1, .print-layout h2, .print-layout h3 {
            color: #1f2937 !important;
          }
        `}</style>
      )}
      
      <div className={`container mx-auto p-6 max-w-6xl ${isPrintMode ? 'print-layout' : ''}`} data-pdf-ready="true">
      {/* Header - Ocultar botões no modo de impressão */}
      {!isPrintMode && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => router.push('/delivery')} 
              variant="outline" 
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{plan.title}</h1>
              <p className="text-gray-600">{plan.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            <Button 
              onClick={handleDownload}
              disabled={downloading}
              variant="outline"
              size="sm"
            >
              {downloading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF Dados
            </Button>
            <Button 
              onClick={handleDownloadPage}
              disabled={downloadingPage}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              {downloadingPage ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              PDF Página
            </Button>
          </div>
        </div>
      )}
      
      {/* Header para modo de impressão */}
      {isPrintMode && (
        <div className="mb-8 text-center border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{plan.title}</h1>
          <p className="text-gray-600 text-lg">{plan.description}</p>
          <div className="mt-4 flex justify-center">
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Informações da Paciente */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">{plan.patient.name}</p>
              <p className="text-sm text-gray-600">{plan.patient.email}</p>
              {plan.patient.phone && (
                <p className="text-sm text-gray-600">{plan.patient.phone}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações do Profissional */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profissional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">{plan.professional.name}</p>
              <p className="text-sm text-gray-600">{plan.professional.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Arquivo */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Arquivo PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Tamanho: {formatFileSize(plan.pdfFile.size)}</p>
              <p className="text-sm text-gray-600">
                Gerado: {formatDate(plan.pdfFile.generatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prévia das Análises - Exatamente como foram criadas */}
      <Card className="mb-6 card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Prévia do Conteúdo - Análises Incluídas
          </CardTitle>
          <CardDescription>
            Visualização exata do conteúdo que foi gerado nas análises
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {plan.analyses.map((analysis, index) => (
              <div key={analysis._id} className="border border-gray-200 rounded-lg overflow-hidden analysis-section">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </span>
                      {analysisTypeLabels[analysis.type] || analysis.type}
                    </h3>
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant={analysis.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {analysis.status}
                      </Badge>
                      <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                        {formatDate(analysis.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 bg-white">
                  {analysis.result?.rawOutput ? (
                    analysis.type === 'laboratory' ? (
                      renderLaboratoryResults(analysis.result.rawOutput)
                    ) : (
                      <div 
                        className="prose prose-gray max-w-none markdown-content"
                        dangerouslySetInnerHTML={{ 
                          __html: renderMarkdown(analysis.result.rawOutput) 
                        }}
                        style={{
                          lineHeight: '1.6',
                          fontSize: isPrintMode ? '12px' : '14px'
                        }}
                      />
                    )
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm italic">
                        Conteúdo da análise não disponível
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Plano Gerado</p>
                <p className="text-sm text-gray-600">{formatDate(plan.createdAt)}</p>
              </div>
            </div>
            
            {plan.deliveredAt && (
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Plano Entregue</p>
                  <p className="text-sm text-gray-600">{formatDate(plan.deliveredAt)}</p>
                </div>
              </div>
            )}
            
            {plan.viewedAt && (
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Visualizado pela Paciente</p>
                  <p className="text-sm text-gray-600">{formatDate(plan.viewedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  )
} 