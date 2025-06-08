import mongoose, { Document, Schema } from 'mongoose'

export interface IPatient extends Document {
  _id: mongoose.Types.ObjectId
  company: mongoose.Types.ObjectId
  professional: mongoose.Types.ObjectId
  
  // Informações Básicas
  name: string
  age: number
  height?: number
  weight?: number
  
  // Histórico Menstrual
  menstrualHistory?: {
    menarche: number // idade da menarca
    cycleLength: number // duração do ciclo em dias
    menstruationLength: number // duração da menstruação em dias
    lastMenstruation: Date
    menopausalStatus: 'pre' | 'peri' | 'post'
    contraceptiveUse?: string
  }
  
  // Sintomas Principais (até 5)
  mainSymptoms: {
    symptom: string
    priority: number // 1-5
  }[]
  
  // Histórico Médico
  medicalHistory: {
    personalHistory: string
    familyHistory: string
    allergies: string[]
    previousTreatments: string[]
  }
  
  // Medicamentos e Suplementos
  medications: {
    name: string
    dosage: string
    frequency: string
    type: 'medication' | 'supplement'
  }[]
  
  // Estilo de Vida
  lifestyle: {
    sleepQuality: 'good' | 'regular' | 'poor'
    sleepHours: number
    exerciseFrequency: 'none' | 'occasional' | 'regular' | 'daily'
    exerciseType?: string
    stressLevel: 'low' | 'moderate' | 'high'
    nutritionQuality: 'good' | 'regular' | 'poor'
    relationshipQuality: 'good' | 'regular' | 'poor'
  }
  
  // Objetivos do Tratamento
  treatmentGoals: {
    goals: string[]
    expectations: string
    additionalNotes?: string
  }
  
  // Status
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const PatientSchema = new Schema<IPatient>({
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  professional: {
    type: Schema.Types.ObjectId,
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
      min: [8, 'Idade da menarca muito baixa'],
      max: [18, 'Idade da menarca muito alta']
    },
    cycleLength: {
      type: Number,
      min: [21, 'Ciclo muito curto'],
      max: [45, 'Ciclo muito longo']
    },
    menstruationLength: {
      type: Number,
      min: [1, 'Duração da menstruação muito curta'],
      max: [10, 'Duração da menstruação muito longa']
    },
    lastMenstruation: {
      type: Date
    },
    menopausalStatus: {
      type: String,
      enum: ['pre', 'peri', 'post']
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
      
      trim: true
    },
    familyHistory: {
      type: String,
      
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
      
      trim: true
    },
    dosage: {
      type: String,
      
      trim: true
    },
    frequency: {
      type: String,
      
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
      
      trim: true
    }],
    expectations: {
      type: String,
      
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

// Índices
PatientSchema.index({ company: 1, professional: 1 })
PatientSchema.index({ name: 1 })
PatientSchema.index({ isActive: 1 })
PatientSchema.index({ createdAt: -1 })

// Validação para limitar sintomas a 5
PatientSchema.pre('save', function(next) {
  if (this.mainSymptoms.length > 5) {
    return next(new Error('Máximo de 5 sintomas principais permitidos'))
  }
  next()
})

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema) 