'use client'

import { useEffect, useState, use } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateBR, calculateDaysSince } from '@/utils/dateUtils'
import DashboardLayout from '@/components/DashboardLayout'

interface Analysis {
  _id: string
  type: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatment'
  status: 'pending' | 'processing' | 'completed' | 'error'
  patient: {
    _id: string
    name: string
  }
  professional: {
    _id: string
    name: string
  }
  result?: {
    rawOutput?: string
    laboratoryAnalysis?: {
      interpretation?: string
      recommendations?: string[]
      alteredValues?: Array<{
        parameter: string
        value: string
        interpretation: string
      }>
    }
  }
  inputData?: {
    laboratoryManualData?: string
  }
  createdAt: string
  updatedAt: string
}

interface Patient {
  _id: string
  name: string
  age?: number
  height?: number
  weight?: number
  menstrualHistory?: {
    menarche: number
    cycleLength: number
    menstruationLength: number
    lastMenstruation: Date
    menopausalStatus: 'pre' | 'peri' | 'post'
    contraceptiveUse?: string
  }
  mainSymptoms?: Array<{
    symptom: string
    priority: number
  }>
  medicalHistory?: {
    personalHistory: string
    familyHistory: string
    allergies: string[]
    previousTreatments: string[]
  }
  medications?: Array<{
    name: string
    dosage: string
    frequency: string
    type: 'medication' | 'supplement'
  }>
  lifestyle?: {
    sleepQuality: 'good' | 'regular' | 'poor'
    sleepHours: number
    exerciseFrequency: 'none' | 'occasional' | 'regular' | 'daily'
    exerciseType?: string
    stressLevel: 'low' | 'moderate' | 'high'
    nutritionQuality: 'good' | 'regular' | 'poor'
    relationshipQuality: 'good' | 'regular' | 'poor'
  }
  treatmentGoals?: {
    goals: string[]
    expectations: string
    additionalNotes?: string
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type TabType = 'overview' | 'medical' | 'medications' | 'lifestyle' | 'goals' | 'analyses'



export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [analysesLoading, setAnalysesLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Carregar análises quando a aba é ativada
  useEffect(() => {
    if (activeTab === 'analyses' && patient) {
      loadPatientAnalyses()
    }
  }, [activeTab, patient])

  const loadPatientAnalyses = async () => {
    if (!patient) return
    
    setAnalysesLoading(true)
    try {
      const response = await fetch(`/api/analyses?patientId=${patient._id}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setAnalyses(data.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar análises:', error)
    } finally {
      setAnalysesLoading(false)
    }
  }

  const handleDeletePatient = async () => {
    if (!patient) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/patients/${patient._id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/patients')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao excluir paciente')
      }
    } catch (error) {
      console.error('Erro ao excluir paciente:', error)
      setError('Erro de conexão ao excluir paciente')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true)
        console.log('Buscando paciente com ID:', resolvedParams.id)
        
        const response = await fetch(`/api/patients/${resolvedParams.id}`)
        console.log('Response status:', response.status)
        console.log('Response headers:', Object.fromEntries(response.headers.entries()))
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log('Error response:', errorText)
          
          if (response.status === 404) {
            setError('Paciente não encontrado')
          } else if (response.status === 401) {
            setError('Não autorizado - redirecionando para login')
            router.push('/auth/signin')
            return
          } else {
            try {
              const errorData = JSON.parse(errorText)
              setError(errorData.error || 'Erro ao carregar paciente')
            } catch {
              setError(`Erro ${response.status}: ${errorText}`)
            }
          }
          return
        }

        const patientData = await response.json()
        console.log('Patient data received:', patientData)
        setPatient(patientData)
      } catch (err) {
        console.error('Erro ao buscar paciente:', err)
        setError('Erro de conexão: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
      } finally {
        setLoading(false)
      }
    }

    if (resolvedParams.id) {
      fetchPatient()
    }
  }, [resolvedParams.id, router])

  const getQualityLabel = (quality: string) => {
    const labels = {
      good: 'Boa',
      regular: 'Regular', 
      poor: 'Ruim',
      none: 'Nenhum',
      occasional: 'Ocasional',
      daily: 'Diário',
      low: 'Baixo',
      moderate: 'Moderado',
      high: 'Alto'
    }
    return labels[quality as keyof typeof labels] || quality
  }

  const getQualityColor = (quality: string) => {
    if (['good', 'low'].includes(quality)) return 'bg-green-100 text-green-800'
    if (['regular', 'moderate', 'occasional'].includes(quality)) return 'bg-yellow-100 text-yellow-800'
    if (['poor', 'high', 'none'].includes(quality)) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }



  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: '👤' },
    { id: 'medical', label: 'Histórico Médico', icon: '🏥' },
    { id: 'medications', label: 'Medicações', icon: '💊' },
    { id: 'lifestyle', label: 'Estilo de Vida', icon: '🌙' },
    { id: 'goals', label: 'Objetivos', icon: '🎯' },
    { id: 'analyses', label: 'Análises', icon: '📊' }
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-24 bg-gray-200 rounded mb-4"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold mb-2">Erro</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Voltar
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h2 className="text-xl text-gray-600">Paciente não encontrado</h2>
            <button 
              onClick={() => router.push('/patients')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Ver todos os pacientes
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
          <p className="text-gray-600">ID: {patient._id}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              patient.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {patient.isActive ? 'Ativo' : 'Inativo'}
            </span>
            {patient.age && (
              <span className="text-sm text-gray-600">{patient.age} anos</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/patients/${patient._id}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Editar
          </button>
          <button
            onClick={() => router.push(`/patients/${patient._id}/analyses/new`)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Nova Análise
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'overview' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Visão Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Informações Básicas</h3>
                <dl className="space-y-2">
                  {patient.age && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Idade:</dt>
                      <dd className="text-sm text-gray-900">{patient.age} anos</dd>
                    </div>
                  )}
                  {patient.height && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Altura:</dt>
                      <dd className="text-sm text-gray-900">{patient.height} cm</dd>
                    </div>
                  )}
                  {patient.weight && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Peso:</dt>
                      <dd className="text-sm text-gray-900">{patient.weight} kg</dd>
                    </div>
                  )}
                  {patient.height && patient.weight && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">IMC:</dt>
                      <dd className="text-sm text-gray-900">
                        {((patient.weight / ((patient.height / 100) ** 2)).toFixed(1))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Menstrual History */}
              {patient.menstrualHistory && (
                <div className="bg-pink-50 rounded-lg p-4 border-l-4 border-pink-400">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">🌸 História Menstrual</h3>
                  <dl className="space-y-2">
                    {patient.menstrualHistory.menarche > 0 && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600">Menarca:</dt>
                        <dd className="text-sm text-gray-900">{patient.menstrualHistory.menarche} anos</dd>
                      </div>
                    )}
                    {patient.menstrualHistory.cycleLength > 0 && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600">Ciclo:</dt>
                        <dd className="text-sm text-gray-900">
                          {patient.menstrualHistory.cycleLength} dias
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            patient.menstrualHistory.cycleLength >= 21 && patient.menstrualHistory.cycleLength <= 35 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {patient.menstrualHistory.cycleLength >= 21 && patient.menstrualHistory.cycleLength <= 35 ? 'Normal' : 'Irregular'}
                          </span>
                        </dd>
                      </div>
                    )}
                    {patient.menstrualHistory.menstruationLength > 0 && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600">Duração:</dt>
                        <dd className="text-sm text-gray-900">
                          {patient.menstrualHistory.menstruationLength} dias
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            patient.menstrualHistory.menstruationLength >= 3 && patient.menstrualHistory.menstruationLength <= 7 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {patient.menstrualHistory.menstruationLength >= 3 && patient.menstrualHistory.menstruationLength <= 7 ? 'Normal' : 'Atípica'}
                          </span>
                        </dd>
                      </div>
                    )}
                    {patient.menstrualHistory.lastMenstruation && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600">Última menstruação:</dt>
                        <dd className="text-sm text-gray-900">
                          {formatDateBR(patient.menstrualHistory.lastMenstruation)}
                          <span className="ml-2 text-xs text-gray-500">
                            ({calculateDaysSince(patient.menstrualHistory.lastMenstruation)} dias atrás)
                          </span>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Status:</dt>
                      <dd>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          patient.menstrualHistory.menopausalStatus === 'pre' ? 'bg-green-100 text-green-800' :
                          patient.menstrualHistory.menopausalStatus === 'peri' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.menstrualHistory.menopausalStatus === 'pre' ? 'Pré-menopausa' :
                           patient.menstrualHistory.menopausalStatus === 'peri' ? 'Perimenopausa' : 'Pós-menopausa'}
                        </span>
                      </dd>
                    </div>
                    {patient.menstrualHistory.contraceptiveUse && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600">Contraceptivo:</dt>
                        <dd className="text-sm text-gray-900">{patient.menstrualHistory.contraceptiveUse}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Main Symptoms */}
              {patient.mainSymptoms && patient.mainSymptoms.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Sintomas Principais</h3>
                  <div className="space-y-2">
                    {patient.mainSymptoms
                      .sort((a, b) => a.priority - b.priority)
                      .map((symptom, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-900">{symptom.symptom}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                            P{symptom.priority}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('analyses')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-white transition-colors text-center"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium">Ver Análises</div>
                </button>
                <button
                  onClick={() => router.push(`/patients/${patient._id}/analyses/new`)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-white transition-colors text-center"
                >
                  <div className="text-2xl mb-2">➕</div>
                  <div className="text-sm font-medium">Nova Análise</div>
                </button>
                <button
                  onClick={() => router.push(`/patients/${patient._id}/edit`)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-white transition-colors text-center"
                >
                  <div className="text-2xl mb-2">✏️</div>
                  <div className="text-sm font-medium">Editar Dados</div>
                </button>
                <button
                  onClick={() => router.push(`/patients/${patient._id}/history`)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-white transition-colors text-center"
                >
                  <div className="text-2xl mb-2">📋</div>
                  <div className="text-sm font-medium">Histórico</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Histórico Médico</h2>
            {patient.medicalHistory ? (
              <div className="space-y-6">
                {/* Personal History */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Histórico Pessoal</h3>
                  <p className="text-gray-700 whitespace-pre-line">{patient.medicalHistory.personalHistory}</p>
                </div>

                {/* Family History */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Histórico Familiar</h3>
                  <p className="text-gray-700 whitespace-pre-line">{patient.medicalHistory.familyHistory}</p>
                </div>

                {/* Allergies */}
                {patient.medicalHistory.allergies && patient.medicalHistory.allergies.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Alergias</h3>
                    <div className="flex flex-wrap gap-2">
                      {patient.medicalHistory.allergies.map((allergy, index) => (
                        <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous Treatments */}
                {patient.medicalHistory.previousTreatments && patient.medicalHistory.previousTreatments.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Tratamentos Anteriores</h3>
                    <ul className="space-y-2">
                      {patient.medicalHistory.previousTreatments.map((treatment, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span className="text-gray-700">{treatment}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">🏥</div>
                <p>Nenhum histórico médico registrado</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Medicações Atuais</h2>
            {patient.medications && patient.medications.length > 0 ? (
              <div className="space-y-4">
                {patient.medications.map((medication, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{medication.name}</h3>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Dosagem:</span>
                            <p className="text-gray-900">{medication.dosage}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Frequência:</span>
                            <p className="text-gray-900">{medication.frequency}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Tipo:</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              medication.type === 'medication' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {medication.type === 'medication' ? 'Medicamento' : 'Suplemento'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">💊</div>
                <p>Nenhuma medicação registrada</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'lifestyle' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Estilo de Vida</h2>
            {patient.lifestyle ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sleep */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">💤 Sono</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Qualidade:</dt>
                      <dd>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(patient.lifestyle.sleepQuality)}`}>
                          {getQualityLabel(patient.lifestyle.sleepQuality)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Horas por noite:</dt>
                      <dd className="text-sm text-gray-900">{patient.lifestyle.sleepHours}h</dd>
                    </div>
                  </dl>
                </div>

                {/* Exercise */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">🏃‍♀️ Exercícios</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Frequência:</dt>
                      <dd>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(patient.lifestyle.exerciseFrequency)}`}>
                          {getQualityLabel(patient.lifestyle.exerciseFrequency)}
                        </span>
                      </dd>
                    </div>
                    {patient.lifestyle.exerciseType && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600">Tipo:</dt>
                        <dd className="text-sm text-gray-900">{patient.lifestyle.exerciseType}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Stress */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">😰 Estresse</h3>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Nível: </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(patient.lifestyle.stressLevel)}`}>
                      {getQualityLabel(patient.lifestyle.stressLevel)}
                    </span>
                  </div>
                </div>

                {/* Nutrition */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">🥗 Nutrição</h3>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Qualidade: </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(patient.lifestyle.nutritionQuality)}`}>
                      {getQualityLabel(patient.lifestyle.nutritionQuality)}
                    </span>
                  </div>
                </div>

                {/* Relationships */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">💝 Relacionamentos</h3>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Qualidade: </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(patient.lifestyle.relationshipQuality)}`}>
                      {getQualityLabel(patient.lifestyle.relationshipQuality)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">🌙</div>
                <p>Nenhuma informação de estilo de vida registrada</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Objetivos do Tratamento</h2>
            {patient.treatmentGoals ? (
              <div className="space-y-6">
                {/* Goals */}
                {patient.treatmentGoals.goals && patient.treatmentGoals.goals.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">🎯 Objetivos Específicos</h3>
                    <ul className="space-y-2">
                      {patient.treatmentGoals.goals.map((goal, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span className="text-gray-700">{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Expectations */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">💭 Expectativas</h3>
                  <p className="text-gray-700 whitespace-pre-line">{patient.treatmentGoals.expectations}</p>
                </div>

                {/* Additional Notes */}
                {patient.treatmentGoals.additionalNotes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">📝 Notas Adicionais</h3>
                    <p className="text-gray-700 whitespace-pre-line">{patient.treatmentGoals.additionalNotes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">🎯</div>
                <p>Nenhum objetivo de tratamento registrado</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analyses' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Análises da Paciente</h2>
              <div className="flex gap-2">
                <button
                  onClick={loadPatientAnalyses}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Atualizar
                </button>
                <Link 
                  href="/analyses/laboratory"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Nova Análise
                </Link>
              </div>
            </div>

            {analysesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando análises...</p>
              </div>
            ) : analyses.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Nenhuma análise encontrada
                </h3>
                <p className="text-gray-600 mb-6">
                  Ainda não foram realizadas análises para esta paciente.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl mb-2">🔬</div>
                    <h4 className="font-medium text-gray-900">Laboratorial</h4>
                    <p className="text-sm text-gray-600">Análise inteligente de exames</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl mb-2">🏮</div>
                    <h4 className="font-medium text-gray-900">MTC</h4>
                    <p className="text-sm text-gray-600">Medicina Tradicional Chinesa</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl mb-2">🧬</div>
                    <h4 className="font-medium text-gray-900">Funcional</h4>
                    <p className="text-sm text-gray-600">Medicina Funcional</p>
                  </div>
                </div>

                <Link
                  href="/analyses/laboratory"
                  className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Criar Primeira Análise
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Lista de Análises */}
                {analyses.map((analysis) => (
                  <div key={analysis._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {analysis.type === 'laboratory' && <span className="text-2xl">🔬</span>}
                          {analysis.type === 'tcm' && <span className="text-2xl">🏮</span>}
                          {analysis.type === 'chronology' && <span className="text-2xl">📅</span>}
                          {analysis.type === 'ifm' && <span className="text-2xl">🧬</span>}
                          {analysis.type === 'treatment' && <span className="text-2xl">💊</span>}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {analysis.type === 'laboratory' && 'Análise Laboratorial'}
                            {analysis.type === 'tcm' && 'Medicina Tradicional Chinesa'}
                            {analysis.type === 'chronology' && 'Cronologia'}
                            {analysis.type === 'ifm' && 'Matriz IFM'}
                            {analysis.type === 'treatment' && 'Plano de Tratamento'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(analysis.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          analysis.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : analysis.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : analysis.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {analysis.status === 'completed' && 'Concluída'}
                          {analysis.status === 'processing' && 'Processando'}
                          {analysis.status === 'pending' && 'Pendente'}
                          {analysis.status === 'error' && 'Erro'}
                        </span>
                        <button 
                          onClick={() => router.push(`/analyses/${analysis._id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Ver detalhes →
                        </button>
                      </div>
                    </div>

                    {/* Resumo da análise */}
                    {analysis.result?.laboratoryAnalysis?.interpretation && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Resumo:</h4>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {analysis.result.laboratoryAnalysis.interpretation.substring(0, 200)}...
                        </p>
                      </div>
                    )}

                    {/* Recomendações */}
                    {analysis.result?.laboratoryAnalysis?.recommendations && analysis.result.laboratoryAnalysis.recommendations.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Principais Recomendações:</h4>
                        <ul className="space-y-1">
                          {analysis.result.laboratoryAnalysis.recommendations.slice(0, 2).map((rec: string, index: number) => (
                            <li key={index} className="flex items-start text-sm text-gray-600">
                              <span className="text-green-500 mr-2 mt-0.5">•</span>
                              <span className="line-clamp-1">{rec}</span>
                            </li>
                          ))}
                          {analysis.result.laboratoryAnalysis.recommendations.length > 2 && (
                            <li className="text-sm text-gray-500 ml-4">
                              +{analysis.result.laboratoryAnalysis.recommendations.length - 2} recomendações adicionais
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {/* Ações */}
                <div className="text-center pt-6">
                  <Link
                    href="/analyses/laboratory"
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Realizar Nova Análise
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-sm text-gray-500 text-center">
        Criado em: {formatDateBR(patient.createdAt)} | 
        Atualizado em: {formatDateBR(patient.updatedAt)}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar Exclusão
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Tem certeza de que deseja excluir a paciente <strong>{patient.name}</strong>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Esta ação não pode ser desfeita e todas as análises associadas serão perdidas.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePatient}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Excluindo...
                  </>
                ) : (
                  'Confirmar Exclusão'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
} 