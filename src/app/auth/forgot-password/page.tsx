'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [step, setStep] = useState(1) // 1: Formulário, 2: Resultado
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, name })
      })

      const data = await response.json()

      if (data.success) {
        setNewPassword(data.temporaryPassword)
        setStep(2)
        toast.success('Nova senha gerada com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao processar solicitação')
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword)
    toast.success('Senha copiada para a área de transferência!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-primary-700 hover:text-primary-800 transition-colors">
              lyz.ai
            </h1>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {step === 1 ? 'Recuperar Senha' : 'Nova Senha Gerada'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 1 ? (
              <>
                Informe seu email e nome exatamente como está no CursEduca
              </>
            ) : (
              'Use a senha abaixo para fazer login'
            )}
          </p>
        </div>

        {/* Formulário ou Resultado */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl">
          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                    placeholder="Digite seu email do CursEduca"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome Completo
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                    placeholder="Digite seu nome exatamente como no CursEduca"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  O nome deve ser idêntico ao cadastrado no CursEduca
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Validando...
                    </div>
                  ) : (
                    'Gerar Nova Senha'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Nova senha gerada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sua nova senha temporária:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    readOnly
                    className="flex-1 px-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-mono text-lg text-center"
                  />
                  <button
                    onClick={copyPassword}
                    className="px-3 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    title="Copiar senha"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Instruções */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Importante
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Esta é uma senha temporária</li>
                        <li>Recomendamos alterar a senha após o primeiro login</li>
                        <li>Guarde esta senha em local seguro</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão para fazer login */}
              <div>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Fazer Login Agora
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Links de navegação */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {step === 1 ? (
              <>
                Lembrou da senha?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Fazer login
                </Link>
              </>
            ) : (
              <>
                Problemas com o login?{' '}
                <button
                  onClick={() => {
                    setStep(1)
                    setNewPassword('')
                    setEmail('')
                    setName('')
                  }}
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Gerar nova senha
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
} 