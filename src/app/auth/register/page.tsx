'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ValidatedUser {
  id: string
  name: string
  email: string
}

interface FormData {
  companyName: string
  name: string
  email: string
  password: string
  confirmPassword: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validatedUser, setValidatedUser] = useState<ValidatedUser | null>(null)
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  // Etapa 1: Validação do email
  const handleEmailValidation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/validate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email })
      })

      const data = await response.json()

      if (data.success) {
        // Armazenar dados validados do Curseduca
        setValidatedUser(data.userData)
        setFormData(prev => ({
          ...prev,
          name: data.userData.name, // Preencher nome do Curseduca
          email: data.userData.email // Confirmar email do Curseduca
        }))
        setStep(2)
      } else {
        setError(data.error || 'Erro na validação do email')
      }
    } catch (err: any) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Etapa 2: Conclusão do cadastro
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validações locais
    if (!formData.companyName.trim()) {
      setError('Nome da empresa é obrigatório')
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não conferem')
      setLoading(false)
      return
    }

    if (!validatedUser) {
      setError('Dados de usuário inválidos. Recomece o processo.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register-curseduca', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          name: validatedUser.name,
          email: validatedUser.email,
          password: formData.password,
          curseduca_id: validatedUser.id
        })
      })

      const data = await response.json()

      if (data.success) {
        // Redirecionar para login com mensagem de sucesso
        router.push('/auth/login?message=Conta criada com sucesso! Faça login para continuar.')
      } else {
        setError(data.error || 'Erro no cadastro')
      }
    } catch (err: any) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToStep1 = () => {
    setStep(1)
    setValidatedUser(null)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Criar Nova Conta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 1 
              ? 'Primeiro, vamos validar seu email no Curseduca'
              : 'Complete seu cadastro'
            }
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Indicador de progresso */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${
                step >= 2 ? 'bg-blue-600' : 'bg-gray-300'
              }`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Validar Email</span>
              <span>Cadastro</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Etapa 1: Validação de Email */}
          {step === 1 && (
            <form onSubmit={handleEmailValidation} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email cadastrado no Curseduca
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="seu.email@exemplo.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Informe o email que você usa no Curseduca para validação
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Validando...' : 'Validar Email'}
              </button>
            </form>
          )}

          {/* Etapa 2: Conclusão do Cadastro */}
          {step === 2 && (
            <form onSubmit={handleRegistration} className="space-y-6">
              {/* Dados validados (readonly) */}
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Email validado com sucesso!
                    </h3>
                    <div className="mt-1 text-sm text-green-700">
                      <p><strong>Nome:</strong> {validatedUser?.name}</p>
                      <p><strong>Email:</strong> {validatedUser?.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  Nome da Empresa/Clínica *
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Clínica da Saúde Feminina"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome Completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  readOnly
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Nome importado do Curseduca (não editável)
                </p>
              </div>

              <div>
                <label htmlFor="email-readonly" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email-readonly"
                  name="email-readonly"
                  type="email"
                  value={formData.email}
                  readOnly
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Email validado do Curseduca (não editável)
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Senha *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar Senha *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Repita a senha"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Já possui uma conta?</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Fazer login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 