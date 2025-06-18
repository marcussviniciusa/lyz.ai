'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeftIcon, UserIcon, CalendarIcon, ClockIcon, AlertTriangleIcon, CheckCircleIcon, AlertCircleIcon, EditIcon, SaveIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import DashboardLayout from '@/components/DashboardLayout'

// Função para renderizar markdown simples
const renderMarkdown = (text: string) => {
  if (!text) return '';
  
  // First, let's handle tables
  let processedText = text.replace(/\|(.+)\|/g, (match, content) => {
    const row = content.split('|').map((cell: string) => cell.trim());
    return `<tr>${row.map((cell: string) => `<td class="border border-gray-300 px-3 py-2">${cell}</td>`).join('')}</tr>`;
  });

  // Wrap table rows in table
  processedText = processedText.replace(/(<tr>.*?<\/tr>\s*)+/g, (match) => {
    return `<table class="w-full border-collapse border border-gray-300 my-6">${match}</table>`;
  });
  
  let html = processedText
    // Remove múltiplas quebras de linha consecutivas
    .replace(/\n{3,}/g, '\n\n')
    // Headers (ordem importa - 4 hashtags primeiro)
    .replace(/^#### (.*$)/gim, '<h4 class="text-base font-medium mb-3 mt-6 text-gray-800">$1</h4>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-4 mt-8 text-gray-900">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-6 mt-10 text-gray-900 border-b-2 border-gray-200 pb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-8 mt-12 text-gray-900">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="my-8 border-gray-300">')
    // Process different levels of lists
    .replace(/^    - (.+)$/gim, '<li class="ml-12 mb-1 list-disc text-sm">$1</li>') // 4 spaces = sublista
    .replace(/^  - (.+)$/gim, '<li class="ml-9 mb-1 list-disc">$1</li>')             // 2 spaces = sublista
    .replace(/^- (.+)$/gim, '<li class="ml-6 mb-2 list-disc">$1</li>')               // lista principal
    // Agrupa listas consecutivas em <ul>
    .replace(/(<li[^>]*>.*?<\/li>\s*)+/g, (match) => {
      return `<ul class="mb-4 space-y-1">${match}</ul>`;
    })
    // Remove linhas que contêm apenas "#" 
    .replace(/^#\s*$/gm, '')
    // Parágrafos - divide por dupla quebra de linha
    .split('\n\n')
    .map(paragraph => {
      paragraph = paragraph.trim();
      // Se já contém tags HTML (headers, listas, tabelas), não envolve em <p>
      if (paragraph.includes('<h') || paragraph.includes('<ul') || paragraph.includes('<li') || paragraph.includes('<table') || paragraph.includes('<hr') || !paragraph) {
        return paragraph;
      }
      // Senão, envolve em parágrafo
      return `<p class="mb-4 text-gray-800 leading-relaxed">${paragraph.replace(/\n/g, '<br/>')}</p>`;
    })
    .filter(paragraph => paragraph.trim() !== '') // Remove parágrafos vazios
    .join('\n');
  
  return html;
};

interface Analysis {
  _id: string
  type: string
  status: string
  patient?: {
    _id: string
    name: string
    dateOfBirth: string
  }
  professional?: {
    _id: string
    name: string
    email: string
  }
  result?: {
    rawOutput?: string
    laboratoryAnalysis?: any
    tcmAnalysis?: any
    chronologyAnalysis?: any
    ifmAnalysis?: any
    treatmentPlan?: any
  }
  aiMetadata?: {
    provider: string
    model: string
    tokensUsed: number
    processingTime: number
    cost: number
  }
  createdAt: string
  updatedAt: string
}

interface LabResult {
  name: string
  value: string
  unit: string
  referenceRange: string
  functionalRange: string
  status: 'normal' | 'abnormal' | 'borderline' | 'optimal'
  interpretation: string
  priority: 'low' | 'medium' | 'high'
}

interface LaboratoryAnalysisResult {
  summary: string
  results: LabResult[]
  recommendations: string[]
  functionalInsights: string[]
  riskFactors: string[]
  followUp: string
}

export default function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const fetchAnalysis = useCallback(async () => {
    try {
      const response = await fetch(`/api/analyses/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
      } else {
        setError('Erro ao carregar análise')
      }
    } catch (error) {
      console.error('Erro:', error)
      setError('Erro ao carregar análise')
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  const handleStartEdit = () => {
    if (analysis?.result?.rawOutput) {
      setEditedContent(analysis.result.rawOutput)
      setIsEditing(true)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedContent('')
  }

  const handleSaveEdit = async () => {
    if (!analysis || !editedContent.trim()) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/analyses/${analysis._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result: {
            ...analysis.result,
            rawOutput: editedContent.trim()
          }
        })
      })

      if (response.ok) {
        const updatedAnalysis = await response.json()
        setAnalysis(updatedAnalysis)
        setIsEditing(false)
        setEditedContent('')
        alert('Análise atualizada com sucesso!')
      } else {
        throw new Error('Erro ao salvar alterações')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar alterações. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const getAnalysisTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      laboratory: 'Análise Laboratorial',
      tcm: 'Medicina Tradicional Chinesa',
      chronology: 'Cronologia',
      ifm: 'Matriz IFM',
      treatmentPlan: 'Plano de Tratamento',
      treatment: 'Plano de Tratamento'
    }
    return types[type] || type
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'Pendente',
      processing: 'Processando',
      completed: 'Concluída',
      error: 'Erro'
    }
    return labels[status] || status
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangleIcon className="w-4 h-4 text-red-500" />
      case 'medium':
        return <AlertCircleIcon className="w-4 h-4 text-yellow-500" />
      default:
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
    }
  }

  const getPriorityLabel = (priority: string) => {
    const labels: { [key: string]: string } = {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa'
    }
    return labels[priority] || priority
  }

  const getLabStatusColor = (status: string) => {
    switch (status) {
      case 'abnormal':
        return 'text-red-600 bg-red-50'
      case 'borderline':
        return 'text-yellow-600 bg-yellow-50'
      case 'optimal':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-green-600 bg-green-50'
    }
  }

  const getLabStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      normal: 'Normal',
      abnormal: 'Alterado',
      borderline: 'Limítrofe',
      optimal: 'Ótimo'
    }
    return labels[status] || status
  }

  const renderLaboratoryResults = (rawOutput: string) => {
    try {
      const data: LaboratoryAnalysisResult = JSON.parse(rawOutput)
      
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
                    {data.results.map((result, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">{result.name}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <span className="font-semibold">{result.value}</span>
                          {result.unit && <span className="text-gray-600 ml-1">{result.unit}</span>}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-600">
                          {result.referenceRange || 'N/A'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-600">
                          {result.functionalRange || 'N/A'}
                        </td>
                                                 <td className="border border-gray-300 px-4 py-2 text-center">
                           <Badge className={`${getLabStatusColor(result.status)} border-0`}>
                             {getLabStatusLabel(result.status)}
                           </Badge>
                         </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getPriorityIcon(result.priority)}
                            <span className="text-sm">{getPriorityLabel(result.priority)}</span>
                          </div>
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
                {data.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-green-800 text-sm flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    {recommendation}
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
                {data.functionalInsights.map((insight, index) => (
                  <li key={index} className="text-purple-800 text-sm flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
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
                {data.riskFactors.map((risk, index) => (
                  <li key={index} className="text-red-800 text-sm flex items-start gap-2">
                    <AlertTriangleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !analysis) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {error || 'Análise não encontrada'}
            </h2>
            <Link href="/analyses">
              <Button>Voltar para análises</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const patientId = analysis.patient?._id || ''
  const patientName = analysis.patient?.name || 'Paciente não identificado'
  const professionalName = analysis.professional?.name || 'Profissional não identificado'

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        {patientId && (
          <Link href={`/patients/${patientId}`}>
            <Button variant="outline" size="icon">
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
          </Link>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {getAnalysisTypeLabel(analysis.type)}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span className="flex items-center gap-1">
              <UserIcon className="w-4 h-4" />
              {patientName}
            </span>
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              {format(new Date(analysis.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              {format(new Date(analysis.createdAt), 'HH:mm', { locale: ptBR })}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor(analysis.status)}>
            {getStatusLabel(analysis.status)}
          </Badge>
          <Badge variant="outline">
            {getAnalysisTypeLabel(analysis.type)}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Análise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Tipo</h4>
                <p className="text-sm">{getAnalysisTypeLabel(analysis.type)}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Status</h4>
                <p className="text-sm">{getStatusLabel(analysis.status)}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Paciente</h4>
                {patientId ? (
                  <Link href={`/patients/${patientId}`} className="text-sm text-blue-600 hover:underline">
                    {patientName}
                  </Link>
                ) : (
                  <p className="text-sm text-gray-500">{patientName}</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Profissional</h4>
                <p className="text-sm">{professionalName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metadados da IA */}
        {analysis.aiMetadata && (
          <Card>
            <CardHeader>
              <CardTitle>Metadados da IA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-700">Provedor</h4>
                  <p>{analysis.aiMetadata.provider}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700">Modelo</h4>
                  <p>{analysis.aiMetadata.model}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700">Tokens Utilizados</h4>
                  <p>{analysis.aiMetadata.tokensUsed.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700">Tempo de Processamento</h4>
                  <p>{analysis.aiMetadata.processingTime}s</p>
                </div>
              </div>
              {analysis.aiMetadata.cost > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm text-gray-700">Custo</h4>
                  <p className="text-sm">US$ {analysis.aiMetadata.cost.toFixed(4)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultado da Análise */}
        {analysis.result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Resultado da Análise</CardTitle>
                {analysis.result.rawOutput && !isEditing && (
                  <Button
                    onClick={handleStartEdit}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <EditIcon className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    placeholder="Digite o conteúdo da análise..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      size="sm"
                      disabled={saving || !editedContent.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <SaveIcon className="h-4 w-4 mr-2" />
                      )}
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {analysis.result.rawOutput ? (
                    analysis.type === 'laboratory' ? (
                      renderLaboratoryResults(analysis.result.rawOutput)
                    ) : analysis.type === 'tcm' || analysis.type === 'chronology' || analysis.type === 'ifm' || analysis.type === 'treatmentPlan' || analysis.type === 'treatment' ? (
                      <div 
                        className="prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: renderMarkdown(analysis.result.rawOutput) 
                        }}
                      />
                    ) : (
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
                          {analysis.result.rawOutput}
                        </pre>
                      </div>
                    )
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Análise ainda não processada
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <div className="flex justify-between items-center">
          {patientId ? (
            <Link href={`/patients/${patientId}`}>
              <Button variant="outline">
                Voltar para Paciente
              </Button>
            </Link>
          ) : (
            <Link href="/analyses">
              <Button variant="outline">
                Voltar para Análises
              </Button>
            </Link>
          )}
          
          {analysis.status === 'pending' && (
            <div className="text-sm text-gray-500 italic">
              Esta análise foi criada mas ainda não foi executada
            </div>
          )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
} 