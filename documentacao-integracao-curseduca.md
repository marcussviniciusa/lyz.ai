# Integração com a API do Curseduca

## Visão Geral

O sistema Lyz implementa uma integração robusta com a plataforma Curseduca, garantindo que apenas usuários previamente cadastrados no Curseduca possam criar contas no sistema. Esta documentação detalha como funciona essa integração, o fluxo de validação de usuários e os aspectos técnicos envolvidos.

## Pré-requisitos

Para que a integração funcione corretamente, o sistema requer:

1. URL da API do Curseduca configurada na variável de ambiente `CURSEDUCA_API_URL`
2. Chave de API do Curseduca configurada na variável de ambiente `CURSEDUCA_API_KEY`

## Fluxo de Cadastro e Validação

O processo de cadastro no sistema Lyz segue um fluxo de duas etapas que garante a validação dos usuários através da plataforma Curseduca:

### Etapa 1: Validação do Email

1. O usuário acessa a página de registro (`/auth/register`)
2. O usuário insere apenas seu email no formulário inicial
3. O frontend envia o email para o endpoint `/api/auth/validate-email`
4. O backend realiza a validação com a API do Curseduca
5. Se o email for encontrado no Curseduca, o sistema avança para a próxima etapa
6. Se o email não for encontrado, o sistema exibe uma mensagem de erro

### Etapa 2: Conclusão do Cadastro

1. Os dados do usuário obtidos do Curseduca (nome e email) são automaticamente preenchidos e bloqueados para edição
2. O usuário define sua senha (seguindo as políticas de segurança)
3. Ao submeter o formulário, o backend realiza uma segunda validação com o Curseduca
4. Se a validação for bem-sucedida, o sistema cria uma empresa para o usuário e registra suas credenciais
5. O usuário recebe tokens de acesso e é redirecionado para o dashboard

## Detalhes Técnicos da API

### Endpoints do Curseduca Utilizados

#### Validação de Usuário por Email
- **Método**: GET
- **URL**: `${CURSEDUCA_API_URL}/members/by`
- **Parâmetros**: `email` (o email do usuário a ser validado)
- **Cabeçalhos**: `api_key: ${CURSEDUCA_API_KEY}`
- **Códigos de Resposta**:
  - 200: Usuário encontrado (retorna dados do usuário)
  - 400: Requisição inválida
  - 401: Acesso não autorizado (chave de API inválida)
  - 404: Usuário não encontrado

### Estrutura de Dados

#### Dados Recebidos do Curseduca
```json
{
  "id": "12345",
  "name": "Nome do Usuário",
  "email": "usuario@exemplo.com"
}
```

#### Dados Armazenados no Sistema Lyz
```javascript
{
  curseduca_id: "12345",
  name: "Nome do Usuário",
  email: "usuario@exemplo.com",
  password: "[senha criptografada]",
  role: "user",
  company_id: 1
}
```

## Implementação no Backend

### Função de Validação com Curseduca

```javascript
// Validate user email against Curseduca API
export const validateCursEducaUser = async (email: string) => {
  try {
    const response = await axios.get(`${CURSEDUCA_API_URL}/members/by`, {
      params: { email },
      headers: { 'api_key': CURSEDUCA_API_KEY }
    });

    if (response.status === 200) {
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      message: 'User not found in Curseduca'
    };
  } catch (error: any) {
    const status = error.response?.status;
    let message = 'Error validating user in Curseduca';
    
    if (status === 400) {
      message = 'Invalid request to Curseduca API';
    } else if (status === 401) {
      message = 'Unauthorized access to Curseduca API';
    } else if (status === 404) {
      message = 'User not found in Curseduca';
    }
    
    return {
      success: false,
      message
    };
  }
};
```

### Função de Criação de Usuário a partir dos Dados do Curseduca

```javascript
// Create user from Curseduca data
export const createUserFromCurseduca = async (cursEducaData: any, password: string) => {
  try {
    // Criar uma empresa para o usuário
    const companyResult = await createCompanyForUser(cursEducaData.name);
    
    if (!companyResult.success) {
      return {
        success: false,
        message: companyResult.message || 'Falha ao criar empresa para o usuário'
      };
    }
    
    const user = await User.create({
      curseduca_id: cursEducaData.id.toString(),
      name: cursEducaData.name,
      email: cursEducaData.email,
      password,
      role: 'user',
      company_id: companyResult.company.id
    });
    
    return {
      success: true,
      user,
      company: companyResult.company
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Error creating user'
    };
  }
};
```

## Implementação no Frontend

### Formulário de Registro em Duas Etapas

O frontend implementa um formulário de registro em duas etapas:

1. **Etapa de Validação**:
   - Campo de email
   - Botão "Validar Email"
   - Exibição de mensagens de erro

2. **Etapa de Confirmação**:
   - Campos preenchidos automaticamente: nome e email (bloqueados)
   - Campos para preenchimento: senha e confirmação de senha
   - Validações de segurança para senha
   - Botão "Voltar" e "Registrar"

### Exemplo de Código (React/TypeScript)

```jsx
// Validação de Email (Etapa 1)
const handleEmailValidation = async (values: { email: string }) => {
  setServerError(null);
  try {
    const response = await validateEmail(values.email);
    // Store validated user data from API response
    setValidatedUser({
      ...response.userData,
      email: values.email
    });
    setStep(2);
  } catch (err: any) {
    setServerError(
      err.response?.data?.message || 
      'Falha na validação do email. Verifique se está cadastrado no Curseduca.'
    );
  }
};

// Registro Final (Etapa 2)
const handleRegistration = async (values: any) => {
  setServerError(null);
  try {
    // Verificar se temos os dados do usuário validado
    if (!validatedUser || !validatedUser.id) {
      throw new Error('Dados de usuário inválidos. Por favor, volte e valide seu email novamente.');
    }
    
    // Register with validated user data
    await register({
      curseduca_id: validatedUser.id,
      name: validatedUser.name || values.name,
      email: validatedUser.email || values.email,
      password: values.password,
    });
  } catch (err: any) {
    setServerError(
      err.response?.data?.message || 
      'Falha no registro. Tente novamente.'
    );
  }
};
```

## Benefícios da Integração

1. **Controle de Acesso**: Apenas usuários previamente cadastrados no Curseduca podem criar contas
2. **Consistência de Dados**: Os dados básicos (nome e email) são importados diretamente do Curseduca
3. **Segurança Reforçada**: Processo de validação dupla, tanto no frontend quanto no backend
4. **Experiência Simplificada**: Usuário não precisa digitar novamente informações já cadastradas
5. **Rastreabilidade**: O ID do Curseduca é armazenado, permitindo a vinculação entre as plataformas

## Considerações para Manutenção

1. **Monitoramento de Erros**: Implementar logs detalhados das integrações com o Curseduca
2. **Verificação de Disponibilidade**: Considerar implementar um sistema de verificação da disponibilidade da API
3. **Atualização de Dados**: Avaliar a necessidade de sincronização periódica de dados com o Curseduca
4. **Segurança da Chave de API**: Garantir a rotação periódica da chave de API e seu armazenamento seguro
5. **Tratamento de Exceções**: Melhorar o tratamento de erros para cobrir cenários como timeout da API

## Conclusão

A integração com o Curseduca é um componente fundamental do sistema Lyz, garantindo que apenas usuários autorizados possam acessar a plataforma. O fluxo de duas etapas para validação e registro proporciona uma experiência de usuário fluida e, ao mesmo tempo, mantém a segurança e integridade dos dados.
