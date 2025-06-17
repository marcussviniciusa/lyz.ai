import axios from 'axios'

interface CursEducaUser {
  id: string
  name: string
  email: string
}

interface CursEducaValidationResult {
  success: boolean
  data?: CursEducaUser
  message?: string
}

// Configuração do Axios para Curseduca
const cursEducaApi = axios.create({
  baseURL: process.env.CURSEDUCA_API_URL,
  timeout: 10000,
  headers: {
    'api_key': process.env.CURSEDUCA_API_KEY,
    'Content-Type': 'application/json'
  }
})

/**
 * Valida um usuário no Curseduca através do email
 */
export const validateCursEducaUser = async (email: string): Promise<CursEducaValidationResult> => {
  try {
    console.log(`[CursEduca] Validando email: ${email}`)
    
    const response = await cursEducaApi.get('/members/by', {
      params: { email }
    })

    if (response.status === 200 && response.data) {
      console.log(`[CursEduca] Usuário encontrado: ${response.data.name}`)
      return {
        success: true,
        data: {
          id: response.data.id.toString(),
          name: response.data.name,
          email: response.data.email
        }
      }
    }
    
    return {
      success: false,
      message: 'Usuário não encontrado no Curseduca'
    }
  } catch (error: any) {
    console.error('[CursEduca] Erro na validação:', error.message)
    
    const status = error.response?.status
    let message = 'Erro ao validar usuário no Curseduca'
    
    if (status === 400) {
      message = 'Requisição inválida para a API do Curseduca'
    } else if (status === 401) {
      message = 'Acesso não autorizado à API do Curseduca'
    } else if (status === 404) {
      message = 'Usuário não encontrado no Curseduca'
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      message = 'Erro de conexão com o Curseduca. Tente novamente mais tarde.'
    }
    
    return {
      success: false,
      message
    }
  }
}

/**
 * Valida um usuário no Curseduca através do email e nome (para recuperação de senha)
 */
export const validateCursEducaUserByEmailAndName = async (email: string, name: string): Promise<CursEducaValidationResult> => {
  try {
    console.log(`[CursEduca] Validando email e nome: ${email} - ${name}`)
    
    const response = await cursEducaApi.get('/members/by', {
      params: { email }
    })

    if (response.status === 200 && response.data) {
      const cursEducaUser = response.data
      
      // Verificar se o nome fornecido corresponde exatamente ao nome no CursEduca
      if (cursEducaUser.name.trim().toLowerCase() === name.trim().toLowerCase()) {
        console.log(`[CursEduca] Email e nome validados com sucesso`)
        return {
          success: true,
          data: {
            id: cursEducaUser.id.toString(),
            name: cursEducaUser.name,
            email: cursEducaUser.email
          }
        }
      } else {
        console.log(`[CursEduca] Nome não confere - CursEduca: "${cursEducaUser.name}" vs Informado: "${name}"`)
        return {
          success: false,
          message: 'Nome não confere com o cadastrado no CursEduca'
        }
      }
    }
    
    return {
      success: false,
      message: 'Email não encontrado no CursEduca'
    }
  } catch (error: any) {
    console.error('[CursEduca] Erro na validação por email e nome:', error.message)
    
    const status = error.response?.status
    let message = 'Erro ao validar usuário no CursEduca'
    
    if (status === 400) {
      message = 'Requisição inválida para a API do Curseduca'
    } else if (status === 401) {
      message = 'Acesso não autorizado à API do Curseduca'
    } else if (status === 404) {
      message = 'Email não encontrado no CursEduca'
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      message = 'Erro de conexão com o Curseduca. Tente novamente mais tarde.'
    }
    
    return {
      success: false,
      message
    }
  }
}

/**
 * Verifica se as configurações do Curseduca estão válidas
 */
export const checkCursEducaConfig = (): boolean => {
  const apiUrl = process.env.CURSEDUCA_API_URL
  const apiKey = process.env.CURSEDUCA_API_KEY
  
  if (!apiUrl || !apiKey) {
    console.error('[CursEduca] Configuração inválida - URL ou API_KEY não definidos')
    return false
  }
  
  return true
}

/**
 * Testa a conectividade com a API do Curseduca
 */
export const testCursEducaConnection = async (): Promise<boolean> => {
  try {
    if (!checkCursEducaConfig()) {
      return false
    }
    
    // Fazer uma requisição de teste
    const response = await cursEducaApi.get('/health', {
      timeout: 5000
    })
    
    return response.status === 200
  } catch (error) {
    console.error('[CursEduca] Erro no teste de conectividade:', error)
    return false
  }
} 