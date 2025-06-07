import mongoose, { Document, Schema } from 'mongoose'

export interface IChronologyAnalysis extends Document {
  _id: mongoose.Types.ObjectId
  company: mongoose.Types.ObjectId
  professional: mongoose.Types.ObjectId
  patient: mongoose.Types.ObjectId
  
  // Dados de Entrada
  inputData: {
    // Timeline de eventos
    lifeEvents: {
      date: Date
      category: 'medical' | 'hormonal' | 'emotional' | 'lifestyle' | 'relationship' | 'professional'
      description: string
      severity: 'low' | 'moderate' | 'high' | 'very-high'
      impact: string
    }[]
    
    // Histórico menstrual detalhado
    menstrualHistory: {
      menarche: Date
      cyclePattern: string
      irregularities: {
        date: Date
        description: string
        possibleCause?: string
      }[]
      contraceptiveHistory: {
        startDate: Date
        endDate?: Date
        type: string
        sideEffects?: string
      }[]
    }
    
    // Sintomas ao longo do tempo
    symptomEvolution: {
      symptom: string
      firstAppearance: Date
      progression: 'improving' | 'stable' | 'worsening' | 'fluctuating'
      triggers?: string[]
      relievingFactors?: string[]
    }[]
    
    // Tratamentos e intervenções
    treatmentHistory: {
      startDate: Date
      endDate?: Date
      treatment: string
      practitioner: string
      effectiveness: 'very-effective' | 'effective' | 'minimal' | 'ineffective' | 'worsened'
      sideEffects?: string
    }[]
  }
  
  // Resultado da Análise
  analysis: {
    // Timeline consolidada
    consolidatedTimeline: {
      period: string
      phase: string
      keyEvents: string[]
      hormonalChanges: string[]
      symptomChanges: string[]
      treatmentResponses: string[]
    }[]
    
    // Padrões identificados
    patterns: {
      cyclicalPatterns: {
        pattern: string
        frequency: string
        description: string
        relatedHormones: string[]
      }[]
      
      triggerPatterns: {
        trigger: string
        symptoms: string[]
        timeframe: string
        mechanism: string
      }[]
      
      treatmentPatterns: {
        treatment: string
        responseTime: string
        effectiveness: string
        bestResponders: string
      }[]
    }
    
    // Momentos críticos
    criticalMoments: {
      date: Date
      event: string
      impact: string
      cascadeEffects: string[]
      recommendedIntervention: string
    }[]
    
    // Correlações hormonais
    hormonalCorrelations: {
      hormone: string
      lifePhase: string
      symptoms: string[]
      interventions: string[]
    }[]
    
    // Prognóstico temporal
    temporalPrognosis: {
      shortTerm: string // 3-6 meses
      mediumTerm: string // 6-12 meses
      longTerm: string // 1-2 anos
      keyMilestones: string[]
    }
    
    // Janelas terapêuticas
    therapeuticWindows: {
      period: string
      opportunity: string
      recommendedActions: string[]
      expectedOutcomes: string
    }[]
    
    // Síntese cronológica
    chronologicalSynthesis: string
  }
  
  // Metadados de IA
  aiMetadata: {
    model: string
    provider: 'openai' | 'anthropic' | 'google'
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cost: number
    processingTime: number // em segundos
    temperature: number
    reasoning: string
  }
  
  // Status e Revisão
  status: 'draft' | 'completed' | 'reviewed' | 'approved'
  professionalReview?: {
    reviewedBy: mongoose.Types.ObjectId
    reviewDate: Date
    notes: string
    approved: boolean
  }
  
  createdAt: Date
  updatedAt: Date
}

