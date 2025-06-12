'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft, Play, Eye, Activity, Heart, User, Calendar, Thermometer, Coffee, Moon, Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { IPatient } from '@/models/Patient';

interface TCMData {
  lingualObservation: {
    color: string;
    coating: string;
    texture: string;
    moisture: string;
    size: string;
    mobility: string;
    marks: string;
  };
  pulseAnalysis: {
    rate: string;
    rhythm: string;
    strength: string;
    depth: string;
    quality: string;
    tension: string;
  };
  generalObservation: {
    complexion: string;
    eyes: string;
    voice: string;
    breathing: string;
    posture: string;
    mood: string;
  };
  symptoms: {
    sleep: string;
    digestion: string;
    appetite: string;
    thirst: string;
    urination: string;
    bowelMovement: string;
    temperature: string;
    sweating: string;
    emotions: string;
  };
  menstrualTcm: {
    // Dados básicos (auto-preenchidos do cadastro)
    menarche: number;
    cycleLength: number;
    menstruationLength: number;
    lastMenstruation: string;
    menopausalStatus: string;
    contraceptiveUse: string;
    
    // Campos específicos TCM
    menstrualFlow: string; // escasso, normal, abundante, muito abundante
    menstrualColor: string; // vermelho vivo, vermelho escuro, rosa claro, marrom, roxo
    menstrualTexture: string; // fluido, espesso, com coágulos, pegajoso
    menstrualOdor: string; // sem odor, levemente doce, forte, fétido
    cycleRegularity: string; // regular, irregular, antecipado, atrasado
    dysmenorrhea: string; // ausente, leve, moderada, intensa
    dysmenorrheaType: string; // antes da menstruação, durante, depois, todo o ciclo
    dysmenorrheaCharacter: string; // cólica, dor em queimação, dor surda, dor em pontadas
    preMenstrualSymptoms: string[]; // tensão mamária, irritabilidade, ansiedade, inchaço, etc
    ovulationSigns: string; // dor ovulatória, muco cervical, sangramento meio ciclo
    energyDuringCycle: string; // fase menstrual, folicular, ovulatória, lútea
    emotionalPattern: string; // estável, irritável antes, depressiva durante, ansiosa depois
    temperaturePattern: string; // sempre frio, calor antes, frio durante, alternado
    sleepPattern: string; // normal, insônia pré-menstrual, sonolência durante
    digestiveChanges: string; // normal, desejos alimentares, náuseas, constipação
    urinaryChanges: string; // normal, retenção, urgência, infecções recorrentes
    skinChanges: string; // normal, acne pré-menstrual, ressecamento, oleosidade
    libidoPattern: string; // normal, diminuída, aumentada na ovulação, ausente
    breastSymptoms: string; // normal, tensão, dor, secreção
    headachePattern: string; // ausente, pré-menstrual, durante menstruação, pós-menstrual
    weightChanges: string; // estável, ganho pré-menstrual, perda durante, flutuação constante
    additional_notes: string;
  };
  additionalNotes: string;
}

