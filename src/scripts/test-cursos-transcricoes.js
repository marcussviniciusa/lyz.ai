const mongoose = require('mongoose');
require('dotenv').config();

// Conectar ao MongoDB usando variável de ambiente
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

async function testCursosTranscricoes() {
  try {
    await connectToMongoDB();
    
    console.log('🎓 === VERIFICANDO DOCUMENTOS "cursos-transcricoes" ===');
    
    // Verificar documentos da categoria cursos-transcricoes
    const cursosDocuments = await RAGDocument.find({ 
      category: 'cursos-transcricoes',
      status: 'completed' 
    });
    
    console.log(`📄 Total de documentos "cursos-transcricoes": ${cursosDocuments.length}`);
    
    if (cursosDocuments.length > 0) {
      console.log('📋 Documentos "cursos-transcricoes" encontrados:');
      cursosDocuments.forEach((doc, i) => {
        console.log(`  ${i+1}. ${doc.fileName} - Status: ${doc.status} - Chunks: ${doc.chunkCount || 0}`);
      });
      
      // Verificar chunks dos documentos de cursos
      const cursosDocIds = cursosDocuments.map(doc => doc._id);
      const cursosChunks = await DocumentChunk.find({ 
        documentId: { $in: cursosDocIds } 
      });
      
      console.log(`\n🧩 Total de chunks de "cursos-transcricoes": ${cursosChunks.length}`);
      
      if (cursosChunks.length > 0) {
        console.log('📋 Primeiros chunks encontrados:');
        cursosChunks.slice(0, 3).forEach((chunk, i) => {
          console.log(`  ${i+1}. Conteúdo: ${chunk.content?.substring(0, 100) || 'N/A'}...`);
          console.log(`     Embedding: ${chunk.embedding?.length || 0} dimensões`);
        });
      }
      
    } else {
      console.log('\n⚠️  NENHUM DOCUMENTO "cursos-transcricoes" ENCONTRADO!');
      console.log('💡 Para testar o RAG com cursos:');
      console.log('   1. Acesse http://localhost:3000/rag');
      console.log('   2. Selecione categoria "Cursos e Transcrições"');
      console.log('   3. Faça upload de documentos PDF sobre cursos');
      console.log('   4. Aguarde o processamento');
      console.log('   5. Execute uma análise de IA');
    }
    
    // Verificar outras categorias disponíveis
    console.log('\n📊 === CATEGORIAS DISPONÍVEIS ===');
    const allCategories = await RAGDocument.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    if (allCategories.length > 0) {
      console.log('📂 Categorias com documentos:');
      allCategories.forEach(cat => {
        console.log(`  - ${cat._id}: ${cat.count} documentos`);
      });
    } else {
      console.log('⚠️  Nenhum documento encontrado em qualquer categoria');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar documentos cursos-transcricoes:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Conexão MongoDB fechada');
  }
}

// Executar teste
testCursosTranscricoes(); 