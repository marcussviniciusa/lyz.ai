const mongoose = require('mongoose');
require('dotenv').config();

// Importar o RAGService
const path = require('path');
const libPath = path.join(__dirname, '../lib/ragService.ts');

// Como é TypeScript, vamos fazer a busca manualmente
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
  category: String,
  status: String,
  chunkCount: Number,
  companyId: mongoose.Schema.Types.ObjectId
}, { collection: 'ragdocuments' });

const DocumentChunk = mongoose.model('DocumentChunk', DocumentChunkSchema);
const RAGDocument = mongoose.model('RAGDocument', RAGDocumentSchema);

async function testDirectRAGSearch() {
  try {
    await connectToMongoDB();
    
    console.log('🔍 === TESTE DIRETO DE BUSCA RAG ===');
    
    const companyId = '507f1f77bcf86cd799439011';
    const category = 'cursos-transcricoes';
    
    console.log(`🎯 Buscando em companyId: ${companyId}`);
    console.log(`📂 Categoria: ${category}`);
    
    // 1. Verificar documentos da categoria
    const documents = await RAGDocument.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      category: category,
      status: 'completed'
    });
    
    console.log(`\n📄 Documentos encontrados: ${documents.length}`);
    documents.forEach((doc, i) => {
      console.log(`  ${i+1}. ${doc.fileName} (${doc.chunkCount || 0} chunks)`);
    });
    
    if (documents.length === 0) {
      console.log('❌ Nenhum documento encontrado! Verificando sem filtro de categoria...');
      
      const allDocs = await RAGDocument.find({
        companyId: new mongoose.Types.ObjectId(companyId),
        status: 'completed'
      });
      
      console.log(`📄 Todos os documentos da empresa: ${allDocs.length}`);
      allDocs.forEach((doc, i) => {
        console.log(`  ${i+1}. ${doc.fileName} - Categoria: ${doc.category}`);
      });
      
      return;
    }
    
    // 2. Verificar chunks dos documentos
    const documentIds = documents.map(doc => doc._id);
    const chunks = await DocumentChunk.find({
      documentId: { $in: documentIds },
      companyId: new mongoose.Types.ObjectId(companyId)
    });
    
    console.log(`\n🧩 Chunks encontrados: ${chunks.length}`);
    
    if (chunks.length > 0) {
      console.log('📋 Primeiros 3 chunks:');
      chunks.slice(0, 3).forEach((chunk, i) => {
        console.log(`  ${i+1}. Conteúdo: ${chunk.content?.substring(0, 100)}...`);
        console.log(`     Embedding: ${chunk.embedding?.length || 0} dimensões`);
        console.log(`     Metadata: ${JSON.stringify(chunk.metadata || {})}`);
      });
      
      // 3. Teste de busca por similaridade básica
      console.log('\n🔍 Testando busca por termos...');
      
      const searchTerms = [
        'tratamento',
        'medicina',
        'plano',
        'protocolo',
        'febre',
        'vitamina'
      ];
      
      for (const term of searchTerms) {
        const termChunks = await DocumentChunk.find({
          documentId: { $in: documentIds },
          companyId: new mongoose.Types.ObjectId(companyId),
          content: { $regex: term, $options: 'i' }
        }).limit(3);
        
        console.log(`  📍 "${term}": ${termChunks.length} chunks encontrados`);
        if (termChunks.length > 0) {
          console.log(`     Exemplo: ${termChunks[0].content?.substring(0, 80)}...`);
        }
      }
      
    } else {
      console.log('❌ Nenhum chunk encontrado!');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste direto:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Conexão MongoDB fechada');
  }
}

// Executar teste
testDirectRAGSearch(); 