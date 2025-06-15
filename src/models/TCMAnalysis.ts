import mongoose, { Schema, Document } from 'mongoose';

export interface ITCMAnalysis extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  professionalId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  tcmData: {
    lingualObservation: {
      color: string;
      coating: string;
      texture: string;
      moisture: string;
      size: string;
      mobility: string;
      marks: string;
    };
    pulseAnalysis: {
      rate: string;
      rhythm: string;
      strength: string;
      depth: string;
      quality: string;
      tension: string;
    };
    generalObservation: {
      complexion: string;
      eyes: string;
      voice: string;
      breathing: string;
      posture: string;
      mood: string;
    };
    symptoms: {
      sleep: string;
      digestion: string;
      appetite: string;
      thirst: string;
      urination: string;
      bowelMovement: string;
      temperature: string;
      sweating: string;
      menstruation: string;
      emotions: string;
    };
    additionalNotes: string;
  };
  analysis: {
    energeticDiagnosis: string;
    herbalRecommendations: string;
    acupuncturePoints: string;
    dietaryGuidance: string;
    fullAnalysis: string;
    metadata: any;
  };
  metadata: {
    analysisDate: Date;
    version: string;
    aiProvider: string;
    model: string;
    tokensUsed: number;
    cost: number;
    processingTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TCMAnalysisSchema = new Schema({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  professionalId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  tcmData: {
    lingualObservation: {
      color: { type: String, default: '' },
      coating: { type: String, default: '' },
      texture: { type: String, default: '' },
      moisture: { type: String, default: '' },
      size: { type: String, default: '' },
      mobility: { type: String, default: '' },
      marks: { type: String, default: '' }
    },
    pulseAnalysis: {
      rate: { type: String, default: '' },
      rhythm: { type: String, default: '' },
      strength: { type: String, default: '' },
      depth: { type: String, default: '' },
      quality: { type: String, default: '' },
      tension: { type: String, default: '' }
    },
    generalObservation: {
      complexion: { type: String, default: '' },
      eyes: { type: String, default: '' },
      voice: { type: String, default: '' },
      breathing: { type: String, default: '' },
      posture: { type: String, default: '' },
      mood: { type: String, default: '' }
    },
    symptoms: {
      sleep: { type: String, default: '' },
      digestion: { type: String, default: '' },
      appetite: { type: String, default: '' },
      thirst: { type: String, default: '' },
      urination: { type: String, default: '' },
      bowelMovement: { type: String, default: '' },
      temperature: { type: String, default: '' },
      sweating: { type: String, default: '' },
      menstruation: { type: String, default: '' },
      emotions: { type: String, default: '' }
    },
    additionalNotes: { type: String, default: '' }
  },
  analysis: {
    energeticDiagnosis: { type: String, required: true },
    herbalRecommendations: { type: String, required: true },
    acupuncturePoints: { type: String, required: true },
    dietaryGuidance: { type: String, required: true },
    fullAnalysis: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  metadata: {
    analysisDate: { type: Date, default: Date.now },
    version: { type: String, default: '1.0' },
    aiProvider: { type: String, required: true },
    model: { type: String, required: true },
    tokensUsed: { type: Number, required: true },
    cost: { type: Number, required: true },
    processingTime: { type: Number, required: true }
  }
}, {
  timestamps: true
});

// Índices para otimização de consultas
TCMAnalysisSchema.index({ patientId: 1, createdAt: -1 });
TCMAnalysisSchema.index({ professionalId: 1, createdAt: -1 });
TCMAnalysisSchema.index({ companyId: 1, createdAt: -1 });

const TCMAnalysis = mongoose.models.TCMAnalysis || mongoose.model<ITCMAnalysis>('TCMAnalysis', TCMAnalysisSchema);

export default TCMAnalysis; 