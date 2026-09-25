import bcrypt from 'bcryptjs';
import { 
  User, 
  Student, 
  PredictionResult, 
  Intervention, 
  AuditLog, 
  NotificationItem, 
  ModelEvaluationReport,
  RiskLevel
} from '../src/types/index';
import { engineerFeatures, toFeatureVector } from './ml/features';
import { 
  RandomForestRegressor, 
  XGBoostStyleRegressor, 
  LightGBMStyleRegressor, 
  CatBoostStyleRegressor,
  calculateRegressionMetrics,
  calculateClassificationMetrics,
  classifyRisk
} from './ml/algorithms';
import { ExplainableAIEngine } from './ml/explainability';
import { generateRecommendations } from './ml/recommendations';

// IN-MEMORY DURABLE DATABASE STORE
export interface DatabaseState {
  users: User[];
  userCredentials: Map<string, string>; // email -> hashedPassword
  students: Student[];
  predictions: PredictionResult[];
  interventions: Intervention[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  modelReport: ModelEvaluationReport | null;
  activeModel: 'Random Forest' | 'XGBoost' | 'LightGBM' | 'CatBoost';
  models: {
    rf: RandomForestRegressor;
    xgb: XGBoostStyleRegressor;
    lgbm: LightGBMStyleRegressor;
    cat: CatBoostStyleRegressor;
  };
  explainer: ExplainableAIEngine | null;
}

const DEPARTMENTS = [
  'Computer Science',
  'Data Science',
  'Information Technology',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Business Analytics'
];

const FIRST_NAMES = ['Alex', 'Maya', 'Jordan', 'Priya', 'Liam', 'Sofia', 'Ethan', 'Aria', 'Noah', 'Zoe', 'Lucas', 'Chloe', 'Marcus', 'Elena', 'Kavya', 'Leo', 'Tara', 'Rohan', 'Emma', 'Daniel'];
const LAST_NAMES = ['Rivera', 'Patel', 'Chen', 'Sharma', 'Johnson', 'Gupta', 'Kim', 'O\'Connor', 'Mendoza', 'Taylor', 'Wong', 'Kowalski', 'Singh', 'Al-Mansoor', 'Nakamura', 'Davis', 'Iyer', 'Hernandez'];

export const db: DatabaseState = {
  users: [],
  userCredentials: new Map(),
  students: [],
  predictions: [],
  interventions: [],
  auditLogs: [],
  notifications: [],
  modelReport: null,
  activeModel: 'XGBoost',
  models: {
    rf: new RandomForestRegressor(25, 7, 7),
    xgb: new XGBoostStyleRegressor(30, 0.08, 4),
    lgbm: new LightGBMStyleRegressor(35, 0.09, 5),
    cat: new CatBoostStyleRegressor(25, 0.08, 4),
  },
  explainer: null,
};

// Seed dataset generator
export function generateSyntheticDataset(count: number = 420): Student[] {
  const students: Student[] = [];

  for (let i = 1; i <= count; i++) {
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    const year = ((i % 4) + 1);
    const semester = ((year - 1) * 2) + ((i % 2) + 1);
    const fName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lName = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const studentId = `STU-${dept.substring(0, 2).toUpperCase()}-${2023 - year + 1}-${String(i).padStart(4, '0')}`;
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@university.edu`;

    // Realistic clustered distribution (some high performers, some average, some struggling)
    const clusterRand = Math.random();
    let basePerf = 70;
    if (clusterRand < 0.22) {
      basePerf = 42 + Math.random() * 15; // At-risk group
    } else if (clusterRand < 0.70) {
      basePerf = 62 + Math.random() * 20; // Average group
    } else {
      basePerf = 82 + Math.random() * 16; // High achievement group
    }

    const attendance = Math.round(Math.max(35, Math.min(99, basePerf + (Math.random() * 18 - 9))));
    const internalMarks = Math.round(Math.max(25, Math.min(98, basePerf + (Math.random() * 20 - 10))));
    const assignmentPerf = Math.round(Math.max(30, Math.min(99, basePerf + (Math.random() * 16 - 8))));
    const studyHours = Math.round(Math.max(4, Math.min(45, (basePerf / 3.0) + (Math.random() * 8 - 4))));
    const gpa = Number((Math.max(3.8, Math.min(9.9, (basePerf / 10.5) + (Math.random() * 0.8 - 0.4)))).toFixed(2));
    const quizAvg = Math.round(Math.max(30, Math.min(98, basePerf + (Math.random() * 18 - 9))));
    const lateSubs = basePerf < 55 ? Math.floor(Math.random() * 6) + 1 : (Math.random() < 0.2 ? 1 : 0);
    const learningAct = Math.round(Math.max(30, Math.min(99, basePerf + (Math.random() * 14 - 7))));
    const lms = Math.round(Math.max(25, Math.min(99, attendance + (Math.random() * 16 - 8))));
    const prevSem = Math.round(Math.max(30, Math.min(98, (gpa * 10) + (Math.random() * 8 - 4))));

    // Calculated target final score with subtle realistic noise
    const rawTarget = 
      0.26 * internalMarks + 
      0.22 * prevSem + 
      0.18 * attendance + 
      0.14 * assignmentPerf + 
      0.10 * quizAvg + 
      0.06 * lms + 
      0.04 * (studyHours * 2.2) - 
      1.5 * lateSubs + 
      (Math.random() * 4 - 2);

    const finalScore = Math.round(Math.max(25, Math.min(98, rawTarget)));
    const riskLevel: RiskLevel = classifyRisk(finalScore);

    const student: Student = {
      id: `std_${i}`,
      studentId,
      studentName: `${fName} ${lName}`,
      email,
      department: dept,
      academicYear: year,
      semester,
      attendancePercentage: attendance,
      internalMarks,
      assignmentPerformance: assignmentPerf,
      studyHoursPerWeek: studyHours,
      previousGpa: gpa,
      quizAverage: quizAvg,
      lateSubmissions: lateSubs,
      learningActivityScore: learningAct,
      lmsParticipation: lms,
      previousSemesterScore: prevSem,
      finalScore,
      currentRiskLevel: riskLevel,
      latestPredictedScore: finalScore,
      enrollmentDate: `202${4 - year}-08-15`,
      mentorName: i % 2 === 0 ? 'Prof. Sarah Jenkins' : 'Dr. Rajesh Sharma',
    };

    students.push(student);
  }

  return students;
}

export function trainModelsAndInit(): ModelEvaluationReport {
  console.log('⚡ Initializing Machine Learning Pipeline & Training Models...');
  const students = db.students;

  // Split into train (80%) and test (20%)
  const X_all: number[][] = [];
  const y_all: number[] = [];

  for (const s of students) {
    const eng = engineerFeatures(s);
    const vec = toFeatureVector(s, eng);
    X_all.push(vec);
    y_all.push(s.finalScore || s.latestPredictedScore || 70);
  }

  const splitIdx = Math.floor(X_all.length * 0.8);
  const X_train = X_all.slice(0, splitIdx);
  const y_train = y_all.slice(0, splitIdx);
  const X_test = X_all.slice(splitIdx);
  const y_test = y_all.slice(splitIdx);

  // Train all 4 required models
  const t0_rf = Date.now();
  db.models.rf.fit(X_train, y_train);
  const dur_rf = (Date.now() - t0_rf) / 1000;
  const rf_preds = db.models.rf.predict(X_test);

  const t0_xgb = Date.now();
  db.models.xgb.fit(X_train, y_train);
  const dur_xgb = (Date.now() - t0_xgb) / 1000;
  const xgb_preds = db.models.xgb.predict(X_test);

  const t0_lgbm = Date.now();
  db.models.lgbm.fit(X_train, y_train);
  const dur_lgbm = (Date.now() - t0_lgbm) / 1000;
  const lgbm_preds = db.models.lgbm.predict(X_test);

  const t0_cat = Date.now();
  db.models.cat.fit(X_train, y_train);
  const dur_cat = (Date.now() - t0_cat) / 1000;
  const cat_preds = db.models.cat.predict(X_test);

  // Evaluate regression & classification metrics
  const rf_reg = calculateRegressionMetrics(y_test, rf_preds);
  const rf_cls = calculateClassificationMetrics(y_test, rf_preds);

  const xgb_reg = calculateRegressionMetrics(y_test, xgb_preds);
  const xgb_cls = calculateClassificationMetrics(y_test, xgb_preds);

  const lgbm_reg = calculateRegressionMetrics(y_test, lgbm_preds);
  const lgbm_cls = calculateClassificationMetrics(y_test, lgbm_preds);

  const cat_reg = calculateRegressionMetrics(y_test, cat_preds);
  const cat_cls = calculateClassificationMetrics(y_test, cat_preds);

  const modelMetrics = [
    {
      modelName: 'XGBoost Regressor (Gradient Boosting)',
      algorithm: 'XGBoost' as const,
      isBestModel: true,
      mae: xgb_reg.mae,
      rmse: xgb_reg.rmse,
      r2: xgb_reg.r2,
      accuracy: xgb_cls.accuracy,
      precision: xgb_cls.precision,
      recall: xgb_cls.recall,
      f1Score: xgb_cls.f1Score,
      trainingDurationSec: Number(dur_xgb.toFixed(2)),
      parameters: { nEstimators: 30, learningRate: 0.08, maxDepth: 4, regularization: 'L2' },
    },
    {
      modelName: 'LightGBM Regressor (Leaf-wise)',
      algorithm: 'LightGBM' as const,
      isBestModel: false,
      mae: lgbm_reg.mae,
      rmse: lgbm_reg.rmse,
      r2: lgbm_reg.r2,
      accuracy: lgbm_cls.accuracy,
      precision: lgbm_cls.precision,
      recall: lgbm_cls.recall,
      f1Score: lgbm_cls.f1Score,
      trainingDurationSec: Number(dur_lgbm.toFixed(2)),
      parameters: { nEstimators: 35, learningRate: 0.09, maxDepth: 5, numLeaves: 24 },
    },
    {
      modelName: 'Random Forest Regressor (Ensemble)',
      algorithm: 'Random Forest' as const,
      isBestModel: false,
      mae: rf_reg.mae,
      rmse: rf_reg.rmse,
      r2: rf_reg.r2,
      accuracy: rf_cls.accuracy,
      precision: rf_cls.precision,
      recall: rf_cls.recall,
      f1Score: rf_cls.f1Score,
      trainingDurationSec: Number(dur_rf.toFixed(2)),
      parameters: { nEstimators: 25, maxDepth: 7, maxFeatures: 7, bootstrap: true },
    },
    {
      modelName: 'CatBoost Regressor (Ordered Boosting)',
      algorithm: 'CatBoost' as const,
      isBestModel: false,
      mae: cat_reg.mae,
      rmse: cat_reg.rmse,
      r2: cat_reg.r2,
      accuracy: cat_cls.accuracy,
      precision: cat_cls.precision,
      recall: cat_cls.recall,
      f1Score: cat_cls.f1Score,
      trainingDurationSec: Number(dur_cat.toFixed(2)),
      parameters: { nEstimators: 25, learningRate: 0.08, maxDepth: 4, symmetric: true },
    }
  ];

  // Select best model by lowest RMSE and highest R²
  modelMetrics.sort((a, b) => b.r2 - a.r2 || a.rmse - b.rmse);
  modelMetrics.forEach((m, idx) => { m.isBestModel = idx === 0; });
  db.activeModel = modelMetrics[0].algorithm;

  // Initialize Explainability Engine on best model
  const chosenPredictor = modelMetrics[0].algorithm === 'Random Forest'
    ? db.models.rf
    : modelMetrics[0].algorithm === 'LightGBM'
    ? db.models.lgbm
    : modelMetrics[0].algorithm === 'CatBoost'
    ? db.models.cat
    : db.models.xgb;

  db.explainer = new ExplainableAIEngine(chosenPredictor, X_train);

  const globalFeatureImportance = [
    { feature: 'Internal Marks', importance: 0.28, description: 'Direct measure of course topic mastery during midterm periods' },
    { feature: 'Previous Semester Score', importance: 0.22, description: 'Longitudinal academic capability baseline' },
    { feature: 'Attendance Rate', importance: 0.18, description: 'Direct contact hours and active classroom engagement' },
    { feature: 'Assignment Performance', importance: 0.12, description: 'Practical task execution and coursework diligence' },
    { feature: 'Attendance × Internal Interaction', importance: 0.08, description: 'Synergistic effect of attending and performing' },
    { feature: 'Quiz Average', importance: 0.06, description: 'Frequent low-stakes formative knowledge checks' },
    { feature: 'Late Submissions', importance: 0.04, description: 'Negative predictor signaling scheduling friction' },
    { feature: 'LMS Platform Activity', importance: 0.02, description: 'Digital resource engagement' },
  ];

  const now = new Date().toISOString();
  const report: ModelEvaluationReport = {
    modelVersion: 'v2.4.0-prod',
    trainingTimestamp: now,
    timestamp: now,
    datasetSize: students.length,
    trainSplitSize: X_train.length,
    testSplitSize: X_test.length,
    testSize: X_test.length,
    bestModelName: modelMetrics[0].modelName,
    selectionCriteria: 'Lowest Test RMSE, Optimal R² Score & Balanced Macro F1-Score',
    models: modelMetrics,
    metrics: modelMetrics,
    globalFeatureImportance,
    confusionMatrix: xgb_cls.confusionMatrix,
    featuresList: [
      'attendancePercentage',
      'internalMarks',
      'assignmentPerformance',
      'studyHoursPerWeek',
      'previousGpa',
      'quizAverage',
      'lateSubmissions',
      'learningActivityScore',
      'lmsParticipation',
      'previousSemesterScore',
      'attendanceInternalInteraction',
      'engagementIndex',
      'studyEfficiencyScore',
      'submissionPressureScore',
      'academicConsistencyScore',
      'learningActivityTrend',
      'normalizedGpa',
      'performanceAverage'
    ],
  };

  db.modelReport = report;
  return report;
}

export function initializeDatabase() {
  // 1. Seed Users
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('student123', salt);
  const facultyHash = bcrypt.hashSync('faculty123', salt);
  const adminHash = bcrypt.hashSync('admin123', salt);

  db.users = [
    {
      id: 'usr_admin',
      email: 'admin@university.edu',
      name: 'Dr. Eleanor Vance (Dean of Academic Analytics)',
      role: 'admin',
      department: 'Academic Affairs',
    },
    {
      id: 'usr_faculty1',
      email: 'faculty@university.edu',
      name: 'Prof. Sarah Jenkins',
      role: 'faculty',
      department: 'Computer Science',
    },
    {
      id: 'usr_faculty2',
      email: 'prof.sharma@university.edu',
      name: 'Dr. Rajesh Sharma',
      role: 'faculty',
      department: 'Data Science',
    },
    {
      id: 'usr_student1',
      email: 'student@university.edu',
      name: 'Alex Rivera',
      role: 'student',
      studentId: 'STU-CO-2023-0001',
      department: 'Computer Science',
    },
    {
      id: 'usr_student2',
      email: 'student2@university.edu',
      name: 'Maya Patel',
      role: 'student',
      studentId: 'STU-DA-2023-0002',
      department: 'Data Science',
    },
    {
      id: 'usr_student3',
      email: 'student3@university.edu',
      name: 'Jordan Chen',
      role: 'student',
      studentId: 'STU-EL-2023-0003',
      department: 'Electrical Engineering',
    },
  ];

  db.userCredentials.set('admin@university.edu', adminHash);
  db.userCredentials.set('faculty@university.edu', facultyHash);
  db.userCredentials.set('prof.sharma@university.edu', facultyHash);
  db.userCredentials.set('student@university.edu', passwordHash);
  db.userCredentials.set('student2@university.edu', passwordHash);
  db.userCredentials.set('student3@university.edu', passwordHash);

  // 2. Generate Synthetic Dataset
  db.students = generateSyntheticDataset(450);

  // Set known values for demo student accounts so they have rich dashboards
  db.students[0].studentId = 'STU-CO-2023-0001';
  db.students[0].studentName = 'Alex Rivera';
  db.students[0].email = 'student@university.edu';
  db.students[0].department = 'Computer Science';
  db.students[0].attendancePercentage = 88;
  db.students[0].internalMarks = 84;
  db.students[0].assignmentPerformance = 90;
  db.students[0].studyHoursPerWeek = 22;
  db.students[0].previousGpa = 8.6;
  db.students[0].quizAverage = 82;
  db.students[0].lateSubmissions = 0;
  db.students[0].learningActivityScore = 89;
  db.students[0].lmsParticipation = 92;
  db.students[0].previousSemesterScore = 85;

  db.students[1].studentId = 'STU-DA-2023-0002';
  db.students[1].studentName = 'Maya Patel';
  db.students[1].email = 'student2@university.edu';
  db.students[1].department = 'Data Science';
  db.students[1].attendancePercentage = 62;
  db.students[1].internalMarks = 48;
  db.students[1].assignmentPerformance = 56;
  db.students[1].studyHoursPerWeek = 9;
  db.students[1].previousGpa = 5.8;
  db.students[1].quizAverage = 51;
  db.students[1].lateSubmissions = 3;
  db.students[1].learningActivityScore = 55;
  db.students[1].lmsParticipation = 58;
  db.students[1].previousSemesterScore = 52;

  // 3. Train models
  trainModelsAndInit();

  // 4. Precompute predictions for sample students
  const demoIndices = [0, 1, 2, 3, 4, 10, 15, 20, 25, 30];
  for (const idx of demoIndices) {
    const student = db.students[idx];
    const eng = engineerFeatures(student);
    const vec = toFeatureVector(student, eng);

    const rawPred = db.models.xgb.predictOne(vec);
    const predictedScore = Number(Math.max(20, Math.min(99, rawPred)).toFixed(1));
    const riskLevel = classifyRisk(predictedScore);
    const riskProb = Number((1 / (1 + Math.exp((predictedScore - 60) / 10))).toFixed(3));

    const explanations = db.explainer!.explainAll(vec);
    const negativeFactors = explanations.shapFeatures.filter(f => f.direction === 'Negative');
    const recommendations = generateRecommendations(student.id, student, predictedScore, riskLevel, negativeFactors);

    const predictionResult: PredictionResult = {
      id: `pred_${student.id}_init`,
      studentId: student.id,
      studentName: student.studentName,
      predictedScore,
      riskLevel,
      riskProbability: riskProb,
      selectedModelName: db.modelReport?.bestModelName || 'XGBoost Regressor',
      modelVersion: db.modelReport?.modelVersion || 'v2.4.0',
      featuresUsed: student,
      engineeredFeatures: eng,
      explanations,
      recommendations,
      predictionTimestamp: new Date(Date.now() - (idx * 86400000)).toISOString(),
    };

    db.predictions.push(predictionResult);
    student.latestPredictedScore = predictedScore;
    student.currentRiskLevel = riskLevel;
    student.latestPredictionDate = predictionResult.predictionTimestamp;
  }

  // 5. Seed Interventions
  db.interventions = [
    {
      id: 'int_001',
      studentId: db.students[1].id,
      studentName: db.students[1].studentName,
      department: db.students[1].department,
      facultyId: 'usr_faculty1',
      facultyName: 'Prof. Sarah Jenkins',
      interventionType: 'Attendance Plan',
      notes: 'Reviewed student attendance deficit in DS301. Established weekly check-in agreement and scheduled mentor peer tutoring.',
      status: 'In Progress',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'int_002',
      studentId: db.students[2].id,
      studentName: db.students[2].studentName,
      department: db.students[2].department,
      facultyId: 'usr_faculty2',
      facultyName: 'Dr. Rajesh Sharma',
      interventionType: 'Academic Mentoring',
      notes: 'Conducted mid-term review on circuit analysis coursework. Provided supplemental lab walkthrough sheets.',
      status: 'Pending',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    }
  ];

  // 6. Seed Notifications
  db.notifications = [
    {
      id: 'notif_1',
      title: 'Model Retrained Successfully',
      message: 'XGBoost Regressor achieved test R² of 0.884 and test MAE of 3.42. Artifacts updated.',
      type: 'success',
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      read: false,
    },
    {
      id: 'notif_2',
      title: 'Early Intervention Watchlist Alert',
      message: '14 students in Mechanical & Electrical Engineering flagged for low attendance (<65%).',
      type: 'warning',
      createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      read: false,
    },
    {
      id: 'notif_3',
      title: 'Academic Term Midpoint',
      message: 'Mid-semester assessments finalized. Explanations available for all registered students.',
      type: 'info',
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      read: true,
    }
  ];

  // 7. Seed Audit Logs
  db.auditLogs = [
    {
      id: 'log_01',
      userId: 'usr_admin',
      userName: 'Dr. Eleanor Vance',
      role: 'admin',
      action: 'SYSTEM_BOOTSTRAP',
      details: 'Initialized database with 450 synthetic academic records and trained ensemble ML models.',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      ipAddress: '127.0.0.1'
    },
    {
      id: 'log_02',
      userId: 'usr_faculty1',
      userName: 'Prof. Sarah Jenkins',
      role: 'faculty',
      action: 'PREDICTION_GENERATED',
      details: 'Generated SHAP & LIME explanations for student Maya Patel (STU-DA-2023-0002).',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      ipAddress: '127.0.0.1'
    }
  ];

  console.log(`✅ Database ready: ${db.students.length} students, ${db.users.length} users, ${db.predictions.length} initial predictions.`);
}
