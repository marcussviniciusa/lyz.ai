'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Eye, 
  Download, 
  Mail,
  MessageCircle,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

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
  analyses: any[]
  finalPlan: {
    executiveSummary: string
    laboratoryFindings: string
    tcmDiagnosis: string
    chronologyInsights: string
    ifmAssessment: string
    treatmentPlan: string
    recommendations: string[]
    followUpPlan: string
  }
  status: 'draft' | 'ready_for_delivery' | 'delivered' | 'viewed_by_patient'
  deliveryMethod: 'email' | 'app' | 'printed'
  scheduledFor?: string
  deliveredAt?: string
  viewedAt?: string
  patientFeedback?: string
  createdAt: string
  updatedAt: string
}

export default function DeliveryPage() {
  const { data: session } = useSession()
  const [plans, setPlans] = useState<DeliveryPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<DeliveryPlan | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState('email')
  const [scheduledDate, setScheduledDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (session) {
      loadDeliveryPlans()
    }
  }, [session])

  const loadDeliveryPlans = async () => {
    try {
      const response = await fetch('/api/delivery/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans || [])
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      draft: 'bg-gray-100 text-gray-800',
      ready_for_delivery: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      viewed_by_patient: 'bg-purple-100 text-purple-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      draft: 'Rascunho',
      ready_for_delivery: 'Pronto para Entrega',
      delivered: 'Entregue',
      viewed_by_patient: 'Visualizado pela Paciente'
    }
    return labels[status] || status
  }

  const handleDelivery = async (planId: string) => {
    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/delivery/plans/${planId}/deliver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: deliveryMethod,
          scheduledFor: scheduledDate
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        setSelectedPlan(null)
        await loadDeliveryPlans()
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Erro na entrega:', error)
      alert('Erro ao processar entrega')
    } finally {
      setSubmitting(false)
    }
  }

  const generatePDF = async (planId: string) => {
    try {
      const response = await fetch(`/api/delivery/plans/${planId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `plano-tratamento-${planId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF')
    }
  }

  if (!session) {
    return <div>Carregando...</div>
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando planos de entrega...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Entrega de Planos
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie a entrega dos planos de tratamento finalizados para as pacientes
            </p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-gray-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Rascunhos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {plans.filter(p => p.status === 'draft').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Prontos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {plans.filter(p => p.status === 'ready_for_delivery').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Send className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Entregues
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {plans.filter(p => p.status === 'delivered').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Eye className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Visualizados
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {plans.filter(p => p.status === 'viewed_by_patient').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Planos */}
        <Card>
          <CardHeader>
            <CardTitle>Planos de Tratamento</CardTitle>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Nenhum plano encontrado
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Complete as análises para gerar planos de tratamento.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div key={plan._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Plano de Tratamento
                          </h3>
                          <Badge className={getStatusColor(plan.status)}>
                            {getStatusLabel(plan.status)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>Paciente: {plan.patient.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>Profissional: {plan.professional.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(plan.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </div>
                        </div>

                        {plan.finalPlan?.executiveSummary && (
                          <div className="bg-gray-50 p-3 rounded-md mb-4">
                            <h4 className="font-semibold text-sm text-gray-700 mb-1">
                              Resumo Executivo:
                            </h4>
                            <p className="text-sm text-gray-600 line-clamp-3">
                              {plan.finalPlan.executiveSummary}
                            </p>
                          </div>
                        )}

                        {plan.deliveredAt && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              Entregue em {format(new Date(plan.deliveredAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                        )}

                        {plan.viewedAt && (
                          <div className="flex items-center gap-2 text-sm text-purple-600">
                            <Eye className="w-4 h-4" />
                            <span>
                              Visualizado em {format(new Date(plan.viewedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatePDF(plan._id)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>

                        <Link href={`/delivery/plans/${plan._id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </Button>
                        </Link>

                        {plan.status === 'ready_for_delivery' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => setSelectedPlan(plan)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Entregar
                          </Button>
                        )}

                        {plan.status === 'delivered' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Entrega */}
        {selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">
                Entregar Plano de Tratamento
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="font-semibold">Paciente: {selectedPlan.patient.name}</p>
                <p className="text-sm text-gray-600">{selectedPlan.patient.email}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Entrega
                  </label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="email">E-mail</option>
                    <option value="app">Portal do Paciente</option>
                    <option value="printed">Impressão</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agendar para (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedPlan(null)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleDelivery(selectedPlan._id)}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? 'Processando...' : 'Entregar Agora'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 