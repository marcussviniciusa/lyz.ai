'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Target, Calendar, Utensils, Pill, Activity, Heart, Book, CheckCircle2, Save, Play } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface Patient {
  _id: string;
  name: string;
  age: number;
  mainSymptoms: { symptom: string; priority: number }[];
  createdAt: Date;
}

interface TreatmentGoals {
  shortTerm: string[];
  mediumTerm: string[];
  longTerm: string[];
  priorities: string[];
}

interface Preferences {
  dietaryRestrictions: string[];
  exercisePreferences: string[];
  supplementPreferences: string[];
  lifestyleConstraints: string[];
  communicationStyle: string;
  followUpFrequency: string;
}

export default function TreatmentPlanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [treatmentGoals, setTreatmentGoals] = useState<TreatmentGoals>({
    shortTerm: [],
    mediumTerm: [],
    longTerm: [],
    priorities: []
  });
  const [preferences, setPreferences] = useState<Preferences>({
    dietaryRestrictions: [],
    exercisePreferences: [],
    supplementPreferences: [],
    lifestyleConstraints: [],
    communicationStyle: '',
    followUpFrequency: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [availableAnalyses, setAvailableAnalyses] = useState({
    laboratory: false,
    tcm: false,
    chronology: false,
    ifm: false
  });
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [existingAnalyses, setExistingAnalyses] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchPatients();
    }
  }, [session]);

  useEffect(() => {
    if (selectedPatientId) {
      loadExistingAnalyses();
    }
  }, [selectedPatientId]);

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

  const checkAvailableAnalyses = async (patientId: string) => {
    try {
      const response = await fetch(`/api/analyses/patient/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableAnalyses(data.analyses);
      }
    } catch (error) {
      console.error('Erro ao verificar análises:', error);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    checkAvailableAnalyses(patient._id);
    setSelectedPatientId(patient._id);
  };

  const addGoal = (type: keyof TreatmentGoals, goal: string) => {
    if (goal.trim()) {
      setTreatmentGoals(prev => ({
        ...prev,
        [type]: [...prev[type], goal.trim()]
      }));
    }
  };

  const removeGoal = (type: keyof TreatmentGoals, index: number) => {
    setTreatmentGoals(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const addPreference = (type: keyof Preferences, preference: string) => {
    if (preference.trim() && Array.isArray(preferences[type])) {
      setPreferences(prev => ({
        ...prev,
        [type]: [...(prev[type] as string[]), preference.trim()]
      }));
    }
  };

  const removePreference = (type: keyof Preferences, index: number) => {
    if (Array.isArray(preferences[type])) {
      setPreferences(prev => ({
        ...prev,
        [type]: (prev[type] as string[]).filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient) return;

    setLoading(true);
    try {
      const response = await fetch('/api/analysis/treatment-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          treatmentGoals,
          preferences
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setStep(4);
      } else {
        console.error('Erro na análise');
      }
    } catch (error) {
      console.error('Erro ao processar análise:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAnalyses = async () => {
    try {
      const response = await fetch(`/api/analyses/${selectedPatientId}`);
      if (response.ok) {
        const data = await response.json();
        setExistingAnalyses(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
    }
  };

  const handleGeneratePlan = async () => {
    if (!selectedPatientId) {
      alert('Por favor, selecione uma paciente');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/analyses/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: selectedPatientId,
          analysisType: 'treatmentPlan'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na geração do plano');
      }

      const data = await response.json();
      setResults(data.data);
    } catch (error: any) {
      console.error('Erro na geração do plano:', error);
      alert(`Erro na geração do plano: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const getAnalysisTypeLabel = (type: string) => {
    const labels = {
      laboratory: 'Análise Laboratorial',
      tcm: 'Medicina Tradicional Chinesa',
      chronology: 'Cronologia',
      ifm: 'Matriz IFM',
      treatmentPlan: 'Plano de Tratamento'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const treatmentAreas = [
    {
      title: 'Nutrição Funcional',
      description: 'Plano alimentar personalizado baseado em necessidades individuais',
      icon: '🥗',
      color: 'bg-green-100 text-green-800'
    },
    {
      title: 'Suplementação',
      description: 'Protocolos específicos de vitaminas, minerais e fitoterápicos',
      icon: '💊',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      title: 'Estilo de Vida',
      description: 'Modificações no sono, exercícios e gestão do estresse',
      icon: '🧘‍♀️',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      title: 'Detoxificação',
      description: 'Protocolos de eliminação de toxinas e suporte hepático',
      icon: '🌿',
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      title: 'Saúde Hormonal',
      description: 'Equilibrio endócrino e regulação dos ciclos femininos',
      icon: '⚖️',
      color: 'bg-pink-100 text-pink-800'
    },
    {
      title: 'Saúde Mental',
      description: 'Abordagem integrada para ansiedade, humor e bem-estar',
      icon: '🧠',
      color: 'bg-indigo-100 text-indigo-800'
    }
  ];

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Plano de Tratamento Personalizado
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Protocolo terapêutico integrado baseado em todas as análises realizadas
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => {
                setResults(null);
                setSelectedPatient(null);
                setExistingAnalyses([]);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Novo Plano
            </button>
          </div>
        </div>

        {/* Seleção de Paciente */}
        {!results && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Selecionar Paciente
                </h3>
                
                <div className="mb-6">
                  <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-2">
                    Escolha a Paciente
                  </label>
                  <select
                    id="patient"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Selecione uma paciente...</option>
                    {patients.map((patient: any) => (
                      <option key={patient._id} value={patient._id}>
                        {patient.name} - {patient.age} anos
                      </option>
                    ))}
                  </select>
                </div>

                {/* Análises Disponíveis */}
                {selectedPatient && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Análises Disponíveis para o Plano de Tratamento
                    </h4>
                    {existingAnalyses.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {existingAnalyses.map((analysis: any) => (
                          <div key={analysis.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-green-500 mr-3"></div>
                              <div>
                                <span className="text-sm font-medium text-gray-900 block">
                                  {getAnalysisTypeLabel(analysis.type)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-green-600 font-medium">✓</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-medium text-yellow-800 mb-1">Nenhuma análise prévia encontrada</p>
                            <p className="text-yellow-700">
                              O plano será baseado apenas nos dados cadastrais. Para um tratamento mais preciso e personalizado, 
                              recomendamos executar primeiro as análises laboratorial, MTC, cronologia e/ou matriz IFM.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Informações sobre complexidade do plano */}
                {selectedPatient && existingAnalyses.length > 0 && (
                  <div className="mb-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="font-medium text-green-800 mb-1">
                            Excelente! {existingAnalyses.length} análise(s) disponível(is)
                          </h4>
                          <p className="text-green-700 text-sm">
                            Com base nas análises realizadas, o plano de tratamento será mais detalhado e personalizado, 
                            incluindo protocolos específicos para os achados identificados.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleGeneratePlan}
                    disabled={!selectedPatientId || isGenerating}
                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Gerando Plano...
                      </>
                    ) : (
                      'Gerar Plano de Tratamento'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Info sobre Áreas do Tratamento */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Áreas Abordadas no Plano de Tratamento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {treatmentAreas.map((area, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <span className="text-2xl mr-3">{area.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {area.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {area.description}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${area.color}`}>
                            Área {index + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resultados */}
        {results && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Plano de Tratamento Personalizado
                </h3>
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {results.processingTime && `Gerado em ${(results.processingTime / 1000).toFixed(1)}s`}
                </div>
              </div>
              
              <div className="prose prose-lg max-w-none">
                {results.content.split('\n').map((line: string, index: number) => (
                  <div key={index} className="mb-3">
                    {line.startsWith('**') && line.endsWith('**') ? (
                      <h4 className="text-lg font-semibold text-gray-900 mt-6 mb-3 border-l-4 border-primary-500 pl-4">
                        {line.replace(/\*\*/g, '')}
                      </h4>
                    ) : line.startsWith('###') ? (
                      <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">
                        {line.replace(/###/g, '')}
                      </h3>
                    ) : line.startsWith('##') ? (
                      <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-6 border-b-2 border-gray-200 pb-2">
                        {line.replace(/##/g, '')}
                      </h2>
                    ) : line.startsWith('- ') ? (
                      <li className="ml-4 text-gray-700 list-disc">{line.substring(2)}</li>
                    ) : line.includes('PROTOCOLO') || line.includes('FASE') ? (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-l-4 border-blue-500 my-4">
                        <h5 className="font-bold text-blue-900">{line}</h5>
                      </div>
                    ) : line.includes('IMPORTANTE') || line.includes('ATENÇÃO') ? (
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 my-3">
                        <p className="text-yellow-800 font-medium">{line}</p>
                      </div>
                    ) : line.includes('DOSAGEM') || line.includes('POSOLOGIA') ? (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200 my-3">
                        <p className="text-green-800 font-medium">{line}</p>
                      </div>
                    ) : line.trim() ? (
                      <p className="text-gray-700 leading-relaxed">{line}</p>
                    ) : (
                      <div className="my-2"></div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setResults(null);
                    setSelectedPatient(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Novo Plano
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir Plano
                </button>
                <button
                  onClick={handleGeneratePlan}
                  disabled={isGenerating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerar Plano
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 