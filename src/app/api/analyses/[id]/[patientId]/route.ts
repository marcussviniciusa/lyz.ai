import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Analysis from '@/models/Analysis'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; patientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await dbConnect()

    const resolvedParams = await params
    const analysis = await Analysis.findById(resolvedParams.id)
      .populate('patient', 'name email')
      .populate('professional', 'name email')

    if (!analysis) {
      return Response.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    return Response.json({
      success: true,
      analysis
    })

  } catch (error) {
    console.error('Erro ao buscar análise:', error)
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 