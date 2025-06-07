'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface AnalysisResult {
  id: string
  type: string
  content: string
  status: 'completed' | 'error'
  createdAt: string
  processingTime?: number
}

interface CompleteAnalysisResults {
  laboratory?: AnalysisResult
  tcm?: AnalysisResult
  chronology: AnalysisResult
  ifm: AnalysisResult
  treatmentPlan: AnalysisResult
}

export default function CompleteAnalysisPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [patients, setPatients] = useState([])
  const [examData, setExamData] = useState('')
  const [tcmData, setTcmData] = useState({
    tongueColor: '',
    tongueCoating: '',
    tongueShape: '',
    tongueMoisture: '',
    patterns: '',
    treatment: '',
    observations: ''
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState({
    current: '',
    completed: [] as string[]
  })
  const [results, setResults] = useState<CompleteAnalysisResults | null>(null)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      loadPatients()
    }
  }, [session])

  const loadPatients = async () => {
    try {
      const response = await fetch('/api/patients')
      if (response.ok) {
        const data = await response.json()
        setPatients(data.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    }
  }

  const handleCompleteAnalysis = async () => {
    if (!selectedPatient) {
      alert('Por favor, selecione uma paciente')
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress({ current: 'Iniciando análises...', completed: [] })

    try {
      const analysisData: any = {
        patientId: selectedPatient,
        analysisType: 'complete'
      }

      if (examData.trim()) {
        analysisData.examData = examData
      }

      if (Object.values(tcmData).some(value => value.trim())) {
        analysisData.tcmData = tcmData
      }

      const response = await fetch('/api/analyses/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro na análise')
      }

      const data = await response.json()
      setResults(data.data)
      setStep(4)
    } catch (error: any) {
      console.error('Erro na análise:', error)
      alert(`Erro na análise: ${error.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analysisSteps = [
    { key: 'laboratory', name: 'Análise Laboratorial', optional: true },
    { key: 'tcm', name: 'Medicina Tradicional Chinesa', optional: true },
    { key: 'chronology', name: 'Cronologia de Saúde', optional: false },
    { key: 'ifm', name: 'Matriz IFM', optional: false },
    { key: 'treatmentPlan', name: 'Plano de Tratamento', optional: false }
  ]

  const formatAnalysisContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <p key={index} className="mb-2">
        {line}
      </p>
    ))
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
              Análise Completa com IA
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Fluxo completo das 5 análises especializadas em saúde feminina
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => {
                setStep(1)
                setResults(null)
                setSelectedPatient('')
                setExamData('')
                setTcmData({
                  tongueColor: '',
                  tongueCoating: '',
                  tongueShape: '',
                  tongueMoisture: '',
                  patterns: '',
                  treatment: '',
                  observations: ''
                })
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Nova Análise
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <div className="flex items-center">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      step >= stepNumber
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stepNumber}
                  </div>
                  {stepNumber < 4 && (
                    <div
                      className={`flex-1 h-1 mx-4 ${
                        step > stepNumber ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-sm text-gray-600">Paciente</span>
              <span className="text-sm text-gray-600">Dados</span>
              <span className="text-sm text-gray-600">Análise</span>
              <span className="text-sm text-gray-600">Resultados</span>
            </div>
          </div>
        </div>

        {/* Step 1: Selecionar Paciente */}
        {step === 1 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Etapa 1: Selecionar Paciente
              </h3>
              
              <div>
                <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-2">
                  Escolha a Paciente
                </label>
                <select
                  id="patient"
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Selecione uma paciente...</option>
                  {patients.map((patient: any) => (
                    <option key={patient._id} value={patient._id}>
                      {patient.name} - {patient.age} anos
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedPatient}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300"
                >
                  Próximo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Dados Opcionais */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Exames Laboratoriais */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Dados Laboratoriais (Opcional)
                </h3>
                <div>
                  <label htmlFor="examData" className="block text-sm font-medium text-gray-700 mb-2">
                    Resultados de Exames
                  </label>
                  <textarea
                    id="examData"
                    rows={8}
                    value={examData}
                    onChange={(e) => setExamData(e.target.value)}
                    placeholder="Cole aqui os resultados dos exames laboratoriais ou digite manualmente..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Dados de MTC */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Medicina Tradicional Chinesa (Opcional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor da Língua
                    </label>
                    <select
                      value={tcmData.tongueColor}
                      onChange={(e) => setTcmData(prev => ({ ...prev, tongueColor: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Selecionar...</option>
                      <option value="pale">Pálida</option>
                      <option value="red">Vermelha</option>
                      <option value="purple">Púrpura</option>
                      <option value="dark">Escura</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Saburra
                    </label>
                    <select
                      value={tcmData.tongueCoating}
                      onChange={(e) => setTcmData(prev => ({ ...prev, tongueCoating: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Selecionar...</option>
                      <option value="thin-white">Fina e branca</option>
                      <option value="thick-white">Grossa e branca</option>
                      <option value="yellow">Amarela</option>
                      <option value="greasy">Oleosa</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Padrões Identificados
                    </label>
                    <textarea
                      rows={3}
                      value={tcmData.patterns}
                      onChange={(e) => setTcmData(prev => ({ ...prev, patterns: e.target.value }))}
                      placeholder="Descreva os padrões de desarmonia observados..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmação e Execução */}
        {step === 3 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Etapa 3: Confirmar e Executar Análises
              </h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Análises que serão executadas:</h4>
                  <ul className="space-y-2">
                    {analysisSteps.map((step) => (
                      <li key={step.key} className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          (step.key === 'laboratory' && examData) ||
                          (step.key === 'tcm' && Object.values(tcmData).some(v => v)) ||
                          (!step.optional)
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`} />
                        <span className={`${
                          (step.key === 'laboratory' && examData) ||
                          (step.key === 'tcm' && Object.values(tcmData).some(v => v)) ||
                          (!step.optional)
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        }`}>
                          {step.name}
                          {step.optional && (
                            <span className="text-xs text-gray-500 ml-1">(opcional)</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isAnalyzing && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
                      <span className="text-blue-700">{analysisProgress.current}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  disabled={isAnalyzing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCompleteAnalysis}
                  disabled={isAnalyzing}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {isAnalyzing ? 'Analisando...' : 'Executar Análises'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Resultados */}
        {step === 4 && results && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Resultados das Análises
                </h3>
                
                <div className="space-y-4">
                  {analysisSteps.map((analysisStep) => {
                    const result = results[analysisStep.key as keyof CompleteAnalysisResults]
                    if (!result) return null

                    return (
                      <div key={analysisStep.key} className="border border-gray-200 rounded-lg">
                        <button
                          onClick={() => setExpandedResult(
                            expandedResult === analysisStep.key ? null : analysisStep.key
                          )}
                          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
                        >
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-green-500 mr-3"></div>
                            <span className="font-medium">{analysisStep.name}</span>
                          </div>
                          <span className="text-gray-400">
                            {expandedResult === analysisStep.key ? '−' : '+'}
                          </span>
                        </button>
                        
                        {expandedResult === analysisStep.key && (
                          <div className="px-4 pb-4 border-t border-gray-200">
                            <div className="mt-3 prose prose-sm max-w-none">
                              {formatAnalysisContent(result.content)}
                            </div>
                            {result.processingTime && (
                              <div className="mt-3 text-xs text-gray-500">
                                Processado em {(result.processingTime / 1000).toFixed(1)}s
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setStep(1)
                      setResults(null)
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Nova Análise
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Imprimir
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