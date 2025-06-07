'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface Analysis {
  _id: string
  type: string
  patientId: {
    _id: string
    name: string
  }
  createdBy: {
    _id: string
    name: string
  }
  status: string
  results: any
  reviewStatus: 'pending' | 'reviewed' | 'approved' | 'rejected'
  reviewNotes?: string
  reviewedBy?: string
  reviewedAt?: Date
  createdAt: Date
  cost: number
}

export default function ReviewsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchAnalysesForReview()
    }
  }, [session])

  const fetchAnalysesForReview = async () => {
    try {
      const response = await fetch('/api/analyses/reviews')
      if (response.ok) {
        const data = await response.json()
        setAnalyses(data.analyses)
      }
    } catch (error) {
      console.error('Erro ao carregar análises para revisão:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitReview = async () => {
    if (!selectedAnalysis) return

    try {
      const response = await fetch(`/api/analyses/${selectedAnalysis._id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewStatus,
          reviewNotes,
        }),
      })

      if (response.ok) {
        // Atualizar a lista
        fetchAnalysesForReview()
        setSelectedAnalysis(null)
        setReviewNotes('')
        setReviewStatus('approved')
      }
    } catch (error) {
      console.error('Erro ao submeter revisão:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' },
      reviewed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Revisado' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprovado' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejeitado' },
    }
    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getAnalysisTypeLabel = (type: string) => {
    const types = {
      laboratorial: 'Análise Laboratorial',
      mtc: 'Medicina Tradicional Chinesa',
      chronology: 'Cronologia',
      ifm_matrix: 'Matriz IFM',
      treatment_plan: 'Plano de Tratamento'
    }
    return types[type as keyof typeof types] || type
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando análises para revisão...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Revisão Profissional
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Revise e valide os resultados das análises de IA antes da entrega aos pacientes
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {analyses.filter(a => a.reviewStatus === 'pending').length} pendentes
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Análises */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Análises Aguardando Revisão
            </h3>
            
            {analyses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo de Análise
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criado por
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analyses.map((analysis) => (
                      <tr key={analysis._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getAnalysisTypeLabel(analysis.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analysis.patientId?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analysis.createdBy?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(analysis.reviewStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedAnalysis(analysis)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            Revisar
                          </button>
                          {analysis.reviewStatus !== 'pending' && (
                            <button className="text-gray-600 hover:text-gray-900">
                              Ver Detalhes
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Nenhuma análise pendente de revisão</p>
                <p className="text-xs text-gray-400">Todas as análises foram revisadas ou não há análises criadas</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Revisão */}
        {selectedAnalysis && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Revisar Análise: {getAnalysisTypeLabel(selectedAnalysis.type)}
                  </h3>
                  <button
                    onClick={() => setSelectedAnalysis(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Paciente:</strong> {selectedAnalysis.patientId?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Criado por:</strong> {selectedAnalysis.createdBy?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Data:</strong> {new Date(selectedAnalysis.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>

                {/* Resultados da Análise */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Resultados da Análise:</h4>
                  <div className="bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedAnalysis.results, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Formulário de Revisão */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status da Revisão
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as 'approved' | 'rejected')}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="approved">Aprovar</option>
                    <option value="rejected">Rejeitar</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas da Revisão
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Adicione suas observações sobre a análise..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedAnalysis(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submitReview}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Submeter Revisão
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 