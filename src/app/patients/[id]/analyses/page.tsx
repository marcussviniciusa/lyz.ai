'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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

interface Patient {
  _id: string
  name: string
}

export default function PatientAnalysesPage() {
  const params = useParams()
  const router = useRouter()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Buscar dados do paciente
        const patientResponse = await fetch(`/api/patients/${params.id}`)
        if (!patientResponse.ok) {
          throw new Error('Erro ao carregar dados do paciente')
        }
        const patientData = await patientResponse.json()
        setPatient(patientData)

        // Buscar análises do paciente
        const analysesResponse = await fetch(`/api/analyses?patientId=${params.id}`)
        if (!analysesResponse.ok) {
          throw new Error('Erro ao carregar análises')
        }
        const analysesData = await analysesResponse.json()
        setAnalyses(analysesData)
      } catch (err) {
        console.error('Erro ao buscar dados:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchData()
    }
  }, [params.id])

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
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Erro</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-sm text-gray-600 mb-2">
            <Link href="/patients" className="hover:text-gray-900">Pacientes</Link>
            <span className="mx-2">/</span>
            <Link href={`/patients/${params.id}`} className="hover:text-gray-900">
              {patient?.name}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">Análises</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">
            Análises de {patient?.name}
          </h1>
          <p className="text-gray-600 mt-1">
            {analyses.length} {analyses.length === 1 ? 'análise encontrada' : 'análises encontradas'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/patients/${params.id}`)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Voltar ao Paciente
          </button>
          <button
            onClick={() => router.push(`/patients/${params.id}/analyses/new`)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Nova Análise
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
            <button className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200">
              Todas
            </button>
            <button className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200">
              Laboratorial
            </button>
            <button className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200">
              MTC
            </button>
            <button className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200">
              Funcional
            </button>
          </div>
        </div>
      </div>

      {/* Analyses List */}
      {analyses.length > 0 ? (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div key={analysis._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{getAnalysisTypeIcon(analysis.type)}</span>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {getAnalysisTypeLabel(analysis.type)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Criada em {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Descrição:</h4>
                      <p className="text-gray-600 text-sm">{analysis.description}</p>
                    </div>

                    {analysis.result && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Resultado:</h4>
                        <p className="text-gray-600 text-sm line-clamp-3">{analysis.result}</p>
                      </div>
                    )}

                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Recomendações:</h4>
                        <ul className="text-gray-600 text-sm space-y-1">
                          {analysis.recommendations.slice(0, 3).map((rec, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                          {analysis.recommendations.length > 3 && (
                            <li className="text-gray-500 text-xs">
                              ... e mais {analysis.recommendations.length - 3} recomendações
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>ID: {analysis._id}</span>
                      <span>•</span>
                      <span>Profissional: {analysis.professional}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(analysis.status)}`}>
                      {getStatusLabel(analysis.status)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/analyses/${analysis._id}`)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => router.push(`/analyses/${analysis._id}/edit`)}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Nenhuma análise encontrada
          </h3>
          <p className="text-gray-600 mb-6">
            Este paciente ainda não possui análises registradas.
          </p>
          <button
            onClick={() => router.push(`/patients/${params.id}/analyses/new`)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Criar Primeira Análise
          </button>
        </div>
      )}

      {/* Summary Stats */}
      {analyses.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resumo das Análises</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analyses.filter(a => a.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Concluídas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analyses.filter(a => a.status === 'in_progress').length}
              </div>
              <div className="text-sm text-gray-600">Em Andamento</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {analyses.filter(a => a.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pendentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {analyses.length}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 