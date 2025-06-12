const mongoose = require('mongoose');

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lyz-ai');

// Definir schemas simples para teste
const RAGDocumentSchema = new mongoose.Schema({
  fileName: String,
  category: String,
  status: String,
  chunkCount: Number,
  companyId: mongoose.Schema.Types.ObjectId
}, { collection: 'ragdocuments' });

const DocumentChunkSchema = new mongoose.Schema({
  documentId: mongoose.Schema.Types.ObjectId,
  content: String,
  embedding: [Number],
  companyId: mongoose.Schema.Types.ObjectId
}, { collection: 'documentchunks' });

const RAGDocument = mongoose.model('RAGDocument', RAGDocumentSchema);
const DocumentChunk = mongoose.model('DocumentChunk', DocumentChunkSchema);

async function testRAGDocuments() {
  try {
    console.log('🔍 === VERIFICANDO DOCUMENTOS RAG NO BANCO ===');
    
    // Verificar documentos
    const documents = await RAGDocument.find().limit(10);
    console.log(`📄 Total de documentos RAG: ${documents.length}`);
    
    if (documents.length > 0) {
      console.log('📋 Primeiros documentos encontrados:');
      documents.forEach((doc, i) => {
        console.log(`  ${i+1}. ${doc.fileName} - Status: ${doc.status} - Categoria: ${doc.category} - Chunks: ${doc.chunkCount}`);
      });
    }
    
    // Verificar chunks
    const chunks = await DocumentChunk.find().limit(5);
    console.log(`\n🧩 Total de chunks: ${chunks.length}`);
    
    if (chunks.length > 0) {
      console.log('📋 Primeiros chunks encontrados:');
      chunks.forEach((chunk, i) => {
        console.log(`  ${i+1}. Documento: ${chunk.documentId} - Tamanho do conteúdo: ${chunk.content?.length || 0} chars - Embedding: ${chunk.embedding?.length || 0} dimensões`);
      });
    }
    
    // Verificar por empresa específica
    const companyId = '507f1f77bcf86cd799439011'; // ObjectId fixo que estamos usando
    const companyDocs = await RAGDocument.find({ companyId }).limit(5);
    console.log(`\n🏢 Documentos para empresa ${companyId}: ${companyDocs.length}`);
    
    const companyChunks = await DocumentChunk.find({ companyId }).limit(5);
    console.log(`🏢 Chunks para empresa ${companyId}: ${companyChunks.length}`);
    
    if (documents.length === 0) {
      console.log('\n⚠️  NENHUM DOCUMENTO RAG ENCONTRADO!');
      console.log('💡 Para testar o RAG:');
      console.log('   1. Acesse http://localhost:3000/rag');
      console.log('   2. Faça upload de alguns documentos PDF');
      console.log('   3. Aguarde o processamento');
      console.log('   4. Execute uma análise novamente');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar documentos RAG:', error);
  } finally {
    mongoose.connection.close();
  }
}

testRAGDocuments(); 