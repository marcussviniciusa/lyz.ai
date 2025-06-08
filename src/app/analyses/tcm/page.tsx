'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Heart, Leaf, Yin, Yang, Zap
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
    menstruation: string;
    emotions: string;
  };
  additionalNotes: string;
}

export default function TCMAnalysisPage() {
  const router = useRouter();
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
      menstruation: '',
      emotions: ''
    },
    additionalNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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

  const handleTCMDataChange = (section: keyof TCMData, field: string, value: string) => {
    if (section === 'additionalNotes') {
      setTcmData(prev => ({ ...prev, additionalNotes: value }));
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
        menstruation: '',
        emotions: ''
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
              Dados Menstruais e Energéticos
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Dados Menstruais */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Ciclo Menstrual</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fase Menstrual Atual</label>
                  <select
                    value={tcmData.symptoms.menstruation}
                    onChange={(e) => handleTCMDataChange('symptoms', 'menstruation', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Menstrual (1-5 dias)">Menstrual (1-5 dias)</option>
                    <option value="Folicular (6-12 dias)">Folicular (6-12 dias)</option>
                    <option value="Ovulatória (13-15 dias)">Ovulatória (13-15 dias)</option>
                    <option value="Lútea (16-28 dias)">Lútea (16-28 dias)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Última Menstruação</label>
                  <input
                    type="date"
                    value={tcmData.symptoms.menstruation}
                    onChange={(e) => handleTCMDataChange('symptoms', 'menstruation', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fluxo Menstrual</label>
                  <select
                    value={tcmData.symptoms.menstruation}
                    onChange={(e) => handleTCMDataChange('symptoms', 'menstruation', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Escasso">Escasso</option>
                    <option value="Normal">Normal</option>
                    <option value="Abundante">Abundante</option>
                    <option value="Muito abundante">Muito abundante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sintomas Pré-menstruais</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Irritabilidade', 'Ansiedade', 'Sensibilidade mamária', 'Inchaço', 'Mudanças de humor', 'Fadiga', 'Dor de cabeça', 'Insônia', 'Desejos alimentares', 'Acne', 'Dor nas costas'].map(symptom => (
                      <label key={symptom} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tcmData.symptoms.menstruation.includes(symptom)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleTCMDataChange('symptoms', 'menstruation', tcmData.symptoms.menstruation + ', ' + symptom);
                            } else {
                              handleTCMDataChange('symptoms', 'menstruation', tcmData.symptoms.menstruation.replace(symptom, '').replace(/, $/, ''));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{symptom}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estado Energético */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Estado Energético</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nível de Energia</label>
                  <select
                    value={tcmData.generalObservation.mood}
                    onChange={(e) => handleTCMDataChange('generalObservation', 'mood', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Muito baixo">Muito baixo</option>
                    <option value="Baixo">Baixo</option>
                    <option value="Normal">Normal</option>
                    <option value="Alto">Alto</option>
                    <option value="Muito alto">Muito alto</option>
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
                <p className="text-gray-700">{result.analysis.energeticDiagnosis}</p>
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
              <div className="flex space-x-3">
                <button
                  onClick={resetForm}
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
    </DashboardLayout>
  );
} 