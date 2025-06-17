'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

const renderMarkdown = (text: string): string => {
  // First, let's handle tables
  let processedText = text.replace(/\|(.+)\|/g, (match, content) => {
    const row = content.split('|').map((cell: string) => cell.trim());
    return `<tr>${row.map((cell: string) => `<td class="border border-gray-300 px-3 py-2">${cell}</td>`).join('')}</tr>`;
  });

  // Wrap table rows in table
  processedText = processedText.replace(/(<tr>.*?<\/tr>\s*)+/g, (match) => {
    return `<table class="w-full border-collapse border border-gray-300 my-6">${match}</table>`;
  });

  return processedText
    // Process headers (order matters - #### before ###)
    .replace(/^#### (.*$)/gim, '<h4 class="text-base font-medium mb-3 mt-6 text-gray-800">$1</h4>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-4 mt-8 text-gray-900">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-6 mt-10 text-gray-900 border-b-2 border-gray-200 pb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-8 mt-12 text-gray-900">$1</h1>')
    
    // Process bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    
    // Process horizontal rules
    .replace(/^---$/gim, '<hr class="my-8 border-gray-300">')
    
    // Process different levels of lists
    .replace(/^    - (.+)$/gim, '<li class="ml-12 mb-1 list-disc text-sm">$1</li>') // 4 spaces = sublista
    .replace(/^  - (.+)$/gim, '<li class="ml-9 mb-1 list-disc">$1</li>')             // 2 spaces = sublista
    .replace(/^- (.+)$/gim, '<li class="ml-6 mb-2 list-disc">$1</li>')               // lista principal
    
    // Group consecutive <li> elements into <ul> containers
    .replace(/(<li[^>]*>.*?<\/li>\s*)+/g, (match) => {
      return `<ul class="mb-4 space-y-1">${match}</ul>`;
    })
    
    // Split into paragraphs and process each one
    .split('\n\n')
    .map(paragraph => {
      // Don't wrap headers, lists, tables, or horizontal rules in <p> tags
      if (paragraph.includes('<h') || paragraph.includes('<ul') || paragraph.includes('<hr') || paragraph.includes('<table') || !paragraph.trim()) {
        return paragraph;
      }
      return `<p class="mb-4 text-gray-800 leading-relaxed">${paragraph}</p>`;
    })
    .join('\n');
};

export default function TreatmentPlanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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

  // Função legada removida - usar handleGeneratePlan ao invés

  const loadExistingAnalyses = useCallback(async () => {
    try {
      const response = await fetch(`/api/analyses?patientId=${selectedPatientId}`);
      if (response.ok) {
        const data = await response.json();
        const relevantAnalyses = data.data?.filter((analysis: any) => 
          ['laboratory', 'tcm', 'chronology', 'ifm'].includes(analysis.type)
        ) || [];
        setExistingAnalyses(relevantAnalyses);
      }
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
    }
  }, [selectedPatientId]);

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
      
      // Processar resposta de forma inteligente (similar às outras análises)
      let processedResult;
      if (data.data?.result) {
        processedResult = data.data.result;
      } else if (data.data?.analysis) {
        processedResult = data.data;
      } else if (data.data) {
        processedResult = data.data;
      } else {
        processedResult = data;
      }
      
      console.log('Dados do plano de tratamento recebidos:', processedResult);
      setResults(processedResult);
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
                color: 'bg-primary-100 text-primary-800'
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
                          <div key={analysis._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(results.content || results.analysis || '') }} />
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