'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

export default function RAGPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [stats, setStats] = useState({
    documents: { total: 0, completed: 0, processing: 0, error: 0 },
    chunks: 0,
    categories: []
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Verificar acesso - apenas superadmin
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/login')
      return
    }

    if (session.user.role !== 'superadmin') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  const categories = [
    { id: 'all', name: 'Todos os Documentos', key: 'all' },
    { id: 'pesquisas-cientificas', name: 'Pesquisas Científicas', key: 'pesquisas-cientificas' },
    { id: 'protocolos-clinicos', name: 'Protocolos Clínicos', key: 'protocolos-clinicos' },
    { id: 'diretrizes-medicas', name: 'Diretrizes Médicas', key: 'diretrizes-medicas' },
    { id: 'estudos-caso', name: 'Estudos de Caso', key: 'estudos-caso' },
    { id: 'medicina-funcional', name: 'Medicina Funcional', key: 'medicina-funcional' },
    { id: 'mtc', name: 'Medicina Chinesa', key: 'mtc' },
    { id: 'fitoterapia', name: 'Fitoterapia', key: 'fitoterapia' },
    { id: 'nutricao', name: 'Nutrição', key: 'nutricao' },
    { id: 'cursos-transcricoes', name: 'Cursos e Transcrições', key: 'cursos-transcricoes' }
  ]

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
        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', selectedCategory === 'all' ? 'pesquisas-cientificas' : selectedCategory)

        const response = await fetch('/api/rag/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Erro ao enviar ${file.name}`)
        }

        const result = await response.json()
        console.log('Upload bem-sucedido:', result)
      }

      // Recarregar lista de documentos
      await loadDocuments()
      alert('Upload concluído! Os documentos estão sendo processados.')
    } catch (error: any) {
      console.error('Erro no upload:', error)
      alert(`Erro no upload: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/rag/documents')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          limit: 5,
          threshold: 0.7
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
        setShowSearch(true)
      } else {
        const errorData = await response.json()
        alert(`Erro na busca: ${errorData.error}`)
      }
    } catch (error: any) {
      console.error('Erro na busca:', error)
      alert(`Erro na busca: ${error.message}`)
    } finally {
      setSearching(false)
    }
  }

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja deletar este documento?')) return

    try {
      const response = await fetch(`/api/rag/documents?id=${documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadDocuments()
        alert('Documento deletado com sucesso!')
      } else {
        const errorData = await response.json()
        alert(`Erro ao deletar: ${errorData.error}`)
      }
    } catch (error: any) {
      console.error('Erro ao deletar documento:', error)
      alert(`Erro ao deletar: ${error.message}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
              <circle cx={4} cy={4} r={3} />
            </svg>
            Processado
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <svg className="w-2 h-2 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} className="opacity-25" />
              <path fill="currentColor" className="opacity-75" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processando
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
              <circle cx={4} cy={4} r={3} />
            </svg>
            Erro
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Pendente
          </span>
        )
    }
  }

  useEffect(() => {
    if (session) {
      loadDocuments()
      const interval = setInterval(loadDocuments, 10000) // Recarregar a cada 10s
      return () => clearInterval(interval)
    }
  }, [session])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Base de Conhecimento RAG
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie documentos científicos e médicos para alimentar as análises de IA
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Busca Semântica
            </button>
          </div>
        </div>

        {/* Busca Semântica */}
        {showSearch && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Busca Semântica nos Documentos
              </h3>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Digite sua pergunta (ex: Como tratar diabetes tipo 2?)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {searching ? (
                      <>
                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} className="opacity-25" />
                          <path fill="currentColor" className="opacity-75" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Buscando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Buscar
                      </>
                    )}
                  </button>
                </div>

                {/* Resultados da Busca */}
                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Resultados encontrados:</h4>
                    {searchResults.map((result: any, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{result.fileName}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              result.confidence === 'Alta' ? 'bg-green-100 text-green-800' :
                              result.confidence === 'Média' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {result.confidence} ({Math.round(result.score * 100)}%)
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{result.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total de Documentos</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.documents.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Processados</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.documents.completed}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Em Processamento</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.documents.processing}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Chunks Gerados</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.chunks}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Enviar Novos Documentos
            </h3>
            
            {/* Category Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria do Documento
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.filter(cat => cat.id !== 'all').map(category => (
                  <option key={category.id} value={category.key}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & Drop Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
              
              {uploading ? (
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} className="opacity-25" />
                    <path fill="currentColor" className="opacity-75" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-sm text-gray-600">Processando documentos...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Clique para enviar</span>
                    </label>
                    <p className="pl-1">ou arraste e solte os arquivos aqui</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF, DOC, DOCX, TXT, MD até 10MB
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Documentos Carregados
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Lista de todos os documentos na base de conhecimento
            </p>
          </div>
          
          {documents.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum documento</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece enviando documentos para construir sua base de conhecimento.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {documents.map((doc: any) => (
                <li key={doc.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.fileName}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-sm text-gray-500">
                            {(doc.fileSize / 1024).toFixed(1)} KB
                          </p>
                          <span className="text-gray-300">•</span>
                          <p className="text-sm text-gray-500">
                            {categories.find(cat => cat.key === doc.category)?.name || doc.category}
                          </p>
                          {doc.processingMetadata && (
                            <>
                              <span className="text-gray-300">•</span>
                              <p className="text-sm text-gray-500">
                                {doc.processingMetadata.totalChunks} chunks
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(doc.status)}
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="text-red-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 