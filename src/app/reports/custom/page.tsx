'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface ReportFilter {
  dateRange: {
    start: string
    end: string
  }
  analysisTypes: string[]
  patients: string[]
  includeMetrics: boolean
  format: 'pdf' | 'excel' | 'json'
  groupBy: 'patient' | 'analysis' | 'date'
}

export default function CustomReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [patients, setPatients] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [reportHistory, setReportHistory] = useState([])
  const [filters, setFilters] = useState<ReportFilter>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias atrás
      end: new Date().toISOString().split('T')[0] // hoje
    },
    analysisTypes: [],
    patients: [],
    includeMetrics: true,
    format: 'pdf',
    groupBy: 'patient'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

  const loadData = async () => {
    try {
      const [patientsRes, analysesRes, reportsRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/analyses'),
        fetch('/api/reports/history')
      ])

      if (patientsRes.ok) {
        const patientsData = await patientsRes.json()
        setPatients(patientsData.data || [])
      }

      if (analysesRes.ok) {
        const analysesData = await analysesRes.json()
        setAnalyses(analysesData.data || [])
      }

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json()
        setReportHistory(reportsData.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const updateFilter = (field: keyof ReportFilter, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const updateDateRange = (field: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { ...prev.dateRange, [field]: value }
    }))
  }

  const toggleAnalysisType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      analysisTypes: prev.analysisTypes.includes(type)
        ? prev.analysisTypes.filter(t => t !== type)
        : [...prev.analysisTypes, type]
    }))
  }

  const togglePatient = (patientId: string) => {
    setFilters(prev => ({
      ...prev,
      patients: prev.patients.includes(patientId)
        ? prev.patients.filter(p => p !== patientId)
        : [...prev.patients, patientId]
    }))
  }

  const generateReport = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filters,
          metadata: {
            generatedBy: session?.user?.id,
            generatedAt: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro na geração do relatório')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const filename = `relatorio_${filters.format}_${new Date().toISOString().split('T')[0]}.${filters.format}`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Atualizar histórico
      loadData()
      
      alert('Relatório gerado com sucesso!')
    } catch (error: any) {
      console.error('Erro na geração do relatório:', error)
      alert(`Erro na geração do relatório: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const getAnalysisTypeName = (type: string) => {
    const names = {
      laboratory: 'Análise Laboratorial',
      tcm: 'Medicina Tradicional Chinesa',
      chronology: 'Cronologia',
      ifm: 'Matriz IFM',
      treatmentPlan: 'Plano de Tratamento'
    }
    return names[type as keyof typeof names] || type
  }

  const presetFilters = [
    {
      name: 'Último Mês',
      action: () => {
        const start = new Date()
        start.setMonth(start.getMonth() - 1)
        updateDateRange('start', start.toISOString().split('T')[0])
        updateDateRange('end', new Date().toISOString().split('T')[0])
      }
    },
    {
      name: 'Último Trimestre',
      action: () => {
        const start = new Date()
        start.setMonth(start.getMonth() - 3)
        updateDateRange('start', start.toISOString().split('T')[0])
        updateDateRange('end', new Date().toISOString().split('T')[0])
      }
    },
    {
      name: 'Este Ano',
      action: () => {
        const start = new Date(new Date().getFullYear(), 0, 1)
        updateDateRange('start', start.toISOString().split('T')[0])
        updateDateRange('end', new Date().toISOString().split('T')[0])
      }
    }
  ]

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
              Relatórios Personalizados
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure filtros e gere relatórios detalhados sobre análises e pacientes
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={generateReport}
              disabled={isGenerating || (filters.analysisTypes.length === 0 && filters.patients.length === 0)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Gerar Relatório
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filtros */}
          <div className="lg:col-span-2 space-y-6">
            {/* Período */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Período</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => updateDateRange('start', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => updateDateRange('end', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {presetFilters.map((preset, index) => (
                  <button
                    key={index}
                    onClick={preset.action}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipos de Análise */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tipos de Análise</h3>
              
              <div className="space-y-3">
                {['laboratory', 'tcm', 'chronology', 'ifm', 'treatmentPlan'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.analysisTypes.includes(type)}
                      onChange={() => toggleAnalysisType(type)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {getAnalysisTypeName(type)}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => updateFilter('analysisTypes', ['laboratory', 'tcm', 'chronology', 'ifm', 'treatmentPlan'])}
                  className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200"
                >
                  Selecionar Todos
                </button>
                <button
                  onClick={() => updateFilter('analysisTypes', [])}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Pacientes */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Pacientes ({filters.patients.length} selecionadas)
              </h3>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {patients.map((patient: any) => (
                  <label key={patient._id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.patients.includes(patient._id)}
                      onChange={() => togglePatient(patient._id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {patient.name} - {patient.age} anos
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => updateFilter('patients', patients.map((p: any) => p._id))}
                  className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200"
                >
                  Selecionar Todas
                </button>
                <button
                  onClick={() => updateFilter('patients', [])}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>

          {/* Configurações e Histórico */}
          <div className="space-y-6">
            {/* Configurações do Relatório */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato
                  </label>
                  <select
                    value={filters.format}
                    onChange={(e) => updateFilter('format', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="json">JSON</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agrupar por
                  </label>
                  <select
                    value={filters.groupBy}
                    onChange={(e) => updateFilter('groupBy', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="patient">Paciente</option>
                    <option value="analysis">Tipo de Análise</option>
                    <option value="date">Data</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.includeMetrics}
                      onChange={(e) => updateFilter('includeMetrics', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Incluir métricas de IA
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Resumo do Relatório</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Período: {filters.dateRange.start} até {filters.dateRange.end}</p>
                <p>• Análises: {filters.analysisTypes.length > 0 ? `${filters.analysisTypes.length} tipos` : 'Todas'}</p>
                <p>• Pacientes: {filters.patients.length > 0 ? `${filters.patients.length} selecionadas` : 'Todas'}</p>
                <p>• Formato: {filters.format.toUpperCase()}</p>
                <p>• Agrupamento: {filters.groupBy === 'patient' ? 'Por Paciente' : filters.groupBy === 'analysis' ? 'Por Análise' : 'Por Data'}</p>
              </div>
            </div>

            {/* Histórico */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico de Relatórios</h3>
              
              {reportHistory.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {reportHistory.slice(0, 5).map((report: any, index) => (
                    <div key={index} className="border-l-4 border-primary-500 pl-3 py-2">
                      <p className="text-sm font-medium text-gray-900">
                        {report.format.toUpperCase()} • {report.groupBy}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhum relatório gerado ainda</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 