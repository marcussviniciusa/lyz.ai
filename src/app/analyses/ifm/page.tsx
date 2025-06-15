'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';

interface Patient {
  _id: string;
  name: string;
  age: number;
  mainSymptoms: string[];
}

interface SystemEvaluation {
  name: string;
  score: number;
  symptoms: string[];
  notes: string;
}

interface IFMAssessment {
  systems: SystemEvaluation[];
  interconnections: string[];
  rootCauses: string[];
  therapeuticPriorities: string[];
}

interface IFMData {
  assimilation: {
    digestion: string;
    absorption: string;
    microbiome: string;
    gutHealth: string;
    foodSensitivities: string[];
    digestiveSymptoms: string[];
  };
  defenseRepair: {
    immuneFunction: string;
    inflammation: string;
    allergies: string[];
    autoimmunity: string;
    infections: string[];
    healingCapacity: string;
  };
  energy: {
    mitocondrialFunction: string;
    oxygenUtilization: string;
    metabolicEfficiency: string;
    fatigueLevel: string;
    energyPatterns: string;
    exerciseTolerance: string;
  };
  biotransformation: {
    phase1Detox: string;
    phase2Detox: string;
    environmentalExposures: string[];
    detoxSymptoms: string[];
    liverFunction: string;
    toxicLoad: string;
  };
  transport: {
    cardiovascularHealth: string;
    circulation: string;
    bloodPressure: string;
    heartRate: string;
    lipidProfile: string;
    vascularFunction: string;
  };
  communication: {
    neurotransmitters: string;
    hormoneBalance: string;
    stressResponse: string;
    sleepQuality: string;
    mood: string;
    cognitiveFunction: string;
  };
  structuralIntegrity: {
    muscleFunction: string;
    jointHealth: string;
    boneHealth: string;
    posture: string;
    mobility: string;
    structuralSymptoms: string[];
  };
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

export default function IFMAnalysisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<{
    analysis?: string;
    content?: string;
    processingTime?: number;
    systems?: Array<{
      name: string;
      score: number;
      symptoms: string[];
      recommendations: string[];
    }>;
    interconnections?: string[];
    priorities?: string[];
  } | null>(null);
  const [existingAnalyses, setExistingAnalyses] = useState([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadPatients();
    }
  }, [session]);

  useEffect(() => {
    if (selectedPatient) {
      loadExistingAnalyses();
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    }
  };

  const loadExistingAnalyses = useCallback(async () => {
    try {
      const response = await fetch(`/api/analyses?patientId=${selectedPatient}`);
      if (response.ok) {
        const data = await response.json();
        const relevantAnalyses = data.data?.filter((analysis: any) => 
          ['laboratory', 'tcm', 'chronology'].includes(analysis.type)
        ) || [];
        setExistingAnalyses(relevantAnalyses);
      }
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
    }
  }, [selectedPatient]);

  const handleAnalyze = async () => {
    if (!selectedPatient) {
      alert('Por favor, selecione uma paciente');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyses/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: selectedPatient,
          analysisType: 'ifm'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na análise');
      }

      const data = await response.json();
      
      // Processar resposta de forma inteligente (similar à cronologia)
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
      
      console.log('Dados da análise IFM recebidos:', processedResult);
      setResults(processedResult);
    } catch (error: any) {
      console.error('Erro na análise:', error);
      alert(`Erro na análise: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
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

  const ifmSystems = [
    {
      name: 'Assimilação',
      description: 'Digestão, absorção, microbiota, permeabilidade intestinal',
      icon: '🍽️',
      color: 'bg-green-100 text-green-800'
    },
    {
      name: 'Defesa e Reparo',
      description: 'Sistema imune, inflamação, função de barreira',
      icon: '🛡️',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      name: 'Energia',
      description: 'Produção de energia celular, mitocôndrias, metabolismo',
      icon: '⚡',
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      name: 'Biotransformação/Eliminação',
      description: 'Detoxificação, eliminação, carga tóxica',
      icon: '🔄',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      name: 'Transporte',
      description: 'Sistema cardiovascular, linfático',
      icon: '❤️',
      color: 'bg-red-100 text-red-800'
    },
    {
      name: 'Comunicação',
      description: 'Hormônios, neurotransmissores, sinalização celular',
      icon: '📡',
      color: 'bg-indigo-100 text-indigo-800'
    },
    {
      name: 'Integridade Estrutural',
      description: 'Músculos, ossos, cartilagem, pele',
      icon: '🏗️',
      color: 'bg-gray-100 text-gray-800'
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
              Análise da Matriz IFM
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Avaliação dos 7 sistemas funcionais com foco em saúde reprodutiva feminina
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => {
                setResults(null);
                setSelectedPatient('');
                setExistingAnalyses([]);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Nova Análise
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
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
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

                {/* Análises Existentes */}
                {selectedPatient && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Análises Disponíveis para Matriz IFM
                    </h4>
                    {existingAnalyses.length > 0 ? (
                      <div className="space-y-2">
                        {existingAnalyses.map((analysis: any) => (
                          <div key={analysis._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-green-500 mr-3"></div>
                              <span className="text-sm font-medium text-gray-900">
                                {getAnalysisTypeLabel(analysis.type)}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <span className="text-xs text-green-600 font-medium">Disponível</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 bg-yellow-50 p-3 rounded-lg">
                        <p className="mb-2">⚠️ Nenhuma análise anterior encontrada.</p>
                        <p>
                          A matriz IFM será gerada baseada apenas nos dados cadastrais da paciente. 
                          Para uma análise mais completa, execute primeiro outras análises.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleAnalyze}
                    disabled={!selectedPatient || isAnalyzing}
                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analisando Sistemas...
                      </>
                    ) : (
                      'Analisar Matriz IFM'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Info sobre os 7 Sistemas IFM */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Os 7 Sistemas da Matriz IFM
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ifmSystems.map((system, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <span className="text-2xl mr-3">{system.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {system.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {system.description}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${system.color}`}>
                            Sistema {index + 1}
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
                  Matriz IFM - Análise dos Sistemas Funcionais
                </h3>
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {results.processingTime && `Processado em ${(results.processingTime / 1000).toFixed(1)}s`}
                </div>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(results.content || results.analysis || '') }} />
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setResults(null);
                    setSelectedPatient('');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Nova Análise
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 