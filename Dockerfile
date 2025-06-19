# Use uma imagem baseada em Debian que suporta Chrome
FROM node:18-bookworm-slim AS base

# Instalar dependências do sistema necessárias para Chrome e Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Instalar Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências apenas quando necessário
FROM base AS deps
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

# Configurar Puppeteer para usar Chrome instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Definir as permissões corretas para prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar automaticamente os arquivos de saída baseado no trace
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Criar diretórios necessários para o Chrome
RUN mkdir -p /home/nextjs/.local/share/applications \
    && mkdir -p /home/nextjs/.config/google-chrome \
    && mkdir -p /home/nextjs/.cache \
    && mkdir -p /tmp/.X11-unix \
    && chmod 1777 /tmp/.X11-unix \
    && chown -R nextjs:nodejs /home/nextjs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js é criado pelo next build a partir do output standalone
CMD ["node", "server.js"] 