// Função para processar markdown simples e remover cabeçalhos desnecessários
const processMarkdown = (text: string) => {
  if (!text) return '';
  
  // Limpar caracteres problemáticos e normalizar
  let processed = text
    .replace(/^#\s*$/gm, '') // Remover linhas com apenas #
    .replace(/^##\s*$/gm, '') // Remover linhas com apenas ##
    .replace(/\n{3,}/g, '\n\n') // Normalizar quebras de linha excessivas
    .trim();
  
  // Processar cabeçalhos (ordem importante - do mais específico para o menos)
  processed = processed
    .replace(/^#### (.*?)$/gm, '<h4 class="text-base font-medium text-blue-700 mt-4 mb-2">$1</h4>')
    .replace(/^### (.*?)$/gm, '<h3 class="text-lg font-semibold text-blue-800 mt-6 mb-3">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-xl font-semibold text-blue-900 mt-6 mb-3">$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold text-blue-900 mt-6 mb-4">$1</h1>');
  
  // Processar texto em negrito
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-blue-600">$1</strong>');
  
  // Dividir em parágrafos e processar
  const sections = processed.split('\n\n').filter(section => {
    const trimmed = section.trim();
    return trimmed && trimmed !== '#' && trimmed !== '##' && trimmed !== '###';
  });
  
  return sections.map(section => {
    section = section.trim();
    
    // Se já é um cabeçalho HTML, retornar como está
    if (section.startsWith('<h')) {
      return section;
    }
    
    // Se contém apenas caracteres especiais, pular
    if (/^[#\s]*$/.test(section)) {
      return '';
    }
    
    // Processar quebras de linha simples como <br>
    const processedSection = section.replace(/\n/g, '<br>');
    
    // Envolver em parágrafo
    return `<div class="mb-4 text-gray-700 leading-relaxed">${processedSection}</div>`;
  }).filter(Boolean).join('');
};

export default function TCMAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const preSelectedPatientId = searchParams.get('patientId');
  
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
  const [tcmData, setTcmData] = useState<TCMData>({
    lingualObservation: {
      color: '',
      coating: '',
      texture: '',
      moisture: '',
      size: '',
      mobility: '',
      marks: ''
    },
    pulseAnalysis: {
      rate: '',
      rhythm: '',
      strength: '',
      depth: '',
      quality: '',
      tension: ''
    },
    generalObservation: {
      complexion: '',
      eyes: '',
      voice: '',
      breathing: '',
      posture: '',
      mood: ''
    },
    symptoms: {
      sleep: '',
      digestion: '',
      appetite: '',
      thirst: '',
      urination: '',
      bowelMovement: '',
      temperature: '',
      sweating: '',
      emotions: ''
    },
    menstrualTcm: {
      menarche: 0,
      cycleLength: 0,
      menstruationLength: 0,
      lastMenstruation: '',
      menopausalStatus: '',
      contraceptiveUse: '',
      menstrualFlow: '',
      menstrualColor: '',
      menstrualTexture: '',
      menstrualOdor: '',
      cycleRegularity: '',
      dysmenorrhea: '',
      dysmenorrheaType: '',
      dysmenorrheaCharacter: '',
      preMenstrualSymptoms: [],
      ovulationSigns: '',
      energyDuringCycle: '',
      emotionalPattern: '',
      temperaturePattern: '',
      sleepPattern: '',
      digestiveChanges: '',
      urinaryChanges: '',
      skinChanges: '',
      libidoPattern: '',
      breastSymptoms: '',
      headachePattern: '',
      weightChanges: '',
      additional_notes: ''
    },
    additionalNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  // Pré-selecionar paciente se fornecido via URL
  useEffect(() => {
    if (preSelectedPatientId && patients.length > 0) {
      const patient = patients.find(p => p._id.toString() === preSelectedPatientId);
      if (patient) {
        setSelectedPatient(patient);
        autoFillMenstrualData(patient);
        setStep(2); // Ir direto para o step de inserção de dados
      }
    }
  }, [preSelectedPatientId, patients]);

  // Auto-preencher dados menstruais do cadastro
  const autoFillMenstrualData = (patient: IPatient) => {
    if (patient.menstrualHistory) {
      setTcmData(prev => ({
        ...prev,
        menstrualTcm: {
          ...prev.menstrualTcm,
          menarche: patient.menstrualHistory?.menarche || 0,
          cycleLength: patient.menstrualHistory?.cycleLength || 0,
          menstruationLength: patient.menstrualHistory?.menstruationLength || 0,
          lastMenstruation: patient.menstrualHistory?.lastMenstruation ? 
            new Date(patient.menstrualHistory.lastMenstruation).toISOString().split('T')[0] : '',
          menopausalStatus: patient.menstrualHistory?.menopausalStatus || '',
          contraceptiveUse: patient.menstrualHistory?.contraceptiveUse || ''
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

  const handleTCMDataChange = (section: keyof TCMData, field: string, value: string) => {
    if (section === 'additionalNotes') {
      setTcmData(prev => ({ ...prev, additionalNotes: value }));
    } else if (section === 'menstrualTcm' && field === 'preMenstrualSymptoms') {
      // Tratar array de sintomas pré-menstruais
      try {
        const arrayValue = JSON.parse(value);
        setTcmData(prev => ({
          ...prev,
          [section]: {
            ...(prev[section] as any),
            [field]: arrayValue
          }
        }));
      } catch (error) {
        console.error('Erro ao parsear sintomas:', error);
      }
    } else {
      setTcmData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section] as any),
          [field]: value
        }
      }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient) return;

    setLoading(true);
    try {
      const response = await fetch('/api/analyses/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          analysisType: 'tcm',
          tcmData
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.data);
        setStep(4);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na análise');
      }
    } catch (error) {
      console.error('Erro ao processar análise:', error);
      alert(`Erro na análise: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedPatient(null);
    setTcmData({
      lingualObservation: {
        color: '',
        coating: '',
        texture: '',
        moisture: '',
        size: '',
        mobility: '',
        marks: ''
      },
      pulseAnalysis: {
        rate: '',
        rhythm: '',
        strength: '',
        depth: '',
        quality: '',
        tension: ''
      },
      generalObservation: {
        complexion: '',
        eyes: '',
        voice: '',
        breathing: '',
        posture: '',
        mood: ''
      },
      symptoms: {
        sleep: '',
        digestion: '',
        appetite: '',
        thirst: '',
        urination: '',
        bowelMovement: '',
        temperature: '',
        sweating: '',
        emotions: ''
      },
      menstrualTcm: {
        menarche: 0,
        cycleLength: 0,
        menstruationLength: 0,
        lastMenstruation: '',
        menopausalStatus: '',
        contraceptiveUse: '',
        menstrualFlow: '',
        menstrualColor: '',
        menstrualTexture: '',
        menstrualOdor: '',
        cycleRegularity: '',
        dysmenorrhea: '',
        dysmenorrheaType: '',
        dysmenorrheaCharacter: '',
        preMenstrualSymptoms: [],
        ovulationSigns: '',
        energyDuringCycle: '',
        emotionalPattern: '',
        temperaturePattern: '',
        sleepPattern: '',
        digestiveChanges: '',
        urinaryChanges: '',
        skinChanges: '',
        libidoPattern: '',
        breastSymptoms: '',
        headachePattern: '',
        weightChanges: '',
        additional_notes: ''
      },
      additionalNotes: ''
    });
    setResult(null);
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/analyses" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Análises
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Análise de Medicina Tradicional Chinesa</h1>
          <p className="text-gray-600 mt-2">Diagnóstico energético personalizado</p>
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
            <span>Observação</span>
            <span>Análise</span>
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

        {/* Step 2: Observação da Língua e Pulso */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Observação da Língua e Pulso
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Observação da Língua */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Observação da Língua</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cor da Língua</label>
                  <select
                    value={tcmData.lingualObservation.color}
                    onChange={(e) => handleTCMDataChange('lingualObservation', 'color', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="rosa-normal">Rosa normal</option>
                    <option value="palida">Pálida</option>
                    <option value="vermelha">Vermelha</option>
                    <option value="roxa">Roxa</option>
                    <option value="azulada">Azulada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Textura</label>
                  <select
                    value={tcmData.lingualObservation.texture}
                    onChange={(e) => handleTCMDataChange('lingualObservation', 'texture', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="lisa">Lisa</option>
                    <option value="rugosa">Rugosa</option>
                    <option value="fissurada">Fissurada</option>
                    <option value="geografica">Geográfica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Saburra</label>
                  <select
                    value={tcmData.lingualObservation.coating}
                    onChange={(e) => handleTCMDataChange('lingualObservation', 'coating', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="branca-fina">Branca fina</option>
                    <option value="branca-espessa">Branca espessa</option>
                    <option value="amarela-fina">Amarela fina</option>
                    <option value="amarela-espessa">Amarela espessa</option>
                    <option value="ausente">Ausente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observações da Língua</label>
                  <textarea
                    value={tcmData.lingualObservation.marks}
                    onChange={(e) => handleTCMDataChange('lingualObservation', 'marks', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Outras observações sobre a língua..."
                  />
                </div>
              </div>

              {/* Análise de Pulso */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Análise de Pulso</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequência</label>
                  <select
                    value={tcmData.pulseAnalysis.rate}
                    onChange={(e) => handleTCMDataChange('pulseAnalysis', 'rate', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Lento">Lento (&lt; 60 bpm)</option>
                    <option value="Normal">Normal (60-90 bpm)</option>
                    <option value="Rápido">Rápido (&gt; 90 bpm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Força</label>
                  <select
                    value={tcmData.pulseAnalysis.strength}
                    onChange={(e) => handleTCMDataChange('pulseAnalysis', 'strength', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Fraco">Fraco</option>
                    <option value="Moderado">Moderado</option>
                    <option value="Forte">Forte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qualidade</label>
                  <select
                    value={tcmData.pulseAnalysis.quality}
                    onChange={(e) => handleTCMDataChange('pulseAnalysis', 'quality', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Deslizante">Deslizante</option>
                    <option value="Rugoso">Rugoso</option>
                    <option value="Tenso">Tenso</option>
                    <option value="Flutuante">Flutuante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observações do Pulso</label>
                  <textarea
                    value={tcmData.pulseAnalysis.tension}
                    onChange={(e) => handleTCMDataChange('pulseAnalysis', 'tension', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Outras observações sobre o pulso..."
                  />
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

        {/* Step 3: Dados Menstruais e Energéticos */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Dados Menstruais e Energéticos TCM
            </h2>

            {selectedPatient?.menstrualHistory && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-blue-900 mb-2">Dados do Cadastro da Paciente:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><strong>Menarca:</strong> {selectedPatient.menstrualHistory.menarche} anos</div>
                  <div><strong>Ciclo:</strong> {selectedPatient.menstrualHistory.cycleLength} dias</div>
                  <div><strong>Duração:</strong> {selectedPatient.menstrualHistory.menstruationLength} dias</div>
                  <div><strong>Status:</strong> {selectedPatient.menstrualHistory.menopausalStatus === 'pre' ? 'Pré-menopausa' : selectedPatient.menstrualHistory.menopausalStatus === 'peri' ? 'Perimenopausa' : 'Pós-menopausa'}</div>
                  {selectedPatient.menstrualHistory.contraceptiveUse && (
                    <div><strong>Contraceptivo:</strong> {selectedPatient.menstrualHistory.contraceptiveUse}</div>
                  )}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              {/* Análise Menstrual TCM */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Análise Menstrual - TCM</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fluxo Menstrual</label>
                  <select
                    value={tcmData.menstrualTcm.menstrualFlow}
                    onChange={(e) => handleTCMDataChange('menstrualTcm', 'menstrualFlow', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="escasso">Escasso</option>
                    <option value="normal">Normal</option>
                    <option value="abundante">Abundante</option>
                    <option value="muito-abundante">Muito abundante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cor do Sangue Menstrual</label>
                  <select
                    value={tcmData.menstrualTcm.menstrualColor}
                    onChange={(e) => handleTCMDataChange('menstrualTcm', 'menstrualColor', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="vermelho-vivo">Vermelho vivo</option>
                    <option value="vermelho-escuro">Vermelho escuro</option>
                    <option value="rosa-claro">Rosa claro</option>
                    <option value="marrom">Marrom</option>
                    <option value="roxo">Roxo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Textura do Sangue</label>
                  <select
                    value={tcmData.menstrualTcm.menstrualTexture}
                    onChange={(e) => handleTCMDataChange('menstrualTcm', 'menstrualTexture', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="fluido">Fluido</option>
                    <option value="espesso">Espesso</option>
                    <option value="com-coagulos">Com coágulos</option>
                    <option value="pegajoso">Pegajoso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Regularidade do Ciclo</label>
                  <select
                    value={tcmData.menstrualTcm.cycleRegularity}
                    onChange={(e) => handleTCMDataChange('menstrualTcm', 'cycleRegularity', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                    <option value="antecipado">Antecipado</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Intensidade da Dismenorreia</label>
                  <select
                    value={tcmData.menstrualTcm.dysmenorrhea}
                    onChange={(e) => handleTCMDataChange('menstrualTcm', 'dysmenorrhea', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="ausente">Ausente</option>
                    <option value="leve">Leve</option>
                    <option value="moderada">Moderada</option>
                    <option value="intensa">Intensa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Dor Menstrual</label>
                  <select
                    value={tcmData.menstrualTcm.dysmenorrheaCharacter}
                    onChange={(e) => handleTCMDataChange('menstrualTcm', 'dysmenorrheaCharacter', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="colica">Cólica</option>
                    <option value="queimacao">Dor em queimação</option>
                    <option value="surda">Dor surda</option>
                    <option value="pontadas">Dor em pontadas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sintomas Pré-menstruais</label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {['Irritabilidade', 'Ansiedade', 'Tensão mamária', 'Inchaço', 'Mudanças de humor', 'Fadiga', 'Dor de cabeça', 'Insônia', 'Desejos alimentares', 'Acne', 'Dor nas costas'].map(symptom => {
                      const isChecked = tcmData.menstrualTcm.preMenstrualSymptoms.includes(symptom);
                      return (
                        <label key={symptom} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const currentSymptoms = tcmData.menstrualTcm.preMenstrualSymptoms;
                              if (e.target.checked) {
                                handleTCMDataChange('menstrualTcm', 'preMenstrualSymptoms', JSON.stringify([...currentSymptoms, symptom]));
                              } else {
                                handleTCMDataChange('menstrualTcm', 'preMenstrualSymptoms', JSON.stringify(currentSymptoms.filter(s => s !== symptom)));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{symptom}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Padrões Energéticos e Emocionais */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Padrões Energéticos - TCM</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Energia Durante o Ciclo</label>
                  <select
                    value={tcmData.menstrualTcm.energyDuringCycle}
                    onChange={(e) => handleTCMDataChange('menstrualTcm', 'energyDuringCycle', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="baixa-menstrual">Baixa durante menstruação</option>
                    <option value="baixa-pre">Baixa pré-menstrual</option>
                    <option value="alta-ovulacao">Alta na ovulação</option>
                    <option value="estavel">Estável todo ciclo</option>
                    <option value="flutuante">Flutuante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Padrão Emocional</label>
                  <select
                    value={tcmData.menstrualTcm.emotionalPattern}
                    onChange={(e) => handleTCMDataChange('menstrualTcm', 'emotionalPattern', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="estavel">Estável</option>
                    <option value="irritavel-pre">Irritável antes</option>
                    <option value="depressiva-durante">Depressiva durante</option>
                    <option value="ansiosa-pos">Ansiosa depois</option>
                    <option value="instavel">Instável todo ciclo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Padrão de Temperatura</label>
                  <select
                    value={tcmData.menstrualTcm.temperaturePattern}
                    onChange={(e) => handleTCMDataChange('menstrualTcm', 'temperaturePattern', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="sempre-frio">Sempre frio</option>
                    <option value="calor-pre">Calor antes da menstruação</option>
                    <option value="frio-durante">Frio durante menstruação</option>
                    <option value="alternado">Alternado</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Padrão de Sono</label>
                  <select
                    value={tcmData.menstrualTcm.sleepPattern}
                    onChange={(e) => handleTCMDataChange('menstrualTcm', 'sleepPattern', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="normal">Normal</option>
                    <option value="insonia-pre">Insônia pré-menstrual</option>
                    <option value="sonolencia-durante">Sonolência durante</option>
                    <option value="interrompido">Sono interrompido</option>
                    <option value="pesadelos">Pesadelos/sonhos agitados</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sensação Térmica</label>
                  <select
                    value={tcmData.generalObservation.breathing}
                    onChange={(e) => handleTCMDataChange('generalObservation', 'breathing', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Sempre com frio">Sempre com frio</option>
                    <option value="Normal">Normal</option>
                    <option value="Sempre com calor">Sempre com calor</option>
                    <option value="Alternante">Alternante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Apetite</label>
                  <select
                    value={tcmData.symptoms.appetite}
                    onChange={(e) => handleTCMDataChange('symptoms', 'appetite', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Muito baixo">Muito baixo</option>
                    <option value="Baixo">Baixo</option>
                    <option value="Normal">Normal</option>
                    <option value="Aumentado">Aumentado</option>
                    <option value="Voraz">Voraz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado Emocional</label>
                  <select
                    value={tcmData.generalObservation.mood}
                    onChange={(e) => handleTCMDataChange('generalObservation', 'mood', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Calmo">Calmo</option>
                    <option value="Ansioso">Ansioso</option>
                    <option value="Irritado">Irritado</option>
                    <option value="Triste">Triste</option>
                    <option value="Estressado">Estressado</option>
                    <option value="Equilibrado">Equilibrado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observações Gerais</label>
                  <textarea
                    value={tcmData.generalObservation.mood}
                    onChange={(e) => handleTCMDataChange('generalObservation', 'mood', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Outras observações relevantes para o diagnóstico energético..."
                  />
                </div>
              </div>
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
                    Gerar Análise TCM
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Resultado */}
        {step === 4 && result && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6">Resultado da Análise TCM</h2>
            
            <div className="space-y-6">
              {/* Diagnóstico Energético */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Diagnóstico Energético</h3>
                <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: processMarkdown(result.analysis.energeticDiagnosis) }}></div>
              </div>

              {/* Fitoterapia */}
              {result.analysis.herbalRecommendations && (
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Recomendações Fitoterapêuticas</h3>
                  <div className="space-y-2">
                    {result.analysis.herbalRecommendations.map((herb: any, index: number) => (
                      <div key={index} className="bg-green-50 p-3 rounded-lg">
                        <h4 className="font-medium">{herb.name}</h4>
                        <p className="text-sm text-gray-600">{herb.dosage}</p>
                        <p className="text-sm">{herb.benefits}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acupuntura */}
              {result.analysis.acupuncturePoints && (
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Pontos de Acupuntura</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {result.analysis.acupuncturePoints.map((point: any, index: number) => (
                      <div key={index} className="bg-purple-50 p-2 rounded text-center">
                        <span className="font-medium">{point.name}</span>
                        <div className="text-xs text-gray-600">{point.indication}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orientações Gerais */}
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Orientações Gerais</h3>
                <ul className="space-y-1">
                  {result.analysis.generalRecommendations?.map((rec: string, index: number) => (
                    <li key={index} className="text-gray-700">• {rec}</li>
                  ))}
                </ul>
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
              <button
                onClick={resetForm}
                className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
              >
                Nova Análise
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 