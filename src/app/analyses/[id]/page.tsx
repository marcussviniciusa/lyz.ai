'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftIcon, UserIcon, CalendarIcon, ClockIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Analysis {
  _id: string
  type: string
  title: string
  description?: string
  status: string
  patient: {
    _id: string
    name: string
    dateOfBirth: string
  }
  professional: {
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

export default function AnalysisDetailPage({ params }: { params: { id: string } }) {
  const [analysis, setAnalysis] = useState<{
    id: string;
    type: string;
    result: string;
    createdAt: string;
    patientId: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter()

  const fetchAnalysis = useCallback(async () => {
    try {
      const response = await fetch(`/api/analyses/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
      } else {
        console.error('Erro ao carregar análise')
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  const getAnalysisTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      laboratory: 'Análise Laboratorial',
      tcm: 'Medicina Tradicional Chinesa',
      chronology: 'Cronologia',
      ifm: 'Matriz IFM',
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Análise não encontrada</h2>
          <Link href="/analyses">
            <Button>Voltar para análises</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/patients/${analysis.patientId}`}>
          <Button variant="outline" size="icon">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{analysis.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span className="flex items-center gap-1">
              <UserIcon className="w-4 h-4" />
              {analysis.patient.name}
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
                <Link href={`/patients/${analysis.patientId}`} className="text-sm text-blue-600 hover:underline">
                  {analysis.patient.name}
                </Link>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Profissional</h4>
                <p className="text-sm">{analysis.professional.name}</p>
              </div>
            </div>
            
            {analysis.description && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Descrição</h4>
                <p className="text-sm text-gray-900">{analysis.description}</p>
              </div>
            )}
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
              <CardTitle>Resultado da Análise</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.status === 'completed' ? (
                <div className="space-y-4">
                  {/* Renderizar resultado específico por tipo */}
                  {analysis.type === 'laboratory' && analysis.result.laboratoryAnalysis && (
                    <div>
                      <h4 className="font-semibold mb-2">Interpretação Laboratorial</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {analysis.result.laboratoryAnalysis.interpretation || 'Análise em processamento...'}
                        </p>
                      </div>
                    </div>
                  )}

                  {analysis.type === 'tcm' && analysis.result.tcmAnalysis && (
                    <div>
                      <h4 className="font-semibold mb-2">Diagnóstico Energético</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {analysis.result.tcmAnalysis.energeticDiagnosis || 'Análise em processamento...'}
                        </p>
                      </div>
                    </div>
                  )}

                  {analysis.type === 'treatment' && analysis.result.treatmentPlan && (
                    <div>
                      <h4 className="font-semibold mb-2">Plano de Tratamento</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {analysis.result.treatmentPlan.executiveSummary || 'Plano em processamento...'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Resultado bruto como fallback */}
                  {analysis.result.rawOutput && (
                    <div>
                      <h4 className="font-semibold mb-2">Resultado Completo</h4>
                      <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap">
                          {analysis.result.rawOutput}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    {analysis.status === 'pending' && 'Análise aguardando processamento...'}
                    {analysis.status === 'processing' && 'Análise sendo processada...'}
                    {analysis.status === 'error' && 'Ocorreu um erro durante o processamento.'}
                  </p>
                  {analysis.status === 'processing' && (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <div className="flex justify-between">
          <Link href={`/patients/${analysis.patientId}`}>
            <Button variant="outline">
              Voltar ao Paciente
            </Button>
          </Link>
          
          {analysis.status === 'pending' && (
            <Button>
              Processar Análise
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 