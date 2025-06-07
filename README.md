# lyz.ai

Plataforma digital para profissionais de saúde especializados em saúde feminina e ciclicidade. O sistema usa inteligência artificial para analisar dados médicos e criar planos de tratamento personalizados.

## 🚀 Funcionalidades

### Sistema de Usuários
- **Superadmin**: Configuração geral do sistema
- **Admin**: Gestão da empresa/clínica
- **Profissional**: Médico, nutricionista, terapeuta

### 5 Análises de IA
1. **Análise Laboratorial** - Interpretação de exames
2. **Análise de Medicina Tradicional Chinesa** - Avaliação energética
3. **Geração de Cronologia** - Linha do tempo da saúde
4. **Matriz IFM** - Análise de Medicina Funcional
5. **Plano de Tratamento Final** - Plano personalizado

### Sistema RAG (Retrieval-Augmented Generation)
- Upload e processamento de documentos médicos
- Base de conhecimento especializada
- Busca semântica inteligente

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Banco de Dados**: MongoDB com Mongoose
- **Armazenamento**: MinIO para arquivos
- **IA**: OpenAI, Anthropic, Google AI
- **RAG**: LangChain para processamento de documentos

## 📋 Pré-requisitos

- Node.js 18+
- MongoDB
- MinIO (para armazenamento de arquivos)

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/lyz.ai.git
cd lyz.ai
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

4. Edite o arquivo `.env.local` com suas configurações.

5. Execute o projeto:
```bash
npm run dev
```

## 🌍 Deploy

O projeto está pronto para deploy em plataformas como Vercel, com suporte para:
- MongoDB Atlas (banco de dados)
- MinIO ou AWS S3 (armazenamento)
- Variáveis de ambiente configuradas

## 📚 Documentação

Para mais informações sobre como usar cada funcionalidade, consulte a documentação interna do sistema após fazer login.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, leia as diretrizes de contribuição antes de enviar um PR.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes. 