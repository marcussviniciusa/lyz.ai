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
  
  // Verificar se está em modo de impressão
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const isPrintMode = searchParams.get('print') === 'true'

  useEffect(() => {
    if (params.id) {
      loadPlan(params.id as string)
    }
  }, [params.id])

  const loadPlan = async (planId: string) => {
    try {
      const response = await fetch(`/api/delivery/plans/${planId}`)
      
      if (!response.ok) {
        throw new Error('Plano não encontrado')
      }
      
      const data = await response.json()
      setPlan(data.plan)
    } catch (error) {
      console.error('Erro ao carregar plano:', error)
      alert('Não foi possível carregar o plano')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      setDownloading(true)
      console.log('🎯 Iniciando download do PDF...')
      
      const response = await fetch(`/api/delivery/plans/${params.id}/pdf`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        console.error('❌ Erro na resposta:', errorData)
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
      }
      
      const blob = await response.blob()
      console.log('📄 PDF blob criado, tamanho:', blob.size)
      
      if (blob.size === 0) {
        throw new Error('PDF gerado está vazio')
      }
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `plano-integrado-${plan?.patient.name || 'paciente'}-${new Date().toISOString().split('T')[0]}.pdf`
      
      document.body.appendChild(a)
      a.click()
      
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('✅ Download concluído com sucesso!')
      
    } catch (error) {
      console.error('❌ Erro no download:', error)
      
      // Mostrar erro mais específico para o usuário
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao gerar PDF'
      
      // Você pode adicionar aqui um toast ou modal de erro
      alert(`Erro ao gerar PDF: ${errorMessage}`)
      
    } finally {
      setDownloading(false)
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
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando plano...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Plano não encontrado</h1>
          <p className="text-gray-600 mb-6">O plano solicitado não existe ou foi removido.</p>
          <Button onClick={() => router.push('/delivery')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Entrega
          </Button>
        </div>
      </div>
    )
  }

  const statusInfo = statusLabels[plan.status] || { label: plan.status, color: 'bg-gray-100 text-gray-800' }

  return (
    <>
      {/* Estilos específicos para impressão */}
      {isPrintMode && (
        <style jsx global>{`
          @media print {
            body { margin: 0; padding: 0; }
            .container { max-width: none !important; margin: 0 !important; padding: 20px !important; }
            .grid { grid-template-columns: 1fr !important; }
            .break-inside-avoid { break-inside: avoid; }
            .break-before { break-before: page; }
          }
          
          .print-layout {
            background: white;
            min-height: 100vh;
            font-family: 'Times New Roman', serif;
          }
          
          .print-layout h1, .print-layout h2, .print-layout h3 {
            color: #1f2937 !important;
          }
          
          .print-layout .card {
            border: 1px solid #e5e7eb;
            box-shadow: none;
            margin-bottom: 20px;
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {downloading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
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
        <Card>
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
        <Card>
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
        <Card>
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
      <Card className="mb-6">
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
              <div key={analysis._id} className="border border-gray-200 rounded-lg overflow-hidden">
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
                          fontSize: '14px'
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
      <Card>
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