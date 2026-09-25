import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { 
  db, 
  initializeDatabase, 
  trainModelsAndInit, 
  generateSyntheticDataset 
} from './server/db';
import { engineerFeatures, toFeatureVector } from './server/ml/features';
import { classifyRisk } from './server/ml/algorithms';
import { generateRecommendations } from './server/ml/recommendations';
import { PredictionResult, Student, Intervention, AuditLog, RiskLevel } from './src/types/index';

const JWT_SECRET = process.env.JWT_SECRET || 'explainable-ai-academic-secret-key-2026';
const PORT = 3000;

// Initialize in-memory seed and train initial models
initializeDatabase();

const app = express();
app.use(express.json());

// Request logging & audit
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api') && !req.path.startsWith('/api/health')) {
      const duration = Date.now() - start;
      // Optional internal debug log
    }
  });
  next();
});

// Helper for JWT authentication
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// Helper to log audit events
function logAudit(userId: string, userName: string, role: string, action: string, details: string, ip?: string) {
  const log: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    userName,
    role,
    action,
    details,
    timestamp: new Date().toISOString(),
    ipAddress: ip || '127.0.0.1',
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 200) db.auditLogs.pop();
}

// -------------------------------------------------------------
// 1. HEALTH CHECK
// -------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Explainable AI Academic Prediction System',
    version: db.modelReport?.modelVersion || 'v2.4.0',
    activeModel: db.activeModel,
    studentsCount: db.students.length,
    trained: db.modelReport !== null,
  });
});

// -------------------------------------------------------------
// 2. AUTHENTICATION
// -------------------------------------------------------------
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  const storedHash = db.userCredentials.get(email.toLowerCase());

  if (!user || !storedHash) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
  }

  const valid = bcrypt.compareSync(password, storedHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, studentId: user.studentId, department: user.department },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  logAudit(user.id, user.name, user.role, 'USER_LOGIN', `Logged in successfully via ${user.role} portal.`);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
      department: user.department,
    },
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, role = 'student', department = 'Computer Science', studentId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const newUser = {
    id: `usr_${Date.now()}`,
    email: email.toLowerCase(),
    name,
    role: role as any,
    department,
    studentId: studentId || (role === 'student' ? `STU-NEW-${Math.floor(1000 + Math.random() * 9000)}` : undefined),
  };

  db.users.push(newUser);
  db.userCredentials.set(newUser.email, hash);

  if (role === 'student' && !db.students.some(s => s.email === newUser.email)) {
    // Create corresponding student academic profile
    const newStudent: Student = {
      id: `std_${Date.now()}`,
      studentId: newUser.studentId!,
      studentName: name,
      email: newUser.email,
      department,
      academicYear: 2,
      semester: 3,
      attendancePercentage: 78,
      internalMarks: 72,
      assignmentPerformance: 75,
      studyHoursPerWeek: 16,
      previousGpa: 7.4,
      quizAverage: 70,
      lateSubmissions: 1,
      learningActivityScore: 75,
      lmsParticipation: 78,
      previousSemesterScore: 74,
      finalScore: 75,
      currentRiskLevel: 'Low Risk',
      latestPredictedScore: 75,
      enrollmentDate: new Date().toISOString().split('T')[0],
      mentorName: 'Prof. Sarah Jenkins',
    };
    db.students.unshift(newStudent);
  }

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, studentId: newUser.studentId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({ token, user: newUser });
});

app.post('/api/auth/refresh', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, studentId: user.studentId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, user });
});

app.post('/api/auth/logout', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  logAudit(user.id, user.name, user.role, 'USER_LOGOUT', 'Logged out.');
  res.json({ message: 'Successfully logged out' });
});

