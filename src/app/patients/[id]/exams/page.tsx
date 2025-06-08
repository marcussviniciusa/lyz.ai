'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { Upload, FileText, Eye, Trash2, Download, Search, Filter } from 'lucide-react'

interface Exam {
  _id: string
  fileName: string
  fileType: string
  fileSize: number
  examType: string
  examDate: string
  uploadedAt: string
  processed: boolean
  extractedData?: any
}

interface Patient {
  _id: string
  name: string
  email: string
  birthDate: string
}

export default function PatientExamsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const patientId = resolvedParams.id

  const [patient, setPatient] = useState<Patient | null>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const examTypes = [
    { id: 'hemograma', name: 'Hemograma Completo' },
    { id: 'bioquimica', name: 'Bioquímica Geral' },
    { id: 'hormonal', name: 'Perfil Hormonal' },
    { id: 'vitaminas', name: 'Vitaminas e Minerais' },
    { id: 'tireoide', name: 'Função Tireoidiana' },
    { id: 'inflamatorio', name: 'Marcadores Inflamatórios' },
    { id: 'imunologico', name: 'Perfil Imunológico' },
    { id: 'urina', name: 'Exame de Urina' },
    { id: 'fezes', name: 'Exame de Fezes' },
    { id: 'outros', name: 'Outros' }
  ]

  useEffect(() => {
    if (session && patientId) {
      loadPatientData()
      loadExams()
    }
  }, [session, patientId])

  const loadPatientData = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}`)
      if (response.ok) {
        const data = await response.json()
        setPatient(data.patient)
      }
    } catch (error) {
      console.error('Erro ao carregar dados da paciente:', error)
    }
  }

  const loadExams = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}/exams`)
      if (response.ok) {
        const data = await response.json()
        setExams(data.exams || [])
      }
    } catch (error) {
      console.error('Erro ao carregar exames:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    await handleFiles(files)
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      await handleFiles(files)
    }
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return

    setUploading(true)
    
    try {
      for (const file of files) {
        // Validar tipo de arquivo
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
        if (!allowedTypes.includes(file.type)) {
          alert(`Tipo de arquivo não suportado: ${file.name}`)
          continue
        }

        // Validar tamanho (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`Arquivo muito grande: ${file.name}. Máximo 10MB.`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('patientId', patientId)
        formData.append('examType', 'outros') // Default, usuário pode alterar depois

        const response = await fetch('/api/upload/exam', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Erro ao enviar ${file.name}`)
        }
      }

      // Recarregar lista de exames
      await loadExams()
      alert('Exames enviados com sucesso!')
    } catch (error) {
      console.error('Erro no upload:', error)
      alert(`Erro no upload: ${error}`)
    } finally {
      setUploading(false)
    }
  }

  const updateExamType = async (examId: string, examType: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/exams/${examId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ examType }),
      })

      if (response.ok) {
        await loadExams()
      }
    } catch (error) {
      console.error('Erro ao atualizar tipo do exame:', error)
    }
  }

  const deleteExam = async (examId: string) => {
    if (!confirm('Tem certeza que deseja excluir este exame?')) return

    try {
      const response = await fetch(`/api/patients/${patientId}/exams/${examId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadExams()
      }
    } catch (error) {
      console.error('Erro ao excluir exame:', error)
    }
  }

  const processExam = async (examId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/exams/${examId}/process`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('Exame enviado para processamento!')
        await loadExams()
      }
    } catch (error) {
      console.error('Erro ao processar exame:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!session) {
    return <div>Carregando...</div>
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando exames...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                href="/patients"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-primary-600"
              >
                Pacientes
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="text-gray-400 mx-2">/</span>
                <span className="text-sm font-medium text-gray-500">{patient?.name}</span>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="text-gray-400 mx-2">/</span>
                <span className="text-sm font-medium text-gray-500">Exames</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Exames - {patient?.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Upload e gestão dos exames laboratoriais da paciente
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-5">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Upload de Exames
            </h3>
            
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                dragActive 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      {uploading ? 'Enviando exames...' : 'Arraste arquivos aqui ou clique para selecionar'}
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileInput}
                      disabled={uploading}
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF, JPG, PNG até 10MB cada
                  </p>
                </div>
              </div>

              {uploading && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Processando...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Exames */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Exames Enviados ({exams.length})
            </h3>
          </div>
          
          {exams.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum exame encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Faça upload dos primeiros exames da paciente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {exams.map((exam) => (
                <div key={exam._id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {exam.fileType === 'application/pdf' ? (
                          <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-8 w-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {exam.fileName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(exam.fileSize)} • {new Date(exam.uploadedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <select
                        value={exam.examType}
                        onChange={(e) => updateExamType(exam._id, e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        {examTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          exam.processed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exam.processed ? 'Processado' : 'Pendente'}
                        </span>
                        
                        {!exam.processed && (
                          <button
                            onClick={() => processExam(exam._id)}
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            Processar
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteExam(exam._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {exam.extractedData && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Dados Extraídos:</h4>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(exam.extractedData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}