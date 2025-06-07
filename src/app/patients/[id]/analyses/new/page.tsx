'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

interface Patient {
  _id: string
  name: string
  dateOfBirth: string
}

export default function NewAnalysisPage({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: ''
  })
  const router = useRouter()

  useEffect(() => {
    fetchPatient()
  }, [params.id])

  const fetchPatient = async () => {
    try {
      const response = await fetch(`/api/patients/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setPatient(data)
      } else {
        console.error('Erro ao carregar paciente')
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.type || !formData.title) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: params.id,
          type: formData.type,
          title: formData.title,
          description: formData.description,
        }),
      })

      if (response.ok) {
        const analysis = await response.json()
        router.push(`/analyses/${analysis._id}`)
      } else {
        const error = await response.json()
        alert(`Erro ao criar análise: ${error.error}`)
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao criar análise')
    } finally {
      setSaving(false)
    }
  }

  const analysisTypes = [
    { value: 'laboratory', label: 'Análise Laboratorial' },
    { value: 'tcm', label: 'Medicina Tradicional Chinesa' },
    { value: 'chronology', label: 'Cronologia' },
    { value: 'ifm', label: 'Matriz IFM' },
    { value: 'treatment', label: 'Plano de Tratamento' },
  ]

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Paciente não encontrado</h2>
          <Link href="/patients">
            <Button>Voltar para lista de pacientes</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/patients/${patient._id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Análise</h1>
          <p className="text-gray-600">Paciente: {patient.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="type">Tipo de Análise *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de análise" />
                </SelectTrigger>
                <SelectContent>
                  {analysisTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Título da Análise *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Análise laboratorial completa"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o objetivo desta análise..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Link href={`/patients/${patient._id}`}>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? 'Criando...' : 'Criar Análise'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 