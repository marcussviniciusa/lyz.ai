const { MongoClient, ObjectId } = require('mongodb')

const uri = "mongodb+srv://lyz:lyz@cluster0.ybwqw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

async function createTestAnalyses() {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  try {
    await client.connect()
    console.log('Conectado ao MongoDB')

    const db = client.db('lyz')
    const analysesCollection = db.collection('analyses')
    const patientsCollection = db.collection('patients')

    // Buscar a paciente Maria Silva
    const patient = await patientsCollection.findOne({ name: 'Maria Silva' })
    if (!patient) {
      console.log('Paciente Maria Silva não encontrada')
      return
    }

    console.log('Paciente encontrada:', patient.name)

    // Análises de teste
    const testAnalyses = [
      {
        type: 'laboratory',
        description: 'Análise dos exames laboratoriais de rotina incluindo hemograma completo, perfil lipídico e hormônios reprodutivos',
        result: 'Exames indicam deficiência de ferro (ferritina: 15 ng/mL - normal >30), níveis elevados de estrogênio relativo à progesterona, sugerindo dominância estrogênica. Hemograma dentro da normalidade, exceto hemoglobina levemente baixa (11.8 g/dL).',
        recommendations: [
          'Suplementação de ferro quelado 18mg por dia em jejum',
          'Aumento do consumo de vitamina C para melhorar absorção do ferro',
          'Avaliação de possível resistência à insulina',
          'Retorno em 3 meses para reavaliação laboratorial'
        ],
        status: 'completed',
        professional: 'Dra. Ana Santos',
        patient: patient._id,
        company: patient.company,
        createdBy: patient.company,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        type: 'tcm',
        description: 'Análise segundo os princípios da Medicina Tradicional Chinesa com avaliação de língua, pulso e padrões energéticos',
        result: 'Padrão de deficiência de Qi do Baço e Estômago com estagnação de Qi do Fígado. Língua pálida com marcas dentárias, pulso fino e lento. Sintomas de TPM indicam desarmonias entre Fígado e Baço, comum em mulheres com stress elevado.',
        recommendations: [
          'Fórmula herbal: Gan Mai Da Zao Tang modificada',
          'Acupuntura nos pontos Yintang, Shenmen, Taichong e Zusanli',
          'Práticas de Qi Gong matinais para tonificar o Qi',
          'Evitar alimentos frios e crus, preferir alimentos mornos',
          'Chá de camomila e erva-cidreira antes de dormir'
        ],
        status: 'in_progress',
        professional: 'Dr. Liu Chen',
        patient: patient._id,
        company: patient.company,
        createdBy: patient.company,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-25')
      },
      {
        type: 'ifm',
        description: 'Avaliação funcional integrativa focando em desequilíbrios hormonais, inflamação sistêmica e função digestiva',
        result: 'Perfil indica disbiose intestinal leve, permeabilidade intestinal aumentada e eixo hipotálamo-hipófise-adrenal desregulado. Ratio ômega-6/ômega-3 elevado (15:1), sugerindo estado pró-inflamatório. Deficiências nutricionais: B12, vitamina D e magnésio.',
        recommendations: [
          'Protocolo de reparação intestinal com L-glutamina 5g 2x/dia',
          'Probióticos de amplo espectro por 3 meses',
          'Suplementação de vitamina D3 4000UI diária',
          'Complexo B de alta biodisponibilidade',
          'Magnésio glicinato 400mg antes de dormir',
          'Ômega-3 EPA/DHA 2g diários',
          'Dieta anti-inflamatória eliminando glúten e laticínios por 6 semanas'
        ],
        status: 'completed',
        professional: 'Dr. Roberto Martins',
        patient: patient._id,
        company: patient.company,
        createdBy: patient.company,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18')
      },
      {
        type: 'chronology',
        description: 'Análise temporal dos sintomas relacionando ciclo menstrual, alimentação, exercícios e variações de humor',
        result: 'Padrão claro de intensificação dos sintomas na fase lútea tardia (7-3 dias antes da menstruação). Correlação positiva entre consumo de açúcar/cafeína e intensidade das cólicas. Exercícios regulares reduzem significativamente os sintomas de TPM.',
        recommendations: [
          'Manter diário alimentar detalhado durante próximos 2 ciclos',
          'Reduzir gradualmente consumo de cafeína',
          'Eliminar açúcar refinado na segunda metade do ciclo',
          'Intensificar exercícios na fase folicular',
          'Yoga suave e alongamentos na fase lútea'
        ],
        status: 'pending',
        professional: 'Dra. Carolina Lima',
        patient: patient._id,
        company: patient.company,
        createdBy: patient.company,
        createdAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25')
      },
      {
        type: 'treatment',
        description: 'Plano de tratamento integrado combinando abordagens nutricionais, suplementação e mudanças de estilo de vida',
        result: 'Protocolo personalizado de 6 meses focando em equilibrio hormonal, redução da inflamação e otimização da função digestiva. Approach graduado com reavaliações mensais.',
        recommendations: [
          'Fase 1 (2 meses): Correção deficiências nutricionais e reparação intestinal',
          'Fase 2 (2 meses): Implementação dieta anti-inflamatória e exercícios',
          'Fase 3 (2 meses): Otimização hormonal e gestão do stress',
          'Consultas de acompanhamento a cada 3 semanas',
          'Reavaliação laboratorial aos 3 e 6 meses'
        ],
        status: 'in_progress',
        professional: 'Equipe Multidisciplinar',
        patient: patient._id,
        company: patient.company,
        createdBy: patient.company,
        createdAt: new Date('2024-01-28'),
        updatedAt: new Date('2024-02-01')
      }
    ]

    // Inserir as análises
    const result = await analysesCollection.insertMany(testAnalyses)
    console.log(`${result.insertedCount} análises criadas com sucesso`)

    // Mostrar as análises criadas
    const createdAnalyses = await analysesCollection.find({ 
      patient: patient._id 
    }).toArray()
    
    console.log('\nAnálises criadas:')
    createdAnalyses.forEach((analysis, index) => {
      console.log(`${index + 1}. ${analysis.type.toUpperCase()} - ${analysis.status} - ${analysis.professional}`)
    })

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await client.close()
    console.log('\nConexão encerrada')
  }
}

createTestAnalyses() 