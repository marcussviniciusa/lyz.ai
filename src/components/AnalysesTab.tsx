'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Analysis {
  _id: string
  type: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatment'
  description: string
  result: string
  recommendations: string[]
  status: 'pending' | 'in_progress' | 'completed'
  professional: string
  createdAt: string
  updatedAt: string
}

interface AnalysesTabProps {
  patientId: string
}

export default function AnalysesTab({ patientId }: AnalysesTabProps) {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/analyses?patientId=${patientId}`)
        if (!response.ok) {
          throw new Error('Erro ao carregar análises')
        }
        const data = await response.json()
        setAnalyses(data)
      } catch (err) {
        console.error('Erro ao buscar análises:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyses()
  }, [patientId])

  const getAnalysisTypeLabel = (type: string) => {
    const labels = {
      laboratory: 'Laboratorial',
      tcm: 'Medicina Tradicional Chinesa',
      chronology: 'Cronologia',
      ifm: 'Medicina Funcional',
      treatment: 'Tratamento'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getAnalysisTypeIcon = (type: string) => {
    const icons = {
      laboratory: '🔬',
      tcm: '🏮',
      chronology: '📅',
      ifm: '🧬',
      treatment: '💊'
    }
    return icons[type as keyof typeof icons] || '📊'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      completed: 'Concluída'
    }
    return labels[status as keyof typeof labels] || status
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">Análises</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">Análises</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Análises</h2>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/patients/${patientId}/analyses`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Ver Todas
          </button>
          <button
            onClick={() => router.push(`/patients/${patientId}/analyses/new`)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Nova Análise
          </button>
        </div>
      </div>

      {analyses.length > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-600">{analyses.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {analyses.filter(a => a.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Concluídas</div>
            </div>
            <div className="text-center bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {analyses.filter(a => a.status === 'in_progress').length}
              </div>
              <div className="text-sm text-gray-600">Em Andamento</div>
            </div>
            <div className="text-center bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {analyses.filter(a => a.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pendentes</div>
            </div>
          </div>

          {/* Recent Analyses */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Análises Recentes</h3>
            {analyses.slice(0, 3).map((analysis) => (
              <div key={analysis._id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(analysis.status)}`}></div>
                    <div>
                      <h4 className="font-medium text-gray-900">{getAnalysisTypeLabel(analysis.type)}</h4>
                      <p className="text-sm text-gray-600">
                        {format(new Date(analysis.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(analysis.status)}`}>
                      {getStatusLabel(analysis.status)}
                    </span>
                    {analysis.status === 'pending' ? (
                      <button
                        onClick={() => {
                          // Redirecionar para execução da análise
                          const analysisRoutes: { [key: string]: string } = {
                            'laboratory': '/analyses/laboratory',
                            'tcm': '/analyses/tcm', 
                            'chronology': '/analyses/chronology',
                            'ifm': '/analyses/ifm',
                            'treatment': '/analyses/treatment-plan'
                          }
                          const route = analysisRoutes[analysis.type]
                          if (route) {
                            router.push(`${route}?patientId=${patientId}&analysisId=${analysis._id}`)
                          }
                        }}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Executar →
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/analyses/${analysis._id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver Resultados →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {analyses.length > 3 && (
              <div className="text-center py-4">
                <button
                  onClick={() => router.push(`/patients/${patientId}/analyses`)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver Todas as Análises →
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-600">Nenhuma análise encontrada.</p>
        </div>
      )}
    </div>
  )
}
