import mongoose, { Document, Schema } from 'mongoose'

export interface IAnalysis extends Document {
  _id: mongoose.Types.ObjectId
  patient: mongoose.Types.ObjectId
  professional: mongoose.Types.ObjectId
  company: mongoose.Types.ObjectId
  
  // Tipo de análise
  type: 'laboratory' | 'tcm' | 'chronology' | 'ifm' | 'treatment'
  
  // Status da análise
  status: 'pending' | 'processing' | 'completed' | 'error'
  
  // Dados de entrada para cada tipo de análise
  inputData: {
    // Para análise laboratorial
    laboratoryFiles?: mongoose.Types.ObjectId[]
    laboratoryManualData?: string
    
    // Para análise de MTC
    tongueObservation?: {
      color: string
      coating: string
      shape: string
      moisture: string
      additionalNotes?: string
    }
    patterns?: string
    treatmentPrinciples?: string
    additionalObservations?: string
    
    // Para cronologia (dados automáticos dos outros analyses)
    
    // Para matriz IFM (dados automáticos)
    
    // Para plano de tratamento final
    professionalType?: 'medico' | 'nutricionista' | 'terapeuta' | 'outro'
    therapeuticGoals?: string[]
    patientPreferences?: string
    limitations?: string
  }
  
  // Resultado da análise
  result: {
    // Resultado bruto da IA
    rawOutput: string
    
    // Resultado estruturado por tipo
    laboratoryAnalysis?: {
      interpretation: string
      alteredValues: {
        parameter: string
        value: string
        referenceRange: string
        interpretation: string
        priority: 'low' | 'medium' | 'high'
      }[]
      functionalMedicineComparison: {
        parameter: string
        conventionalRange: string
        functionalRange: string
        status: string
      }[]
      recommendations: string[]
    }
    
    tcmAnalysis?: {
      energeticDiagnosis: string
      phytotherapyRecommendations: {
        herb: string
        dosage: string
        duration: string
        purpose: string
      }[]
      acupunctureRecommendations: {
        points: string[]
        frequency: string
        duration: string
      }
      lifestyleRecommendations: string[]
    }
    
    chronologyAnalysis?: {
      timeline: {
        date: Date
        event: string
        category: 'menstrual' | 'symptom' | 'treatment' | 'lifestyle' | 'other'
        impact: string
      }[]
      patterns: {
        pattern: string
        frequency: string
        triggers: string[]
      }[]
      criticalMoments: {
        date: Date
        event: string
        significance: string
      }[]
    }
    
    ifmAnalysis?: {
      systemsAssessment: {
        system: 'assimilation' | 'defense' | 'energy' | 'biotransformation' | 'transport' | 'communication' | 'structure'
        status: 'optimal' | 'suboptimal' | 'dysfunctional'
        findings: string[]
        priority: number
      }[]
      rootCauses: string[]
      systemicConnections: {
        primary: string
        secondary: string
        connection: string
      }[]
      treatmentPriorities: {
        priority: number
        system: string
        intervention: string
        rationale: string
      }[]
    }
    
    treatmentPlan?: {
      executiveSummary: string
      diagnosticSynthesis: string
      therapeuticObjectives: string[]
      interventions: {
        category: 'nutrition' | 'supplementation' | 'lifestyle' | 'medication' | 'therapy' | 'monitoring'
        intervention: string
        dosage?: string
        frequency?: string
        duration?: string
        rationale: string
        priority: number
      }[]
      followUpSchedule: {
        timeframe: string
        type: 'consultation' | 'exam' | 'assessment'
        objectives: string[]
      }[]
      expectedOutcomes: string[]
      contraindications: string[]
      patientGuidelines: string[]
    }
  }
  
  // Metadados da IA utilizada
  aiMetadata: {
    provider: 'openai' | 'anthropic' | 'google'
    model: string
    promptVersion: string
    tokensUsed: number
    processingTime: number
    cost: number
  }
  
  // Revisão profissional
  professionalReview?: {
    reviewed: boolean
    reviewedAt: Date
    adjustments: string
    approved: boolean
    notes: string
  }
  
  // Sistema de entrega de planos (apenas para treatment type)
  deliveryInfo?: {
    deliveredAt?: Date
    deliveryMethod?: 'email' | 'sms' | 'portal'
    deliveryMessage?: string
    deliveredBy?: mongoose.Types.ObjectId
    viewedAt?: Date
  }
  
  createdAt: Date
  updatedAt: Date
}

