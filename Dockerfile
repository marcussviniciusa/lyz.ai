# Use a imagem oficial do Node.js como base
FROM node:18-alpine AS base

# Instalar dependências apenas quando necessário
FROM base AS deps
# Verificar https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine para entender por que libc6-compat pode ser necessário.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Instalar dependências baseado no gerenciador de pacotes preferido
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild o código fonte apenas quando necessário
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js coleta dados de telemetria completamente anônimos sobre uso geral.
# Saiba mais aqui: https://nextjs.org/telemetry
# Descomente a linha seguinte caso queira desabilitar a telemetria durante o build.
ENV NEXT_TELEMETRY_DISABLED=1

# Variáveis de ambiente necessárias para o build (valores temporários)
ENV MONGODB_URI="mongodb://localhost:27017/temp"
ENV NEXTAUTH_SECRET="temp-build-secret"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV MINIO_ENDPOINT="localhost"
ENV MINIO_PORT="9000"
ENV MINIO_ACCESS_KEY="temp"
ENV MINIO_SECRET_KEY="temp"
ENV MINIO_BUCKET_NAME="temp"
ENV MINIO_USE_SSL="false"

RUN npm run build

# Imagem de produção, copiar todos os arquivos e executar next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Descomente a linha seguinte caso queira desabilitar a telemetria durante o runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Definir as permissões corretas para prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar automaticamente os arquivos de saída baseado no trace
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js é criado pelo next build a partir do output standalone
CMD ["node", "server.js"] 