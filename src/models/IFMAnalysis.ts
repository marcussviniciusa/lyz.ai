import mongoose, { Document, Schema } from 'mongoose'

export interface IIFMAnalysis extends Document {
  _id: mongoose.Types.ObjectId
  company: mongoose.Types.ObjectId
  professional: mongoose.Types.ObjectId
  patient: mongoose.Types.ObjectId
  
  // Dados de Entrada (Os 7 Sistemas Funcionais)
  inputData: {
    // 1. Assimilação (Digestão, Absorção e Microbioma)
    assimilation: {
      digestion: string
      absorption: string
      microbiome: string
      gutHealth: string
      foodSensitivities: string[]
      digestiveSymptoms: string[]
    }
    
    // 2. Defesa e Reparo (Sistema Imune e Inflamação)
    defenseRepair: {
      immuneFunction: string
      inflammation: string
      allergies: string[]
      autoimmunity: string
      infections: string[]
      healingCapacity: string
    }
    
    // 3. Energia (Produção Mitocondrial)
    energy: {
      mitocondrialFunction: string
      oxygenUtilization: string
      metabolicEfficiency: string
      fatigueLevel: string
      energyPatterns: string
      exerciseTolerance: string
    }
    
    // 4. Biotransformação (Detoxificação)
    biotransformation: {
      phase1Detox: string
      phase2Detox: string
      environmentalExposures: string[]
      detoxSymptoms: string[]
      liverFunction: string
      toxicLoad: string
    }
    
    // 5. Transporte (Sistema Cardiovascular)
    transport: {
      cardiovascularHealth: string
      circulation: string
      bloodPressure: string
      heartRate: string
      lipidProfile: string
      vascularFunction: string
    }
    
    // 6. Comunicação (Sistema Neurológico e Endócrino)
    communication: {
      neurotransmitters: string
      hormoneBalance: string
      stressResponse: string
      sleepQuality: string
      mood: string
      cognitiveFunction: string
    }
    
    // 7. Integridade Estrutural (Músculo-esquelético)
    structuralIntegrity: {
      muscleFunction: string
      jointHealth: string
      boneHealth: string
      posture: string
      mobility: string
      structuralSymptoms: string[]
    }
  }
  
