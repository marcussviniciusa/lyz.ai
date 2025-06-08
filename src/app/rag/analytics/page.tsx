'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Brain, 
  FileText, 
  Search, 
  Target, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Database,
  Cpu
} from 'lucide-react'

interface RAGAnalytics {
  totalAnalyses: number
  ragEnhancedAnalyses: number
  avgDocumentsUsed: number
  avgProcessingTime: number
  accuracyScore: number
  topCategories: Array<{
    category: string
    count: number
    percentage: number
  }>
  monthlyTrend: Array<{
    month: string
    analyses: number
    ragUsage: number
  }>
  performanceMetrics: {
    searchLatency: number
    embeddingLatency: number
    totalLatency: number
    cacheHitRate: number
  }
  qualityMetrics: {
    relevanceScore: number
    coherenceScore: number
    groundedness: number
    answerRelevancy: number
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function RAGAnalyticsPage() {
  const [analytics, setAnalytics] = useState<RAGAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rag/analytics')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar analytics')
      }
      
      const data = await response.json()
      setAnalytics(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAnalytics()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>Nenhum dado de analytics disponível</AlertDescription>
        </Alert>
      </div>
    )
  }

  const ragUsageRate = (analytics.ragEnhancedAnalyses / analytics.totalAnalyses) * 100

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics RAG</h1>
            <p className="text-gray-600 mt-2">
              Métricas de performance e uso do sistema RAG
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Atualizando...
              </>
            ) : (
              'Atualizar Dados'
            )}
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Análises</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAnalyses}</div>
            <div className="flex items-center mt-2">
              <Badge variant="secondary" className="text-xs">
                {analytics.ragEnhancedAnalyses} com RAG
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Uso RAG</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ragUsageRate.toFixed(1)}%</div>
            <Progress value={ragUsageRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Usados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgDocumentsUsed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Média por análise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgProcessingTime}s</div>
            <p className="text-xs text-muted-foreground mt-1">
              Processamento
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Uso & Tendências</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="quality">Qualidade</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendência de Uso Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="analyses" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Total de Análises"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ragUsage" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Uso RAG"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Adoção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Adoção RAG</span>
                  <span className="text-sm text-muted-foreground">{ragUsageRate.toFixed(1)}%</span>
                </div>
                <Progress value={ragUsageRate} />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Score de Precisão</span>
                  <span className="text-sm text-muted-foreground">{analytics.accuracyScore}%</span>
                </div>
                <Progress value={analytics.accuracyScore} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indicadores Chave</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Análises Concluídas</span>
                  </div>
                  <span className="text-sm font-medium">{analytics.totalAnalyses}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Melhoria Contínua</span>
                  </div>
                  <Badge variant="outline">+15% este mês</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Base de Conhecimento</span>
                  </div>
                  <Badge variant="secondary">Ativa</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Latência de Processamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Busca Semântica</span>
                    <span className="text-sm font-medium">{analytics.performanceMetrics.searchLatency}ms</span>
                  </div>
                  <Progress value={(analytics.performanceMetrics.searchLatency / 1000) * 100} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Embeddings</span>
                    <span className="text-sm font-medium">{analytics.performanceMetrics.embeddingLatency}ms</span>
                  </div>
                  <Progress value={(analytics.performanceMetrics.embeddingLatency / 1000) * 100} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Latência Total</span>
                    <span className="text-sm font-medium">{analytics.performanceMetrics.totalLatency}ms</span>
                  </div>
                  <Progress value={(analytics.performanceMetrics.totalLatency / 2000) * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eficiência do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Taxa de Cache Hit</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{analytics.performanceMetrics.cacheHitRate}%</div>
                    <Badge variant="outline" className="text-xs">Excelente</Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Precisão de Busca</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">94.2%</div>
                    <Badge variant="outline" className="text-xs">Ótimo</Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Melhoria Semanal</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">+2.1%</div>
                    <Badge variant="outline" className="text-xs">Crescendo</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Qualidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Relevância</span>
                    <span className="text-sm font-medium">{analytics.qualityMetrics.relevanceScore}%</span>
                  </div>
                  <Progress value={analytics.qualityMetrics.relevanceScore} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Coerência</span>
                    <span className="text-sm font-medium">{analytics.qualityMetrics.coherenceScore}%</span>
                  </div>
                  <Progress value={analytics.qualityMetrics.coherenceScore} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Fundamentação</span>
                    <span className="text-sm font-medium">{analytics.qualityMetrics.groundedness}%</span>
                  </div>
                  <Progress value={analytics.qualityMetrics.groundedness} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Relevância da Resposta</span>
                    <span className="text-sm font-medium">{analytics.qualityMetrics.answerRelevancy}%</span>
                  </div>
                  <Progress value={analytics.qualityMetrics.answerRelevancy} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Score Geral de Qualidade</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {Math.round((
                    analytics.qualityMetrics.relevanceScore +
                    analytics.qualityMetrics.coherenceScore +
                    analytics.qualityMetrics.groundedness +
                    analytics.qualityMetrics.answerRelevancy
                  ) / 4)}%
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Excelente Qualidade
                </Badge>
                <p className="text-sm text-muted-foreground mt-4">
                  Baseado em 4 métricas de avaliação
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.topCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categorias Utilizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topCategories.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium capitalize">
                          {category.category.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{category.count}</div>
                        <div className="text-xs text-muted-foreground">{category.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 