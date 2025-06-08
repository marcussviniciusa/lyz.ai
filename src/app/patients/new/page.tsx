'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PatientFormData {
  name: string
  birthDate: string
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

export default function NewPatientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    birthDate: '',
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
      } else if (field === 'medicalHistory.medications') {
        // Parse medications string to array
        const medicationsArray = value.split('\n').filter(line => line.trim()).map(line => {
          const parts = line.split(' - ')
          return {
            name: parts[0] || '',
            dosage: parts[1] || '',
            frequency: parts[2] || '',
            type: 'medication' as const
          }
        })
        setFormData(prev => ({
          ...prev,
          medicalHistory: {
            ...prev.medicalHistory,
            medications: medicationsArray
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
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Transformar os dados para o formato esperado pela API
      const apiData = {
        name: formData.name,
        birthDate: formData.birthDate,
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

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar paciente')
      }

      setSuccess('Paciente cadastrado com sucesso!')
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push(`/patients/${data.patient._id}`)
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Erro interno do servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <h1 className="text-3xl font-bold">Novo Paciente</h1>
          <p className="text-gray-600 mt-2">
            Preencha os dados do novo paciente
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
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    required
                  />
                </div>
              </div>
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
                    + Adicionar Medicamento
                  </Button>
                </div>
                
                {formData.medicalHistory.medications.map((medication, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Medicamento {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                        className="text-red-600"
                      >
                        Remover
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
                        <select
                          value={medication.type}
                          onChange={(e) => updateMedication(index, 'type', e.target.value)}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="medication">Medicamento</option>
                          <option value="supplement">Suplemento</option>
                        </select>
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
                <select
                  id="exerciseFrequency"
                  value={formData.lifestyle.exerciseFrequency}
                  onChange={(e) => handleInputChange('lifestyle.exerciseFrequency', e.target.value)}
                >
                  <option value="none">Nenhum</option>
                  <option value="occasional">Ocasional</option>
                  <option value="regular">Regular</option>
                  <option value="daily">Diário</option>
                </select>
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
                <select
                  id="stressLevel"
                  value={formData.lifestyle.stressLevel}
                  onChange={(e) => handleInputChange('lifestyle.stressLevel', e.target.value)}
                >
                  <option value="low">Baixo</option>
                  <option value="moderate">Moderado</option>
                  <option value="high">Alto</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="nutritionQuality">Qualidade da Nutrição</Label>
                <select
                  id="nutritionQuality"
                  value={formData.lifestyle.nutritionQuality}
                  onChange={(e) => handleInputChange('lifestyle.nutritionQuality', e.target.value)}
                >
                  <option value="good">Boa</option>
                  <option value="regular">Regular</option>
                  <option value="poor">Ruim</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="relationshipQuality">Qualidade da Relação</Label>
                <select
                  id="relationshipQuality"
                  value={formData.lifestyle.relationshipQuality}
                  onChange={(e) => handleInputChange('lifestyle.relationshipQuality', e.target.value)}
                >
                  <option value="good">Boa</option>
                  <option value="regular">Regular</option>
                  <option value="poor">Ruim</option>
                </select>
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

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Observações adicionais..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancelar
            </Button>
            
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Paciente
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}