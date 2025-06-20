'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
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

export default function PatientAnalysesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Buscar dados do paciente
        const patientResponse = await fetch(`/api/patients/${resolvedParams.id}`)
        if (!patientResponse.ok) {
          throw new Error('Erro ao carregar dados do paciente')
        }
        const patientData = await patientResponse.json()
        setPatient(patientData)

        // Buscar análises do paciente
        const analysesResponse = await fetch(`/api/analyses?patientId=${resolvedParams.id}`)
        if (!analysesResponse.ok) {
          throw new Error('Erro ao carregar análises')
        }
        const analysesData = await analysesResponse.json()
        const arr = analysesData.data || analysesData.analyses || analysesData || []
        setAnalyses(
          Array.isArray(arr)
            ? arr.map((a) => ({
                _id: a._id,
                type: a.type,
                description: a.description || '',
                result: typeof a.result === 'string' ? a.result : (a.result?.rawOutput || ''),
                recommendations: a.recommendations || a.result?.recommendations || [],
                status: a.status,
                professional: typeof a.professional === 'object' ? (a.professional?.name || '') : (a.professional || ''),
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
              }))
            : []
        )
      } catch (err) {
        console.error('Erro ao buscar dados:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    if (resolvedParams.id) {
      fetchData()
    }
  }, [resolvedParams.id])

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

  // Função para lidar com seleção/deseleção
  const handleSelectAnalysis = (id: string) => {
    setSelectedAnalyses((prev) =>
      prev.includes(id) ? prev.filter((aid) => aid !== id) : [...prev, id]
    )
  }

  // Função para selecionar/desmarcar todas
  const handleSelectAll = () => {
    if (selectedAnalyses.length === analyses.length) {
      setSelectedAnalyses([])
    } else {
      setSelectedAnalyses(analyses.map((a) => a._id))
    }
  }

  // Função para gerar PDF (chama endpoint futuro)
  const handleGeneratePDF = async () => {
    if (selectedAnalyses.length === 0) return
    try {
      const response = await fetch('/api/delivery/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisIds: selectedAnalyses, patientId: resolvedParams.id })
      })
      if (response.ok) {
        // Redireciona para /delivery após gerar
        router.push('/delivery')
      } else {
        alert('Erro ao gerar PDF do plano')
      }
    } catch (err) {
      alert('Erro ao gerar PDF do plano')
    }
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
            <Link href={`/patients/${resolvedParams.id}`} className="hover:text-gray-900">
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
            onClick={() => router.push(`/patients/${resolvedParams.id}`)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Voltar ao Paciente
          </button>
          <button
            onClick={() => router.push(`/patients/${resolvedParams.id}/analyses/new`)}
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

      {/* Botão de geração de PDF */}
      {analyses.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <button
              className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 mr-2"
              onClick={handleSelectAll}
            >
              {selectedAnalyses.length === analyses.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </button>
            <span className="text-sm text-gray-600">{selectedAnalyses.length} selecionada(s)</span>
          </div>
          <button
            className={`px-4 py-2 rounded text-white font-semibold transition-colors ${selectedAnalyses.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            disabled={selectedAnalyses.length === 0}
            onClick={handleGeneratePDF}
          >
            Gerar Plano em PDF
          </button>
        </div>
      )}

      {/* Analyses List */}
      {analyses.length > 0 ? (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div key={analysis._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow flex">
              <div className="flex items-start p-6">
                <input
                  type="checkbox"
                  className="mr-4 mt-2 h-5 w-5 accent-blue-600"
                  checked={selectedAnalyses.includes(analysis._id)}
                  onChange={() => handleSelectAnalysis(analysis._id)}
                  aria-label="Selecionar análise"
                />
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
                      Ver Resultados
                    </button>
                    {analysis.status === 'pending' && (
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
                            router.push(`${route}?patientId=${resolvedParams.id}&analysisId=${analysis._id}`)
                          }
                        }}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Executar
                      </button>
                    )}
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
            onClick={() => router.push(`/patients/${resolvedParams.id}/analyses/new`)}
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