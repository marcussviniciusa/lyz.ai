'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface Company {
  _id: string
  name: string
  cnpj?: string
  email?: string
  phone?: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  approvedBy?: {
    _id: string
    name: string
    email: string
  }
  approvedAt?: string
  rejectionReason?: string
  usage: {
    totalAnalyses: number
    totalUsers: number
  }
  createdAt: string
}

interface NewCompany {
  name: string
  cnpj: string
  email: string
  phone: string
  address: {
    street: string
    number: string
    complement: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  status: 'pending' | 'approved'
}

export default function CompaniesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'suspend'>('approve')
  const [rejectionReason, setRejectionReason] = useState('')
  const [newCompany, setNewCompany] = useState<NewCompany>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    },
    status: 'pending'
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/login')
      return
    }

    if (session.user.role !== 'superadmin') {
      router.push('/dashboard')
      return
    }

    fetchCompanies()
  }, [session, status, router, statusFilter])

  const fetchCompanies = async () => {
    try {
      const url = statusFilter === 'all' ? '/api/companies' : `/api/companies?status=${statusFilter}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setCompanies(data.companies)
      } else {
        console.error('Erro ao buscar empresas:', data.error)
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCompany)
      })

      const data = await response.json()

      if (data.success) {
        setCompanies([data.company, ...companies])
        setShowForm(false)
        setNewCompany({
          name: '',
          cnpj: '',
          email: '',
          phone: '',
          address: {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
            zipCode: ''
          },
          status: 'pending'
        })
      } else {
        alert(`Erro: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro ao criar empresa:', error)
      alert('Erro ao criar empresa')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprovalAction = async () => {
    if (!selectedCompany) return

    try {
      const response = await fetch(`/api/companies/${selectedCompany._id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: approvalAction,
          rejectionReason: rejectionReason
        })
      })

      const data = await response.json()

      if (data.success) {
        // Atualizar a empresa na lista
        setCompanies(companies.map(company => 
          company._id === selectedCompany._id ? data.company : company
        ))
        setShowApprovalModal(false)
        setSelectedCompany(null)
        setRejectionReason('')
        alert(data.message)
      } else {
        alert(`Erro: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro ao processar ação:', error)
      alert('Erro ao processar ação')
    }
  }

  const openApprovalModal = (company: Company, action: 'approve' | 'reject' | 'suspend') => {
    setSelectedCompany(company)
    setApprovalAction(action)
    setShowApprovalModal(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return ''
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      case 'suspended': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovada'
      case 'pending': return 'Pendente'
      case 'rejected': return 'Rejeitada'
      case 'suspended': return 'Suspensa'
      default: return status
    }
  }

  const filteredCompanies = companies.filter(company => {
    if (statusFilter === 'all') return true
    return company.status === statusFilter
  })

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
            <p className="text-gray-600">Gerencie as empresas do sistema</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Nova Empresa
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar por Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendentes</option>
                <option value="approved">Aprovadas</option>
                <option value="rejected">Rejeitadas</option>
                <option value="suspended">Suspensas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal de Aprovação/Rejeição */}
        {showApprovalModal && selectedCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {approvalAction === 'approve' && 'Aprovar Empresa'}
                  {approvalAction === 'reject' && 'Rejeitar Empresa'}
                  {approvalAction === 'suspend' && 'Suspender Empresa'}
                </h2>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600">
                  Empresa: <strong>{selectedCompany.name}</strong>
                </p>
              </div>

              {(approvalAction === 'reject' || approvalAction === 'suspend') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo {approvalAction === 'reject' ? '(obrigatório)' : '(opcional)'}
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Digite o motivo da ${approvalAction === 'reject' ? 'rejeição' : 'suspensão'}...`}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApprovalAction}
                  disabled={approvalAction === 'reject' && !rejectionReason}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                    approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    approvalAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {approvalAction === 'approve' && 'Aprovar'}
                  {approvalAction === 'reject' && 'Rejeitar'}
                  {approvalAction === 'suspend' && 'Suspender'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Formulário de Nova Empresa */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Nova Empresa</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      value={newCompany.cnpj}
                      onChange={(e) => setNewCompany({...newCompany, cnpj: e.target.value})}
                      placeholder="00.000.000/0000-00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newCompany.email}
                      onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={newCompany.phone}
                      onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status Inicial
                    </label>
                    <select
                      value={newCompany.status}
                      onChange={(e) => setNewCompany({...newCompany, status: e.target.value as 'pending' | 'approved'})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">Pendente</option>
                      <option value="approved">Aprovada</option>
                    </select>
                  </div>
                </div>

                {/* Endereço */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rua *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCompany.address.street}
                        onChange={(e) => setNewCompany({
                          ...newCompany,
                          address: {...newCompany.address, street: e.target.value}
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCompany.address.number}
                        onChange={(e) => setNewCompany({
                          ...newCompany,
                          address: {...newCompany.address, number: e.target.value}
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={newCompany.address.complement}
                        onChange={(e) => setNewCompany({
                          ...newCompany,
                          address: {...newCompany.address, complement: e.target.value}
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bairro *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCompany.address.neighborhood}
                        onChange={(e) => setNewCompany({
                          ...newCompany,
                          address: {...newCompany.address, neighborhood: e.target.value}
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCompany.address.city}
                        onChange={(e) => setNewCompany({
                          ...newCompany,
                          address: {...newCompany.address, city: e.target.value}
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={newCompany.address.state}
                        onChange={(e) => setNewCompany({
                          ...newCompany,
                          address: {...newCompany.address, state: e.target.value.toUpperCase()}
                        })}
                        placeholder="SP"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CEP *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCompany.address.zipCode}
                        onChange={(e) => setNewCompany({
                          ...newCompany,
                          address: {...newCompany.address, zipCode: e.target.value}
                        })}
                        placeholder="00000-000"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Criando...' : 'Criar Empresa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de Empresas */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNPJ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aprovado por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuários
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Análises
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criada em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCompanies.map((company) => (
                  <tr key={company._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {company.name}
                        </div>
                        {company.email && (
                          <div className="text-sm text-gray-500">
                            {company.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCNPJ(company.cnpj || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(company.status)}`}>
                        {getStatusText(company.status)}
                      </span>
                      {company.rejectionReason && (
                        <div className="text-xs text-red-600 mt-1" title={company.rejectionReason}>
                          {company.rejectionReason.length > 30 ? 
                            `${company.rejectionReason.substring(0, 30)}...` : 
                            company.rejectionReason
                          }
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.approvedBy ? (
                        <div>
                          <div>{company.approvedBy.name}</div>
                          <div className="text-xs text-gray-500">
                            {company.approvedAt && formatDate(company.approvedAt)}
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.usage.totalUsers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.usage.totalAnalyses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(company.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/companies/${company._id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        
                        {company.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openApprovalModal(company, 'approve')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => openApprovalModal(company, 'reject')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                        
                        {company.status === 'approved' && (
                          <button
                            onClick={() => openApprovalModal(company, 'suspend')}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Suspender
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCompanies.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">
                {statusFilter === 'all' ? 'Nenhuma empresa encontrada' : `Nenhuma empresa ${getStatusText(statusFilter).toLowerCase()} encontrada`}
              </div>
              <p className="text-gray-400 mt-2">
                {statusFilter === 'all' ? 'Clique em "Nova Empresa" para criar a primeira empresa' : 'Altere o filtro para ver outras empresas'}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
