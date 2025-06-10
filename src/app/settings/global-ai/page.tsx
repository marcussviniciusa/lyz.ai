'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Settings2, Save, RotateCcw, Brain, ChevronDown, ChevronUp } from 'lucide-react'

interface AnalysisConfig {
  provider: 'openai' | 'anthropic' | 'google'
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  userPromptTemplate: string
  ragEnabled: boolean
  ragThreshold: number
  ragMaxResults: number
}

interface GlobalAIConfig {
  _id?: string
  apiKeys: {
    openai?: string
    anthropic?: string
    google?: string
  }
  googleVision: {
    enabled: boolean
    projectId?: string
    clientEmail?: string
    privateKey?: string
  }
  laboratory: AnalysisConfig
  tcm: AnalysisConfig
  chronology: AnalysisConfig
  ifm: AnalysisConfig
  treatmentPlan: AnalysisConfig
  lastUpdatedBy: string
  version: string
  updatedAt: string
}

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4.1-mini'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-3-7-sonnet-20250219', 'claude-sonnet-4-20250514'] },
  { value: 'google', label: 'Google', models: ['gemini-2.5-flash-preview-05-20'] }
]

const ANALYSIS_TYPES = [
  { key: 'laboratory', label: '🧪 Análise Laboratorial', description: 'Interpretação de exames laboratoriais com foco em medicina funcional' },
  { key: 'tcm', label: '☯️ Medicina Tradicional Chinesa', description: 'Diagnóstico energético e fitoterapia chinesa' },
  { key: 'chronology', label: '📅 Cronologia', description: 'Análise temporal de padrões de saúde' },
  { key: 'ifm', label: '🔄 Matriz IFM', description: 'Avaliação pelos 7 sistemas funcionais do IFM' },
  { key: 'treatmentPlan', label: '📋 Plano de Tratamento', description: 'Criação de protocolos terapêuticos integrativos' }
]

