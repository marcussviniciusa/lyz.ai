// Como não podemos importar TypeScript diretamente, vamos testar a busca manualmente
const mongoose = require('mongoose');
require('dotenv').config();

// OpenAI para embeddings
const { OpenAI } = require('openai');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lyz-ai';

async function connectToMongoDB() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB conectado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error);
    process.exit(1);
  }
}

// Schema para busca direta
const DocumentChunkSchema = new mongoose.Schema({
  documentId: mongoose.Schema.Types.ObjectId,
  content: String,
  embedding: [Number],
  companyId: mongoose.Schema.Types.ObjectId,
  metadata: mongoose.Schema.Types.Mixed
}, { collection: 'documentchunks' });

const RAGDocumentSchema = new mongoose.Schema({
  fileName: String,
  originalFileName: String,
  category: String,
  status: String,
  chunkCount: Number,
  companyId: mongoose.Schema.Types.ObjectId
}, { collection: 'ragdocuments' });

const DocumentChunk = mongoose.model('DocumentChunk', DocumentChunkSchema);
const RAGDocument = mongoose.model('RAGDocument', RAGDocumentSchema);

// Função para calcular similaridade de cosseno
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vetores devem ter o mesmo tamanho');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

async function testRAGServiceDirectly() {
  try {
    await connectToMongoDB();
    
    console.log('🔍 === TESTE DIRETO DO RAG SERVICE ===');
    
    const companyId = '507f1f77bcf86cd799439011';
    const category = 'cursos-transcricoes';
    const query = 'tratamento febre medicina integrativa';
    
    console.log(`🎯 Parâmetros:`);
    console.log(`   CompanyId: ${companyId}`);
    console.log(`   Categoria: ${category}`);
    console.log(`   Query: ${query}`);
    
    // 1. Buscar documentos da categoria
    console.log('\n📄 1. Buscando documentos da categoria...');
    const documents = await RAGDocument.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      category: category,
      status: 'completed'
    });
    
    console.log(`   Encontrados: ${documents.length} documentos`);
    documents.forEach((doc, i) => {
      console.log(`   ${i+1}. ${doc.originalFileName || doc.fileName} (${doc.chunkCount || 0} chunks)`);
    });
    
    if (documents.length === 0) {
      console.log('❌ Nenhum documento encontrado! Parando teste.');
      return;
    }
    
    // 2. Buscar chunks dos documentos
    console.log('\n🧩 2. Buscando chunks dos documentos...');
    const documentIds = documents.map(doc => doc._id);
    const filter = {
      companyId: new mongoose.Types.ObjectId(companyId),
      documentId: { $in: documentIds }
    };
    
    const chunks = await DocumentChunk.find(filter).limit(50);
    console.log(`   Encontrados: ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      console.log('❌ Nenhum chunk encontrado! Parando teste.');
      return;
    }
    
    // 3. Testar embedding da query (simulado)
    console.log('\n🧠 3. Testando busca por similaridade...');
    
    // Para simular, vamos buscar chunks que contenham palavras da query
    const queryWords = query.toLowerCase().split(' ');
    console.log(`   Palavras da query: ${queryWords.join(', ')}`);
    
    const matchingChunks = chunks.filter(chunk => {
      const content = chunk.content.toLowerCase();
      return queryWords.some(word => content.includes(word));
    });
    
    console.log(`   Chunks com conteúdo relevante: ${matchingChunks.length}`);
    
    if (matchingChunks.length > 0) {
      console.log('\n📋 Primeiros 3 chunks relevantes:');
      matchingChunks.slice(0, 3).forEach((chunk, i) => {
        console.log(`   ${i+1}. Score simulado: 0.8`);
        console.log(`      Conteúdo: ${chunk.content.substring(0, 100)}...`);
        console.log(`      Embedding: ${chunk.embedding?.length || 0} dimensões`);
      });
      
      console.log('\n✅ SUCESSO! O RAG deveria estar funcionando.');
      console.log('🔧 O problema pode estar na geração de embeddings ou threshold muito alto.');
      
    } else {
      console.log('\n⚠️  Nenhum chunk com conteúdo relevante encontrado.');
      console.log('💡 Isso pode explicar por que o RAG não retorna resultados.');
      
      // Mostrar alguns chunks para análise
      console.log('\n📋 Primeiros 3 chunks (para análise):');
      chunks.slice(0, 3).forEach((chunk, i) => {
        console.log(`   ${i+1}. Conteúdo: ${chunk.content.substring(0, 150)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro no teste direto:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Conexão MongoDB fechada');
  }
}

// Executar teste
testRAGServiceDirectly(); 