const AnalysisSchema = new Schema<IAnalysis>({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  professional: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  type: {
    type: String,
    enum: ['laboratory', 'tcm', 'chronology', 'ifm', 'treatment'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'error'],
    default: 'pending'
  },
  inputData: {
    laboratoryFiles: [{
      type: Schema.Types.ObjectId,
      ref: 'Document'
    }],
    laboratoryManualData: String,
    tongueObservation: {
      color: String,
      coating: String,
      shape: String,
      moisture: String,
      additionalNotes: String
    },
    patterns: String,
    treatmentPrinciples: String,
    additionalObservations: String,
    professionalType: {
      type: String,
      enum: ['medico', 'nutricionista', 'terapeuta', 'outro']
    },
    therapeuticGoals: [String],
    patientPreferences: String,
    limitations: String
  },
  result: {
    rawOutput: String,
    laboratoryAnalysis: {
      interpretation: String,
      alteredValues: [{
        parameter: String,
        value: String,
        referenceRange: String,
        interpretation: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high']
        }
      }],
      functionalMedicineComparison: [{
        parameter: String,
        conventionalRange: String,
        functionalRange: String,
        status: String
      }],
      recommendations: [String]
    },
    tcmAnalysis: {
      energeticDiagnosis: String,
      phytotherapyRecommendations: [{
        herb: String,
        dosage: String,
        duration: String,
        purpose: String
      }],
      acupunctureRecommendations: {
        points: [String],
        frequency: String,
        duration: String
      },
      lifestyleRecommendations: [String]
    },
    chronologyAnalysis: {
      timeline: [{
        date: Date,
        event: String,
        category: {
          type: String,
          enum: ['menstrual', 'symptom', 'treatment', 'lifestyle', 'other']
        },
        impact: String
      }],
      patterns: [{
        pattern: String,
        frequency: String,
        triggers: [String]
      }],
      criticalMoments: [{
        date: Date,
        event: String,
        significance: String
      }]
    },
    ifmAnalysis: {
      systemsAssessment: [{
        system: {
          type: String,
          enum: ['assimilation', 'defense', 'energy', 'biotransformation', 'transport', 'communication', 'structure']
        },
        status: {
          type: String,
          enum: ['optimal', 'suboptimal', 'dysfunctional']
        },
        findings: [String],
        priority: Number
      }],
      rootCauses: [String],
      systemicConnections: [{
        primary: String,
        secondary: String,
        connection: String
      }],
      treatmentPriorities: [{
        priority: Number,
        system: String,
        intervention: String,
        rationale: String
      }]
    },
    treatmentPlan: {
      executiveSummary: String,
      diagnosticSynthesis: String,
      therapeuticObjectives: [String],
      interventions: [{
        category: {
          type: String,
          enum: ['nutrition', 'supplementation', 'lifestyle', 'medication', 'therapy', 'monitoring']
        },
        intervention: String,
        dosage: String,
        frequency: String,
        duration: String,
        rationale: String,
        priority: Number
      }],
      followUpSchedule: [{
        timeframe: String,
        type: {
          type: String,
          enum: ['consultation', 'exam', 'assessment']
        },
        objectives: [String]
      }],
      expectedOutcomes: [String],
      contraindications: [String],
      patientGuidelines: [String]
    }
  },
  aiMetadata: {
    provider: {
      type: String,
      enum: ['openai', 'anthropic', 'google'],
      required: true
    },
    model: {
      type: String,
      required: true
    },
    promptVersion: {
      type: String,
      required: true
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    processingTime: {
      type: Number,
      default: 0
    },
    cost: {
      type: Number,
      default: 0
    }
  },
  professionalReview: {
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedAt: Date,
    adjustments: String,
    approved: {
      type: Boolean,
      default: false
    },
    notes: String
  },
  deliveryInfo: {
    deliveredAt: Date,
    deliveryMethod: {
      type: String,
      enum: ['email', 'sms', 'portal']
    },
    deliveryMessage: String,
    deliveredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: Date
  }
}, {
  timestamps: true
})

// Índices
AnalysisSchema.index({ patient: 1, type: 1 })
AnalysisSchema.index({ professional: 1, company: 1 })
AnalysisSchema.index({ status: 1 })
AnalysisSchema.index({ createdAt: -1 })
AnalysisSchema.index({ type: 1, status: 1 })

export default mongoose.models.Analysis || mongoose.model<IAnalysis>('Analysis', AnalysisSchema) 