const mongoose = require('mongoose')
const path = require('path')

// Configurar caminhos para importar modelos
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') })

console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Carregado' : 'Não encontrado')

// Schema do paciente baseado no modelo atual
const PatientSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  professional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Nome da paciente é obrigatório'],
    trim: true,
    maxlength: [200, 'Nome não pode ter mais de 200 caracteres']
  },
  age: {
    type: Number,
    required: [true, 'Idade é obrigatória'],
    min: [0, 'Idade deve ser positiva'],
    max: [120, 'Idade inválida']
  },
  height: {
    type: Number,
    min: [0, 'Altura deve ser positiva'],
    max: [300, 'Altura inválida']
  },
  weight: {
    type: Number,
    min: [0, 'Peso deve ser positivo'],
    max: [500, 'Peso inválido']
  },
  menstrualHistory: {
    menarche: {
      type: Number,
      required: true,
      min: [8, 'Idade da menarca muito baixa'],
      max: [18, 'Idade da menarca muito alta']
    },
    cycleLength: {
      type: Number,
      required: true,
      min: [21, 'Ciclo muito curto'],
      max: [45, 'Ciclo muito longo']
    },
    menstruationLength: {
      type: Number,
      required: true,
      min: [1, 'Duração da menstruação muito curta'],
      max: [10, 'Duração da menstruação muito longa']
    },
    lastMenstruation: {
      type: Date,
      required: true
    },
    menopausalStatus: {
      type: String,
      enum: ['pre', 'peri', 'post'],
      required: true
    },
    contraceptiveUse: {
      type: String,
      trim: true
    }
  },
  mainSymptoms: [{
    symptom: {
      type: String,
      required: true,
      trim: true
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  }],
  medicalHistory: {
    personalHistory: {
      type: String,
      required: true,
      trim: true
    },
    familyHistory: {
      type: String,
      required: true,
      trim: true
    },
    allergies: [{
      type: String,
      trim: true
    }],
    previousTreatments: [{
      type: String,
      trim: true
    }]
  },
  medications: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    dosage: {
      type: String,
      required: true,
      trim: true
    },
    frequency: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['medication', 'supplement'],
      required: true
    }
  }],
  lifestyle: {
    sleepQuality: {
      type: String,
      enum: ['good', 'regular', 'poor'],
      required: true
    },
    sleepHours: {
      type: Number,
      required: true,
      min: 0,
      max: 24
    },
    exerciseFrequency: {
      type: String,
      enum: ['none', 'occasional', 'regular', 'daily'],
      required: true
    },
    exerciseType: {
      type: String,
      trim: true
    },
    stressLevel: {
      type: String,
      enum: ['low', 'moderate', 'high'],
      required: true
    },
    nutritionQuality: {
      type: String,
      enum: ['good', 'regular', 'poor'],
      required: true
    },
    relationshipQuality: {
      type: String,
      enum: ['good', 'regular', 'poor'],
      required: true
    }
  },
  treatmentGoals: {
    goals: [{
      type: String,
      required: true,
      trim: true
    }],
    expectations: {
      type: String,
      required: true,
      trim: true
    },
    additionalNotes: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

const Patient = mongoose.models.Patient || mongoose.model('Patient', PatientSchema)

async function createTestPatient() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lyzai')
    console.log('✅ Conectado ao MongoDB')

    // Criar ObjectIds de teste
    const companyId = new mongoose.Types.ObjectId()
    const professionalId = new mongoose.Types.ObjectId()

    const testPatient = {
      company: companyId,
      professional: professionalId,
      name: 'Maria Silva',
      age: 32,
      height: 165,
      weight: 62,
      menstrualHistory: {
        menarche: 12,
        cycleLength: 28,
        menstruationLength: 5,
        lastMenstruation: new Date('2024-05-15'),
        menopausalStatus: 'pre',
        contraceptiveUse: 'Anticoncepcional oral'
      },
      mainSymptoms: [
        { symptom: 'Dores de cabeça frequentes', priority: 1 },
        { symptom: 'Cólicas menstruais intensas', priority: 2 },
        { symptom: 'Fadiga constante', priority: 3 }
      ],
      medicalHistory: {
        personalHistory: 'Sem histórico de doenças graves. Alergia a aspirina.',
        familyHistory: 'Mãe com hipertensão, avó materna com diabetes tipo 2.',
        allergies: ['Aspirina', 'Frutos do mar'],
        previousTreatments: ['Fisioterapia para dores nas costas', 'Tratamento para ansiedade']
      },
      medications: [
        {
          name: 'Anticoncepcional Yasmin',
          dosage: '1 comprimido',
          frequency: 'Diário',
          type: 'medication'
        },
        {
          name: 'Vitamina D',
          dosage: '2000 UI',
          frequency: 'Diário',
          type: 'supplement'
        }
      ],
      lifestyle: {
        sleepQuality: 'regular',
        sleepHours: 7,
        exerciseFrequency: 'occasional',
        exerciseType: 'Caminhada e yoga',
        stressLevel: 'moderate',
        nutritionQuality: 'good',
        relationshipQuality: 'good'
      },
      treatmentGoals: {
        goals: [
          'Reduzir dores de cabeça',
          'Melhorar qualidade do sono',
          'Diminuir cólicas menstruais'
        ],
        expectations: 'Espero ter mais energia e menos dores no dia a dia.',
        additionalNotes: 'Prefere tratamentos naturais quando possível.'
      },
      isActive: true
    }

    const patient = new Patient(testPatient)
    const savedPatient = await patient.save()

    console.log('✅ Paciente de teste criado com sucesso!')
    console.log('ID:', savedPatient._id.toString())
    console.log('Nome:', savedPatient.name)
    console.log('Idade:', savedPatient.age)

    console.log('\n🔗 URL para testar:')
    console.log(`http://localhost:3000/patients/${savedPatient._id}`)

    return savedPatient

  } catch (error) {
    console.error('❌ Erro ao criar paciente de teste:', error)
  } finally {
    await mongoose.disconnect()
    console.log('✅ Desconectado do MongoDB')
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  createTestPatient()
}

module.exports = { createTestPatient } 