'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Eye,
  Calendar,
  User,
  Building
} from 'lucide-react'

interface DeliveryPlan {
  _id: string
  patient: {
    _id: string
    name: string
    email: string
    phone?: string
  }
  professional?: {
    _id: string
    name: string
    email: string
  } | null
  company?: {
    _id: string
    name: string
  }
  analyses: Array<{
    _id: string
    type: string
    status: string
    createdAt: string
  }>
  title: string
  description?: string
  status: string
  deliveryMethod?: string
  deliveredAt?: string
  viewedAt?: string
  createdAt: string
  updatedAt: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  generated: { label: 'Gerado', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800' },
  viewed_by_patient: { label: 'Visualizado', color: 'bg-purple-100 text-purple-800' },
  archived: { label: 'Arquivado', color: 'bg-gray-100 text-gray-800' }
}

export default function DeliveryPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<DeliveryPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const response = await fetch('/api/delivery/plans')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar planos')
      }
      
      const data = await response.json()
      setPlans(data.plans || [])
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
      alert('Não foi possível carregar os planos de entrega')
    } finally {
      setLoading(false)
    }
  }

  const handleViewPlan = (planId: string) => {
    router.push(`/delivery/plans/${planId}`)
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando planos de entrega...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Entrega de Planos</h1>
        <p className="text-gray-600">
          Gerencie e entregue planos integrados para suas pacientes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Planos</p>
                <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gerados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {plans.filter(p => p.status === 'generated').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Entregues</p>
                <p className="text-2xl font-bold text-gray-900">
                  {plans.filter(p => p.status === 'delivered').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Visualizados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {plans.filter(p => p.status === 'viewed_by_patient').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum plano encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              Ainda não há planos de entrega gerados. Crie análises para suas pacientes e gere planos integrados.
            </p>
            <Button onClick={() => router.push('/patients')}>
              Ver Pacientes
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const statusInfo = statusLabels[plan.status] || { 
              label: plan.status, 
              color: 'bg-gray-100 text-gray-800' 
            }

            return (
              <Card 
                key={plan._id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewPlan(plan._id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {plan.title}
                          </h3>
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>

                      {plan.description && (
                        <p className="text-gray-600 mb-4">{plan.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{plan.patient.name}</p>
                            <p className="text-gray-600">{plan.patient.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">
                              {plan.professional?.name || 'Profissional não definido'}
                            </p>
                            <p className="text-gray-600">Profissional</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{formatDate(plan.createdAt)}</p>
                            <p className="text-gray-600">
                              {plan.analyses.length} análise(s)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
} 