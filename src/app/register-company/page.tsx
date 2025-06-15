'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CompanyRegistration {
  name: string
  website: string
  contactPerson: {
    name: string
    email: string
    phone: string
    position: string
  }
  description: string
}

export default function RegisterCompanyPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState<CompanyRegistration>({
    name: '',
    website: '',
    contactPerson: {
      name: '',
      email: '',
      phone: '',
      position: ''
    },
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/companies/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
      } else {
        alert(`Erro: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro ao cadastrar empresa:', error)
      alert('Erro ao cadastrar empresa. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/^(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
    }
    return value
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Cadastro Enviado!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sua solicitação de cadastro foi enviada com sucesso.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Próximos Passos
              </h3>
              <div className="text-sm text-gray-600 space-y-3">
                <p>
                  ✅ Sua empresa <strong>{formData.name}</strong> foi cadastrada em nosso sistema
                </p>
                <p>
                  ⏳ Nossa equipe irá analisar as informações fornecidas
                </p>
                <p>
                  📧 Você receberá um email em <strong>{formData.contactPerson.email}</strong> com o resultado da análise
                </p>
                <p>
                  🚀 Após aprovação, você poderá acessar a plataforma e começar a usar nossos serviços
                </p>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Cadastre sua Empresa
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Preencha os dados abaixo para solicitar acesso à plataforma
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados da Empresa */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dados da Empresa</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://www.exemplo.com.br"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Pessoa de Contato */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pessoa de Contato</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      contactPerson: {...formData.contactPerson, name: e.target.value}
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cargo/Posição *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson.position}
                    onChange={(e) => setFormData({
                      ...formData,
                      contactPerson: {...formData.contactPerson, position: e.target.value}
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contactPerson.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      contactPerson: {...formData.contactPerson, email: e.target.value}
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.contactPerson.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      contactPerson: {...formData.contactPerson, phone: formatPhone(e.target.value)}
                    })}
                    placeholder="(11) 99999-9999"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Descrição da Empresa
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Conte-nos um pouco sobre sua empresa, área de atuação, especialidades..."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}