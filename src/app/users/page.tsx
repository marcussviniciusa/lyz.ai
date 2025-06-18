'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface User {
  _id: string
  name: string
  email: string
  role: 'professional' | 'admin' | 'superadmin'
  active: boolean
  company?: {
    _id: string
    name: string
  }
  createdAt: string
  lastLogin?: string
}

interface Company {
  _id: string
  name: string
  status: string
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleteWithCompany, setDeleteWithCompany] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'professional' as 'professional' | 'admin' | 'superadmin',
    password: '',
    company: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    
    // Verificar se tem permissão para acessar esta página
    if (session && !['admin', 'superadmin'].includes(session.user.role || '')) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session && ['admin', 'superadmin'].includes(session.user.role || '')) {
      fetchUsers()
      if (session.user.role === 'superadmin') {
        fetchCompanies()
      }
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies?status=approved')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
    }
  }

  const createUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchUsers()
        setShowCreateModal(false)
        setFormData({ name: '', email: '', role: 'professional', password: '', company: '' })
        alert('Usuário criado com sucesso!')
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      alert('Erro ao criar usuário')
    }
  }

  const editUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchUsers()
        setShowEditModal(false)
        setSelectedUser(null)
        setFormData({ name: '', email: '', role: 'professional', password: '', company: '' })
        alert('Usuário atualizado com sucesso!')
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Erro ao editar usuário:', error)
      alert('Erro ao editar usuário')
    }
  }

  const toggleUserStatus = async (userId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      })

      if (response.ok) {
        fetchUsers()
        const action = !currentActive ? 'ativado' : 'desativado'
        alert(`Usuário ${action} com sucesso!`)
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error)
      alert('Erro ao alterar status do usuário')
    }
  }

  const deleteUser = async () => {
    if (!selectedUser) return

    console.log('Iniciando exclusão do usuário:', selectedUser.name)
    console.log('Excluir empresa também:', deleteWithCompany)

    try {
      const response = await fetch(`/api/users/${selectedUser._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteCompany: deleteWithCompany }),
      })

      console.log('Resposta da API:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Resultado da exclusão:', result)
        
        fetchUsers()
        setShowDeleteModal(false)
        setSelectedUser(null)
        setDeleteWithCompany(false)
        setDeleteConfirmation('')
        
        let message = 'Usuário excluído com sucesso!'
        if (result.deletedCompany) {
          message += ` A empresa "${result.deletedCompany.name}" também foi excluída.`
        }
        alert(message)
      } else {
        const error = await response.json()
        console.log('Erro da API:', error)
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      alert('Erro ao excluir usuário')
    }
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      company: user.company?._id || ''
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (user: User) => {
    setSelectedUser(user)
    setDeleteConfirmation('')
    setDeleteWithCompany(false)
    setShowDeleteModal(true)
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      superadmin: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Super Admin' },
      admin: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Administrador' },
      professional: { bg: 'bg-green-100', text: 'text-green-800', label: 'Profissional' },
    }
    const config = roleConfig[role as keyof typeof roleConfig]
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getStatusBadge = (active: boolean) => {
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {active ? 'Ativo' : 'Inativo'}
      </span>
    )
  }

  // Verificar se pode excluir
  const canDelete = deleteConfirmation === 'EXCLUIR'

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    )
  }

  if (!session || !['admin', 'superadmin'].includes(session.user.role || '')) {
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
                Gestão de Usuários
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Gerencie os usuários da sua empresa ou clínica
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Novo Usuário
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Função
                      </th>
                      {session?.user.role === 'superadmin' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Empresa
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Último Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(user.role)}
                        </td>
                        {session?.user.role === 'superadmin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.company?.name || 'Sem empresa'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(user.active)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin 
                            ? new Date(user.lastLogin).toLocaleDateString('pt-BR')
                            : 'Nunca'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => toggleUserStatus(user._id, user.active)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              user.active 
                                ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {user.active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button 
                            onClick={() => openEditModal(user)}
                            className="px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-xs font-medium"
                          >
                            Editar
                          </button>
                          {session?.user.role === 'superadmin' && (
                            <button 
                              onClick={() => openDeleteModal(user)}
                              className="px-3 py-1 bg-red-100 text-red-800 hover:bg-red-200 rounded text-xs font-medium"
                            >
                              Excluir
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Nenhum usuário encontrado</p>
                <p className="text-xs text-gray-400">Clique em "Novo Usuário" para adicionar o primeiro usuário</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Criação */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Criar Novo Usuário
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Digite o nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Digite o email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Função
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value as any
                        setFormData({ 
                          ...formData, 
                          role: newRole
                        })
                      }}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="professional">Profissional</option>
                      <option value="admin">Administrador</option>
                      {session?.user.role === 'superadmin' && (
                        <option value="superadmin">Super Admin</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha Temporária
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Digite uma senha temporária"
                    />
                  </div>

                  {session?.user.role === 'superadmin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa {formData.role !== 'superadmin' && '*'}
                      </label>
                      <select
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        required={formData.role !== 'superadmin'}
                      >
                        <option value="">
                          {formData.role === 'superadmin' ? 'Nenhuma empresa (opcional)' : 'Selecione uma empresa'}
                        </option>
                        {companies.map((company) => (
                          <option key={company._id} value={company._id}>{company.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createUser}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Criar Usuário
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Editar Usuário
                  </h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Função
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value as any
                        setFormData({ 
                          ...formData, 
                          role: newRole
                        })
                      }}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="professional">Profissional</option>
                      <option value="admin">Administrador</option>
                      {session?.user.role === 'superadmin' && (
                        <option value="superadmin">Super Admin</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nova Senha (deixe em branco para manter atual)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Digite nova senha ou deixe em branco"
                    />
                  </div>

                  {session?.user.role === 'superadmin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa {formData.role !== 'superadmin' && '*'}
                      </label>
                      <select
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        required={formData.role !== 'superadmin'}
                      >
                        <option value="">
                          {formData.role === 'superadmin' ? 'Nenhuma empresa (opcional)' : 'Selecione uma empresa'}
                        </option>
                        {companies.map((company) => (
                          <option key={company._id} value={company._id}>{company.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={editUser}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Atualizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Exclusão */}
        {showDeleteModal && selectedUser && session?.user.role === 'superadmin' && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-red-600">
                    Excluir Usuário Permanentemente
                  </h3>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-sm text-red-800">
                      <strong>ATENÇÃO:</strong> Esta ação é irreversível! Você está prestes a excluir permanentemente:
                    </p>
                    <ul className="mt-2 text-sm text-red-700">
                      <li>• <strong>Usuário:</strong> {selectedUser.name} ({selectedUser.email})</li>
                      <li>• <strong>Role:</strong> {selectedUser.role}</li>
                    </ul>
                  </div>

                  {selectedUser.company && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="deleteCompany"
                        checked={deleteWithCompany}
                        onChange={(e) => setDeleteWithCompany(e.target.checked)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="deleteCompany" className="text-sm text-gray-700">
                        Excluir empresa também (apenas se não houver outros usuários)
                      </label>
                    </div>
                  )}

                  <div className="bg-yellow-50 p-4 rounded-md">
                    <p className="text-sm text-yellow-800">
                      Para confirmar, digite <strong>EXCLUIR</strong> abaixo:
                    </p>
                    <input
                      type="text"
                      placeholder="Digite EXCLUIR para confirmar"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="mt-2 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={deleteUser}
                    disabled={!canDelete}
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      canDelete 
                        ? 'bg-red-600 hover:bg-red-700 cursor-pointer' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Excluir Permanentemente
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