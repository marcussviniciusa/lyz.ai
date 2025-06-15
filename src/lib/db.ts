import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Por favor, defina a variável de ambiente MONGODB_URI no arquivo .env.local')
}

interface GlobalMongoose {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Cache simples sem usar global
let cached: GlobalMongoose = { conn: null, promise: null }

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB conectado com sucesso')
      return mongoose
    }).catch((error) => {
      console.error('Erro ao conectar com MongoDB:', error)
      throw error
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default dbConnect
export { dbConnect as connectToDatabase } 