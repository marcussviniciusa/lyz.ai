'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, Clock, Plus, ArrowLeft, AlertCircle, Trash2, Play, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Patient {
  _id: string;
  name: string;
  age: number;
  mainSymptoms: { symptom: string; priority: number }[];
  createdAt: Date;
}

interface LifeEvent {
  date: string;
  category: 'medical' | 'hormonal' | 'emotional' | 'lifestyle' | 'relationship' | 'professional';
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'very-high';
  impact: string;
}

interface MenstrualIrregularity {
  date: string;
  description: string;
  possibleCause: string;
}

interface ContraceptiveHistory {
  startDate: string;
  endDate: string;
  type: string;
  sideEffects: string;
}

interface SymptomEvolution {
  symptom: string;
  firstAppearance: string;
  progression: 'improving' | 'stable' | 'worsening' | 'fluctuating';
  triggers: string[];
  relievingFactors: string[];
}

interface TreatmentHistory {
  startDate: string;
  endDate: string;
  treatment: string;
  practitioner: string;
  effectiveness: 'very-effective' | 'effective' | 'minimal' | 'ineffective' | 'worsened';
  sideEffects: string;
}

interface ChronologyData {
  lifeEvents: LifeEvent[];
  menstrualHistory: {
    menarche: string;
    cyclePattern: string;
    irregularities: MenstrualIrregularity[];
    contraceptiveHistory: ContraceptiveHistory[];
  };
  symptomEvolution: SymptomEvolution[];
  treatmentHistory: TreatmentHistory[];
}

