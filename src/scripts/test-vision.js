// Script para testar Google Vision API
const { getGoogleVisionService } = require('../lib/google-vision.ts')

async function testVision() {
  try {
    console.log('🔍 Testando Google Vision API...')
    
    const visionService = getGoogleVisionService()
    
    if (!visionService.isConfigured()) {
      console.log('❌ Google Vision não configurado')
      console.log('📄 Configuração necessária em .env.local:')
      console.log('GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json')
      console.log('OU')
      console.log('GOOGLE_CLOUD_PROJECT_ID=...')
      console.log('GOOGLE_CLOUD_CLIENT_EMAIL=...')
      console.log('GOOGLE_CLOUD_PRIVATE_KEY=...')
      return
    }
    
    console.log('✅ Google Vision configurado corretamente!')
    console.log('🎯 Pronto para processar exames laboratoriais')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

testVision() 