  // Resultado da Análise
  analysis: {
    // Avaliação dos Sistemas
    systemsAssessment: {
      assimilation: {
        status: 'optimal' | 'suboptimal' | 'dysfunction' | 'critical'
        score: number // 0-100
        keyIssues: string[]
        priority: 'high' | 'medium' | 'low'
      }
      defenseRepair: {
        status: 'optimal' | 'suboptimal' | 'dysfunction' | 'critical'
        score: number
        keyIssues: string[]
        priority: 'high' | 'medium' | 'low'
      }
      energy: {
        status: 'optimal' | 'suboptimal' | 'dysfunction' | 'critical'
        score: number
        keyIssues: string[]
        priority: 'high' | 'medium' | 'low'
      }
      biotransformation: {
        status: 'optimal' | 'suboptimal' | 'dysfunction' | 'critical'
        score: number
        keyIssues: string[]
        priority: 'high' | 'medium' | 'low'
      }
      transport: {
        status: 'optimal' | 'suboptional' | 'dysfunction' | 'critical'
        score: number
        keyIssues: string[]
        priority: 'high' | 'medium' | 'low'
      }
      communication: {
        status: 'optimal' | 'suboptimal' | 'dysfunction' | 'critical'
        score: number
        keyIssues: string[]
        priority: 'high' | 'medium' | 'low'
      }
      structuralIntegrity: {
        status: 'optimal' | 'suboptimal' | 'dysfunction' | 'critical'
        score: number
        keyIssues: string[]
        priority: 'high' | 'medium' | 'low'
      }
    }
    
    // Conexões Sistêmicas
    systemicConnections: {
      primaryDysfunction: string // Sistema principal disfuncional
      cascadeEffects: string[] // Efeitos em cascata
      interconnections: {
        system1: string
        system2: string
        connection: string
        impact: string
      }[]
      rootCauses: string[]
    }
    
    // Identificação de Causas Raiz
    rootCauseAnalysis: {
      primaryCauses: {
        cause: string
        affectedSystems: string[]
        evidenceLevel: 'high' | 'medium' | 'low'
        intervention: string
      }[]
      secondaryCauses: {
        cause: string
        affectedSystems: string[]
        evidenceLevel: 'high' | 'medium' | 'low'
        intervention: string
      }[]
      contributingFactors: string[]
    }
    
    // Priorização de Intervenções
    interventionPriority: {
      immediate: {
        system: string
        intervention: string
        rationale: string
        expectedOutcome: string
        timeframe: string
      }[]
      shortTerm: {
        system: string
        intervention: string
        rationale: string
        expectedOutcome: string
        timeframe: string
      }[]
      longTerm: {
        system: string
        intervention: string
        rationale: string
        expectedOutcome: string
        timeframe: string
      }[]
    }
    
    // Plano de Monitoramento
    monitoringPlan: {
      biomarkers: {
        marker: string
        system: string
        frequency: string
        targetRange: string
      }[]
      symptoms: {
        symptom: string
        system: string
        trackingMethod: string
        frequency: string
      }[]
      functionalTests: {
        test: string
        system: string
        frequency: string
        purpose: string
      }[]
    }
    
    // Síntese IFM
    ifmSynthesis: string
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

const IFMAnalysisSchema = new Schema<IIFMAnalysis>({
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
    assimilation: {
      digestion: { type: String, required: true, trim: true },
      absorption: { type: String, required: true, trim: true },
      microbiome: { type: String, required: true, trim: true },
      gutHealth: { type: String, required: true, trim: true },
      foodSensitivities: [{ type: String, trim: true }],
      digestiveSymptoms: [{ type: String, trim: true }]
    },
    
    defenseRepair: {
      immuneFunction: { type: String, required: true, trim: true },
      inflammation: { type: String, required: true, trim: true },
      allergies: [{ type: String, trim: true }],
      autoimmunity: { type: String, required: true, trim: true },
      infections: [{ type: String, trim: true }],
      healingCapacity: { type: String, required: true, trim: true }
    },
    
    energy: {
      mitocondrialFunction: { type: String, required: true, trim: true },
      oxygenUtilization: { type: String, required: true, trim: true },
      metabolicEfficiency: { type: String, required: true, trim: true },
      fatigueLevel: { type: String, required: true, trim: true },
      energyPatterns: { type: String, required: true, trim: true },
      exerciseTolerance: { type: String, required: true, trim: true }
    },
    
    biotransformation: {
      phase1Detox: { type: String, required: true, trim: true },
      phase2Detox: { type: String, required: true, trim: true },
      environmentalExposures: [{ type: String, trim: true }],
      detoxSymptoms: [{ type: String, trim: true }],
      liverFunction: { type: String, required: true, trim: true },
      toxicLoad: { type: String, required: true, trim: true }
    },
    
    transport: {
      cardiovascularHealth: { type: String, required: true, trim: true },
      circulation: { type: String, required: true, trim: true },
      bloodPressure: { type: String, required: true, trim: true },
      heartRate: { type: String, required: true, trim: true },
      lipidProfile: { type: String, required: true, trim: true },
      vascularFunction: { type: String, required: true, trim: true }
    },
    
    communication: {
      neurotransmitters: { type: String, required: true, trim: true },
      hormoneBalance: { type: String, required: true, trim: true },
      stressResponse: { type: String, required: true, trim: true },
      sleepQuality: { type: String, required: true, trim: true },
      mood: { type: String, required: true, trim: true },
      cognitiveFunction: { type: String, required: true, trim: true }
    },
    
    structuralIntegrity: {
      muscleFunction: { type: String, required: true, trim: true },
      jointHealth: { type: String, required: true, trim: true },
      boneHealth: { type: String, required: true, trim: true },
      posture: { type: String, required: true, trim: true },
      mobility: { type: String, required: true, trim: true },
      structuralSymptoms: [{ type: String, trim: true }]
    }
  },
  
  analysis: {
    systemsAssessment: {
      assimilation: {
        status: {
          type: String,
          enum: ['optimal', 'suboptimal', 'dysfunction', 'critical'],
          required: true
        },
        score: { type: Number, required: true, min: 0, max: 100 },
        keyIssues: [{ type: String, required: true }],
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          required: true
        }
      },
      defenseRepair: {
        status: {
          type: String,
          enum: ['optimal', 'suboptimal', 'dysfunction', 'critical'],
          required: true
        },
        score: { type: Number, required: true, min: 0, max: 100 },
        keyIssues: [{ type: String, required: true }],
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          required: true
        }
      },
      energy: {
        status: {
          type: String,
          enum: ['optimal', 'suboptimal', 'dysfunction', 'critical'],
          required: true
        },
        score: { type: Number, required: true, min: 0, max: 100 },
        keyIssues: [{ type: String, required: true }],
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          required: true
        }
      },
      biotransformation: {
        status: {
          type: String,
          enum: ['optimal', 'suboptimal', 'dysfunction', 'critical'],
          required: true
        },
        score: { type: Number, required: true, min: 0, max: 100 },
        keyIssues: [{ type: String, required: true }],
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          required: true
        }
      },
      transport: {
        status: {
          type: String,
          enum: ['optimal', 'suboptimal', 'dysfunction', 'critical'],
          required: true
        },
        score: { type: Number, required: true, min: 0, max: 100 },
        keyIssues: [{ type: String, required: true }],
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          required: true
        }
      },
      communication: {
        status: {
          type: String,
          enum: ['optimal', 'suboptimal', 'dysfunction', 'critical'],
          required: true
        },
        score: { type: Number, required: true, min: 0, max: 100 },
        keyIssues: [{ type: String, required: true }],
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          required: true
        }
      },
      structuralIntegrity: {
        status: {
          type: String,
          enum: ['optimal', 'suboptimal', 'dysfunction', 'critical'],
          required: true
        },
        score: { type: Number, required: true, min: 0, max: 100 },
        keyIssues: [{ type: String, required: true }],
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          required: true
        }
      }
    },
    
    systemicConnections: {
      primaryDysfunction: { type: String, required: true },
      cascadeEffects: [{ type: String }],
      interconnections: [{
        system1: { type: String, required: true },
        system2: { type: String, required: true },
        connection: { type: String, required: true },
        impact: { type: String, required: true }
      }],
      rootCauses: [{ type: String }]
    },
    
    rootCauseAnalysis: {
      primaryCauses: [{
        cause: { type: String, required: true },
        affectedSystems: [{ type: String, required: true }],
        evidenceLevel: {
          type: String,
          enum: ['high', 'medium', 'low'],
          required: true
        },
        intervention: { type: String, required: true }
      }],
      secondaryCauses: [{
        cause: { type: String, required: true },
        affectedSystems: [{ type: String, required: true }],
        evidenceLevel: {
          type: String,
          enum: ['high', 'medium', 'low'],
          required: true
        },
        intervention: { type: String, required: true }
      }],
      contributingFactors: [{ type: String }]
    },
    
    interventionPriority: {
      immediate: [{
        system: { type: String, required: true },
        intervention: { type: String, required: true },
        rationale: { type: String, required: true },
        expectedOutcome: { type: String, required: true },
        timeframe: { type: String, required: true }
      }],
      shortTerm: [{
        system: { type: String, required: true },
        intervention: { type: String, required: true },
        rationale: { type: String, required: true },
        expectedOutcome: { type: String, required: true },
        timeframe: { type: String, required: true }
      }],
      longTerm: [{
        system: { type: String, required: true },
        intervention: { type: String, required: true },
        rationale: { type: String, required: true },
        expectedOutcome: { type: String, required: true },
        timeframe: { type: String, required: true }
      }]
    },
    
    monitoringPlan: {
      biomarkers: [{
        marker: { type: String, required: true },
        system: { type: String, required: true },
        frequency: { type: String, required: true },
        targetRange: { type: String, required: true }
      }],
      symptoms: [{
        symptom: { type: String, required: true },
        system: { type: String, required: true },
        trackingMethod: { type: String, required: true },
        frequency: { type: String, required: true }
      }],
      functionalTests: [{
        test: { type: String, required: true },
        system: { type: String, required: true },
        frequency: { type: String, required: true },
        purpose: { type: String, required: true }
      }]
    },
    
    ifmSynthesis: { type: String, required: true }
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
IFMAnalysisSchema.index({ company: 1, patient: 1 })
IFMAnalysisSchema.index({ professional: 1, createdAt: -1 })
IFMAnalysisSchema.index({ status: 1 })

// Método para calcular pontuação geral IFM
IFMAnalysisSchema.methods.calculateOverallScore = function() {
  const systems = this.analysis.systemsAssessment
  const scores = [
    systems.assimilation.score,
    systems.defenseRepair.score,
    systems.energy.score,
    systems.biotransformation.score,
    systems.transport.score,
    systems.communication.score,
    systems.structuralIntegrity.score
  ]
  
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

// Método para identificar sistema mais disfuncional
IFMAnalysisSchema.methods.getMostDysfunctionalSystem = function() {
  const systems = this.analysis.systemsAssessment
  let lowestScore = 100
  let mostDysfunctional = null
  
  Object.entries(systems).forEach(([system, data]) => {
    if (data.score < lowestScore) {
      lowestScore = data.score
      mostDysfunctional = system
    }
  })
  
  return mostDysfunctional
}

export default mongoose.models.IFMAnalysis || mongoose.model<IIFMAnalysis>('IFMAnalysis', IFMAnalysisSchema) 