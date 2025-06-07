'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface Patient {
  _id: string
  name: string
  email: string
  phone?: string
}

interface DeliveryPlan {
  _id: string
  patientId: Patient
  treatmentPlan: any
  laboratorial?: any
  mtc?: any
  chronology?: any
  ifmMatrix?: any
  status: 'ready' | 'delivered' | 'viewed'
  deliveredAt?: Date
  viewedAt?: Date
  deliveryMethod: 'email' | 'sms' | 'portal'
  createdAt: Date
}

export default function DeliveryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [deliveryPlans, setDeliveryPlans] = useState<DeliveryPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<DeliveryPlan | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'sms' | 'portal'>('email')
  const [customMessage, setCustomMessage] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchDeliveryPlans()
    }
  }, [session])

  const fetchDeliveryPlans = async () => {
    try {
      const response = await fetch('/api/delivery/plans')
      if (response.ok) {
        const data = await response.json()
        setDeliveryPlans(data.plans)
      }
    } catch (error) {
      console.error('Erro ao carregar planos para entrega:', error)
    } finally {
      setLoading(false)
    }
  }

  const deliverPlan = async () => {
    if (!selectedPlan) return

    try {
      const response = await fetch(`/api/delivery/plans/${selectedPlan._id}/deliver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deliveryMethod,
          customMessage,
        }),
      })

      if (response.ok) {
        fetchDeliveryPlans()
        setSelectedPlan(null)
        setCustomMessage('')
        setDeliveryMethod('email')
      }
    } catch (error) {
      console.error('Erro ao entregar plano:', error)
    }
  }

  const previewPlan = (plan: DeliveryPlan) => {
    setSelectedPlan(plan)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ready: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pronto para Entrega' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Entregue' },
      viewed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Visualizado' },
    }
    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando planos para entrega...</p>
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
                Entrega de Planos
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Gerencie a entrega dos planos de tratamento finalizados para os pacientes
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {deliveryPlans.filter(p => p.status === 'ready').length} prontos
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Planos */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Planos de Tratamento
            </h3>
            
            {deliveryPlans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data de Criação
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entregue em
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveryPlans.map((plan) => (
                      <tr key={plan._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {plan.patientId?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div>{plan.patientId?.email || 'N/A'}</div>
                            {plan.patientId?.phone && (
                              <div className="text-xs text-gray-500">{plan.patientId.phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(plan.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(plan.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {plan.deliveredAt 
                            ? new Date(plan.deliveredAt).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => previewPlan(plan)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            Preview
                          </button>
                          {plan.status === 'ready' && (
                            <button
                              onClick={() => setSelectedPlan(plan)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Entregar
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Nenhum plano pronto para entrega</p>
                <p className="text-xs text-gray-400">Os planos aparecerão aqui quando as análises forem concluídas e aprovadas</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Entrega */}
        {selectedPlan && selectedPlan.status === 'ready' && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Entregar Plano: {selectedPlan.patientId?.name}
                  </h3>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Paciente:</strong> {selectedPlan.patientId?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Email:</strong> {selectedPlan.patientId?.email}
                  </p>
                  {selectedPlan.patientId?.phone && (
                    <p className="text-sm text-gray-600">
                      <strong>Telefone:</strong> {selectedPlan.patientId.phone}
                    </p>
                  )}
                </div>

                {/* Método de Entrega */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Entrega
                  </label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value as 'email' | 'sms' | 'portal')}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="portal">Portal do Paciente</option>
                  </select>
                </div>

                {/* Mensagem Personalizada */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem Personalizada
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Adicione uma mensagem personalizada para acompanhar o plano..."
                  />
                </div>

                {/* Preview do Plano */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Preview do Plano:</h4>
                  <div className="bg-gray-50 p-4 rounded-md max-h-40 overflow-y-auto">
                    <div className="text-sm text-gray-700">
                      <h5 className="font-semibold mb-2">Plano de Tratamento Personalizado</h5>
                      <p className="mb-2">
                        <strong>Paciente:</strong> {selectedPlan.patientId?.name}
                      </p>
                      <p className="mb-2">
                        <strong>Data:</strong> {new Date(selectedPlan.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      <div className="space-y-2">
                        {selectedPlan.laboratorial && (
                          <div>✅ Análise Laboratorial concluída</div>
                        )}
                        {selectedPlan.mtc && (
                          <div>✅ Medicina Tradicional Chinesa concluída</div>
                        )}
                        {selectedPlan.chronology && (
                          <div>✅ Cronologia de saúde concluída</div>
                        )}
                        {selectedPlan.ifmMatrix && (
                          <div>✅ Matriz IFM concluída</div>
                        )}
                        {selectedPlan.treatmentPlan && (
                          <div>✅ Plano de tratamento final concluído</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={deliverPlan}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Entregar Plano
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Preview */}
        {selectedPlan && selectedPlan.status !== 'ready' && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Preview: {selectedPlan.patientId?.name}
                  </h3>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="bg-gray-50 p-6 rounded-md max-h-96 overflow-y-auto">
                  <div className="prose max-w-none">
                    <h4 className="text-lg font-semibold mb-4">Plano de Tratamento Completo</h4>
                    
                    {selectedPlan.treatmentPlan && (
                      <div className="mb-6">
                        <h5 className="font-medium mb-2">Plano Final:</h5>
                        <pre className="text-sm whitespace-pre-wrap bg-white p-3 rounded border">
                          {JSON.stringify(selectedPlan.treatmentPlan, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedPlan.laboratorial && (
                      <div className="mb-6">
                        <h5 className="font-medium mb-2">Análise Laboratorial:</h5>
                        <div className="text-sm bg-white p-3 rounded border">
                          Análise laboratorial concluída
                        </div>
                      </div>
                    )}

                    {selectedPlan.mtc && (
                      <div className="mb-6">
                        <h5 className="font-medium mb-2">Medicina Tradicional Chinesa:</h5>
                        <div className="text-sm bg-white p-3 rounded border">
                          Diagnóstico energético concluído
                        </div>
                      </div>
                    )}

                    {selectedPlan.chronology && (
                      <div className="mb-6">
                        <h5 className="font-medium mb-2">Cronologia:</h5>
                        <div className="text-sm bg-white p-3 rounded border">
                          Timeline de saúde criada
                        </div>
                      </div>
                    )}

                    {selectedPlan.ifmMatrix && (
                      <div className="mb-6">
                        <h5 className="font-medium mb-2">Matriz IFM:</h5>
                        <div className="text-sm bg-white p-3 rounded border">
                          Análise sistêmica concluída
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Fechar
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