export default function ChronologyAnalysisPage() {
  const { status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [chronologyData, setChronologyData] = useState<ChronologyData>({
    lifeEvents: [],
    menstrualHistory: {
      menarche: '',
      cyclePattern: '',
      irregularities: [],
      contraceptiveHistory: []
    },
    symptomEvolution: [],
    treatmentHistory: []
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    timeline: Array<{
      date: string;
      event: string;
      category: string;
      impact: string;
    }>;
    patterns: Array<{
      pattern: string;
      significance: string;
    }>;
    recommendations: string[];
  } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient) return;

    setLoading(true);
    try {
      const response = await fetch('/api/analysis/chronology', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          chronologyData
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setStep(5);
      } else {
        console.error('Erro na análise');
      }
    } catch (error) {
      console.error('Erro ao processar análise:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções para adicionar/remover eventos
  const addLifeEvent = () => {
    setChronologyData(prev => ({
      ...prev,
      lifeEvents: [...prev.lifeEvents, {
        date: '',
        category: 'medical',
        description: '',
        severity: 'moderate',
        impact: ''
      }]
    }));
  };

  const removeLifeEvent = (index: number) => {
    setChronologyData(prev => ({
      ...prev,
      lifeEvents: prev.lifeEvents.filter((_, i) => i !== index)
    }));
  };

  const updateLifeEvent = (index: number, field: keyof LifeEvent, value: string) => {
    setChronologyData(prev => ({
      ...prev,
      lifeEvents: prev.lifeEvents.map((event, i) => 
        i === index ? { ...event, [field]: value } : event
      )
    }));
  };

  const addSymptomEvolution = () => {
    setChronologyData(prev => ({
      ...prev,
      symptomEvolution: [...prev.symptomEvolution, {
        symptom: '',
        firstAppearance: '',
        progression: 'stable',
        triggers: [],
        relievingFactors: []
      }]
    }));
  };

  const categories = [
    { value: 'medical', label: 'Médico', color: 'bg-red-100 text-red-800' },
    { value: 'hormonal', label: 'Hormonal', color: 'bg-purple-100 text-purple-800' },
    { value: 'emotional', label: 'Emocional', color: 'bg-blue-100 text-blue-800' },
    { value: 'lifestyle', label: 'Estilo de Vida', color: 'bg-green-100 text-green-800' },
    { value: 'relationship', label: 'Relacionamento', color: 'bg-pink-100 text-pink-800' },
    { value: 'professional', label: 'Profissional', color: 'bg-gray-100 text-gray-800' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Baixo' },
    { value: 'moderate', label: 'Moderado' },
    { value: 'high', label: 'Alto' },
    { value: 'very-high', label: 'Muito Alto' }
  ];

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/analyses" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Análises
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Análise de Cronologia</h1>
        <p className="text-gray-600 mt-2">Identificação de padrões temporais na história da paciente</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex items-center ${i < 5 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step >= i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {i}
              </div>
              {i < 5 && (
                <div className={`flex-1 h-1 mx-4 
                  ${step > i ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Paciente</span>
          <span>Eventos</span>
          <span>Sintomas</span>
          <span>Tratamentos</span>
          <span>Resultado</span>
        </div>
      </div>

      {/* Step 1: Seleção de Paciente */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Selecionar Paciente</h2>
          <div className="grid gap-4">
            {patients.map((patient) => (
              <div
                key={patient._id.toString()}
                className={`p-4 border rounded-lg cursor-pointer transition-colors
                  ${selectedPatient?._id === patient._id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{patient.name}</h3>
                    <p className="text-sm text-gray-600">{patient.age} anos</p>
                    <p className="text-sm text-gray-500">
                      {patient.mainSymptoms.length} sintomas principais
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(patient.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedPatient}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Eventos de Vida */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Eventos de Vida e Histórico Menstrual
          </h2>

          <div className="space-y-8">
            {/* Histórico Menstrual Básico */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Histórico Menstrual</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data da Menarca</label>
                  <input
                    type="date"
                    value={chronologyData.menstrualHistory.menarche}
                    onChange={(e) => setChronologyData(prev => ({
                      ...prev,
                      menstrualHistory: { ...prev.menstrualHistory, menarche: e.target.value }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Padrão de Ciclo</label>
                  <input
                    type="text"
                    value={chronologyData.menstrualHistory.cyclePattern}
                    onChange={(e) => setChronologyData(prev => ({
                      ...prev,
                      menstrualHistory: { ...prev.menstrualHistory, cyclePattern: e.target.value }
                    }))}
                    placeholder="Ex: Regular 28 dias, irregular, ausente..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Eventos de Vida */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Eventos Significativos</h3>
                <button
                  onClick={addLifeEvent}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Evento
                </button>
              </div>

              <div className="space-y-4">
                {chronologyData.lifeEvents.map((event, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-700">Evento {index + 1}</span>
                      <button
                        onClick={() => removeLifeEvent(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) => updateLifeEvent(index, 'date', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                        <select
                          value={event.category}
                          onChange={(e) => updateLifeEvent(index, 'category', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                        <input
                          type="text"
                          value={event.description}
                          onChange={(e) => updateLifeEvent(index, 'description', e.target.value)}
                          placeholder="Descreva o evento..."
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Severidade</label>
                        <select
                          value={event.severity}
                          onChange={(e) => updateLifeEvent(index, 'severity', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {severityLevels.map(level => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Impacto na Saúde</label>
                        <input
                          type="text"
                          value={event.impact}
                          onChange={(e) => updateLifeEvent(index, 'impact', e.target.value)}
                          placeholder="Como afetou a saúde..."
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {chronologyData.lifeEvents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Nenhum evento adicionado. Clique em "Adicionar Evento" para começar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Evolução de Sintomas */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Evolução de Sintomas
          </h2>

          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">Registre como os sintomas evoluíram ao longo do tempo</p>
            <button
              onClick={addSymptomEvolution}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Sintoma
            </button>
          </div>

          <div className="space-y-4">
            {chronologyData.symptomEvolution.map((symptom, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">Sintoma {index + 1}</span>
                  <button
                    onClick={() => setChronologyData(prev => ({
                      ...prev,
                      symptomEvolution: prev.symptomEvolution.filter((_, i) => i !== index)
                    }))}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sintoma</label>
                    <input
                      type="text"
                      value={symptom.symptom}
                      onChange={(e) => setChronologyData(prev => ({
                        ...prev,
                        symptomEvolution: prev.symptomEvolution.map((s, i) => 
                          i === index ? { ...s, symptom: e.target.value } : s
                        )
                      }))}
                      placeholder="Nome do sintoma"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primeira Aparição</label>
                    <input
                      type="date"
                      value={symptom.firstAppearance}
                      onChange={(e) => setChronologyData(prev => ({
                        ...prev,
                        symptomEvolution: prev.symptomEvolution.map((s, i) => 
                          i === index ? { ...s, firstAppearance: e.target.value } : s
                        )
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Progressão</label>
                    <select
                      value={symptom.progression}
                      onChange={(e) => setChronologyData(prev => ({
                        ...prev,
                        symptomEvolution: prev.symptomEvolution.map((s, i) => 
                          i === index ? { ...s, progression: e.target.value as any } : s
                        )
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="improving">Melhorando</option>
                      <option value="stable">Estável</option>
                      <option value="worsening">Piorando</option>
                      <option value="fluctuating">Flutuante</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gatilhos (separados por vírgula)</label>
                    <input
                      type="text"
                      value={symptom.triggers.join(', ')}
                      onChange={(e) => setChronologyData(prev => ({
                        ...prev,
                        symptomEvolution: prev.symptomEvolution.map((s, i) => 
                          i === index ? { ...s, triggers: e.target.value.split(',').map(t => t.trim()) } : s
                        )
                      }))}
                      placeholder="Stress, menstruação, alimentos..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            {chronologyData.symptomEvolution.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Nenhum sintoma adicionado. Clique em "Adicionar Sintoma" para começar.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Histórico de Tratamentos */}
      {step === 4 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6">Histórico de Tratamentos</h2>

          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">Registre todos os tratamentos já realizados</p>
            <button
              onClick={() => setChronologyData(prev => ({
                ...prev,
                treatmentHistory: [...prev.treatmentHistory, {
                  startDate: '',
                  endDate: '',
                  treatment: '',
                  practitioner: '',
                  effectiveness: 'minimal',
                  sideEffects: ''
                }]
              }))}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Tratamento
            </button>
          </div>

          <div className="space-y-4">
            {chronologyData.treatmentHistory.map((treatment, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">Tratamento {index + 1}</span>
                  <button
                    onClick={() => setChronologyData(prev => ({
                      ...prev,
                      treatmentHistory: prev.treatmentHistory.filter((_, i) => i !== index)
                    }))}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Início</label>
                    <input
                      type="date"
                      value={treatment.startDate}
                      onChange={(e) => setChronologyData(prev => ({
                        ...prev,
                        treatmentHistory: prev.treatmentHistory.map((t, i) => 
                          i === index ? { ...t, startDate: e.target.value } : t
                        )
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fim (opcional)</label>
                    <input
                      type="date"
                      value={treatment.endDate}
                      onChange={(e) => setChronologyData(prev => ({
                        ...prev,
                        treatmentHistory: prev.treatmentHistory.map((t, i) => 
                          i === index ? { ...t, endDate: e.target.value } : t
                        )
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tratamento</label>
                    <input
                      type="text"
                      value={treatment.treatment}
                      onChange={(e) => setChronologyData(prev => ({
                        ...prev,
                        treatmentHistory: prev.treatmentHistory.map((t, i) => 
                          i === index ? { ...t, treatment: e.target.value } : t
                        )
                      }))}
                      placeholder="Nome do tratamento"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profissional</label>
                    <input
                      type="text"
                      value={treatment.practitioner}
                      onChange={(e) => setChronologyData(prev => ({
                        ...prev,
                        treatmentHistory: prev.treatmentHistory.map((t, i) => 
                          i === index ? { ...t, practitioner: e.target.value } : t
                        )
                      }))}
                      placeholder="Nome do profissional"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Efetividade</label>
                    <select
                      value={treatment.effectiveness}
                      onChange={(e) => setChronologyData(prev => ({
                        ...prev,
                        treatmentHistory: prev.treatmentHistory.map((t, i) => 
                          i === index ? { ...t, effectiveness: e.target.value as any } : t
                        )
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="very-effective">Muito Efetivo</option>
                      <option value="effective">Efetivo</option>
                      <option value="minimal">Mínimo</option>
                      <option value="ineffective">Inefetivo</option>
                      <option value="worsened">Piorou</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Efeitos Colaterais</label>
                    <input
                      type="text"
                      value={treatment.sideEffects}
                      onChange={(e) => setChronologyData(prev => ({
                        ...prev,
                        treatmentHistory: prev.treatmentHistory.map((t, i) => 
                          i === index ? { ...t, sideEffects: e.target.value } : t
                        )
                      }))}
                      placeholder="Efeitos colaterais observados"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            {chronologyData.treatmentHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Nenhum tratamento adicionado. Clique em "Adicionar Tratamento" para começar.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Gerar Análise Cronológica
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Resultado */}
      {step === 5 && result && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6">Resultado da Análise Cronológica</h2>
          
          <div className="space-y-8">
            {/* Timeline Consolidada */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline Consolidada</h3>
              <div className="space-y-4">
                {result.analysis.consolidatedTimeline?.map((period: any, index: number) => (
                  <div key={index} className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-900">{period.period}</h4>
                      <span className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">{period.phase}</span>
                    </div>
                    {period.keyEvents.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-blue-800">Eventos Chave:</span>
                        <ul className="text-sm text-blue-700 ml-4">
                          {period.keyEvents.map((event: string, i: number) => (
                            <li key={i}>• {event}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Padrões Identificados */}
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Padrões Identificados</h3>
              
              {result.analysis.patterns.cyclicalPatterns?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-green-800 mb-2">Padrões Cíclicos</h4>
                  <div className="space-y-2">
                    {result.analysis.patterns.cyclicalPatterns.map((pattern: any, index: number) => (
                      <div key={index} className="bg-green-50 p-3 rounded-lg">
                        <div className="font-medium">{pattern.pattern}</div>
                        <div className="text-sm text-gray-600">Frequência: {pattern.frequency}</div>
                        <div className="text-sm">{pattern.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.analysis.patterns.triggerPatterns?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-green-800 mb-2">Padrões de Gatilhos</h4>
                  <div className="space-y-2">
                    {result.analysis.patterns.triggerPatterns.map((trigger: any, index: number) => (
                      <div key={index} className="bg-green-50 p-3 rounded-lg">
                        <div className="font-medium">{trigger.trigger}</div>
                        <div className="text-sm text-gray-600">Timeframe: {trigger.timeframe}</div>
                        <div className="text-sm">{trigger.mechanism}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Momentos Críticos */}
            {result.analysis.criticalMoments?.length > 0 && (
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Momentos Críticos</h3>
                <div className="space-y-3">
                  {result.analysis.criticalMoments.map((moment: any, index: number) => (
                    <div key={index} className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-red-900">{moment.event}</span>
                        <span className="text-sm text-red-700">
                          {new Date(moment.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-sm text-red-800 mb-2">{moment.impact}</div>
                      <div className="text-sm text-red-700">
                        <strong>Intervenção recomendada:</strong> {moment.recommendedIntervention}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prognóstico Temporal */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Prognóstico Temporal</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Curto Prazo (3-6 meses)</h4>
                  <p className="text-sm text-purple-800">{result.analysis.temporalPrognosis.shortTerm}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Médio Prazo (6-12 meses)</h4>
                  <p className="text-sm text-purple-800">{result.analysis.temporalPrognosis.mediumTerm}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Longo Prazo (1-2 anos)</h4>
                  <p className="text-sm text-purple-800">{result.analysis.temporalPrognosis.longTerm}</p>
                </div>
              </div>
            </div>

            {/* Síntese Cronológica */}
            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Síntese Cronológica</h3>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-gray-800">{result.analysis.chronologicalSynthesis}</p>
              </div>
            </div>

            {/* Metadados */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Informações da Análise</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Modelo:</span>
                  <span className="ml-2">{result.aiMetadata.model}</span>
                </div>
                <div>
                  <span className="text-gray-600">Tokens:</span>
                  <span className="ml-2">{result.aiMetadata.totalTokens}</span>
                </div>
                <div>
                  <span className="text-gray-600">Custo:</span>
                  <span className="ml-2">R$ {result.aiMetadata.cost.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Data:</span>
                  <span className="ml-2">{new Date(result.createdAt).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => router.push('/analyses')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Voltar para Análises
            </button>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedPatient(null);
                  setResult(null);
                  setChronologyData({
                    lifeEvents: [],
                    menstrualHistory: {
                      menarche: '',
                      cyclePattern: '',
                      irregularities: [],
                      contraceptiveHistory: []
                    },
                    symptomEvolution: [],
                    treatmentHistory: []
                  });
                }}
                className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
              >
                Nova Análise
              </button>
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
                <Save className="w-4 h-4 mr-2" />
                Salvar Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 