const ChronologyAnalysisSchema = new Schema<IChronologyAnalysis>({
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
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  
  inputData: {
    lifeEvents: [{
      date: { type: Date, required: true },
      category: {
        type: String,
        enum: ['medical', 'hormonal', 'emotional', 'lifestyle', 'relationship', 'professional'],
        required: true
      },
      description: { type: String, required: true, trim: true },
      severity: {
        type: String,
        enum: ['low', 'moderate', 'high', 'very-high'],
        required: true
      },
      impact: { type: String, required: true, trim: true }
    }],
    
    menstrualHistory: {
      menarche: { type: Date, required: true },
      cyclePattern: { type: String, required: true, trim: true },
      irregularities: [{
        date: { type: Date, required: true },
        description: { type: String, required: true, trim: true },
        possibleCause: { type: String, trim: true }
      }],
      contraceptiveHistory: [{
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        type: { type: String, required: true, trim: true },
        sideEffects: { type: String, trim: true }
      }]
    },
    
    symptomEvolution: [{
      symptom: { type: String, required: true, trim: true },
      firstAppearance: { type: Date, required: true },
      progression: {
        type: String,
        enum: ['improving', 'stable', 'worsening', 'fluctuating'],
        required: true
      },
      triggers: [{ type: String, trim: true }],
      relievingFactors: [{ type: String, trim: true }]
    }],
    
    treatmentHistory: [{
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      treatment: { type: String, required: true, trim: true },
      practitioner: { type: String, required: true, trim: true },
      effectiveness: {
        type: String,
        enum: ['very-effective', 'effective', 'minimal', 'ineffective', 'worsened'],
        required: true
      },
      sideEffects: { type: String, trim: true }
    }]
  },
  
  analysis: {
    consolidatedTimeline: [{
      period: { type: String, required: true },
      phase: { type: String, required: true },
      keyEvents: [{ type: String, required: true }],
      hormonalChanges: [{ type: String }],
      symptomChanges: [{ type: String }],
      treatmentResponses: [{ type: String }]
    }],
    
    patterns: {
      cyclicalPatterns: [{
        pattern: { type: String, required: true },
        frequency: { type: String, required: true },
        description: { type: String, required: true },
        relatedHormones: [{ type: String }]
      }],
      
      triggerPatterns: [{
        trigger: { type: String, required: true },
        symptoms: [{ type: String, required: true }],
        timeframe: { type: String, required: true },
        mechanism: { type: String, required: true }
      }],
      
      treatmentPatterns: [{
        treatment: { type: String, required: true },
        responseTime: { type: String, required: true },
        effectiveness: { type: String, required: true },
        bestResponders: { type: String, required: true }
      }]
    },
    
    criticalMoments: [{
      date: { type: Date, required: true },
      event: { type: String, required: true },
      impact: { type: String, required: true },
      cascadeEffects: [{ type: String }],
      recommendedIntervention: { type: String, required: true }
    }],
    
    hormonalCorrelations: [{
      hormone: { type: String, required: true },
      lifePhase: { type: String, required: true },
      symptoms: [{ type: String }],
      interventions: [{ type: String }]
    }],
    
    temporalPrognosis: {
      shortTerm: { type: String, required: true },
      mediumTerm: { type: String, required: true },
      longTerm: { type: String, required: true },
      keyMilestones: [{ type: String }]
    },
    
    therapeuticWindows: [{
      period: { type: String, required: true },
      opportunity: { type: String, required: true },
      recommendedActions: [{ type: String }],
      expectedOutcomes: { type: String, required: true }
    }],
    
    chronologicalSynthesis: { type: String, required: true }
  },
  
  aiMetadata: {
    model: { type: String, required: true },
    provider: {
      type: String,
      enum: ['openai', 'anthropic', 'google'],
      required: true
    },
    promptTokens: { type: Number, required: true },
    completionTokens: { type: Number, required: true },
    totalTokens: { type: Number, required: true },
    cost: { type: Number, required: true },
    processingTime: { type: Number, required: true },
    temperature: { type: Number, required: true },
    reasoning: { type: String, required: true }
  },
  
  status: {
    type: String,
    enum: ['draft', 'completed', 'reviewed', 'approved'],
    default: 'draft'
  },
  
  professionalReview: {
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewDate: { type: Date },
    notes: { type: String, trim: true },
    approved: { type: Boolean }
  }
}, {
  timestamps: true
})

// Índices para otimização
ChronologyAnalysisSchema.index({ company: 1, patient: 1 })
ChronologyAnalysisSchema.index({ professional: 1, createdAt: -1 })
ChronologyAnalysisSchema.index({ status: 1 })

// Método para calcular pontuação de padrões
ChronologyAnalysisSchema.methods.calculatePatternScore = function() {
  const cyclicalCount = this.analysis.patterns.cyclicalPatterns.length
  const triggerCount = this.analysis.patterns.triggerPatterns.length
  const treatmentCount = this.analysis.patterns.treatmentPatterns.length
  const criticalCount = this.analysis.criticalMoments.length
  
  return (cyclicalCount * 3) + (triggerCount * 2) + (treatmentCount * 2) + (criticalCount * 1)
}

export default mongoose.models.ChronologyAnalysis || mongoose.model<IChronologyAnalysis>('ChronologyAnalysis', ChronologyAnalysisSchema) 