// -------------------------------------------------------------
// 3. DASHBOARD SUMMARY
// -------------------------------------------------------------
app.get('/api/dashboard/summary', (req: Request, res: Response) => {
  const students = db.students;
  const totalStudents = students.length;

  let totalScore = 0;
  let totalAttendance = 0;
  let totalStudyHours = 0;
  let highRisk = 0;
  let medRisk = 0;
  let lowRisk = 0;

  const deptMap: Record<string, { count: number; totalScore: number; highRisk: number }> = {};

  for (const s of students) {
    const score = s.latestPredictedScore || 70;
    totalScore += score;
    totalAttendance += s.attendancePercentage;
    totalStudyHours += s.studyHoursPerWeek;

    if (s.currentRiskLevel === 'High Risk') highRisk++;
    else if (s.currentRiskLevel === 'Medium Risk') medRisk++;
    else lowRisk++;

    if (!deptMap[s.department]) {
      deptMap[s.department] = { count: 0, totalScore: 0, highRisk: 0 };
    }
    deptMap[s.department].count++;
    deptMap[s.department].totalScore += score;
    if (s.currentRiskLevel === 'High Risk') deptMap[s.department].highRisk++;
  }

  const departmentBreakdown = Object.keys(deptMap).map(dept => ({
    department: dept,
    studentCount: deptMap[dept].count,
    avgScore: Number((deptMap[dept].totalScore / deptMap[dept].count).toFixed(1)),
    highRiskCount: deptMap[dept].highRisk,
  }));

  const watchlistStudents = students
    .filter(s => s.currentRiskLevel === 'High Risk')
    .slice(0, 10);

  const activeInterventions = db.interventions.filter(i => i.status !== 'Resolved').length;

  res.json({
    totalStudents,
    averagePredictedScore: Number((totalScore / (totalStudents || 1)).toFixed(1)),
    highRiskCount: highRisk,
    mediumRiskCount: medRisk,
    lowRiskCount: lowRisk,
    averageAttendance: Number((totalAttendance / (totalStudents || 1)).toFixed(1)),
    averageStudyHours: Number((totalStudyHours / (totalStudents || 1)).toFixed(1)),
    interventionsActive: activeInterventions,
    departmentBreakdown,
    recentPredictions: db.predictions.slice(0, 6),
    recentInterventions: db.interventions.slice(0, 5),
    watchlistStudents,
  });
});

// -------------------------------------------------------------
// 4. STUDENTS API
// -------------------------------------------------------------
app.get('/api/students', (req: Request, res: Response) => {
  const { search, department, year, risk, minScore, maxScore, page = '1', limit = '15', sortBy = 'studentName', sortOrder = 'asc' } = req.query;

  let filtered = [...db.students];

  // Search
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(s => 
      s.studentName.toLowerCase().includes(q) || 
      s.studentId.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }

  // Department filter
  if (department && department !== 'All') {
    filtered = filtered.filter(s => s.department === department);
  }

  // Academic year
  if (year && year !== 'All') {
    filtered = filtered.filter(s => s.academicYear === Number(year));
  }

  // Risk filter
  if (risk && risk !== 'All') {
    filtered = filtered.filter(s => s.currentRiskLevel === risk);
  }

  // Score range
  if (minScore) {
    filtered = filtered.filter(s => (s.latestPredictedScore || 0) >= Number(minScore));
  }
  if (maxScore) {
    filtered = filtered.filter(s => (s.latestPredictedScore || 0) <= Number(maxScore));
  }

  // Sorting
  filtered.sort((a: any, b: any) => {
    let valA = a[String(sortBy)];
    let valB = b[String(sortBy)];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
    if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
    return 0;
  });

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(limit), 10) || 15);
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (pageNum - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  res.json({
    students: paginated,
    total,
    page: pageNum,
    limit: pageSize,
    totalPages,
  });
});

app.get('/api/students/:student_id', (req: Request, res: Response) => {
  const idOrStudentId = req.params.student_id;
  const student = db.students.find(s => s.id === idOrStudentId || s.studentId === idOrStudentId);
  if (!student) {
    return res.status(404).json({ error: `Student with ID "${idOrStudentId}" not found.` });
  }

  const predictions = db.predictions.filter(p => p.studentId === student.id);
  const interventions = db.interventions.filter(i => i.studentId === student.id);

  res.json({
    student,
    predictions,
    interventions,
  });
});

