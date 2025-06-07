'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

// Função para mapear atividade física para valores enum válidos
function mapExerciseFrequency(activity: string): 'none' | 'occasional' | 'regular' | 'daily' {
  switch (activity) {
    case 'sedentaria': return 'none'
    case 'leve': return 'occasional'
    case 'moderada': return 'regular'
    case 'intensa':
    case 'atleta': return 'daily'
    default: return 'regular'
  }
}

export default function NewPatientPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Dados Pessoais
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    
    // Dados Médicos Gerais
    weight: '',
    height: '',
    profession: '',
    physicalActivity: '',
    smokingHistory: '',
    alcoholConsumption: '',
    
    // Histórico Menstrual
    menarcheAge: '',
    menstrualCycleLength: '',
    menstrualFlowDuration: '',
    lastMenstrualPeriod: '',
    contraceptiveMethod: '',
    contraceptiveHistory: '',
    
    // Sintomas (máximo 5)
    symptoms: [''],
    
    // Histórico Médico
    previousDiseases: '',
    familyHistory: '',
    surgicalHistory: '',
    currentMedications: '',
    allergies: '',
    
    // Objetivos do Tratamento
    treatmentGoals: '',
    specificConcerns: '',
    
    // Observações
    notes: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSymptomChange = (index: number, value: string) => {
    const newSymptoms = [...formData.symptoms]
    newSymptoms[index] = value
    setFormData(prev => ({
      ...prev,
      symptoms: newSymptoms
    }))
  }

  const addSymptom = () => {
    if (formData.symptoms.length < 5) {
      setFormData(prev => ({
        ...prev,
        symptoms: [...prev.symptoms, '']
      }))
    }
  }

  const removeSymptom = (index: number) => {
    const newSymptoms = formData.symptoms.filter((_, i) => i !== index)
    setFormData(prev => ({
      ...prev,
      symptoms: newSymptoms.length > 0 ? newSymptoms : ['']
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Converter birthDate para age
      const birthDate = new Date(formData.birthDate)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear() - 
        (today.getMonth() < birthDate.getMonth() || 
         (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0)

      // Estruturar dados conforme esperado pela API
      const patientData = {
        name: formData.name,
        age: age,
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        
        menstrualHistory: {
          menarche: formData.menarcheAge ? parseInt(formData.menarcheAge) : 12, // Valor padrão
          cycleLength: formData.menstrualCycleLength ? parseInt(formData.menstrualCycleLength) : 28, // Valor padrão
          menstruationLength: formData.menstrualFlowDuration ? parseInt(formData.menstrualFlowDuration) : 5, // Valor padrão
          lastMenstruation: formData.lastMenstrualPeriod || new Date().toISOString().split('T')[0], // Data atual se não informada
          menopausalStatus: 'pre', // Valor enum válido
          contraceptiveUse: formData.contraceptiveMethod || 'none'
        },
        
        // Converter sintomas para formato correto
        mainSymptoms: formData.symptoms
          .filter(s => s.trim() !== '')
          .map((symptom, index) => ({
            symptom: symptom.trim(),
            priority: index + 1 // Prioridade baseada na ordem
          })),
        
        medicalHistory: {
          personalHistory: formData.previousDiseases || 'Não informado',
          familyHistory: formData.familyHistory || 'Não informado',
          allergies: formData.allergies ? [formData.allergies] : [],
          previousTreatments: formData.surgicalHistory ? [formData.surgicalHistory] : []
        },
        
        medications: formData.currentMedications ? [{
          name: formData.currentMedications,
          dosage: 'Não especificado',
          frequency: 'Conforme prescrição',
          type: 'medication'
        }] : [],
        
        lifestyle: {
          sleepQuality: 'regular', // Valor enum válido
          sleepHours: 8,
          exerciseFrequency: mapExerciseFrequency(formData.physicalActivity), // Mapear para valores válidos
          exerciseType: formData.physicalActivity || 'cardio',
          stressLevel: 'moderate',
          nutritionQuality: 'regular',
          relationshipQuality: 'regular'
        },
        
        treatmentGoals: {
          goals: formData.treatmentGoals ? [formData.treatmentGoals] : ['Não especificado'],
          expectations: formData.specificConcerns || 'Melhoria geral da saúde',
          additionalNotes: formData.notes || ''
        }
      }



      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      })

      if (response.ok) {
        router.push('/patients')
      } else {
        let errorMessage = 'Erro desconhecido'
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || 'Erro desconhecido'
        } catch (e) {
          console.error('Erro ao parsear resposta:', e)
          errorMessage = `Erro HTTP ${response.status}`
        }
        alert(`Erro ao criar paciente: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao criar paciente: Falha na comunicação com o servidor')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return <div>Carregando...</div>
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Nova Paciente
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Preencha todas as informações necessárias para criar o perfil da paciente
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Dados Pessoais */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Dados Pessoais
              </h3>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    required
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Dados Físicos */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Dados Físicos e Estilo de Vida
              </h3>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    step="0.1"
                    value={formData.weight}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profissão
                  </label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Atividade Física
                  </label>
                  <select
                    name="physicalActivity"
                    value={formData.physicalActivity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Selecione</option>
                    <option value="sedentaria">Sedentária</option>
                    <option value="leve">Leve (1-2x/semana)</option>
                    <option value="moderada">Moderada (3-4x/semana)</option>
                    <option value="intensa">Intensa (5-6x/semana)</option>
                    <option value="atleta">Atleta (diário/2x dia)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Histórico de Tabagismo
                  </label>
                  <select
                    name="smokingHistory"
                    value={formData.smokingHistory}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Selecione</option>
                    <option value="nunca">Nunca fumou</option>
                    <option value="ex-fumante">Ex-fumante</option>
                    <option value="atual">Fumante atual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consumo de Álcool
                  </label>
                  <select
                    name="alcoholConsumption"
                    value={formData.alcoholConsumption}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Selecione</option>
                    <option value="nao-bebe">Não bebe</option>
                    <option value="social">Social (ocasional)</option>
                    <option value="regular">Regular (semanal)</option>
                    <option value="diario">Diário</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Histórico Menstrual */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Histórico Menstrual
              </h3>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idade da Menarca
                  </label>
                  <input
                    type="number"
                    name="menarcheAge"
                    min="8"
                    max="20"
                    value={formData.menarcheAge}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duração do Ciclo (dias)
                  </label>
                  <input
                    type="number"
                    name="menstrualCycleLength"
                    min="21"
                    max="45"
                    value={formData.menstrualCycleLength}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duração do Fluxo (dias)
                  </label>
                  <input
                    type="number"
                    name="menstrualFlowDuration"
                    min="1"
                    max="10"
                    value={formData.menstrualFlowDuration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Última Menstruação
                  </label>
                  <input
                    type="date"
                    name="lastMenstrualPeriod"
                    value={formData.lastMenstrualPeriod}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método Contraceptivo Atual
                  </label>
                  <input
                    type="text"
                    name="contraceptiveMethod"
                    value={formData.contraceptiveMethod}
                    onChange={handleInputChange}
                    placeholder="Ex: Pílula, DIU, Preservativo, Nenhum"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Histórico de Métodos Contraceptivos
                </label>
                <textarea
                  name="contraceptiveHistory"
                  rows={3}
                  value={formData.contraceptiveHistory}
                  onChange={handleInputChange}
                  placeholder="Descreva métodos utilizados anteriormente e por quanto tempo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Sintomas */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Sintomas Principais (máximo 5)
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Liste os principais sintomas ou queixas da paciente
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {formData.symptoms.map((symptom, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={symptom}
                    onChange={(e) => handleSymptomChange(index, e.target.value)}
                    placeholder={`Sintoma ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  {formData.symptoms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSymptom(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {formData.symptoms.length < 5 && (
                <button
                  type="button"
                  onClick={addSymptom}
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  + Adicionar Sintoma
                </button>
              )}
            </div>
          </div>

          {/* Histórico Médico */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Histórico Médico
              </h3>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doenças Prévias
                </label>
                <textarea
                  name="previousDiseases"
                  rows={3}
                  value={formData.previousDiseases}
                  onChange={handleInputChange}
                  placeholder="Liste doenças diagnosticadas anteriormente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Histórico Familiar
                </label>
                <textarea
                  name="familyHistory"
                  rows={3}
                  value={formData.familyHistory}
                  onChange={handleInputChange}
                  placeholder="Doenças na família (pais, avós, irmãos)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cirurgias Realizadas
                </label>
                <textarea
                  name="surgicalHistory"
                  rows={2}
                  value={formData.surgicalHistory}
                  onChange={handleInputChange}
                  placeholder="Liste cirurgias e anos aproximados"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medicamentos Atuais
                </label>
                <textarea
                  name="currentMedications"
                  rows={3}
                  value={formData.currentMedications}
                  onChange={handleInputChange}
                  placeholder="Liste medicamentos em uso, incluindo suplementos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alergias
                </label>
                <textarea
                  name="allergies"
                  rows={2}
                  value={formData.allergies}
                  onChange={handleInputChange}
                  placeholder="Liste alergias conhecidas a medicamentos, alimentos, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Objetivos do Tratamento */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Objetivos do Tratamento
              </h3>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objetivos Principais
                </label>
                <textarea
                  name="treatmentGoals"
                  rows={3}
                  value={formData.treatmentGoals}
                  onChange={handleInputChange}
                  placeholder="O que a paciente espera alcançar com o tratamento?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preocupações Específicas
                </label>
                <textarea
                  name="specificConcerns"
                  rows={3}
                  value={formData.specificConcerns}
                  onChange={handleInputChange}
                  placeholder="Preocupações ou questões específicas da paciente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações Adicionais
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Qualquer informação adicional relevante"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Criar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}