import type { Metadata, Viewport } from 'next'
import Providers from '@/components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'lyz.ai - Plataforma de Saúde Feminina',
  description: 'Plataforma digital para profissionais de saúde especializados em saúde feminina e ciclicidade',
  keywords: ['saúde feminina', 'medicina funcional', 'inteligência artificial', 'ciclicidade'],
  authors: [{ name: 'lyz.ai Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full bg-gray-50">
        <Providers>
          <div className="min-h-full">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
} 