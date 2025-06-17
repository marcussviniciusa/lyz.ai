# 🔐 Criação do Primeiro Super Admin - lyz.ai

## 📋 Situação

Após trocar o nome do banco de dados MongoDB no arquivo `.env`, é necessário criar o primeiro usuário **superadmin** no novo banco de dados.

## 🎯 Opções Disponíveis

### **Opção 1: Script Interativo (Recomendado)**
Script completo com validações e entrada interativa de dados.

```bash
npm run create-superadmin
```

**Ou diretamente:**
```bash
node create-superadmin.js
```

**Características:**
- ✅ Entrada interativa de dados
- ✅ Validação de email
- ✅ Verificação de duplicatas
- ✅ Confirmação dos dados
- ✅ Hash seguro da senha (bcrypt)
- ✅ Verificação de super admin existente

---

### **Opção 2: Script Rápido**
Script automatizado com credenciais padrão para desenvolvimento.

```bash
npm run create-superadmin-quick
```

**Ou diretamente:**
```bash
node create-superadmin-quick.js
```

**Credenciais Padrão:**
- 📧 **Email:** `admin@lyz.ai`
- 👤 **Nome:** `Super Admin`
- 🔒 **Senha:** `admin123456`
- 👑 **Role:** `superadmin`

---

### **Opção 3: Verificar Super Admins Existentes**
Script para verificar todos os super admins no sistema.

```bash
npm run check-superadmins
```

**Ou diretamente:**
```bash
node check-superadmins.js
```

**Características:**
- ✅ Lista todos os super admins
- ✅ Mostra informações detalhadas
- ✅ Estatísticas gerais do sistema
- ✅ Status de último login
- ✅ Dados de criação

---

### **Opção 4: Via Interface Web**
Como descrito no `INSTALLATION.md`:

1. Acesse `http://localhost:3000`
2. Clique em "Criar Nova Conta"
3. Use o email: `admin@lyz.ai`
4. O primeiro usuário criado automaticamente se torna superadmin

**⚠️ ATENÇÃO:** Esta opção pode não funcionar se não houver lógica específica para tornar o primeiro usuário superadmin automaticamente.

---

## 🔧 Pré-requisitos

1. **MongoDB funcionando** e conectado
2. **Arquivo `.env`** configurado com `MONGODB_URI`
3. **Dependências instaladas:** `npm install`

## 📁 Estrutura dos Scripts

### `create-superadmin.js`
- Script interativo completo
- Validações rigorosas
- Entrada manual de dados
- Confirmação de segurança

### `create-superadmin-quick.js`
- Script automatizado
- Credenciais pré-definidas
- Ideal para desenvolvimento
- Criação instantânea

### `check-superadmins.js`
- Verificação de super admins
- Informações detalhadas
- Estatísticas do sistema
- Status de login

## 🛡️ Validações Implementadas

- ✅ **Email único:** Verifica duplicatas no banco
- ✅ **Formato de email:** Validação regex
- ✅ **Senha segura:** Mínimo 8 caracteres
- ✅ **Hash bcrypt:** Nível 12 de segurança
- ✅ **Super admin existente:** Previne criação duplicada
- ✅ **Conexão MongoDB:** Verificação de conectividade

## 🚀 Execução Passo a Passo

### 1. Verificar Configuração
```bash
# Verificar se .env existe e tem MONGODB_URI
cat .env | grep MONGODB_URI
```

### 2. Executar Script
```bash
# Para criação interativa
npm run create-superadmin

# Para criação rápida
npm run create-superadmin-quick
```

### 3. Verificar Criação
```bash
# Usar o script de verificação de super admins
npm run check-superadmins

# Ou usar o script de verificação existente
node src/scripts/check-users.js
```

## 📊 Saída Esperada

### Script Interativo:
```
🚀 === CRIAÇÃO DO PRIMEIRO SUPER ADMIN ===

📡 Conectando ao MongoDB...
✅ Conectado ao MongoDB: mongodb://***@localhost:27017/novo-banco

📝 Dados do Super Admin:
👤 Nome completo: Administrador Principal
📧 Email: admin@empresa.com
🔒 Senha (mínimo 8 caracteres): ********

📋 Confirmação dos dados:
👤 Nome: Administrador Principal
📧 Email: admin@empresa.com
🔒 Senha: ********
👑 Role: superadmin

✅ Confirma a criação? (S/n): s

🔐 Gerando hash da senha...
💾 Salvando usuário no banco...

🎉 === SUPER ADMIN CRIADO COM SUCESSO! ===
📧 Email: admin@empresa.com
👤 Nome: Administrador Principal
🆔 ID: 674abc123def456789012345
📅 Criado em: 01/01/2024 10:30:45

🔐 Agora você pode fazer login com essas credenhttps://curseduca.comais!
```

### Script Rápido:
```
🚀 === CRIAÇÃO RÁPIDA DO SUPER ADMIN ===

📡 Conectando ao MongoDB...
✅ Conectado ao MongoDB: mongodb://***@localhost:27017/novo-banco

📝 Criando super admin com dados padrão:
👤 Nome: Super Admin
📧 Email: admin@lyz.ai
🔒 Senha: admin123456
👑 Role: superadmin

🔐 Gerando hash da senha...
💾 Salvando usuário no banco...

🎉 === SUPER ADMIN CRIADO COM SUCESSO! ===
📧 Email: admin@lyz.ai
👤 Nome: Super Admin
🔒 Senha: admin123456
🆔 ID: 674abc123def456789012345
📅 Criado em: 01/01/2024 10:30:45

🔐 Agora você pode fazer login com essas credenciais!

⚠️  IMPORTANTE: Altere a senha após o primeiro login!
```

## ⚠️ Possíveis Erros

### Erro de Conexão MongoDB
```
❌ MONGODB_URI não encontrada no .env
```
**Solução:** Configurar variável `MONGODB_URI` no arquivo `.env`

### Email Duplicado
```
❌ Este email já está em uso
```
**Solução:** Usar outro email ou verificar usuários existentes

### Super Admin Existente
```
⚠️  Já existe um super admin no sistema!
```
**Solução:** Usar o script interativo para criar outro super admin

## 🔄 Próximos Passos

1. **Fazer login** com as credenciais criadas
2. **Alterar senha** (se usando script rápido)
3. **Configurar provedores de IA** em `/settings/ai-providers`
4. **Configurar sistema RAG** em `/rag`
5. **Criar empresa** e usuários admin/profissionais

## 📝 Notas Importantes

- 🔒 **Senhas** são sempre hashadas com bcrypt (level 12)
- 👑 **Super admin** não precisa de empresa vinculada
- 🏢 **Outros usuários** (admin/professional) precisam de empresa
- 🔐 **Primeiro login** deve ser feito para ativar a conta
- 📧 **Email** é sempre convertido para lowercase
- 🆔 **IDs** são ObjectIds do MongoDB

## 🛠️ Solução de Problemas

Se algo der errado, você pode:

1. **Verificar logs** do MongoDB
2. **Testar conexão** com `mongosh`
3. **Limpar coleção** de usuários se necessário
4. **Recriar** com credenciais diferentes

### Limpar Usuários (se necessário):
```javascript
// No mongosh
use novo-nome-do-banco
db.users.deleteMany({})
```

---

**✅ Com estes scripts, você terá seu primeiro super admin criado rapidamente e com segurança!** 