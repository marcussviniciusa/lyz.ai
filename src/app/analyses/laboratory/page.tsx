'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Upload, FileText, X, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Patient {
  _id: string
  name: string
  age?: number
  email?: string
}

interface LabResult {
  name: string
  value: string
  unit: string
  referenceRange: string
  functionalRange?: string
  status: 'normal' | 'borderline' | 'abnormal' | 'optimal'
  interpretation: string
  priority: 'low' | 'medium' | 'high'
}

interface AnalysisResult {
  summary: string
  results: LabResult[]
  recommendations: string[]
  functionalInsights: string[]
  riskFactors: string[]
  followUp: string
}

function LaboratoryAnalysisContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedPatientId = searchParams.get('patientId')
  
  const [step, setStep] = useState(1)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  
  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [ocrResults, setOcrResults] = useState<any[]>([])
  const [processingMethod, setProcessingMethod] = useState('')
  const [confidence, setConfidence] = useState(0)
  
  // Manual input state
  const [labData, setLabData] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [inputMethod, setInputMethod] = useState<'upload' | 'manual'>('upload')
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      loadPatients()
    }
  }, [status])

  // Pré-selecionar paciente se fornecido via URL
  useEffect(() => {
    if (preSelectedPatientId && patients.length > 0) {
      const patientExists = patients.find(p => p._id === preSelectedPatientId)
      if (patientExists) {
        setSelectedPatient(preSelectedPatientId)
        setStep(2) // Ir direto para o step de inserção de dados
      }
    }
  }, [preSelectedPatientId, patients])

  const loadPatients = async () => {
    setLoadingPatients(true)
    try {
      const response = await fetch('/api/patients')
      if (response.ok) {
        const data = await response.json()
        setPatients(data.patients || [])
      } else {
        console.error('Erro ao carregar pacientes')
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    } finally {
      setLoadingPatients(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
      return validTypes.includes(file.type)
    })
    
    if (validFiles.length !== files.length) {
      setUploadError('Apenas arquivos PDF, PNG e JPG são aceitos')
      return
    }
    
    setUploadedFiles(prev => [...prev, ...validFiles])
    setUploadError('')
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const processFiles = async (): Promise<string> => {
    if (uploadedFiles.length === 0) return ''
    
    setIsUploading(true)
    setUploadError('')
    setOcrResults([])
    
    try {
      const formData = new FormData()
      uploadedFiles.forEach(file => formData.append('files', file))
      
      const response = await fetch('/api/upload/exam', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Erro no upload dos arquivos')
      }
      
      const data = await response.json()
      
      // Capturar informações do processamento
      setConfidence(data.confidence || 0)
      setProcessingMethod(data.method || 'unknown')
      setOcrResults(data.ocrResults || [])
      
      if (data.processingErrors && data.processingErrors.length > 0) {
        console.warn('Erros de processamento:', data.processingErrors)
      }
      
      return data.extractedText || ''
    } catch (error: any) {
      setUploadError('Erro ao processar arquivos: ' + error.message)
      setConfidence(0)
      setProcessingMethod('error')
      return ''
    } finally {
      setIsUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedPatient) {
      setError('Por favor, selecione uma paciente')
      return
    }
    
    let examData = ''
    
    if (inputMethod === 'upload' && uploadedFiles.length > 0) {
      examData = await processFiles()
      if (!examData && uploadError) {
        return
      }
    } else if (inputMethod === 'manual') {
      examData = labData
    }
    
    if (!examData) {
      setError('Por favor, forneça os dados laboratoriais via upload ou inserção manual')
      return
    }

    setIsAnalyzing(true)
    setError('')
    
    try {
      const response = await fetch('/api/analysis/laboratory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: selectedPatient,
          examData,
          symptoms
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro na análise')
      }

      const data = await response.json()
      setResults(data)
      setStep(3)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setSelectedPatient('')
    setUploadedFiles([])
    setLabData('')
    setSymptoms('')
    setResults(null)
    setError('')
    setUploadError('')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-green-100 text-green-800 border-green-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'borderline': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'abnormal': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />
      default: return null
    }
  }

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              🔬 Análise Laboratorial com IA
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Interpretação inteligente de exames laboratoriais com medicina funcional
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button
              onClick={resetForm}
              variant="outline"
            >
              Nova Análise
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-6">
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
                  {stepNumber < 3 && (
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
              <span className="text-sm text-gray-600">Dados dos Exames</span>
              <span className="text-sm text-gray-600">Resultados</span>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Selecionar Paciente */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Etapa 1: Selecionar Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-2">
                  Escolha a Paciente *
                </label>
                {loadingPatients ? (
                  <div className="animate-pulse h-10 bg-gray-200 rounded-md"></div>
                ) : (
                  <select
                    id="patient"
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">Selecione uma paciente...</option>
                    {patients.map((patient) => (
                      <option key={patient._id} value={patient._id}>
                        {patient.name} {patient.age ? `(${patient.age} anos)` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {patients.length === 0 && !loadingPatients && (
                  <p className="mt-1 text-sm text-gray-500">
                    Nenhuma paciente cadastrada. Cadastre uma paciente primeiro.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedPatient}
                >
                  Próximo →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Dados Laboratoriais */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Etapa 2: Dados Laboratoriais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Método de Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Método de Entrada dos Dados
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                      inputMethod === 'upload'
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setInputMethod('upload')}
                  >
                    <div className="flex items-center space-x-3">
                      <Upload className="w-5 h-5 text-primary-600" />
                      <div>
                        <div className="font-medium text-gray-900">Upload de Arquivos</div>
                        <div className="text-sm text-gray-500">PDF, PNG, JPG</div>
                      </div>
                    </div>
                  </div>
                  
                  <div
                    className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                      inputMethod === 'manual'
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setInputMethod('manual')}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-primary-600" />
                      <div>
                        <div className="font-medium text-gray-900">Inserção Manual</div>
                        <div className="text-sm text-gray-500">Digitar ou colar dados</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload de Arquivos */}
              {inputMethod === 'upload' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload de Exames (PDF, PNG, JPG)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                          >
                            <span>Escolher arquivos</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              multiple
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="sr-only"
                              onChange={handleFileUpload}
                            />
                          </label>
                          <p className="pl-1">ou arraste e solte</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PDF, PNG, JPG até 10MB cada
                        </p>
                      </div>
                    </div>

                    {uploadError && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{uploadError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Lista de arquivos */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Arquivos selecionados:
                        </h4>
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
                            >
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-700">{file.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({Math.round(file.size / 1024)}KB)
                                </span>
                              </div>
                              <button
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status do Processamento OCR */}
                    {(confidence > 0 || processingMethod) && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Status do Processamento OCR
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Método:</span>
                            <span className="text-blue-900 font-medium">
                              {processingMethod === 'google_vision' && '🔍 Google Vision API'}
                              {processingMethod === 'fallback' && '📄 Modo Simulação'}
                              {processingMethod === 'error_fallback' && '⚠️ Fallback (Erro)'}
                              {!processingMethod && 'Processando...'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Confiança:</span>
                            <span className={`font-medium ${
                              confidence >= 0.8 ? 'text-green-600' :
                              confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {(confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          {ocrResults.length > 0 && (
                            <div className="mt-3">
                              <span className="text-blue-700 font-medium">Arquivos processados:</span>
                              <div className="mt-1 space-y-1">
                                {ocrResults.map((result, idx) => (
                                  <div key={idx} className="text-xs bg-white p-2 rounded border">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium">{result.fileName}</span>
                                      <span className={`px-2 py-1 rounded ${
                                        result.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                                        result.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {result.confidence ? `${(result.confidence * 100).toFixed(0)}%` : 'N/A'}
                                      </span>
                                    </div>
                                    {result.examType && (
                                      <div className="text-gray-600 mt-1">
                                        Tipo detectado: {result.examType}
                                      </div>
                                    )}
                                    {result.error && (
                                      <div className="text-red-600 mt-1">
                                        Erro: {result.error}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Inserção Manual */}
              {inputMethod === 'manual' && (
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
                    placeholder="Cole aqui os resultados dos exames laboratoriais.

FORMATO ACEITO - Apenas dados laboratoriais reais:

✅ Exemplos corretos:
TSH: 2.5 mUI/L (VR: 0.4-4.0)
Hemoglobina: 12.5 g/dL (VR: 12.0-16.0)
Vitamina D: 25 ng/mL (VR: 30-100)
Ferritina: 45 ng/mL (Ref: 15-200)
Glicose: 95 mg/dL (VR: 70-110)
Colesterol Total: 180 mg/dL
HDL: 45 mg/dL (VR: >40)

❌ Evite incluir dados administrativos:
CNES, CRF, idade, cadastro, telefone, endereço, etc."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Inclua valores de referência quando disponíveis. A IA pode interpretar diversos formatos.
                  </p>
                </div>
              )}

              {/* Sintomas */}
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
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  ← Voltar
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={
                    isAnalyzing ||
                    isUploading ||
                    (inputMethod === 'upload' && uploadedFiles.length === 0) ||
                    (inputMethod === 'manual' && !labData.trim())
                  }
                >
                  {isAnalyzing || isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isUploading ? 'Processando...' : 'Analisando...'}
                    </>
                  ) : (
                    'Analisar com IA →'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Resultados */}
        {step === 3 && (
          <div className="space-y-6">
            {results ? (
              <>
                {/* Resumo Executivo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>Resumo Executivo</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-900">{results.summary}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Resultados Detalhados */}
                <Card>
                  <CardHeader>
                    <CardTitle>Análise Detalhada dos Marcadores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-2 font-medium text-gray-700">Marcador</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-700">Valor</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-700">Referência Convencional</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-700">Faixa Funcional</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-700">Status</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-700">Prioridade</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-700">Interpretação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.results.map((result, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-2 font-medium text-gray-900">{result.name}</td>
                              <td className="py-3 px-2">
                                <span className="font-semibold">{result.value}</span>
                                {result.unit && <span className="text-gray-500 ml-1">{result.unit}</span>}
                              </td>
                              <td className="py-3 px-2 text-gray-600">{result.referenceRange}</td>
                              <td className="py-3 px-2 text-gray-600">{result.functionalRange || 'N/A'}</td>
                              <td className="py-3 px-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(result.status)}`}>
                                  {result.status === 'optimal' && 'Ótimo'}
                                  {result.status === 'normal' && 'Normal'}
                                  {result.status === 'borderline' && 'Limítrofe'}
                                  {result.status === 'abnormal' && 'Alterado'}
                                </span>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center space-x-1">
                                  {getPriorityIcon(result.priority)}
                                  <span className="text-xs capitalize">{result.priority}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-sm text-gray-700">{result.interpretation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Seções removidas: Insights da Medicina Funcional e Plano de Acompanhamento */}

                {/* Ações */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                  >
                    ← Editar Dados
                  </Button>
                  <div className="space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => window.print()}
                    >
                      📄 Imprimir
                    </Button>
                    <Button onClick={resetForm}>
                      Nova Análise
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Processando análise...</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function LaboratoryAnalysisPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando análise laboratorial...</p>
        </div>
      </DashboardLayout>
    }>
      <LaboratoryAnalysisContent />
    </Suspense>
  )
} 