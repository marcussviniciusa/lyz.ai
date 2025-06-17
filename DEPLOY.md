# 🚀 Deploy do Lyz.AI

## ✅ Status do Build

**Build Docker concluído com sucesso!**
- ✅ Imagem disponível: `marcussviniciusa/lyz-ai:latest`
- ✅ Todas as correções aplicadas (Suspense, MongoDB, MinIO, TypeScript)
- ✅ Sistema pronto para deploy em produção

## 📋 Pré-requisitos

Certifique-se de que sua VPS já possui:
- ✅ MongoDB
- ✅ Portainer
- ✅ Traefik
- ✅ MinIO

## 🔧 Configuração para Deploy

### 1. **Imagem Docker Pronta**

A imagem Docker já está disponível no Docker Hub:
```
marcussviniciusa/lyz-ai:latest
```

**Não é necessário fazer build**, a imagem já está pronta para uso!

### 2. **Configuração das Variáveis de Ambiente**

Edite o arquivo `docker-compose.yml` e configure:

```yaml
environment:
  # URL da aplicação (OBRIGATÓRIO)
  - NEXTAUTH_URL=https://lyz.seudominio.com
  
  # Secret do NextAuth (OBRIGATÓRIO)
  - NEXTAUTH_SECRET=seu-secret-super-seguro-aqui
  
  # MongoDB (ajuste conforme sua configuração)
  - MONGODB_URI=mongodb://mongo:27017/lyz-ai
  
  # Chaves de API da IA
  - OPENAI_API_KEY=sua-chave-openai-aqui
  - ANTHROPIC_API_KEY=sua-chave-anthropic-aqui
  
  # MinIO (ajuste conforme sua configuração)
  - MINIO_ENDPOINT=minio:9000
  - MINIO_ACCESS_KEY=sua-access-key-minio
  - MINIO_SECRET_KEY=sua-secret-key-minio
  - MINIO_BUCKET_NAME=lyz-ai-files
```

### 3. **Configuração do Traefik**

No `docker-compose.yml`, ajuste os labels do Traefik:

```yaml
labels:
  - "traefik.http.routers.lyz-ai.rule=Host(`lyz.seudominio.com`)"
  - "traefik.http.routers.lyz-ai-http.rule=Host(`lyz.seudominio.com`)"
```

## 🐳 Deploy no Portainer

### 1. **Criar Stack no Portainer**

1. Acesse o Portainer
2. Vá em **Stacks** → **Add Stack**
3. Nome: `lyz-ai`
4. Cole o conteúdo do `docker-compose.yml`
5. Ajuste as variáveis de ambiente
6. Deploy

### 2. **Verificar Redes**

Certifique-se de que a rede `traefik` existe:
```bash
docker network ls | grep traefik
```

Se não existir, crie:
```bash
docker network create traefik
```

## 🔐 Configurações de Segurança

### 1. **Gerar NEXTAUTH_SECRET**

```bash
openssl rand -base64 32
```

### 2. **Configurar MinIO**

Certifique-se de que o bucket `lyz-ai-files` existe no MinIO.

### 3. **Configurar MongoDB**

Crie o banco de dados `lyz-ai` no MongoDB se necessário.

## 🌐 Configuração de DNS

Configure seu DNS para apontar `lyz.seudominio.com` para o IP da sua VPS.

## 📝 Checklist de Deploy

- [ ] Imagem buildada e enviada para Docker Hub
- [ ] Variáveis de ambiente configuradas
- [ ] Domínio configurado no DNS
- [ ] Rede `traefik` criada
- [ ] Stack criada no Portainer
- [ ] Bucket MinIO criado
- [ ] Banco MongoDB configurado
- [ ] SSL/TLS funcionando via Traefik

## 🔍 Verificação

Após o deploy:

1. **Verificar containers**:
   ```bash
   docker ps | grep lyz-ai
   ```

2. **Verificar logs**:
   ```bash
   docker logs lyz-ai
   ```

3. **Testar aplicação**:
   - Acesse `https://lyz.seudominio.com`
   - Teste login
   - Verifique funcionalidades

## 🚨 Troubleshooting

### Container não inicia
- Verifique logs: `docker logs lyz-ai`
- Verifique variáveis de ambiente
- Verifique conectividade com MongoDB/MinIO

### Erro de SSL
- Verifique configuração do Traefik
- Verifique se o domínio está apontando corretamente
- Aguarde alguns minutos para o Let's Encrypt

### Erro de conexão com MongoDB
- Verifique se o MongoDB está rodando
- Verifique a string de conexão
- Verifique se estão na mesma rede

### Erro de conexão com MinIO
- Verifique se o MinIO está rodando
- Verifique credenciais
- Verifique se o bucket existe

## 📊 Monitoramento

Monitore os logs da aplicação:
```bash
docker logs -f lyz-ai
```

## 🔄 Atualizações

Para atualizar a aplicação:

1. Build nova imagem com nova tag
2. Push para Docker Hub
3. Atualizar tag no docker-compose.yml
4. Redeployar stack no Portainer

## 🎯 Exemplo de Configuração Completa

```yaml
version: '3.8'

services:
  lyz-ai:
    image: marcussviniciusa/lyz-ai:latest
    container_name: lyz-ai
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=https://lyz.exemplo.com
      - NEXTAUTH_SECRET=abc123def456ghi789jkl012mno345pqr678
      - MONGODB_URI=mongodb://mongo:27017/lyz-ai
      - OPENAI_API_KEY=sk-proj-abc123...
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin123
      - MINIO_BUCKET_NAME=lyz-ai-files
      - MINIO_USE_SSL=false
    networks:
      - traefik
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.lyz-ai.rule=Host(`lyz.exemplo.com`)"
      - "traefik.http.routers.lyz-ai.entrypoints=websecure"
      - "traefik.http.routers.lyz-ai.tls.certresolver=letsencrypt"
      - "traefik.http.services.lyz-ai.loadbalancer.server.port=3000"

networks:
  traefik:
    external: true
``` 