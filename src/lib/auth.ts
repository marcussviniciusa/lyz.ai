import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        // Por enquanto, uma implementação simples
        // TODO: Implementar verificação real com banco de dados
        if (credentials?.email === 'admin@lyz.ai' && credentials?.password === 'admin123') {
          return {
            id: '1',
            email: 'admin@lyz.ai',
            name: 'Admin',
            role: 'superadmin'
          }
        }
        return null
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ''
        session.user.role = token.role
        session.user.company = token.company
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}

export default authOptions 