app.put('/api/students/:student_id', (req: Request, res: Response) => {
  const idOrStudentId = req.params.student_id;
  const index = db.students.findIndex(s => s.id === idOrStudentId || s.studentId === idOrStudentId);
  if (index === -1) {
    return res.status(404).json({ error: `Student with ID "${idOrStudentId}" not found.` });
  }

  const updates = req.body;
  db.students[index] = {
    ...db.students[index],
    ...updates,
    id: db.students[index].id, // Prevent overriding internal ID
  };

  res.json(db.students[index]);
});

// -------------------------------------------------------------
// 5. PREDICTION & EXPLAINABLE AI API
// -------------------------------------------------------------
app.post('/api/predict', (req: Request, res: Response) => {
  try {
    const input = req.body;

    // Validate inputs
    const attendance = Number(input.attendancePercentage);
    const internal = Number(input.internalMarks);
    const assignment = Number(input.assignmentPerformance);
    const studyHours = Number(input.studyHoursPerWeek);
    const gpa = Number(input.previousGpa);
    const quiz = Number(input.quizAverage);
    const late = Number(input.lateSubmissions);
    const learningAct = Number(input.learningActivityScore);
    const lms = Number(input.lmsParticipation);
    const prevSem = Number(input.previousSemesterScore);

    if (isNaN(attendance) || attendance < 0 || attendance > 100) {
      return res.status(400).json({ error: 'Attendance must be between 0 and 100%.' });
    }
    if (isNaN(internal) || internal < 0 || internal > 100) {
      return res.status(400).json({ error: 'Internal marks must be between 0 and 100.' });
    }
    if (isNaN(gpa) || gpa < 0 || gpa > 10) {
      return res.status(400).json({ error: 'GPA must be between 0.0 and 10.0.' });
    }

    const studentFeatureData = {
      studentId: input.studentId || 'MANUAL-PRED',
      studentName: input.studentName || 'Sample Student',
      department: input.department || 'Computer Science',
      academicYear: Number(input.academicYear) || 2,
      semester: Number(input.semester) || 4,
      attendancePercentage: attendance,
      internalMarks: internal,
      assignmentPerformance: assignment,
      studyHoursPerWeek: studyHours,
      previousGpa: gpa,
      quizAverage: quiz,
      lateSubmissions: late,
      learningActivityScore: learningAct,
      lmsParticipation: lms,
      previousSemesterScore: prevSem,
    };

    // Apply Feature Engineering
    const engineered = engineerFeatures(studentFeatureData);
    const featureVec = toFeatureVector(studentFeatureData, engineered);

    // Predict using active trained model
    const activeModelInstance = db.activeModel === 'Random Forest'
      ? db.models.rf
      : db.activeModel === 'LightGBM'
      ? db.models.lgbm
      : db.activeModel === 'CatBoost'
      ? db.models.cat
      : db.models.xgb;

    const rawPred = activeModelInstance.predictOne(featureVec);
    const predictedScore = Number(Math.max(15, Math.min(99, rawPred)).toFixed(1));
    const riskLevel: RiskLevel = classifyRisk(predictedScore);
    // Sigmoid probability centered around risk boundary (60)
    const riskProbability = Number((1 / (1 + Math.exp((predictedScore - 58) / 9))).toFixed(3));

    // Compute Explainable AI (SHAP and LIME)
    const explanations = db.explainer!.explainAll(featureVec);

    // Generate Personalized Recommendations
    const negativeFactors = explanations.shapFeatures.filter(f => f.direction === 'Negative');
    const recommendations = generateRecommendations(
      studentFeatureData.studentId,
      studentFeatureData,
      predictedScore,
      riskLevel,
      negativeFactors
    );

    const result: PredictionResult = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      studentId: studentFeatureData.studentId,
      studentName: studentFeatureData.studentName,
      predictedScore,
      riskLevel,
      riskProbability,
      selectedModelName: `${db.activeModel} Regressor`,
      modelVersion: db.modelReport?.modelVersion || 'v2.4.0',
      featuresUsed: studentFeatureData,
      engineeredFeatures: engineered,
      explanations,
      recommendations,
      predictionTimestamp: new Date().toISOString(),
    };

    // Store in prediction history
    db.predictions.unshift(result);
    if (db.predictions.length > 500) db.predictions.pop();

    // If existing student, update student's latest risk level
    const existingStudent = db.students.find(s => s.id === input.studentId || s.studentId === input.studentId);
    if (existingStudent) {
      existingStudent.latestPredictedScore = predictedScore;
      existingStudent.currentRiskLevel = riskLevel;
      existingStudent.latestPredictionDate = result.predictionTimestamp;
    }

    res.json(result);
  } catch (err: any) {
    console.error('Prediction error:', err);
    res.status(500).json({ error: 'Failed to generate prediction and explanations: ' + err.message });
  }
});

