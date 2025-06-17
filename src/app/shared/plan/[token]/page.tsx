'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  User, 
  Clock,
  AlertCircle,
  Eye,
  Lock,
  Shield
} from 'lucide-react'

interface SharedPlan {
  _id: string
  patient: {
    name: string
    email: string
  }
  professional: {
    name: string
    email: string
  }
  analyses: Array<{
    _id: string
    type: string
    status: string
    createdAt: string
    result?: {
      rawOutput: string
    }
  }>
  title: string
  description?: string
  status: string
  createdAt: string
  shareLink: {
    isPublic: boolean
    hasPassword: boolean
    expiresAt: string
    accessCount: number
  }
}

const analysisTypeLabels: Record<string, string> = {
  laboratory: 'Análise Laboratorial',
  tcm: 'Medicina Tradicional Chinesa',
  chronology: 'Cronologia de Saúde',
  ifm: 'Matriz de Medicina Funcional',
  treatment: 'Plano de Tratamento',
  treatmentPlan: 'Plano de Tratamento'
}

// Função para renderizar markdown simples (mesma da página original)
function renderMarkdown(text: string): string {
  if (!text) return ''
  
  let cleanText = text.trim()
  const paragraphs = cleanText.split(/\n\s*\n/)
  const processedParagraphs: string[] = []
  
  paragraphs.forEach(paragraph => {
    if (!paragraph.trim()) return
    
    const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line)
    const processedLines: string[] = []
    
    lines.forEach(line => {
      if (line.startsWith('#### ')) {
        processedLines.push(`<h4 class="text-base font-semibold mt-6 mb-3 text-gray-900">${line.substring(5)}</h4>`)
      } else if (line.startsWith('### ')) {
        processedLines.push(`<h3 class="text-lg font-semibold mt-8 mb-4 text-gray-900">${line.substring(4)}</h3>`)
      } else if (line.startsWith('## ')) {
        processedLines.push(`<h2 class="text-xl font-semibold mt-8 mb-4 text-gray-900">${line.substring(3)}</h2>`)
      } else if (line.startsWith('# ')) {
        processedLines.push(`<h1 class="text-2xl font-bold mt-8 mb-6 text-gray-900">${line.substring(2)}</h1>`)
      } else if (line.startsWith('• ') || line.startsWith('- ')) {
        const content = line.substring(2)
        const formattedContent = content
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>')
        processedLines.push(`<div class="ml-4 mb-2 flex items-start"><span class="text-blue-600 mr-3 mt-1 flex-shrink-0">•</span><div class="text-gray-700 leading-relaxed">${formattedContent}</div></div>`)
      } else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)/)
        if (match) {
          const [, number, content] = match
          const formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>')
          processedLines.push(`<div class="ml-4 mb-3 flex items-start"><span class="text-blue-600 mr-3 font-medium min-w-[1.5rem] flex-shrink-0">${number}.</span><div class="text-gray-700 leading-relaxed">${formattedContent}</div></div>`)
        }
      } else if (line.toLowerCase().startsWith('conclusão')) {
        processedLines.push(`<div class="mt-8 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg"><h4 class="text-base font-semibold mb-2 text-blue-900">${line}</h4></div>`)
      } else {
        const formattedContent = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>')
        processedLines.push(`<p class="mb-3 text-gray-700 leading-relaxed">${formattedContent}</p>`)
      }
    })
    
    if (processedLines.length > 0) {
      processedParagraphs.push(`<div class="mb-4">${processedLines.join('')}</div>`)
    }
  })
  
  return processedParagraphs.join('')
}

export default function SharedPlanPage() {
  const params = useParams()
  const token = params.token as string
  
  const [plan, setPlan] = useState<SharedPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [submittingPassword, setSubmittingPassword] = useState(false)

  const loadSharedPlan = async (inputPassword?: string) => {
    try {
      setLoading(true)
      setError(null)
      setPasswordError('')
      
      const body: any = {}
      if (inputPassword) {
        body.password = inputPassword
      }
      
      const response = await fetch(`/api/shared/plan/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 && data.needsPassword) {
          setNeedsPassword(true)
          setLoading(false)
          return
        }
        
        if (response.status === 401 && data.error === 'Senha incorreta') {
          setPasswordError('Senha incorreta')
          setSubmittingPassword(false)
          return
        }
        
        throw new Error(data.error || 'Erro ao carregar plano')
      }

      setPlan(data.plan)
      setNeedsPassword(false)
      setLoading(false)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setPasswordError('Digite a senha')
      return
    }
    
    setSubmittingPassword(true)
    await loadSharedPlan(password)
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

  useEffect(() => {
    if (token) {
      loadSharedPlan()
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando plano...</p>
        </div>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle>Plano Protegido</CardTitle>
            <CardDescription>
              Este plano está protegido por senha. Digite a senha para acessar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError('')
                  }}
                  className={passwordError ? 'border-red-500' : ''}
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={submittingPassword}
              >
                {submittingPassword ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Acessar Plano
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Erro de Acesso</CardTitle>
            <CardDescription className="text-red-600">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Plano não encontrado</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{plan.title}</h1>
            {plan.description && (
              <p className="text-gray-600 text-lg">{plan.description}</p>
            )}
            <div className="mt-4 flex justify-center items-center space-x-4">
              <Badge variant="secondary">
                <Eye className="w-3 h-3 mr-1" />
                {plan.shareLink.accessCount} visualizações
              </Badge>
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                Expira em {formatDate(plan.shareLink.expiresAt)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Informações da Paciente e Profissional */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Paciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="font-medium text-gray-900">{plan.patient.name}</p>
                <p className="text-sm text-gray-600">{plan.patient.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="font-medium text-gray-900">{plan.professional.name}</p>
                <p className="text-sm text-gray-600">{plan.professional.email}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Análises */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Análises e Resultados
            </CardTitle>
            <CardDescription>
              Conteúdo detalhado das análises realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {plan.analyses.map((analysis, index) => (
                <div key={analysis._id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">
                          {index + 1}
                        </span>
                        {analysisTypeLabels[analysis.type] || analysis.type}
                      </h3>
                      <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                        {formatDate(analysis.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-white">
                    {analysis.result?.rawOutput ? (
                      <div 
                        className="prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: renderMarkdown(analysis.result.rawOutput) 
                        }}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm italic">
                          Conteúdo da análise não disponível
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Plano gerado em {formatDate(plan.createdAt)}</p>
          <p className="mt-1">Powered by Lyz.ai - Sistema de Análises Médicas</p>
        </div>
      </div>
    </div>
  )
} 