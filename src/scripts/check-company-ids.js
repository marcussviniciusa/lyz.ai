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

async function checkCompanyIds() {
  try {
    await connectToMongoDB();
    
    console.log('🔍 === VERIFICANDO COMPANY IDs DOS DOCUMENTOS RAG ===');
    
    // Verificar todos os documentos cursos-transcricoes
    const cursosDocuments = await RAGDocument.find({ 
      category: 'cursos-transcricoes',
      status: 'completed' 
    });
    
    console.log(`📄 Total de documentos "cursos-transcricoes": ${cursosDocuments.length}`);
    
    if (cursosDocuments.length > 0) {
      console.log('\n📋 CompanyIds dos documentos:');
      
      const companyIdCounts = {};
      
      cursosDocuments.forEach((doc, i) => {
        const companyIdStr = doc.companyId?.toString() || 'null';
        companyIdCounts[companyIdStr] = (companyIdCounts[companyIdStr] || 0) + 1;
        
        console.log(`  ${i+1}. ${doc.fileName}`);
        console.log(`     CompanyId: ${companyIdStr}`);
        console.log(`     Chunks: ${doc.chunkCount || 0}`);
      });
      
      console.log('\n📊 Distribuição por CompanyId:');
      Object.entries(companyIdCounts).forEach(([companyId, count]) => {
        console.log(`  - ${companyId}: ${count} documento(s)`);
      });
      
      // Verificar chunks também
      console.log('\n🧩 Verificando chunks...');
      const cursosDocIds = cursosDocuments.map(doc => doc._id);
      const cursosChunks = await DocumentChunk.find({ 
        documentId: { $in: cursosDocIds } 
      });
      
      console.log(`📊 Total de chunks: ${cursosChunks.length}`);
      
      if (cursosChunks.length > 0) {
        const chunkCompanyIds = {};
        cursosChunks.forEach(chunk => {
          const companyIdStr = chunk.companyId?.toString() || 'null';
          chunkCompanyIds[companyIdStr] = (chunkCompanyIds[companyIdStr] || 0) + 1;
        });
        
        console.log('📊 Distribuição de chunks por CompanyId:');
        Object.entries(chunkCompanyIds).forEach(([companyId, count]) => {
          console.log(`  - ${companyId}: ${count} chunk(s)`);
        });
      }
      
      // Mostrar o CompanyId que estamos usando no sistema
      const fixedCompanyId = '507f1f77bcf86cd799439011';
      console.log(`\n🎯 CompanyId usado no sistema: ${fixedCompanyId}`);
      
      const matchingDocs = cursosDocuments.filter(doc => 
        doc.companyId?.toString() === fixedCompanyId
      );
      console.log(`✅ Documentos que correspondem: ${matchingDocs.length}`);
      
      if (matchingDocs.length === 0) {
        console.log('\n❌ PROBLEMA ENCONTRADO!');
        console.log('💡 Os documentos têm companyIds diferentes do usado na busca');
        console.log('🔧 Soluções possíveis:');
        console.log(`   1. Atualizar documentos para usar ${fixedCompanyId}`);
        console.log('   2. Usar o companyId real dos documentos existentes');
      } else {
        console.log('\n✅ CompanyIds estão corretos!');
      }
      
    } else {
      console.log('\n⚠️  Nenhum documento cursos-transcricoes encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar company IDs:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Conexão MongoDB fechada');
  }
}

// Executar verificação
checkCompanyIds(); 