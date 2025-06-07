'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Analysis {
  _id: string
  type: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatment'
  description: string
  result: string
  recommendations: string[]
  status: 'pending' | 'in_progress' | 'completed'
  professional: string
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



export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [analysesLoading, setAnalysesLoading] = useState(false)

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true)
        console.log('Buscando paciente com ID:', params.id)
        
        const response = await fetch(`/api/patients/${params.id}`)
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

    if (params.id) {
      fetchPatient()
    }
  }, [params.id, router])

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
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-24 bg-gray-200 rounded mb-4"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
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
    )
  }

  if (!patient) {
    return (
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
    )
  }

  return (
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">História Menstrual</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Menarca:</dt>
                      <dd className="text-sm text-gray-900">{patient.menstrualHistory.menarche} anos</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Ciclo:</dt>
                      <dd className="text-sm text-gray-900">{patient.menstrualHistory.cycleLength} dias</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Duração:</dt>
                      <dd className="text-sm text-gray-900">{patient.menstrualHistory.menstruationLength} dias</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Última menstruação:</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(patient.menstrualHistory.lastMenstruation).toLocaleDateString('pt-BR')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Status:</dt>
                      <dd className="text-sm text-gray-900">
                        {patient.menstrualHistory.menopausalStatus === 'pre' ? 'Pré-menopausa' :
                         patient.menstrualHistory.menopausalStatus === 'peri' ? 'Perimenopausa' : 'Pós-menopausa'}
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
              <h2 className="text-xl font-semibold">Análises</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/patients/${patient._id}/analyses`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Ver Todas
                </button>
                <button
                  onClick={() => router.push(`/patients/${patient._id}/analyses/new`)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Nova Análise
                </button>
              </div>
            </div>

            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Sistema de Análises Integrado
              </h3>
              <p className="text-gray-600 mb-6">
                Análises laboratoriais, MTC, cronologia, medicina funcional e planos de tratamento integrados com IA.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">🔬</div>
                  <h4 className="font-medium text-gray-900">Laboratorial</h4>
                  <p className="text-sm text-gray-600">Análise inteligente de exames laboratoriais</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">🏮</div>
                  <h4 className="font-medium text-gray-900">MTC</h4>
                  <p className="text-sm text-gray-600">Medicina Tradicional Chinesa</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">🧬</div>
                  <h4 className="font-medium text-gray-900">Funcional</h4>
                  <p className="text-sm text-gray-600">Medicina Funcional Integrativa</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">📅</div>
                  <h4 className="font-medium text-gray-900">Cronologia</h4>
                  <p className="text-sm text-gray-600">Análise temporal de sintomas</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">💊</div>
                  <h4 className="font-medium text-gray-900">Tratamento</h4>
                  <p className="text-sm text-gray-600">Planos integrados personalizados</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">🤖</div>
                  <h4 className="font-medium text-gray-900">IA Integrada</h4>
                  <p className="text-sm text-gray-600">OpenAI, Anthropic, Google</p>
                </div>
              </div>

              <button
                onClick={() => router.push(`/patients/${patient._id}/analyses/new`)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Criar Primeira Análise
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-sm text-gray-500 text-center">
        Criado em: {new Date(patient.createdAt).toLocaleDateString('pt-BR')} | 
        Atualizado em: {new Date(patient.updatedAt).toLocaleDateString('pt-BR')}
      </div>
    </div>
  )
} 