'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

export default function LaboratoryAnalysisPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [labData, setLabData] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [analysisType, setAnalysisType] = useState('comprehensive')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando análise...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return null
  }

  const handleAnalyze = async () => {
    if (!selectedPatient || !labData) {
      alert('Por favor, selecione uma paciente e forneça os dados laboratoriais')
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyses/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: selectedPatient,
          analysisType: 'laboratory',
          examData: {
            labData,
            symptoms,
            focusType: analysisType
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro na análise')
      }

      const data = await response.json()
      setResults(data.data)
      setStep(3)
    } catch (error: any) {
      console.error('Erro na análise:', error)
      alert(`Erro na análise: ${error.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analysisTypes = [
    {
      id: 'comprehensive',
      name: 'Análise Abrangente',
      description: 'Análise completa com interpretação de todos os marcadores'
    },
    {
      id: 'hormonal',
      name: 'Foco Hormonal',
      description: 'Análise focada em hormônios e ciclo menstrual'
    },
    {
      id: 'metabolic',
      name: 'Foco Metabólico',
      description: 'Análise focada em metabolismo e nutrição'
    },
    {
      id: 'inflammatory',
      name: 'Foco Inflamatório',
      description: 'Análise focada em marcadores inflamatórios'
    }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Análise Laboratorial com IA
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Interpretação inteligente de exames laboratoriais com foco em medicina funcional
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => {
                setStep(1)
                setResults(null)
                setSelectedPatient('')
                setLabData('')
                setSymptoms('')
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Nova Análise
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <div className="flex items-center">
              {[1, 2, 3].map((stepNumber) => (
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
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      stepNumber < 3 ? (step > stepNumber ? 'bg-primary-600' : 'bg-gray-200') : ''
                    }`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-sm text-gray-600">Selecionar Paciente</span>
              <span className="text-sm text-gray-600">Dados Laboratoriais</span>
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
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-2">
                    Escolha a Paciente
                  </label>
                  <select
                    id="patient"
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">Selecione uma paciente...</option>
                    <option value="demo-1">Maria Silva (Demo)</option>
                    <option value="demo-2">Ana Santos (Demo)</option>
                    <option value="demo-3">Julia Costa (Demo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Análise
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysisTypes.map((type) => (
                      <div
                        key={type.id}
                        className={`relative rounded-lg border p-4 cursor-pointer ${
                          analysisType === type.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => setAnalysisType(type.id)}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="analysisType"
                            value={type.id}
                            checked={analysisType === type.id}
                            onChange={(e) => setAnalysisType(e.target.value)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <div className="ml-3">
                            <label className="block text-sm font-medium text-gray-900">
                              {type.name}
                            </label>
                            <p className="text-sm text-gray-500">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedPatient}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    Próximo →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Dados Laboratoriais */}
        {step === 2 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Etapa 2: Dados Laboratoriais
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="labData" className="block text-sm font-medium text-gray-700 mb-2">
                    Resultados dos Exames *
                  </label>
                  <textarea
                    id="labData"
                    rows={12}
                    value={labData}
                    onChange={(e) => setLabData(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Cole aqui os resultados dos exames laboratoriais, exemplo:

Hemograma Completo:
- Hemácias: 4.2 milhões/mm³ (VR: 4.0-5.0)
- Hemoglobina: 12.5 g/dL (VR: 12.0-16.0)
- Hematócrito: 38% (VR: 36-46)

Perfil Lipídico:
- Colesterol Total: 200 mg/dL (VR: <200)
- HDL: 45 mg/dL (VR: >40)
- LDL: 130 mg/dL (VR: <130)

Hormônios:
- TSH: 2.5 mUI/L (VR: 0.4-4.0)
- T4 Livre: 1.2 ng/dL (VR: 0.8-1.8)
- FSH: 8.0 mUI/mL (VR: 2.0-12.0)
- LH: 6.5 mUI/mL (VR: 1.0-12.0)

Vitaminas e Minerais:
- Vitamina D: 25 ng/mL (VR: 30-100)
- B12: 350 pg/mL (VR: 200-900)
- Ferro: 70 μg/dL (VR: 60-150)
- Ferritina: 25 ng/mL (VR: 15-200)"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Inclua valores de referência quando disponíveis. A IA pode interpretar diversos formatos.
                  </p>
                </div>

                <div>
                  <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700 mb-2">
                    Sintomas e Observações Clínicas (Opcional)
                  </label>
                  <textarea
                    id="symptoms"
                    rows={4}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Descreva sintomas atuais, histórico clínico relevante, medicamentos em uso, etc."
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={!labData || isAnalyzing}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analisando...
                      </>
                    ) : (
                      'Analisar com IA →'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Resultados */}
        {step === 3 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Etapa 3: Resultados da Análise
              </h3>
              
              {results ? (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Análise Concluída com Sucesso
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>A análise foi processada pela IA especializada em medicina funcional.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="prose max-w-none">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold mb-4">Interpretação dos Exames</h4>
                      <div className="whitespace-pre-wrap text-gray-700">
                        {results}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(2)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      ← Editar Dados
                    </button>
                    <div className="space-x-3">
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir
                      </button>
                      <button
                        onClick={() => {
                          setStep(1)
                          setResults(null)
                          setSelectedPatient('')
                          setLabData('')
                          setSymptoms('')
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Nova Análise
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Processando análise...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 