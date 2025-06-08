'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { calculateAge } from '@/utils/dateUtils'
import { DateInput } from '@/components/ui/date-input'

interface PatientFormData {
  name: string
  birthDate: string
  height: number
  weight: number
  menstrualHistory: {
    menarche: number
    cycleLength: number
    menstruationLength: number
    lastMenstruation: string
    menopausalStatus: 'pre' | 'peri' | 'post'
    contraceptiveUse: string
  }
  mainSymptoms: Array<{
    symptom: string
    priority: number
  }>
  medicalHistory: {
    allergies: string
    medications: Array<{
      name: string
      dosage: string
      frequency: string
      type: 'medication' | 'supplement'
    }>
    chronicConditions: string
    surgeries: string
    familyHistory: string
  }
  lifestyle: {
    sleepQuality: 'good' | 'regular' | 'poor'
    sleepHours: number
    exerciseFrequency: 'none' | 'occasional' | 'regular' | 'daily'
    exerciseType: string
    stressLevel: 'low' | 'moderate' | 'high'
    nutritionQuality: 'good' | 'regular' | 'poor'
    relationshipQuality: 'good' | 'regular' | 'poor'
  }
  treatmentGoals: {
    goals: string[]
    expectations: string
    additionalNotes: string
  }
  notes: string
}