app.get('/api/predictions/:student_id', (req: Request, res: Response) => {
  const studentId = req.params.student_id;
  const history = db.predictions.filter(p => p.studentId === studentId);
  res.json({ studentId, count: history.length, predictions: history });
});

// -------------------------------------------------------------
// 6. MODEL EVALUATION & TRAINING
// -------------------------------------------------------------
app.get('/api/models/evaluation', (req: Request, res: Response) => {
  if (!db.modelReport) {
    trainModelsAndInit();
  }
  res.json(db.modelReport);
});

app.post('/api/models/train', (req: Request, res: Response) => {
  try {
    const { addSyntheticCount = 0 } = req.body;
    if (addSyntheticCount > 0) {
      const extra = generateSyntheticDataset(Number(addSyntheticCount));
      db.students.push(...extra);
    }

    const updatedReport = trainModelsAndInit();

    logAudit('usr_admin', 'Administrator', 'admin', 'MODEL_RETRAINED', 
      `Retrained models on ${db.students.length} records. Best model: ${updatedReport.bestModelName}`);

    res.json({
      message: 'Models successfully retrained and evaluated on fresh dataset split.',
      report: updatedReport,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Model training failed: ' + err.message });
  }
});

// -------------------------------------------------------------
// 7. RECOMMENDATIONS API
// -------------------------------------------------------------
app.get('/api/recommendations/:student_id', (req: Request, res: Response) => {
  const studentId = req.params.student_id;
  const latestPred = db.predictions.find(p => p.studentId === studentId);
  if (latestPred) {
    return res.json({ studentId, recommendations: latestPred.recommendations });
  }

  const student = db.students.find(s => s.id === studentId || s.studentId === studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const recs = generateRecommendations(student.id, student, student.latestPredictedScore || 70, student.currentRiskLevel, []);
  res.json({ studentId: student.id, recommendations: recs });
});

app.put('/api/recommendations/:student_id/:rec_id/toggle', (req: Request, res: Response) => {
  const { student_id, rec_id } = req.params;
  let updated = false;

  for (const p of db.predictions) {
    if (p.studentId === student_id) {
      const rec = p.recommendations.find(r => r.id === rec_id);
      if (rec) {
        rec.completed = !rec.completed;
        rec.updatedAt = new Date().toISOString();
        updated = true;
        return res.json({ success: true, recommendation: rec });
      }
    }
  }

  if (!updated) {
    res.json({ success: true, message: 'Updated recommendation status.' });
  }
});

// -------------------------------------------------------------
// 8. INTERVENTIONS API
// -------------------------------------------------------------
app.get('/api/interventions', (req: Request, res: Response) => {
  const { student_id, status } = req.query;
  let list = [...db.interventions];
  if (student_id) {
    list = list.filter(i => i.studentId === student_id);
  }
  if (status && status !== 'All') {
    list = list.filter(i => i.status === status);
  }
  res.json({ interventions: list });
});

app.post('/api/interventions', (req: Request, res: Response) => {
  const { studentId, studentName, department, facultyName, interventionType, notes, status = 'Pending' } = req.body;
  if (!studentId || !notes || !interventionType) {
    return res.status(400).json({ error: 'studentId, interventionType, and notes are required.' });
  }

  const newIntervention: Intervention = {
    id: `int_${Date.now()}`,
    studentId,
    studentName: studentName || 'Student',
    department: department || 'General',
    facultyId: 'usr_faculty',
    facultyName: facultyName || 'Faculty Mentor',
    interventionType,
    notes,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.interventions.unshift(newIntervention);

  logAudit('usr_faculty', newIntervention.facultyName, 'faculty', 'CREATE_INTERVENTION', 
    `Created ${interventionType} intervention for student ${studentName} (${studentId}).`);

  res.status(201).json(newIntervention);
});

app.put('/api/interventions/:intervention_id', (req: Request, res: Response) => {
  const id = req.params.intervention_id;
  const idx = db.interventions.findIndex(i => i.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Intervention not found' });
  }

  db.interventions[idx] = {
    ...db.interventions[idx],
    ...req.body,
    id: db.interventions[idx].id,
    updatedAt: new Date().toISOString(),
  };

  res.json(db.interventions[idx]);
});

// -------------------------------------------------------------
// 9. REPORTS API
// -------------------------------------------------------------
app.get('/api/reports/risk', (req: Request, res: Response) => {
  const highRiskStudents = db.students.filter(s => s.currentRiskLevel === 'High Risk');
  const mediumRiskStudents = db.students.filter(s => s.currentRiskLevel === 'Medium Risk');
  const lowRiskStudents = db.students.filter(s => s.currentRiskLevel === 'Low Risk');

  res.json({
    generatedAt: new Date().toISOString(),
    totalStudents: db.students.length,
    highRiskCount: highRiskStudents.length,
    mediumRiskCount: mediumRiskStudents.length,
    lowRiskCount: lowRiskStudents.length,
    highRiskStudents,
    mediumRiskStudents,
  });
});

app.get('/api/reports/performance', (req: Request, res: Response) => {
  const depts = Array.from(new Set(db.students.map(s => s.department)));
  const departmentStats = depts.map(dept => {
    const list = db.students.filter(s => s.department === dept);
    const avgScore = list.reduce((a, b) => a + (b.latestPredictedScore || 70), 0) / (list.length || 1);
    const avgAtt = list.reduce((a, b) => a + b.attendancePercentage, 0) / (list.length || 1);
    const avgInternal = list.reduce((a, b) => a + b.internalMarks, 0) / (list.length || 1);
    const highRisk = list.filter(s => s.currentRiskLevel === 'High Risk').length;

    return {
      department: dept,
      studentCount: list.length,
      averageScore: Number(avgScore.toFixed(1)),
      averageAttendance: Number(avgAtt.toFixed(1)),
      averageInternalMarks: Number(avgInternal.toFixed(1)),
      highRiskCount: highRisk,
      highRiskRate: Number(((highRisk / (list.length || 1)) * 100).toFixed(1)),
    };
  });

  res.json({
    generatedAt: new Date().toISOString(),
    totalStudents: db.students.length,
    departmentStats,
  });
});

// -------------------------------------------------------------
// 10. NOTIFICATIONS & AUDIT LOGS
// -------------------------------------------------------------
app.get('/api/notifications', (req: Request, res: Response) => {
  res.json({ notifications: db.notifications });
});

app.get('/api/audit-logs', (req: Request, res: Response) => {
  res.json({ logs: db.auditLogs });
});

// -------------------------------------------------------------
// 11. AUTOMATED TEST SUITE RUNNER (QA Requirement)
// -------------------------------------------------------------
app.post('/api/test-suite/run', (req: Request, res: Response) => {
  const testResults: { category: string; testName: string; passed: boolean; message: string; durationMs: number }[] = [];

  const runTest = (category: string, testName: string, fn: () => void) => {
    const t0 = Date.now();
    try {
      fn();
      testResults.push({
        category,
        testName,
        passed: true,
        message: 'Assertion passed successfully.',
        durationMs: Date.now() - t0,
      });
    } catch (err: any) {
      testResults.push({
        category,
        testName,
        passed: false,
        message: err.message || 'Assertion failed.',
        durationMs: Date.now() - t0,
      });
    }
  };

  // 1. Health & DB
  runTest('Backend API', 'Database has populated seed records', () => {
    if (db.students.length < 100) throw new Error(`Expected at least 100 students, got ${db.students.length}`);
  });

  // 2. ML Feature Engineering
  runTest('ML Pipeline', 'Engineered features adhere to valid numeric domains', () => {
    const sample = db.students[0];
    const eng = engineerFeatures(sample);
    if (eng.engagementIndex < 0 || eng.engagementIndex > 100) {
      throw new Error(`Engagement index out of bounds: ${eng.engagementIndex}`);
    }
    if (eng.academicConsistencyScore < 0 || eng.academicConsistencyScore > 100) {
      throw new Error(`Consistency score out of bounds: ${eng.academicConsistencyScore}`);
    }
  });

  // 3. Model Inference & Risk Classification
  runTest('ML Pipeline', 'Random Forest & Gradient Boosting generate predictions in 0-100 scale', () => {
    const sample = db.students[0];
    const eng = engineerFeatures(sample);
    const vec = toFeatureVector(sample, eng);
    const predRf = db.models.rf.predictOne(vec);
    const predXgb = db.models.xgb.predictOne(vec);
    if (predRf < 0 || predRf > 100) throw new Error(`RF prediction ${predRf} out of bounds`);
    if (predXgb < 0 || predXgb > 100) throw new Error(`XGB prediction ${predXgb} out of bounds`);
  });

  // 4. SHAP Explainability & Efficiency Axiom
  runTest('Explainable AI', 'SHAP values satisfy local efficiency axiom', () => {
    const sample = db.students[0];
    const eng = engineerFeatures(sample);
    const vec = toFeatureVector(sample, eng);
    const shap = db.explainer!.explainSHAP(vec);
    const sumShap = shap.features.reduce((sum, f) => sum + f.impactValue, 0);
    const pred = db.models.xgb.predictOne(vec);
    const diff = Math.abs((shap.baseValue + sumShap) - pred);
    if (diff > 2.0) {
      throw new Error(`SHAP efficiency discrepancy: base=${shap.baseValue}, sum=${sumShap.toFixed(2)}, pred=${pred.toFixed(2)}, diff=${diff.toFixed(2)}`);
    }
  });

  // 5. LIME Local Surrogate
  runTest('Explainable AI', 'LIME generates local sensitivity attributions', () => {
    const sample = db.students[1];
    const eng = engineerFeatures(sample);
    const vec = toFeatureVector(sample, eng);
    const lime = db.explainer!.explainLIME(vec);
    if (lime.features.length === 0) throw new Error('LIME returned empty features array');
  });

  // 6. Recommendations Non-Punitive & Concrete
  runTest('Recommendation Engine', 'Generates prioritized recommendations for high-risk student', () => {
    const strugglingStudent = db.students.find(s => s.currentRiskLevel === 'High Risk') || db.students[1];
    const recs = generateRecommendations(strugglingStudent.id, strugglingStudent, 45, 'High Risk', []);
    if (recs.length === 0) throw new Error('Failed to generate recommendations for at-risk student');
    if (!recs.some(r => r.priority === 'High')) throw new Error('Expected at least one High priority recommendation');
  });

  // 7. Security & Authorization
  runTest('Security & Auth', 'Password hashing verification works securely with bcrypt', () => {
    const studentHash = db.userCredentials.get('student@university.edu');
    if (!studentHash) throw new Error('Student credentials missing');
    if (!bcrypt.compareSync('student123', studentHash)) throw new Error('Bcrypt validation failed');
  });

  const passedCount = testResults.filter(t => t.passed).length;
  const totalCount = testResults.length;

  res.json({
    summary: {
      total: totalCount,
      passed: passedCount,
      failed: totalCount - passedCount,
      allPassed: passedCount === totalCount,
      timestamp: new Date().toISOString(),
    },
    tests: testResults,
  });
});

// -------------------------------------------------------------
// VITE SPA MIDDLEWARE / PRODUCTION STATIC SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Explainable AI Academic Prediction System running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
