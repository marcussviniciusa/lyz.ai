'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface SystemSettings {
  _id: string
  enableEmailNotifications: boolean
  enableSmsNotifications: boolean
  dataRetentionDays: number
  maxFileUploadSize: number
  allowedFileTypes: string[]
  securitySettings: {
    forcePasswordReset: boolean
    sessionTimeoutMinutes: number
    maxLoginAttempts: number
  }
  billingSettings: {
    defaultPlan: string
    enableUsageTracking: boolean
    autoUpgradeThreshold: number
  }
}

const defaultSettings: SystemSettings = {
  _id: '',
  enableEmailNotifications: true,
  enableSmsNotifications: false,
  dataRetentionDays: 365,
  maxFileUploadSize: 10, // MB
  allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
  securitySettings: {
    forcePasswordReset: false,
    sessionTimeoutMinutes: 480,
    maxLoginAttempts: 5
  },
  billingSettings: {
    defaultPlan: 'basic',
    enableUsageTracking: true,
    autoUpgradeThreshold: 90
  }
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    
    // Verificar se tem permissão para acessar esta página
    if (session && session.user.role !== 'superadmin') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session && session.user.role === 'superadmin') {
      fetchSettings()
    }
  }, [session])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || defaultSettings)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        alert('Configurações salvas com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateNestedSettings = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof SystemSettings] as object),
        [key]: value
      }
    }))
  }

  const tabs = [
    { id: 'general', name: 'Geral', icon: '⚙️' },
    { id: 'notifications', name: 'Notificações', icon: '🔔' },
    { id: 'security', name: 'Segurança', icon: '🔒' },
    { id: 'billing', name: 'Faturamento', icon: '💳' },
    { id: 'data', name: 'Dados', icon: '📊' }
  ]

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'superadmin') {
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
                Configurações do Sistema
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Gerencie configurações globais da plataforma Lyz.ai
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Geral */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Gerais</h3>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Retenção de Dados (dias)
                      </label>
                      <input
                        type="number"
                        value={settings.dataRetentionDays}
                        onChange={(e) => updateSettings('dataRetentionDays', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Tempo que os dados são mantidos no sistema</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tamanho Máximo de Upload (MB)
                      </label>
                      <input
                        type="number"
                        value={settings.maxFileUploadSize}
                        onChange={(e) => updateSettings('maxFileUploadSize', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipos de Arquivo Permitidos
                    </label>
                    <input
                      type="text"
                      value={settings.allowedFileTypes.join(', ')}
                      onChange={(e) => updateSettings('allowedFileTypes', e.target.value.split(', '))}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="pdf, jpg, jpeg, png, docx"
                    />
                    <p className="mt-1 text-xs text-gray-500">Separar tipos por vírgula</p>
                  </div>
                </div>
              </div>
            )}



            {/* Tab: Notificações */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Notificação</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">Notificações por Email</span>
                        <span className="text-sm text-gray-500">Enviar notificações por email para usuários</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSettings('enableEmailNotifications', !settings.enableEmailNotifications)}
                        className={`${
                          settings.enableEmailNotifications ? 'bg-primary-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            settings.enableEmailNotifications ? 'translate-x-5' : 'translate-x-0'
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">Notificações por SMS</span>
                        <span className="text-sm text-gray-500">Enviar notificações por SMS para usuários</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSettings('enableSmsNotifications', !settings.enableSmsNotifications)}
                        className={`${
                          settings.enableSmsNotifications ? 'bg-primary-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            settings.enableSmsNotifications ? 'translate-x-5' : 'translate-x-0'
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Segurança */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Segurança</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">Forçar Reset de Senha</span>
                        <span className="text-sm text-gray-500">Forçar usuários a alterar senha no próximo login</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateNestedSettings('securitySettings', 'forcePasswordReset', !settings.securitySettings.forcePasswordReset)}
                        className={`${
                          settings.securitySettings.forcePasswordReset ? 'bg-primary-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            settings.securitySettings.forcePasswordReset ? 'translate-x-5' : 'translate-x-0'
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timeout de Sessão (minutos)
                        </label>
                        <input
                          type="number"
                          value={settings.securitySettings.sessionTimeoutMinutes}
                          onChange={(e) => updateNestedSettings('securitySettings', 'sessionTimeoutMinutes', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Máximo de Tentativas de Login
                        </label>
                        <input
                          type="number"
                          value={settings.securitySettings.maxLoginAttempts}
                          onChange={(e) => updateNestedSettings('securitySettings', 'maxLoginAttempts', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Faturamento */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Faturamento</h3>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Plano Padrão
                        </label>
                        <select
                          value={settings.billingSettings.defaultPlan}
                          onChange={(e) => updateNestedSettings('billingSettings', 'defaultPlan', e.target.value)}
                          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="basic">Básico</option>
                          <option value="professional">Profissional</option>
                          <option value="enterprise">Empresarial</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Threshold para Auto-upgrade (%)
                        </label>
                        <input
                          type="number"
                          value={settings.billingSettings.autoUpgradeThreshold}
                          onChange={(e) => updateNestedSettings('billingSettings', 'autoUpgradeThreshold', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">% de uso para sugerir upgrade</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">Rastreamento de Uso</span>
                        <span className="text-sm text-gray-500">Acompanhar uso de recursos para faturamento</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateNestedSettings('billingSettings', 'enableUsageTracking', !settings.billingSettings.enableUsageTracking)}
                        className={`${
                          settings.billingSettings.enableUsageTracking ? 'bg-primary-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            settings.billingSettings.enableUsageTracking ? 'translate-x-5' : 'translate-x-0'
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Dados */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Gestão de Dados</h3>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Atenção
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>As operações de dados são irreversíveis. Certifique-se de ter backups antes de prosseguir.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
                      <div className="flex items-center">
                        <svg className="h-8 w-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Backup Completo</h4>
                          <p className="text-sm text-gray-500">Fazer backup de todos os dados</p>
                        </div>
                      </div>
                    </button>

                    <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
                      <div className="flex items-center">
                        <svg className="h-8 w-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Restaurar Backup</h4>
                          <p className="text-sm text-gray-500">Restaurar dados de backup</p>
                        </div>
                      </div>
                    </button>

                    <button className="p-4 border border-red-300 rounded-lg hover:bg-red-50 text-left">
                      <div className="flex items-center">
                        <svg className="h-8 w-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Limpeza de Dados</h4>
                          <p className="text-sm text-gray-500">Limpar dados antigos baseado na política de retenção</p>
                        </div>
                      </div>
                    </button>

                    <button className="p-4 border border-purple-300 rounded-lg hover:bg-purple-50 text-left">
                      <div className="flex items-center">
                        <svg className="h-8 w-8 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Estatísticas do Sistema</h4>
                          <p className="text-sm text-gray-500">Ver uso de armazenamento e performance</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 