export default function GlobalAIConfigPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [config, setConfig] = useState<GlobalAIConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }

    if (status === 'authenticated' && session?.user?.role !== 'superadmin') {
      router.push('/dashboard')
      return
    }

    if (status === 'authenticated') {
      fetchConfig()
    }
  }, [status, session, router])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/settings/global-ai-config')
      if (!response.ok) throw new Error('Erro ao carregar configuração')
      
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar configuração' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config) return

    setSaving(true)
    try {
      const response = await fetch('/api/settings/global-ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (!response.ok) throw new Error('Erro ao salvar configuração')

      const updatedConfig = await response.json()
      setConfig(updatedConfig)
      setMessage({ type: 'success', text: 'Configuração salva com sucesso!' })
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar configuração' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja restaurar as configurações padrão? Esta ação não pode ser desfeita.')) return

    setSaving(true)
    try {
      const response = await fetch('/api/settings/global-ai-config', {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Erro ao restaurar configurações padrão')

      const newConfig = await response.json()
      setConfig(newConfig)
      setMessage({ type: 'success', text: 'Configurações restauradas para o padrão!' })
    } catch (error) {
      console.error('Erro ao restaurar:', error)
      setMessage({ type: 'error', text: 'Erro ao restaurar configurações' })
    } finally {
      setSaving(false)
    }
  }

  const updateAnalysisConfig = (analysisType: keyof GlobalAIConfig, field: keyof AnalysisConfig, value: any) => {
    if (!config) return

    setConfig(prev => ({
      ...prev!,
      [analysisType]: {
        ...(prev![analysisType] as AnalysisConfig),
        [field]: value
      }
    }))
  }

  const getAnalysisConfig = (analysisType: string): AnalysisConfig | undefined => {
    if (!config) return undefined
    return config[analysisType as keyof Pick<GlobalAIConfig, 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatmentPlan'>] as AnalysisConfig
  }

  const togglePromptExpansion = (key: string) => {
    setExpandedPrompts(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Erro ao carregar configuração</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings2 className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Configuração Global de IA</h1>
          <Badge variant="secondary">Super Admin</Badge>
        </div>
        <p className="text-gray-600">
          Configure os parâmetros de IA para todos os tipos de análise do sistema
        </p>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <span>Versão: {config.version}</span>
          <span>Última atualização: {new Date(config.updatedAt).toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-3 mb-6">
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={saving}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrão
        </Button>
        <Button 
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="api-keys" className="text-xs">
            🔑 API Keys
          </TabsTrigger>
          {ANALYSIS_TYPES.map(type => (
            <TabsTrigger key={type.key} value={type.key} className="text-xs">
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Aba API Keys */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Settings2 className="h-5 w-5" />
                🔑 Chaves de API dos Provedores
              </CardTitle>
              <CardDescription>
                Configure as chaves de API para cada provedor de IA. Essas chaves são necessárias para realizar as análises.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {/* OpenAI */}
                <div className="space-y-2">
                  <Label htmlFor="openai-key" className="flex items-center gap-2">
                    <span className="text-green-600">●</span>
                    OpenAI API Key
                  </Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={config?.apiKeys?.openai || ''}
                    onChange={(e) => setConfig(prev => prev ? {
                      ...prev,
                      apiKeys: { ...prev.apiKeys, openai: e.target.value }
                    } : prev)}
                  />
                  <p className="text-xs text-gray-500">
                    Obtenha sua chave em: https://platform.openai.com/api-keys
                  </p>
                </div>

                {/* Anthropic */}
                <div className="space-y-2">
                  <Label htmlFor="anthropic-key" className="flex items-center gap-2">
                    <span className="text-orange-600">●</span>
                    Anthropic API Key
                  </Label>
                  <Input
                    id="anthropic-key"
                    type="password"
                    placeholder="sk-ant-..."
                    value={config?.apiKeys?.anthropic || ''}
                    onChange={(e) => setConfig(prev => prev ? {
                      ...prev,
                      apiKeys: { ...prev.apiKeys, anthropic: e.target.value }
                    } : prev)}
                  />
                  <p className="text-xs text-gray-500">
                    Obtenha sua chave em: https://console.anthropic.com/
                  </p>
                </div>

                {/* Google */}
                <div className="space-y-2">
                  <Label htmlFor="google-key" className="flex items-center gap-2">
                    <span className="text-blue-600">●</span>
                    Google AI API Key
                  </Label>
                  <Input
                    id="google-key"
                    type="password"
                    placeholder="AIza..."
                    value={config?.apiKeys?.google || ''}
                    onChange={(e) => setConfig(prev => prev ? {
                      ...prev,
                      apiKeys: { ...prev.apiKeys, google: e.target.value }
                    } : prev)}
                  />
                  <p className="text-xs text-gray-500">
                    Obtenha sua chave em: https://makersuite.google.com/app/apikey
                  </p>
                </div>
              </div>

              {/* Configuração Google Vision OCR */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="google-vision-enabled"
                      checked={config?.googleVision?.enabled || false}
                      onCheckedChange={(checked) => setConfig(prev => prev ? {
                        ...prev,
                        googleVision: { ...prev.googleVision, enabled: checked }
                      } : prev)}
                    />
                    <Label htmlFor="google-vision-enabled" className="flex items-center gap-2">
                      <span className="text-red-600">●</span>
                      <span className="font-semibold">Google Vision OCR</span>
                    </Label>
                  </div>
                  <Badge variant={config?.googleVision?.enabled ? "default" : "secondary"}>
                    {config?.googleVision?.enabled ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Configure o Google Cloud Vision API para processamento OCR automático de exames laboratoriais
                </p>

                {config?.googleVision?.enabled && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="google-project-id">Project ID</Label>
                      <Input
                        id="google-project-id"
                        placeholder="meu-projeto-gcp"
                        value={config?.googleVision?.projectId || ''}
                        onChange={(e) => setConfig(prev => prev ? {
                          ...prev,
                          googleVision: { ...prev.googleVision, projectId: e.target.value }
                        } : prev)}
                      />
                      <p className="text-xs text-gray-500">
                        ID do seu projeto no Google Cloud Platform
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="google-client-email">Service Account Email</Label>
                      <Input
                        id="google-client-email"
                        placeholder="service-account@projeto.iam.gserviceaccount.com"
                        value={config?.googleVision?.clientEmail || ''}
                        onChange={(e) => setConfig(prev => prev ? {
                          ...prev,
                          googleVision: { ...prev.googleVision, clientEmail: e.target.value }
                        } : prev)}
                      />
                      <p className="text-xs text-gray-500">
                        Email da service account com permissões do Vision API
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="google-private-key">Private Key</Label>
                      <Textarea
                        id="google-private-key"
                        placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                        rows={4}
                        value={config?.googleVision?.privateKey || ''}
                        onChange={(e) => setConfig(prev => prev ? {
                          ...prev,
                          googleVision: { ...prev.googleVision, privateKey: e.target.value }
                        } : prev)}
                      />
                      <p className="text-xs text-gray-500">
                        Chave privada da service account (incluindo -----BEGIN PRIVATE KEY----- e -----END PRIVATE KEY-----)
                      </p>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Google Vision API:</strong>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li>• Habilite a Vision API no seu projeto GCP</li>
                          <li>• Crie uma service account com role "Cloud Vision AI Service Agent"</li>
                          <li>• Baixe a chave JSON e extraia os valores acima</li>
                          <li>• Primeiras 1.000 requisições/mês são gratuitas</li>
                          <li>• Custo: ~$1.50 por 1.000 documentos processados</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> As chaves de API são armazenadas de forma segura e criptografada. 
                  Nunca compartilhe suas chaves com terceiros. Você pode testar a conectividade após salvar as configurações.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {ANALYSIS_TYPES.map(type => (
          <TabsContent key={type.key} value={type.key} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Brain className="h-5 w-5" />
                  {type.label}
                </CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Configurações do Provedor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Provedor de IA</Label>
                    <Select
                      value={getAnalysisConfig(type.key)?.provider}
                      onValueChange={(value) => updateAnalysisConfig(type.key as keyof GlobalAIConfig, 'provider', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_OPTIONS.map(provider => (
                          <SelectItem key={provider.value} value={provider.value}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select
                      value={getAnalysisConfig(type.key)?.model}
                      onValueChange={(value) => updateAnalysisConfig(type.key as keyof GlobalAIConfig, 'model', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_OPTIONS
                          .find(p => p.value === getAnalysisConfig(type.key)?.provider)
                          ?.models.map(model => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Parâmetros do Modelo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Temperatura</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={getAnalysisConfig(type.key)?.temperature}
                        onChange={(e) => updateAnalysisConfig(type.key as keyof GlobalAIConfig, 'temperature', parseFloat(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">0-2</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      min="100"
                      max="8000"
                      step="100"
                      value={getAnalysisConfig(type.key)?.maxTokens}
                      onChange={(e) => updateAnalysisConfig(type.key as keyof GlobalAIConfig, 'maxTokens', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      RAG Habilitado
                      <Switch
                        checked={getAnalysisConfig(type.key)?.ragEnabled}
                        onCheckedChange={(checked) => updateAnalysisConfig(type.key as keyof GlobalAIConfig, 'ragEnabled', checked)}
                      />
                    </Label>
                  </div>
                </div>

                {/* Configurações RAG */}
                {getAnalysisConfig(type.key)?.ragEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="space-y-2">
                      <Label>Threshold RAG</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={getAnalysisConfig(type.key)?.ragThreshold}
                          onChange={(e) => updateAnalysisConfig(type.key as keyof GlobalAIConfig, 'ragThreshold', parseFloat(e.target.value))}
                          className="w-20"
                        />
                        <span className="text-sm text-gray-500">0-1</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Resultados RAG</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={getAnalysisConfig(type.key)?.ragMaxResults}
                        onChange={(e) => updateAnalysisConfig(type.key as keyof GlobalAIConfig, 'ragMaxResults', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                {/* Prompts */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Prompt do Sistema</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePromptExpansion(`${type.key}_system`)}
                      >
                        {expandedPrompts[`${type.key}_system`] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={getAnalysisConfig(type.key)?.systemPrompt}
                      onChange={(e) => updateAnalysisConfig(type.key as keyof GlobalAIConfig, 'systemPrompt', e.target.value)}
                      rows={expandedPrompts[`${type.key}_system`] ? 12 : 4}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Template do Prompt do Usuário</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePromptExpansion(`${type.key}_user`)}
                      >
                        {expandedPrompts[`${type.key}_user`] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={getAnalysisConfig(type.key)?.userPromptTemplate}
                      onChange={(e) => updateAnalysisConfig(type.key as keyof GlobalAIConfig, 'userPromptTemplate', e.target.value)}
                      rows={expandedPrompts[`${type.key}_user`] ? 15 : 6}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Use variáveis como {'{{patientName}}'}, {'{{patientAge}}'}, {'{{examData}}'}, etc.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
} 