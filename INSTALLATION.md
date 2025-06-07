# Guia de Instalação - lyz.ai

## Pré-requisitos

- Node.js 18+ 
- MongoDB 5.0+
- MinIO (ou AWS S3)
- Git

## 1. Clone o Repositório

```bash
git clone <repository-url>
cd lyz.ai
```

## 2. Instalar Dependências

```bash
npm install
```

## 3. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure as variáveis:

```bash
cp .env.example .env.local
```

Configure as seguintes variáveis no arquivo `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/lyz-ai

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# APIs de IA
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_AI_API_KEY=your-google-ai-key

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=lyz-ai-files

# Configurações do Sistema
NODE_ENV=development
APP_URL=http://localhost:3000
```

## 4. Configurar MongoDB

### Usando Docker

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:5.0
```

### Instalação Local

Siga as instruções de instalação do MongoDB para seu sistema operacional:
https://docs.mongodb.com/manual/installation/

## 5. Configurar MinIO

### Usando Docker

```bash
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -v minio_data:/data \
  -e "MINIO_ACCESS_KEY=minioadmin" \
  -e "MINIO_SECRET_KEY=minioadmin" \
  quay.io/minio/minio server /data --console-address ":9001"
```

### Instalação Local

1. Baixe o MinIO: https://min.io/download
2. Execute: `./minio server ./data`

## 6. Executar a Aplicação

### Modo de Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em: http://localhost:3000

### Modo de Produção

```bash
npm run build
npm start
```

## 7. Configuração Inicial

### Criar Usuário Superadmin

1. Acesse http://localhost:3000
2. Clique em "Criar Nova Conta"
3. Use o email: `admin@lyz.ai`
4. O primeiro usuário criado automaticamente se torna superadmin

### Configurar Provedores de IA

1. Faça login como superadmin
2. Acesse "Configurações > Provedores de IA"
3. Configure as chaves de API dos provedores desejados

### Upload de Base de Conhecimento

1. Acesse "Sistema RAG > Gerenciar Documentos"
2. Faça upload de documentos médicos, protocolos e guidelines
3. Aguarde o processamento automático dos documentos

## Estrutura de Pastas

```
lyz.ai/
├── src/
│   ├── app/               # Páginas Next.js (App Router)
│   ├── components/        # Componentes React
│   ├── lib/              # Utilitários e configurações
│   └── models/           # Modelos do MongoDB
├── public/               # Arquivos estáticos
├── .env.example         # Exemplo de variáveis de ambiente
└── package.json         # Dependências e scripts
```

## Scripts Disponíveis

- `npm run dev` - Executa em modo de desenvolvimento
- `npm run build` - Compila para produção
- `npm run start` - Executa em modo de produção
- `npm run lint` - Executa o linter
- `npm run type-check` - Verifica tipos TypeScript

## Solução de Problemas

### Erro de Conexão com MongoDB

Verifique se o MongoDB está rodando e a URI está correta:

```bash
# Verificar status do MongoDB
mongosh mongodb://localhost:27017/lyz-ai
```

### Erro de Conexão com MinIO

Verifique se o MinIO está rodando:

```bash
# Verificar se MinIO está acessível
curl http://localhost:9000/minio/health/live
```

### Erro de Dependências

Limpe o cache e reinstale:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro de TypeScript

Execute verificação de tipos:

```bash
npm run type-check
```

## Próximos Passos

1. **Configurar SSL/HTTPS para produção**
2. **Configurar backup do MongoDB**
3. **Configurar monitoramento com logs**
4. **Implementar testes automatizados**
5. **Configurar CI/CD**

## Suporte

Para suporte técnico, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.

## Licença

Este projeto está licenciado sob os termos da licença MIT. 