export default function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    birthDate: '',
    height: 0,
    weight: 0,
    menstrualHistory: {
      menarche: 0,
      cycleLength: 0,
      menstruationLength: 0,
      lastMenstruation: '',
      menopausalStatus: 'pre',
      contraceptiveUse: ''
    },
    mainSymptoms: [],
    medicalHistory: {
      allergies: '',
      medications: [],
      chronicConditions: '',
      surgeries: '',
      familyHistory: ''
    },
    lifestyle: {
      sleepQuality: 'regular',
      sleepHours: 8,
      exerciseFrequency: 'regular',
      exerciseType: '',
      stressLevel: 'moderate',
      nutritionQuality: 'regular',
      relationshipQuality: 'regular'
    },
    treatmentGoals: {
      goals: [],
      expectations: '',
      additionalNotes: ''
    },
    notes: ''
  })

  // Carregar dados do paciente
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/patients/${resolvedParams.id}`)
        
        if (!response.ok) {
          throw new Error('Paciente não encontrado')
        }

        const patient = await response.json()
        
        // Mapear dados do paciente para o formulário
        setFormData({
          name: patient.name || '',
          birthDate: patient.birthDate?.split('T')[0] || '',
          height: patient.height || 0,
          weight: patient.weight || 0,
          menstrualHistory: {
            menarche: patient.menstrualHistory?.menarche || 0,
            cycleLength: patient.menstrualHistory?.cycleLength || 0,
            menstruationLength: patient.menstrualHistory?.menstruationLength || 0,
            lastMenstruation: patient.menstrualHistory?.lastMenstruation?.split('T')[0] || '',
            menopausalStatus: patient.menstrualHistory?.menopausalStatus || 'pre',
            contraceptiveUse: patient.menstrualHistory?.contraceptiveUse || ''
          },
          mainSymptoms: patient.mainSymptoms || [],
          medicalHistory: {
            allergies: Array.isArray(patient.medicalHistory?.allergies) 
              ? patient.medicalHistory.allergies.join(', ') 
              : patient.medicalHistory?.allergies || '',
            medications: patient.medications || [],
            chronicConditions: patient.medicalHistory?.personalHistory || '',
            surgeries: Array.isArray(patient.medicalHistory?.previousTreatments)
              ? patient.medicalHistory.previousTreatments.join('\n')
              : '',
            familyHistory: patient.medicalHistory?.familyHistory || ''
          },
          lifestyle: {
            sleepQuality: patient.lifestyle?.sleepQuality || 'regular',
            sleepHours: patient.lifestyle?.sleepHours || 8,
            exerciseFrequency: patient.lifestyle?.exerciseFrequency || 'regular',
            exerciseType: patient.lifestyle?.exerciseType || '',
            stressLevel: patient.lifestyle?.stressLevel || 'moderate',
            nutritionQuality: patient.lifestyle?.nutritionQuality || 'regular',
            relationshipQuality: patient.lifestyle?.relationshipQuality || 'regular'
          },
          treatmentGoals: {
            goals: patient.treatmentGoals?.goals || [],
            expectations: patient.treatmentGoals?.expectations || '',
            additionalNotes: patient.treatmentGoals?.additionalNotes || ''
          },
          notes: ''
        })
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados do paciente')
      } finally {
        setLoading(false)
      }
    }

    if (resolvedParams.id) {
      fetchPatient()
    }
  }, [resolvedParams.id])

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        medications: [...prev.medicalHistory.medications, {
          name: '',
          dosage: '',
          frequency: '',
          type: 'medication'
        }]
      }
    }))
  }

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        medications: prev.medicalHistory.medications.filter((_, i) => i !== index)
      }
    }))
  }

  const updateMedication = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        medications: prev.medicalHistory.medications.map((med, i) => 
          i === index ? { ...med, [field]: value } : med
        )
      }
    }))
  }

  const addSymptom = () => {
    if (formData.mainSymptoms.length < 5) {
      setFormData(prev => ({
        ...prev,
        mainSymptoms: [...prev.mainSymptoms, {
          symptom: '',
          priority: prev.mainSymptoms.length + 1
        }]
      }))
    }
  }

  const removeSymptom = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mainSymptoms: prev.mainSymptoms.filter((_, i) => i !== index)
        .map((symptom, i) => ({ ...symptom, priority: i + 1 }))
    }))
  }

  const updateSymptom = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      mainSymptoms: prev.mainSymptoms.map((symptom, i) => 
        i === index ? { ...symptom, [field]: value } : symptom
      )
    }))
  }

  const calculateIMC = (height: number, weight: number) => {
    if (height > 0 && weight > 0) {
      const heightInMeters = height / 100
      return (weight / (heightInMeters * heightInMeters)).toFixed(1)
    }
    return null
  }

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      
      // Tratar campos especiais
      if (field === 'lifestyle.sleepHours') {
        setFormData(prev => ({
          ...prev,
          lifestyle: {
            ...prev.lifestyle,
            sleepHours: parseInt(value) || 8
          }
        }))
      } else if (field === 'menstrualHistory.menarche' || field === 'menstrualHistory.cycleLength' || field === 'menstrualHistory.menstruationLength') {
        setFormData(prev => ({
          ...prev,
          menstrualHistory: {
            ...prev.menstrualHistory,
            [child]: parseInt(value) || 0
          }
        }))
      } else if (field === 'treatmentGoals.goals') {
        // Parse goals string to array
        const goalsArray = value.split('\n').filter(line => line.trim())
        setFormData(prev => ({
          ...prev,
          treatmentGoals: {
            ...prev.treatmentGoals,
            goals: goalsArray
          }
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent as keyof PatientFormData] as any,
            [child]: value
          }
        }))
      }
    } else {
      // Campos numéricos
      if (field === 'height' || field === 'weight') {
        setFormData(prev => ({
          ...prev,
          [field]: parseInt(value) || 0
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          [field]: value
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Transformar os dados para o formato esperado pela API
      const apiData = {
        name: formData.name,
        birthDate: formData.birthDate,
        age: calculateAge(formData.birthDate),
        height: formData.height,
        weight: formData.weight,
        menstrualHistory: {
          menarche: formData.menstrualHistory.menarche,
          cycleLength: formData.menstrualHistory.cycleLength,
          menstruationLength: formData.menstrualHistory.menstruationLength,
          lastMenstruation: formData.menstrualHistory.lastMenstruation,
          menopausalStatus: formData.menstrualHistory.menopausalStatus,
          contraceptiveUse: formData.menstrualHistory.contraceptiveUse
        },
        mainSymptoms: formData.mainSymptoms.map(s => ({
          symptom: s.symptom,
          priority: s.priority
        })),
        medicalHistory: {
          personalHistory: formData.medicalHistory.chronicConditions || 'Não informado',
          familyHistory: formData.medicalHistory.familyHistory || 'Não informado',
          allergies: formData.medicalHistory.allergies ? [formData.medicalHistory.allergies] : [],
          previousTreatments: formData.medicalHistory.surgeries ? [formData.medicalHistory.surgeries] : []
        },
        medications: formData.medicalHistory.medications.map(m => ({
          name: m.name,
          dosage: m.dosage || 'Não especificado',
          frequency: m.frequency || 'Não especificado',
          type: m.type
        })),
        lifestyle: {
          sleepQuality: formData.lifestyle.sleepQuality,
          sleepHours: formData.lifestyle.sleepHours,
          exerciseFrequency: formData.lifestyle.exerciseFrequency,
          exerciseType: formData.lifestyle.exerciseType,
          stressLevel: formData.lifestyle.stressLevel,
          nutritionQuality: formData.lifestyle.nutritionQuality,
          relationshipQuality: formData.lifestyle.relationshipQuality
        },
        treatmentGoals: {
          goals: formData.treatmentGoals.goals,
          expectations: formData.treatmentGoals.expectations,
          additionalNotes: formData.treatmentGoals.additionalNotes
        }
      }

      const response = await fetch(`/api/patients/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar paciente')
      }

      setSuccess('Paciente atualizado com sucesso!')
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push(`/patients/${resolvedParams.id}`)
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Erro interno do servidor')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-24 bg-gray-200 rounded mb-4"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/patients/${resolvedParams.id}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Detalhes
          </Button>
          
          <h1 className="text-3xl font-bold">Editar Paciente</h1>
          <p className="text-gray-600 mt-2">
            Atualize os dados do paciente
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <DateInput
                    id="birthDate"
                    label="Data de Nascimento *"
                    value={formData.birthDate}
                    onChange={(value) => handleInputChange('birthDate', value)}
                    required
                  />
                </div>
                
                {formData.birthDate && (
                  <div>
                    <Label>Idade (calculada)</Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm">
                      <span className="font-medium">{calculateAge(formData.birthDate)} anos</span>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    min="50"
                    max="250"
                    value={formData.height || ''}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    placeholder="Ex: 165"
                  />
                </div>
                
                <div>
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="20"
                    max="300"
                    value={formData.weight || ''}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    placeholder="Ex: 65"
                  />
                </div>
                
                {formData.height > 0 && formData.weight > 0 && (
                  <div>
                    <Label>IMC (calculado)</Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm">
                      <span className="font-medium">{calculateIMC(formData.height, formData.weight)}</span>
                      <span className="text-gray-600 ml-2">
                        {(() => {
                          const imc = parseFloat(calculateIMC(formData.height, formData.weight) || '0')
                          if (imc < 18.5) return '(Abaixo do peso)'
                          if (imc < 25) return '(Peso normal)'
                          if (imc < 30) return '(Sobrepeso)'
                          return '(Obesidade)'
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico Menstrual */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico Menstrual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="menarche">Idade da Menarca</Label>
                  <Input
                    id="menarche"
                    type="number"
                    min="8"
                    max="18"
                    value={formData.menstrualHistory.menarche || ''}
                    onChange={(e) => handleInputChange('menstrualHistory.menarche', e.target.value)}
                    placeholder="Ex: 12"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cycleLength">Duração do Ciclo (dias)</Label>
                  <Input
                    id="cycleLength"
                    type="number"
                    min="21"
                    max="45"
                    value={formData.menstrualHistory.cycleLength || ''}
                    onChange={(e) => handleInputChange('menstrualHistory.cycleLength', e.target.value)}
                    placeholder="Ex: 28"
                  />
                </div>
                
                <div>
                  <Label htmlFor="menstruationLength">Duração da Menstruação (dias)</Label>
                  <Input
                    id="menstruationLength"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.menstrualHistory.menstruationLength || ''}
                    onChange={(e) => handleInputChange('menstrualHistory.menstruationLength', e.target.value)}
                    placeholder="Ex: 5"
                  />
                </div>
                
                <div>
                  <DateInput
                    id="lastMenstruation"
                    label="Última Menstruação"
                    value={formData.menstrualHistory.lastMenstruation}
                    onChange={(value) => handleInputChange('menstrualHistory.lastMenstruation', value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="menopausalStatus">Status Menopausal</Label>
                  <Select
                    value={formData.menstrualHistory.menopausalStatus}
                    onValueChange={(value) => handleInputChange('menstrualHistory.menopausalStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre">Pré-menopausa</SelectItem>
                      <SelectItem value="peri">Perimenopausa</SelectItem>
                      <SelectItem value="post">Pós-menopausa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="contraceptiveUse">Uso de Contraceptivos</Label>
                  <Input
                    id="contraceptiveUse"
                    value={formData.menstrualHistory.contraceptiveUse}
                    onChange={(e) => handleInputChange('menstrualHistory.contraceptiveUse', e.target.value)}
                    placeholder="Ex: Anticoncepcional oral, DIU..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sintomas Principais */}
          <Card>
            <CardHeader>
              <CardTitle>Sintomas Principais</CardTitle>
              <p className="text-sm text-gray-600">Liste até 5 sintomas principais por ordem de prioridade</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center mb-3">
                <Label>Sintomas (máximo 5)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSymptom}
                  disabled={formData.mainSymptoms.length >= 5}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Sintoma
                </Button>
              </div>
              
              {formData.mainSymptoms.map((symptom, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Sintoma {index + 1} (Prioridade {symptom.priority})</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSymptom(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-3">
                      <Label>Descrição do Sintoma *</Label>
                      <Input
                        value={symptom.symptom}
                        onChange={(e) => updateSymptom(index, 'symptom', e.target.value)}
                        placeholder="Ex: Cólicas menstruais intensas"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Prioridade</Label>
                      <Select
                        value={symptom.priority.toString()}
                        onValueChange={(value) => updateSymptom(index, 'priority', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} - {num === 1 ? 'Mais urgente' : num === 5 ? 'Menos urgente' : 'Moderada'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              
              {formData.mainSymptoms.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">🎯</div>
                  <p>Nenhum sintoma adicionado</p>
                  <p className="text-sm">Clique em "Adicionar Sintoma" para começar</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico Médico */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico Médico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="allergies">Alergias</Label>
                <Textarea
                  id="allergies"
                  value={formData.medicalHistory.allergies}
                  onChange={(e) => handleInputChange('medicalHistory.allergies', e.target.value)}
                  placeholder="Descreva alergias conhecidas..."
                />
              </div>
              
              {/* Medicações */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Medicamentos em Uso</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMedication}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Medicamento
                  </Button>
                </div>
                
                {formData.medicalHistory.medications.map((medication, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Medicamento {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Nome do Medicamento *</Label>
                        <Input
                          value={medication.name}
                          onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          placeholder="Ex: Metformina"
                        />
                      </div>
                      
                      <div>
                        <Label>Dosagem</Label>
                        <Input
                          value={medication.dosage}
                          onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          placeholder="Ex: 500mg"
                        />
                      </div>
                      
                      <div>
                        <Label>Frequência</Label>
                        <Input
                          value={medication.frequency}
                          onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                          placeholder="Ex: 2x ao dia"
                        />
                      </div>
                      
                      <div>
                        <Label>Tipo</Label>
                        <Select
                          value={medication.type}
                          onValueChange={(value) => updateMedication(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medication">Medicamento</SelectItem>
                            <SelectItem value="supplement">Suplemento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                
                {formData.medicalHistory.medications.length === 0 && (
                  <p className="text-gray-500 text-sm">Nenhum medicamento adicionado</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="chronicConditions">Condições Crônicas</Label>
                <Textarea
                  id="chronicConditions"
                  value={formData.medicalHistory.chronicConditions}
                  onChange={(e) => handleInputChange('medicalHistory.chronicConditions', e.target.value)}
                  placeholder="Descreva condições crônicas..."
                />
              </div>
              
              <div>
                <Label htmlFor="surgeries">Cirurgias</Label>
                <Textarea
                  id="surgeries"
                  value={formData.medicalHistory.surgeries}
                  onChange={(e) => handleInputChange('medicalHistory.surgeries', e.target.value)}
                  placeholder="Liste cirurgias realizadas..."
                />
              </div>
              
              <div>
                <Label htmlFor="familyHistory">Histórico Familiar</Label>
                <Textarea
                  id="familyHistory"
                  value={formData.medicalHistory.familyHistory}
                  onChange={(e) => handleInputChange('medicalHistory.familyHistory', e.target.value)}
                  placeholder="Histórico médico familiar relevante..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Estilo de Vida */}
          <Card>
            <CardHeader>
              <CardTitle>Estilo de Vida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sleepQuality">Qualidade do Sono</Label>
                <Select
                  value={formData.lifestyle.sleepQuality}
                  onValueChange={(value) => handleInputChange('lifestyle.sleepQuality', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a qualidade do sono" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Boa</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="poor">Ruim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="sleepHours">Horas de Sono</Label>
                <Input
                  id="sleepHours"
                  type="number"
                  value={formData.lifestyle.sleepHours.toString()}
                  onChange={(e) => handleInputChange('lifestyle.sleepHours', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="exerciseFrequency">Frequência de Exercício</Label>
                <Select
                  value={formData.lifestyle.exerciseFrequency}
                  onValueChange={(value) => handleInputChange('lifestyle.exerciseFrequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="occasional">Ocasional</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="daily">Diário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="exerciseType">Tipo de Exercício</Label>
                <Textarea
                  id="exerciseType"
                  value={formData.lifestyle.exerciseType}
                  onChange={(e) => handleInputChange('lifestyle.exerciseType', e.target.value)}
                  placeholder="Descreva o tipo de exercício..."
                />
              </div>
              
              <div>
                <Label htmlFor="stressLevel">Nível de Estresse</Label>
                <Select
                  value={formData.lifestyle.stressLevel}
                  onValueChange={(value) => handleInputChange('lifestyle.stressLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixo</SelectItem>
                    <SelectItem value="moderate">Moderado</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="nutritionQuality">Qualidade da Nutrição</Label>
                <Select
                  value={formData.lifestyle.nutritionQuality}
                  onValueChange={(value) => handleInputChange('lifestyle.nutritionQuality', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Boa</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="poor">Ruim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="relationshipQuality">Qualidade da Relação</Label>
                <Select
                  value={formData.lifestyle.relationshipQuality}
                  onValueChange={(value) => handleInputChange('lifestyle.relationshipQuality', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Boa</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="poor">Ruim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Metas de Tratamento */}
          <Card>
            <CardHeader>
              <CardTitle>Metas de Tratamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="goals">Metas</Label>
                <Textarea
                  id="goals"
                  value={formData.treatmentGoals.goals.join('\n')}
                  onChange={(e) => handleInputChange('treatmentGoals.goals', e.target.value)}
                  placeholder="Liste metas de tratamento..."
                />
              </div>
              
              <div>
                <Label htmlFor="expectations">Expectativas</Label>
                <Textarea
                  id="expectations"
                  value={formData.treatmentGoals.expectations}
                  onChange={(e) => handleInputChange('treatmentGoals.expectations', e.target.value)}
                  placeholder="Descreva expectativas..."
                />
              </div>
              
              <div>
                <Label htmlFor="additionalNotes">Notas Adicionais</Label>
                <Textarea
                  id="additionalNotes"
                  value={formData.treatmentGoals.additionalNotes}
                  onChange={(e) => handleInputChange('treatmentGoals.additionalNotes', e.target.value)}
                  placeholder="Adicione notas adicionais..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/patients/${resolvedParams.id}`)}
              disabled={saving}
            >
              Cancelar
            </Button>
            
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 