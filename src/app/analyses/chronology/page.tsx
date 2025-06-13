'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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

interface TreatmentHistory {
  startDate: string;
  endDate: string;
  treatment: string;
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
  treatmentHistory: TreatmentHistory[];
}

// Função para converter markdown básico em HTML
const renderMarkdown = (markdown: string) => {
  if (!markdown) return '';
  
  let html = markdown
    // Remove múltiplas quebras de linha consecutivas
    .replace(/\n{3,}/g, '\n\n')
    // Headers (ordem importa - 4 hashtags primeiro)
    .replace(/^#### (.*$)/gim, '<h4 class="text-base font-medium mb-3 mt-6 text-gray-800">$1</h4>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-4 mt-8 text-gray-900">$1</h3>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Listas - processa linhas que começam com "• " ou "- "
    .replace(/^[•\-] (.+)$/gim, '<li class="ml-6 mb-2 list-disc">$1</li>')
    // Agrupa listas consecutivas em <ul>
    .replace(/(<li[^>]*>.*?<\/li>\s*)+/g, (match) => {
      return `<ul class="mb-4 space-y-1">${match}</ul>`;
    })
    // Remove linhas que contêm apenas "#" 
    .replace(/^#\s*$/gm, '')
    // Parágrafos - divide por dupla quebra de linha
    .split('\n\n')
    .map(paragraph => {
      paragraph = paragraph.trim();
      // Se já contém tags HTML (headers, listas), não envolve em <p>
      if (paragraph.includes('<h') || paragraph.includes('<ul') || paragraph.includes('<li') || !paragraph) {
        return paragraph;
      }
      // Senão, envolve em parágrafo
      return `<p class="mb-4 text-gray-800 leading-relaxed">${paragraph.replace(/\n/g, '<br/>')}</p>`;
    })
    .filter(paragraph => paragraph.trim() !== '') // Remove parágrafos vazios
    .join('\n');
  
  return html;
};

export default function ChronologyAnalysisPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedPatientId = searchParams.get('patientId');
  
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
    treatmentHistory: []
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    type: string;
    content: string;
    status: string;
    createdAt: Date;
    processingTime?: number;
    analysis?: {
      consolidatedTimeline?: Array<{
        period: string;
        phase: string;
        keyEvents: string[];
    }>;
      patterns: {
        cyclicalPatterns?: Array<{
      pattern: string;
          frequency: string;
          description: string;
    }>;
        triggerPatterns?: Array<{
          trigger: string;
          timeframe: string;
          mechanism: string;
        }>;
      };
      criticalMoments?: Array<{
        event: string;
        date: string;
        impact: string;
        recommendedIntervention: string;
      }>;
      temporalPrognosis: {
        shortTerm: string;
        mediumTerm: string;
        longTerm: string;
      };
      chronologicalSynthesis: string;
    };
    aiMetadata?: {
      model: string;
      totalTokens: number;
      cost: number;
    };
  } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchPatients();
  }, []);

  // Pré-selecionar paciente se fornecido via URL
  useEffect(() => {
    if (preSelectedPatientId && patients.length > 0) {
      const patient = patients.find(p => p._id === preSelectedPatientId);
      if (patient) {
        setSelectedPatient(patient);
        autoFillMenstrualData(patient);
        setStep(2); // Ir direto para o step de inserção de dados
      }
    }
  }, [preSelectedPatientId, patients]);

  // Auto-preencher dados menstruais do cadastro
  const autoFillMenstrualData = (patient: any) => {
    if (patient.menstrualHistory) {
      // Calcular data da menarca baseada na idade atual e idade da menarca
      let menarcheDate = '';
      if (patient.menstrualHistory.menarche && patient.age) {
        const currentYear = new Date().getFullYear();
        const menarcheYear = currentYear - (patient.age - patient.menstrualHistory.menarche);
        menarcheDate = `${menarcheYear}-01-01`; // Usar 1º de janeiro como aproximação
      }

      // Criar descrição do padrão de ciclo
      let cyclePattern = '';
      if (patient.menstrualHistory.cycleLength && patient.menstrualHistory.menstruationLength) {
        const status = patient.menstrualHistory.menopausalStatus;
        const contraceptive = patient.menstrualHistory.contraceptiveUse;
        
        if (status === 'post') {
          cyclePattern = 'Pós-menopausa - ciclos ausentes';
        } else if (status === 'peri') {
          cyclePattern = `Perimenopausa - ciclos irregulares (anteriormente ${patient.menstrualHistory.cycleLength} dias)`;
        } else {
          cyclePattern = `Regular ${patient.menstrualHistory.cycleLength} dias, menstruação ${patient.menstrualHistory.menstruationLength} dias`;
          if (contraceptive) {
            cyclePattern += ` (usando ${contraceptive})`;
          }
        }
      }

      setChronologyData(prev => ({
        ...prev,
        menstrualHistory: {
          ...prev.menstrualHistory,
          menarche: menarcheDate,
          cyclePattern: cyclePattern || prev.menstrualHistory.cyclePattern
        }
      }));
    }
  };

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
    if (!selectedPatient) {
      alert('Por favor, selecione um paciente primeiro.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/analyses/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType: 'chronology',
          patientId: selectedPatient._id,
          data: chronologyData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate analysis');
      }

      const analysisResult = await response.json();
      console.log('🔍 Raw API Response:', analysisResult);
      console.log('🔍 Has data?', !!analysisResult.data);
      console.log('🔍 Data structure:', analysisResult.data);
      console.log('🔍 Analysis in data?', !!analysisResult.data?.analysis);
      console.log('🔍 Result object:', analysisResult.data?.result);
      
      // Extrair os dados corretos da resposta da API
      let processedResult;
      if (analysisResult.data?.result) {
        // Se os dados estão em data.result
        processedResult = analysisResult.data.result;
      } else if (analysisResult.data?.analysis) {
        // Se os dados estão em data.analysis
        processedResult = analysisResult.data;
      } else if (analysisResult.data) {
        // Se os dados estão diretamente em data
        processedResult = analysisResult.data;
      } else {
        // Fallback para a estrutura original
        processedResult = analysisResult;
      }
      
      console.log('🔍 Processed result:', processedResult);
      console.log('🔍 Analysis object:', processedResult.analysis);
      
      setResult(processedResult);
      setStep(4);
    } catch (error) {
      console.error('Error generating chronology analysis:', error);
      alert('Erro ao gerar análise cronológica. Tente novamente.');
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
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex items-center ${i < 4 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step >= i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {i}
              </div>
              {i < 4 && (
                <div className={`flex-1 h-1 mx-4 
                  ${step > i ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Paciente</span>
          <span>Eventos</span>
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
                onClick={() => {
                  setSelectedPatient(patient);
                  autoFillMenstrualData(patient);
                }}
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

      {/* Step 3: Histórico de Tratamentos */}
      {step === 3 && (
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
              onClick={() => setStep(2)}
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

      {/* Step 4: Resultado */}
      {step === 4 && result && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6">Resultado da Análise Cronológica</h2>
          
          {/* Análise Estruturada */}
          {result.analysis ? (
            <div className="space-y-8">
              {/* Timeline Consolidada */}
              {result.analysis.consolidatedTimeline && result.analysis.consolidatedTimeline.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Timeline Consolidada</h3>
                  <div className="space-y-4">
                    {result.analysis.consolidatedTimeline.map((period: any, index: number) => (
                      <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">{period.period}</h4>
                        <p className="text-blue-800 mb-3 font-medium">Fase: {period.phase}</p>
                        {period.keyEvents && period.keyEvents.length > 0 && (
                          <div className="mb-3">
                            <strong className="text-blue-900">Eventos-chave:</strong>
                            <ul className="list-disc list-inside text-blue-800 mt-1">
                              {period.keyEvents.map((event: string, i: number) => (
                                <li key={i}>{event}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {period.hormonalChanges && period.hormonalChanges.length > 0 && (
                          <div className="mb-3">
                            <strong className="text-blue-900">Mudanças Hormonais:</strong>
                            <ul className="list-disc list-inside text-blue-800 mt-1">
                              {period.hormonalChanges.map((change: string, i: number) => (
                                <li key={i}>{change}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Padrões Identificados */}
              {result.analysis.patterns && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Padrões Identificados</h3>
                  
                  {/* Padrões Cíclicos */}
                  {result.analysis.patterns.cyclicalPatterns && result.analysis.patterns.cyclicalPatterns.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3 text-purple-900">Padrões Cíclicos</h4>
                      <div className="grid gap-4">
                        {result.analysis.patterns.cyclicalPatterns.map((pattern: any, index: number) => (
                          <div key={index} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <div className="mb-2">
                              <strong className="text-purple-900">{pattern.pattern}</strong>
                              <span className="ml-2 text-purple-700 text-sm">({pattern.frequency})</span>
                            </div>
                            <p className="text-purple-800">{pattern.description}</p>
                            {pattern.relatedHormones && pattern.relatedHormones.length > 0 && (
                              <div className="mt-2">
                                <strong className="text-purple-900 text-sm">Hormônios relacionados:</strong>
                                <span className="ml-2 text-purple-700 text-sm">
                                  {pattern.relatedHormones.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Padrões de Gatilho */}
                  {result.analysis.patterns.triggerPatterns && result.analysis.patterns.triggerPatterns.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3 text-orange-900">Padrões de Gatilho</h4>
                      <div className="grid gap-4">
                        {result.analysis.patterns.triggerPatterns.map((trigger: any, index: number) => (
                          <div key={index} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <div className="mb-2">
                              <strong className="text-orange-900">{trigger.trigger}</strong>
                              <span className="ml-2 text-orange-700 text-sm">({trigger.timeframe})</span>
                            </div>
                            <p className="text-orange-800 mb-2">{trigger.mechanism}</p>
                            {trigger.symptoms && trigger.symptoms.length > 0 && (
                              <div>
                                <strong className="text-orange-900 text-sm">Sintomas:</strong>
                                <span className="ml-2 text-orange-700 text-sm">
                                  {trigger.symptoms.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Momentos Críticos */}
              {result.analysis.criticalMoments && result.analysis.criticalMoments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Momentos Críticos</h3>
                  <div className="space-y-4">
                    {result.analysis.criticalMoments.map((moment: any, index: number) => (
                      <div key={index} className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="flex justify-between items-start mb-2">
                          <strong className="text-red-900">{moment.event}</strong>
                          <span className="text-red-700 text-sm">
                            {moment.date && new Date(moment.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-red-800 mb-3">{moment.impact}</p>
                        {moment.cascadeEffects && moment.cascadeEffects.length > 0 && (
                          <div className="mb-3">
                            <strong className="text-red-900 text-sm">Efeitos em cascata:</strong>
                            <ul className="list-disc list-inside text-red-800 mt-1 text-sm">
                              {moment.cascadeEffects.map((effect: string, i: number) => (
                                <li key={i}>{effect}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="bg-red-100 p-3 rounded">
                          <strong className="text-red-900 text-sm">Intervenção recomendada:</strong>
                          <p className="text-red-800 text-sm mt-1">{moment.recommendedIntervention}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prognóstico Temporal */}
              {result.analysis.temporalPrognosis && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Prognóstico Temporal</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2">Curto Prazo (3-6 meses)</h4>
                      <p className="text-green-800 text-sm">{result.analysis.temporalPrognosis.shortTerm}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-yellow-900 mb-2">Médio Prazo (6-12 meses)</h4>
                      <p className="text-yellow-800 text-sm">{result.analysis.temporalPrognosis.mediumTerm}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Longo Prazo (1-2 anos)</h4>
                      <p className="text-blue-800 text-sm">{result.analysis.temporalPrognosis.longTerm}</p>
                    </div>
                  </div>
                  {result.analysis.temporalPrognosis.keyMilestones && result.analysis.temporalPrognosis.keyMilestones.length > 0 && (
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                      <strong className="text-gray-900">Marcos importantes:</strong>
                      <ul className="list-disc list-inside text-gray-800 mt-2">
                        {result.analysis.temporalPrognosis.keyMilestones.map((milestone: string, i: number) => (
                          <li key={i}>{milestone}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Síntese Cronológica */}
              {result.analysis.chronologicalSynthesis && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Síntese Cronológica</h3>
                  <div className="bg-gray-50 p-6 rounded-lg border">
                    <div 
                      className="text-gray-800 leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: renderMarkdown(result.analysis.chronologicalSynthesis) 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Metadados da IA */}
              {result.aiMetadata && (
                <div className="bg-gray-50 p-4 rounded-lg mt-8">
                  <h4 className="font-medium text-gray-900 mb-2">Informações da Análise</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Modelo:</span>
                      <span className="ml-2">{result.aiMetadata.model}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total de tokens:</span>
                      <span className="ml-2">{result.aiMetadata.totalTokens?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Custo:</span>
                      <span className="ml-2">
                        {result.aiMetadata.cost ? `$${result.aiMetadata.cost.toFixed(4)}` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Data:</span>
                      <span className="ml-2">{result.createdAt ? new Date(result.createdAt).toLocaleString('pt-BR') : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : result.content ? (
            // Fallback para conteúdo em markdown
            <div className="space-y-6">
              <div className="prose max-w-none">
                <div 
                  className="text-gray-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: renderMarkdown(result.content) 
                  }}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mt-8">
                <h4 className="font-medium text-gray-900 mb-2">Informações da Análise</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <span className="ml-2 capitalize">{result.type || 'Cronologia'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 capitalize">{result.status || 'Concluído'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tempo de processamento:</span>
                    <span className="ml-2">{result.processingTime ? `${(result.processingTime / 1000).toFixed(1)}s` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Data:</span>
                    <span className="ml-2">{result.createdAt ? new Date(result.createdAt).toLocaleString('pt-BR') : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">Conteúdo Não Encontrado</h3>
                <p className="text-yellow-700 mb-4">
                  A análise foi processada, mas o conteúdo não está disponível.
                </p>
                <div className="bg-yellow-100 p-4 rounded text-left">
                  <h4 className="font-medium text-yellow-800 mb-2">Debug Info:</h4>
                  <pre className="text-xs text-yellow-700 whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button
              onClick={() => {
                setStep(1);
                setResult(null);
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Nova Análise
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 