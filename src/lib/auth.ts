import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/db'
import User from '@/models/User'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          await dbConnect()
          
          // Buscar usuário no banco de dados incluindo password explicitamente
          const user = await User.findOne({ 
            email: credentials.email.toLowerCase(),
            active: true 
          }).select('+password') // IMPORTANTE: incluir password que tem select: false

          if (!user) {
            console.log('[Auth] Usuário não encontrado:', credentials.email)
            return null
          }

          // Verificar se o usuário tem senha
          if (!user.password) {
            console.log('[Auth] Usuário sem senha:', credentials.email)
            return null
          }

          // Verificar senha
          const isValidPassword = await bcrypt.compare(credentials.password, user.password)
          if (!isValidPassword) {
            console.log('[Auth] Senha inválida para:', credentials.email)
            return null
          }

          console.log('[Auth] Login bem-sucedido para:', credentials.email)
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            company: user.company?.toString() || null,
            companyName: user.name
          }
        } catch (error) {
          console.error('[Auth] Erro na autenticação:', error)
          return null
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/login'
  },
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.company = user.company
        token.companyName = user.companyName
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ''
        session.user.role = token.role as string
        session.user.company = token.company as string
        session.user.companyName = token.companyName as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}

export default authOptions 