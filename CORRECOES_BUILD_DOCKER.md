# Correções para Build Docker - Sistema Lyz.AI

## Resumo das Correções Implementadas

### 1. Correção de Tipos TypeScript
**Problema**: Faltava o tipo `@types/bcryptjs` para o módulo bcryptjs
**Solução**: 
```bash
npm install --save-dev @types/bcryptjs
```

### 2. Correção de Conexão MongoDB
**Problema**: A verificação da variável `MONGODB_URI` estava sendo feita no momento da importação
**Solução**: Movida a verificação para dentro da função `dbConnect()` para evitar erros durante o build

### 3. Correção de Inicialização MinIO
**Problema**: O cliente MinIO estava sendo inicializado no momento da importação
**Solução**: Implementada inicialização lazy com função `getMinioClient()` que só cria o cliente quando necessário

### 4. Correção de useSearchParams com Suspense
**Problema**: `useSearchParams()` precisa estar envolvido em Suspense boundary para builds estáticos
**Páginas corrigidas**:
- `/analyses/chronology/page.tsx`
- `/analyses/laboratory/page.tsx`
- `/analyses/tcm/page.tsx` (já estava correta)

**Solução**: Criação de componentes separados envolvidos em `<Suspense>`

### 5. Correção do .dockerignore
**Problema**: A pasta `public` estava sendo excluída pelo .dockerignore
**Solução**: Removida a linha `public` do .dockerignore para permitir cópia no Docker

### 6. Variáveis de Ambiente para Build
**Adicionadas variáveis temporárias no Dockerfile para permitir o build**:
```dockerfile
ENV MONGODB_URI="mongodb://localhost:27017/temp"
ENV NEXTAUTH_SECRET="temp-build-secret"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV MINIO_ENDPOINT="localhost"
ENV MINIO_PORT="9000"
ENV MINIO_ACCESS_KEY="temp"
ENV MINIO_SECRET_KEY="temp"
ENV MINIO_BUCKET_NAME="temp"
ENV MINIO_USE_SSL="false"
```

### 7. Correção do Formato ENV no Dockerfile
**Problema**: Formato legado `ENV key value`
**Solução**: Atualizado para `ENV key=value`

## Resultado Final

✅ **Build Docker concluído com sucesso**
✅ **Imagem enviada para Docker Hub**: `marcussviniciusa/lyz-ai:latest`
✅ **Todas as páginas de análise funcionando**
✅ **Sistema pronto para deploy em produção**

## Próximos Passos

1. **Deploy no Portainer**: Usar o docker-compose.yml fornecido
2. **Configurar variáveis de ambiente reais** no ambiente de produção
3. **Configurar DNS** para apontar para o servidor
4. **Configurar SSL/HTTPS** via Traefik

## Arquivos Modificados

- `src/lib/db.ts` - Correção inicialização MongoDB
- `src/lib/minio.ts` - Correção inicialização MinIO
- `src/app/analyses/chronology/page.tsx` - Adicionado Suspense
- `src/app/analyses/laboratory/page.tsx` - Adicionado Suspense
- `Dockerfile` - Variáveis de ambiente e formato ENV
- `.dockerignore` - Removida exclusão da pasta public
- `package.json` - Adicionado @types/bcryptjs

## Tempo Total de Build
Aproximadamente 2 minutos e 30 segundos

## Warnings do Docker
- Uso de variáveis sensíveis em ENV (normal para build, serão sobrescritas em produção) 