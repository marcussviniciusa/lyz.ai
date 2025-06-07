'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface ProviderConfig {
  provider: string
  enabled: boolean
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  timeout: number
  retries: number
  priority: number
}

export default function AIProvidersSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      loadProviderConfigs()
    }
  }, [session])

  const loadProviderConfigs = async () => {
    try {
      const response = await fetch('/api/settings/ai-providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers || getDefaultProviders())
      } else {
        setProviders(getDefaultProviders())
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error)
      setProviders(getDefaultProviders())
    }
  }

  const getDefaultProviders = (): ProviderConfig[] => [
    {
      provider: 'openai',
      enabled: true,
      apiKey: '',
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 4000,
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1,
      timeout: 30000,
      retries: 3,
      priority: 1
    },
    {
      provider: 'anthropic',
      enabled: true,
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3,
      maxTokens: 4000,
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1,
      timeout: 30000,
      retries: 3,
      priority: 2
    },
    {
      provider: 'google',
      enabled: false,
      apiKey: '',
      model: 'gemini-1.5-pro',
      temperature: 0.3,
      maxTokens: 4000,
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1,
      timeout: 30000,
      retries: 3,
      priority: 3
    }
  ]

  const updateProvider = (index: number, field: keyof ProviderConfig, value: any) => {
    setProviders(prev => prev.map((provider, i) => 
      i === index ? { ...provider, [field]: value } : provider
    ))
  }

  const testProvider = async (providerName: string) => {
    setTestingProvider(providerName)
    try {
      const provider = providers.find(p => p.provider === providerName)
      if (!provider) return

      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: provider.provider,
          config: provider
        })
      })

      const result = await response.json()
      setTestResults(prev => ({ ...prev, [providerName]: result }))
    } catch (error: any) {
      console.error(`Erro ao testar ${providerName}:`, error)
      setTestResults(prev => ({ ...prev, [providerName]: { success: false, error: error.message } }))
    } finally {
      setTestingProvider(null)
    }
  }

  const saveConfigurations = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/ai-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ providers })
      })

      if (response.ok) {
        alert('Configurações salvas com sucesso!')
      } else {
        throw new Error('Falha ao salvar configurações')
      }
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = () => {
    if (confirm('Tem certeza que deseja resetar todas as configurações para os valores padrão?')) {
      setProviders(getDefaultProviders())
      setTestResults({})
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return '🤖'
      case 'anthropic': return '🧠'
      case 'google': return '🔍'
      default: return '⚙️'
    }
  }

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'openai': return 'OpenAI GPT'
      case 'anthropic': return 'Anthropic Claude'
      case 'google': return 'Google Gemini'
      default: return provider
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Configurações dos Provedores de IA
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure e teste os provedores de inteligência artificial para análises
            </p>
          </div>
          <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
            <button
              onClick={resetToDefaults}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Resetar Padrões
            </button>
            <button
              onClick={saveConfigurations}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Configuração de Provedores
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Configure os provedores de IA para garantir a melhor qualidade nas análises. 
                  O sistema usará os provedores habilitados em ordem de prioridade para fallback automático.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Providers Configuration */}
        <div className="space-y-6">
          {providers.map((provider, index) => {
            const testResult = testResults[provider.provider]
            return (
              <div key={provider.provider} className="bg-white shadow rounded-lg">
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getProviderIcon(provider.provider)}</span>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {getProviderDisplayName(provider.provider)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Configurações para {provider.provider}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={provider.enabled}
                          onChange={(e) => updateProvider(index, 'enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-900">
                          {provider.enabled ? 'Habilitado' : 'Desabilitado'}
                        </span>
                      </label>
                      <button
                        onClick={() => testProvider(provider.provider)}
                        disabled={!provider.enabled || testingProvider === provider.provider}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {testingProvider === provider.provider ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                            Testando...
                          </>
                        ) : (
                          'Testar'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Test Results */}
                  {testResult && (
                    <div className={`mb-4 p-3 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-start">
                        <svg className={`w-5 h-5 mr-2 mt-0.5 ${testResult.success ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          {testResult.success ? (
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          ) : (
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          )}
                        </svg>
                        <div>
                          <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                            {testResult.success ? 'Teste bem-sucedido!' : 'Falha no teste'}
                          </p>
                          {testResult.responseTime && (
                            <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                              Tempo de resposta: {testResult.responseTime}ms
                            </p>
                          )}
                          {testResult.error && (
                            <p className="text-sm text-red-700 mt-1">
                              Erro: {testResult.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {provider.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* API Key */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Chave da API
                        </label>
                        <input
                          type="password"
                          value={provider.apiKey}
                          onChange={(e) => updateProvider(index, 'apiKey', e.target.value)}
                          placeholder="sk-..."
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      {/* Model */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Modelo
                        </label>
                        <input
                          type="text"
                          value={provider.model}
                          onChange={(e) => updateProvider(index, 'model', e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prioridade
                        </label>
                        <select
                          value={provider.priority}
                          onChange={(e) => updateProvider(index, 'priority', parseInt(e.target.value))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value={1}>1 (Mais alta)</option>
                          <option value={2}>2 (Alta)</option>
                          <option value={3}>3 (Média)</option>
                          <option value={4}>4 (Baixa)</option>
                          <option value={5}>5 (Mais baixa)</option>
                        </select>
                      </div>

                      {/* Temperature */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Temperature ({provider.temperature})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={provider.temperature}
                          onChange={(e) => updateProvider(index, 'temperature', parseFloat(e.target.value))}
                          className="block w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Conservativo</span>
                          <span>Criativo</span>
                        </div>
                      </div>

                      {/* Max Tokens */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Máximo de Tokens
                        </label>
                        <input
                          type="number"
                          min="100"
                          max="8000"
                          value={provider.maxTokens}
                          onChange={(e) => updateProvider(index, 'maxTokens', parseInt(e.target.value))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      {/* Top P */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Top P ({provider.topP})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={provider.topP}
                          onChange={(e) => updateProvider(index, 'topP', parseFloat(e.target.value))}
                          className="block w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Timeout */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timeout (ms)
                        </label>
                        <input
                          type="number"
                          min="5000"
                          max="120000"
                          step="1000"
                          value={provider.timeout}
                          onChange={(e) => updateProvider(index, 'timeout', parseInt(e.target.value))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      {/* Retries */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tentativas
                        </label>
                        <select
                          value={provider.retries}
                          onChange={(e) => updateProvider(index, 'retries', parseInt(e.target.value))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                      </div>

                      {/* Frequency Penalty */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Penalty Frequência ({provider.frequencyPenalty})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={provider.frequencyPenalty}
                          onChange={(e) => updateProvider(index, 'frequencyPenalty', parseFloat(e.target.value))}
                          className="block w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Usage Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Dicas de Configuração
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Temperature:</strong> Valores baixos (0.1-0.3) para análises médicas consistentes</li>
                  <li><strong>Prioridade:</strong> Configure fallback automático em caso de falha de um provedor</li>
                  <li><strong>Tokens:</strong> 4000+ recomendado para análises completas</li>
                  <li><strong>Timeout:</strong> 30s+ para análises complexas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 