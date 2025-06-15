'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface Company {
  _id: string
  name: string
  cnpj?: string
  email?: string
  phone?: string
  website?: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  approvedBy?: {
    _id: string
    name: string
    email: string
  }
  approvedAt?: string
  rejectionReason?: string
  metadata?: {
    contactPerson?: {
      name: string
      email: string
      phone: string
      position: string
    }
    description?: string
    registrationDate?: string
    registrationSource?: string
  }
  address?: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  settings?: {
    maxUsersAllowed: number
    defaultAiProvider: string
    ragSettings?: {
      chunkSize: number
      chunkOverlap: number
      embeddingModel: string
    }
  }
  usage?: {
    totalAnalyses: number
    totalUsers: number
    monthlyUsage?: Array<{
      month: string
      analysesCount: number
      tokensUsed: number
    }>
  }
  createdAt: string
  updatedAt: string
}

export default function CompanyEditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/login')
      return
    }

    if (session.user.role !== 'superadmin' && session.user.company !== companyId) {
      router.push('/dashboard')
      return
    }

    fetchCompany()
  }, [session, status, router, companyId])

  const fetchCompany = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}`)
      const data = await response.json()
      
      if (data.success) {
        setCompany(data.company)
      } else {
        console.error('Erro ao buscar empresa:', data.error)
        router.push('/companies')
      }
    } catch (error) {
      console.error('Erro ao buscar empresa:', error)
      router.push('/companies')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!company) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(company)
      })

      const data = await response.json()

      if (data.success) {
        setCompany(data.company)
        alert('Empresa atualizada com sucesso!')
      } else {
        alert(`Erro: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error)
      alert('Erro ao atualizar empresa')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
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

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Empresa não encontrada</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(company.status)}`}>
                {getStatusText(company.status)}
              </span>
            </div>
            <p className="text-gray-600">Editar informações da empresa</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/companies')}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Geral
            </button>
            {company.metadata && (
              <button
                onClick={() => setActiveTab('registration')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'registration'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dados do Cadastro
              </button>
            )}
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Configurações
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'usage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Uso
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Informações Gerais</h3>
              
              {/* Status e Aprovação */}
              {session?.user.role === 'superadmin' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Status da Empresa</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={company.status}
                        onChange={(e) => setCompany({
                          ...company,
                          status: e.target.value as 'pending' | 'approved' | 'rejected' | 'suspended'
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="pending">Pendente</option>
                        <option value="approved">Aprovada</option>
                        <option value="rejected">Rejeitada</option>
                        <option value="suspended">Suspensa</option>
                      </select>
                    </div>
                    
                    {(company.status === 'rejected' || company.status === 'suspended') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Motivo
                        </label>
                        <input
                          type="text"
                          value={company.rejectionReason || ''}
                          onChange={(e) => setCompany({
                            ...company,
                            rejectionReason: e.target.value
                          })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Digite o motivo..."
                        />
                      </div>
                    )}
                  </div>
                  
                  {company.approvedBy && (
                    <div className="mt-3 text-sm text-gray-600">
                      Aprovada por: <strong>{company.approvedBy.name}</strong> em {company.approvedAt && formatDate(company.approvedAt)}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={company.name}
                    onChange={(e) => setCompany({...company, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={company.cnpj || ''}
                    onChange={(e) => setCompany({...company, cnpj: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={company.email || ''}
                    onChange={(e) => setCompany({...company, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={company.phone || ''}
                    onChange={(e) => setCompany({...company, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={company.website || ''}
                    onChange={(e) => setCompany({...company, website: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rua
                    </label>
                    <input
                      type="text"
                      value={company.address?.street || ''}
                      onChange={(e) => setCompany({
                        ...company,
                        address: {
                          street: e.target.value,
                          number: company.address?.number || '',
                          complement: company.address?.complement || '',
                          neighborhood: company.address?.neighborhood || '',
                          city: company.address?.city || '',
                          state: company.address?.state || '',
                          zipCode: company.address?.zipCode || ''
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={company.address?.number || ''}
                      onChange={(e) => setCompany({
                        ...company,
                        address: {
                          street: company.address?.street || '',
                          number: e.target.value,
                          complement: company.address?.complement || '',
                          neighborhood: company.address?.neighborhood || '',
                          city: company.address?.city || '',
                          state: company.address?.state || '',
                          zipCode: company.address?.zipCode || ''
                        }
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
                      value={company.address?.complement || ''}
                      onChange={(e) => setCompany({
                        ...company,
                        address: {
                          street: company.address?.street || '',
                          number: company.address?.number || '',
                          complement: e.target.value,
                          neighborhood: company.address?.neighborhood || '',
                          city: company.address?.city || '',
                          state: company.address?.state || '',
                          zipCode: company.address?.zipCode || ''
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={company.address?.neighborhood || ''}
                      onChange={(e) => setCompany({
                        ...company,
                        address: {
                          street: company.address?.street || '',
                          number: company.address?.number || '',
                          complement: company.address?.complement || '',
                          neighborhood: e.target.value,
                          city: company.address?.city || '',
                          state: company.address?.state || '',
                          zipCode: company.address?.zipCode || ''
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={company.address?.city || ''}
                      onChange={(e) => setCompany({
                        ...company,
                        address: {
                          street: company.address?.street || '',
                          number: company.address?.number || '',
                          complement: company.address?.complement || '',
                          neighborhood: company.address?.neighborhood || '',
                          city: e.target.value,
                          state: company.address?.state || '',
                          zipCode: company.address?.zipCode || ''
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado (UF)
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={company.address?.state || ''}
                      onChange={(e) => setCompany({
                        ...company,
                        address: {
                          street: company.address?.street || '',
                          number: company.address?.number || '',
                          complement: company.address?.complement || '',
                          neighborhood: company.address?.neighborhood || '',
                          city: company.address?.city || '',
                          state: e.target.value.toUpperCase(),
                          zipCode: company.address?.zipCode || ''
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={company.address?.zipCode || ''}
                      onChange={(e) => setCompany({
                        ...company,
                        address: {
                          street: company.address?.street || '',
                          number: company.address?.number || '',
                          complement: company.address?.complement || '',
                          neighborhood: company.address?.neighborhood || '',
                          city: company.address?.city || '',
                          state: company.address?.state || '',
                          zipCode: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'registration' && company.metadata && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Dados do Cadastro Público</h3>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Esta empresa se cadastrou através do formulário público em{' '}
                      {company.metadata.registrationDate && formatDate(company.metadata.registrationDate)}
                    </p>
                  </div>
                </div>
              </div>

              {company.metadata.contactPerson && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Pessoa de Contato</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome
                      </label>
                      <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                        {company.metadata.contactPerson.name}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                        {company.metadata.contactPerson.email}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone
                      </label>
                      <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                        {company.metadata.contactPerson.phone}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cargo
                      </label>
                      <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                        {company.metadata.contactPerson.position}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {company.metadata.description && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Descrição da Empresa</h4>
                  <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 min-h-[100px]">
                    {company.metadata.description}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Configurações</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máximo de Usuários Permitidos
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={company.settings?.maxUsersAllowed || 10}
                    onChange={(e) => setCompany({
                      ...company,
                      settings: {
                        maxUsersAllowed: parseInt(e.target.value) || 1,
                        defaultAiProvider: company.settings?.defaultAiProvider || 'openai',
                        ragSettings: company.settings?.ragSettings || { chunkSize: 1000, chunkOverlap: 200, embeddingModel: 'text-embedding-ada-002' }
                      }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provedor de IA Padrão
                  </label>
                  <select
                    value={company.settings?.defaultAiProvider || 'openai'}
                    onChange={(e) => setCompany({
                      ...company,
                      settings: {
                        maxUsersAllowed: company.settings?.maxUsersAllowed || 10,
                        defaultAiProvider: e.target.value,
                        ragSettings: company.settings?.ragSettings || { chunkSize: 1000, chunkOverlap: 200, embeddingModel: 'text-embedding-ada-002' }
                      }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                  </select>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Configurações RAG</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tamanho do Chunk
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="2000"
                      value={company.settings?.ragSettings?.chunkSize || 1000}
                      onChange={(e) => setCompany({
                        ...company,
                        settings: {
                          maxUsersAllowed: company.settings?.maxUsersAllowed || 10,
                          defaultAiProvider: company.settings?.defaultAiProvider || 'openai',
                          ragSettings: {
                            chunkSize: parseInt(e.target.value) || 1000,
                            chunkOverlap: company.settings?.ragSettings?.chunkOverlap || 200,
                            embeddingModel: company.settings?.ragSettings?.embeddingModel || 'text-embedding-ada-002'
                          }
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sobreposição do Chunk
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={company.settings?.ragSettings?.chunkOverlap || 200}
                      onChange={(e) => setCompany({
                        ...company,
                        settings: {
                          maxUsersAllowed: company.settings?.maxUsersAllowed || 10,
                          defaultAiProvider: company.settings?.defaultAiProvider || 'openai',
                          ragSettings: {
                            chunkSize: company.settings?.ragSettings?.chunkSize || 1000,
                            chunkOverlap: parseInt(e.target.value) || 200,
                            embeddingModel: company.settings?.ragSettings?.embeddingModel || 'text-embedding-ada-002'
                          }
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo de Embedding
                    </label>
                    <select
                      value={company.settings?.ragSettings?.embeddingModel || 'text-embedding-ada-002'}
                      onChange={(e) => setCompany({
                        ...company,
                        settings: {
                          maxUsersAllowed: company.settings?.maxUsersAllowed || 10,
                          defaultAiProvider: company.settings?.defaultAiProvider || 'openai',
                          ragSettings: {
                            chunkSize: company.settings?.ragSettings?.chunkSize || 1000,
                            chunkOverlap: company.settings?.ragSettings?.chunkOverlap || 200,
                            embeddingModel: e.target.value
                          }
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="text-embedding-ada-002">text-embedding-ada-002</option>
                      <option value="text-embedding-3-small">text-embedding-3-small</option>
                      <option value="text-embedding-3-large">text-embedding-3-large</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Estatísticas de Uso</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {company.usage?.totalUsers || 0}
                  </div>
                  <div className="text-sm text-blue-600">Total de Usuários</div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {company.usage?.totalAnalyses || 0}
                  </div>
                  <div className="text-sm text-green-600">Total de Análises</div>
                </div>
              </div>

              {company.usage?.monthlyUsage && company.usage.monthlyUsage.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Uso Mensal</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mês
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Análises
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tokens Usados
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {company.usage.monthlyUsage.map((usage, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(usage.month)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {usage.analysesCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {usage.tokensUsed.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}