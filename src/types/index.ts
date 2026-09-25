export type Role = 'student' | 'faculty' | 'admin';

export type RiskLevel = 'Low Risk' | 'Medium Risk' | 'High Risk';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  studentId?: string;
  department?: string;
  avatar?: string;
}

export interface StudentFeatureData {
  studentId: string;
  studentName: string;
  department: string;
  academicYear: number; // 1 to 4
  semester: number; // 1 to 8
  attendancePercentage: number; // 0 - 100
  internalMarks: number; // 0 - 100
  assignmentPerformance: number; // 0 - 100
  studyHoursPerWeek: number; // 0 - 60
  previousGpa: number; // 0.0 - 10.0
  quizAverage: number; // 0 - 100
  lateSubmissions: number; // 0+
  learningActivityScore: number; // 0 - 100
  lmsParticipation: number; // 0 - 100
  previousSemesterScore: number; // 0 - 100
  finalScore?: number; // Ground truth or historical (0 - 100)
}

export interface EngineeredFeatures {
  attendanceInternalInteraction: number;
  engagementIndex: number;
  studyEfficiencyScore: number;
  submissionPressureScore: number;
  academicConsistencyScore: number;
  learningActivityTrend: number;
  normalizedGpa: number;
  performanceAverage: number;
}

export interface Student extends StudentFeatureData {
  id: string;
  email: string;
  enrollmentDate: string;
  phone?: string;
  currentRiskLevel: RiskLevel;
  latestPredictedScore: number;
  latestPredictionDate?: string;
  mentorName?: string;
}

export interface ExplanationFeature {
  featureName: string;
  displayName: string;
  inputValue: number | string;
  impactValue: number; // in score points (+/-)
  direction: 'Positive' | 'Negative' | 'Neutral';
  explanationMethod: 'SHAP' | 'LIME' | 'PerturbationFallback';
  humanDescription: string;
}

export interface PredictionExplanation {
  shapBaseValue: number;
  shapFeatures: ExplanationFeature[];
  limeIntercept: number;
  limeFeatures: ExplanationFeature[];
  methodUsed: 'SHAP' | 'LIME' | 'Ensemble';
  disclaimer: string;
}

export interface Recommendation {
  id: string;
  studentId: string;
  recommendationArea: string;
  actionText: string;
  priority: 'High' | 'Medium' | 'Low';
  reason: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PredictionResult {
  id: string;
  studentId: string;
  studentName: string;
  predictedScore: number;
  riskLevel: RiskLevel;
  riskProbability: number; // 0.0 to 1.0
  selectedModelName: string;
  modelVersion: string;
  featuresUsed: StudentFeatureData;
  engineeredFeatures: EngineeredFeatures;
  explanations: PredictionExplanation;
  recommendations: Recommendation[];
  predictionTimestamp: string;
}

export interface Intervention {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  facultyId: string;
  facultyName: string;
  interventionType: 'Academic Mentoring' | 'Attendance Plan' | 'Assignment Extension' | 'Counseling' | 'Peer Tutoring' | 'Honors Program';
  notes: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Follow-up Needed';
  createdAt: string;
  updatedAt: string;
}

export interface ModelMetricComparison {
  modelName: string;
  algorithm: 'Random Forest' | 'XGBoost' | 'LightGBM' | 'CatBoost';
  isBestModel: boolean;
  mae: number;
  rmse: number;
  r2: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingDurationSec: number;
  parameters: Record<string, any>;
}

export type ModelMetrics = ModelMetricComparison;

export interface ModelEvaluationReport {
  modelVersion: string;
  trainingTimestamp: string;
  timestamp?: string;
  datasetSize: number;
  trainSplitSize: number;
  testSplitSize: number;
  testSize?: number;
  bestModelName: string;
  selectionCriteria: string;
  models: ModelMetricComparison[];
  metrics?: ModelMetricComparison[];
  globalFeatureImportance: { feature: string; importance: number; description: string }[];
  confusionMatrix: {
    labels: string[];
    matrix: number[][]; // [actual][predicted]
  };
  featuresList: string[];
}

export interface DashboardSummary {
  totalStudents: number;
  averagePredictedScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageAttendance: number;
  averageStudyHours: number;
  interventionsActive: number;
  departmentBreakdown: {
    department: string;
    studentCount: number;
    avgScore: number;
    highRiskCount: number;
  }[];
  recentPredictions: PredictionResult[];
  recentInterventions: Intervention[];
  watchlistStudents: Student[];
}

export interface NotificationItem {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}
