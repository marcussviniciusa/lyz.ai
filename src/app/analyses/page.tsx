'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface SavedAnalysis {
  _id: string
  type: string
  patient: { name: string }
  status: string
  createdAt: string
}

export default function AnalysesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([])
  const [loadingAnalyses, setLoadingAnalyses] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      loadSavedAnalyses()
    }
  }, [session])

  const loadSavedAnalyses = async () => {
    try {
      const response = await fetch('/api/analyses?limit=10')
      if (response.ok) {
        const data = await response.json()
        setSavedAnalyses(data.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar análises:', error)
    } finally {
      setLoadingAnalyses(false)
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando análises...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return null
  }

  const analysisTypes = [
    {
      id: 'laboratory',
      name: 'Análise Laboratorial',
      description: 'Interpretação inteligente de exames laboratoriais com foco em medicina funcional',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'primary'
    },
    {
      id: 'tcm',
      name: 'Medicina Tradicional Chinesa',
      description: 'Diagnóstico energético com recomendações de fitoterapia e acupuntura',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      color: 'secondary'
    },
    {
      id: 'chronology',
      name: 'Geração de Cronologia',
      description: 'Timeline inteligente da história de saúde identificando padrões',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'green'
    },
    {
      id: 'ifm-matrix',
      name: 'Matriz IFM',
      description: 'Análise dos 7 sistemas funcionais identificando causas raiz',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: 'purple'
    },
    {
      id: 'treatment-plan',
      name: 'Plano de Tratamento Final',
      description: 'Síntese integrativa de todas as análises em um plano terapêutico personalizado',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'indigo'
    }
  ]

  const getColorClasses = (color: string) => {
    const colorMap = {
      primary: 'text-primary-600 bg-primary-100 border-primary-300',
      secondary: 'text-secondary-600 bg-secondary-100 border-secondary-300',
      green: 'text-green-600 bg-green-100 border-green-300',
      purple: 'text-purple-600 bg-purple-100 border-purple-300',
      indigo: 'text-indigo-600 bg-indigo-100 border-indigo-300'
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.primary
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Análises de IA
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Ferramentas de inteligência artificial para análise avançada de saúde feminina
            </p>
          </div>
        </div>

        {/* Grid de Análises */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analysisTypes.map((analysis) => (
            <div
              key={analysis.id}
              className={`bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:shadow-md transition-all cursor-pointer group hover:${analysis.color === 'primary' ? 'border-primary-300' : analysis.color === 'secondary' ? 'border-secondary-300' : analysis.color === 'green' ? 'border-green-300' : analysis.color === 'purple' ? 'border-purple-300' : 'border-indigo-300'}`}
              onClick={() => {
                const routeMap: Record<string, string> = {
                  'laboratory': '/analyses/laboratory',
                  'tcm': '/analyses/tcm',
                  'chronology': '/analyses/chronology',
                  'ifm-matrix': '/analyses/ifm',
                  'treatment-plan': '/analyses/treatment-plan'
                };
                router.push(routeMap[analysis.id] || '/analyses');
              }}
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${getColorClasses(analysis.color)}`}>
                    {analysis.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700">
                    {analysis.name}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  {analysis.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">0 análises realizadas</span>
                  <button 
                    className={`text-sm font-medium ${analysis.color === 'primary' ? 'text-primary-600 hover:text-primary-800' : analysis.color === 'secondary' ? 'text-secondary-600 hover:text-secondary-800' : analysis.color === 'green' ? 'text-green-600 hover:text-green-800' : analysis.color === 'purple' ? 'text-purple-600 hover:text-purple-800' : 'text-indigo-600 hover:text-indigo-800'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const routeMap: Record<string, string> = {
                        'laboratory': '/analyses/laboratory',
                        'tcm': '/analyses/tcm',
                        'chronology': '/analyses/chronology',
                        'ifm-matrix': '/analyses/ifm',
                        'treatment-plan': '/analyses/treatment-plan'
                      };
                      router.push(routeMap[analysis.id] || '/analyses');
                    }}
                  >
                    Iniciar Análise →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Análises Recentes */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Análises Recentes
              </h3>
              <button
                onClick={loadSavedAnalyses}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Atualizar
              </button>
            </div>
            
            {loadingAnalyses ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Carregando análises...</p>
              </div>
            ) : savedAnalyses.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma análise encontrada</h3>
                <p className="mt-1 text-sm text-gray-500">Comece criando sua primeira análise!</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {savedAnalyses.map((analysis) => (
                      <tr key={analysis._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {analysis.type === 'laboratory' ? 'Laboratorial' : analysis.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analysis.patient?.name || 'Nome não disponível'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            analysis.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {analysis.status === 'completed' ? 'Concluída' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => router.push(`/analyses/${analysis._id}`)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Seção de Instruções */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Como Usar as Análises de IA
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">1</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-gray-900">Selecione uma Paciente</h4>
                  <p className="text-sm text-gray-600">
                    Escolha a paciente para quem deseja realizar a análise. Certifique-se de que os dados estão completos.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">2</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-gray-900">Forneça Dados Adicionais</h4>
                  <p className="text-sm text-gray-600">
                    Adicione informações específicas como exames laboratoriais, sintomas detalhados ou observações.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">3</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-gray-900">Obtenha Resultados</h4>
                  <p className="text-sm text-gray-600">
                    Receba uma análise detalhada com insights, recomendações e próximos passos sugeridos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total de Análises</dt>
                    <dd className="text-lg font-medium text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Este Mês</dt>
                    <dd className="text-lg font-medium text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Custo IA</dt>
                    <dd className="text-lg font-medium text-gray-900">R$ 0,00</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Tempo Médio</dt>
                    <dd className="text-lg font-medium text-gray-900">0s</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 