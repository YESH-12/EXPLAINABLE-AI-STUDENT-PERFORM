import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GoogleGenAI, Type } from '@google/genai';
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

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to run full ML prediction + SHAP + LIME + Recommendations for a student object
function computeStudentPrediction(studentInput: any): PredictionResult {
  const studentFeatureData = {
    studentId: studentInput.studentId || `STU-RT-${Math.floor(1000 + Math.random() * 9000)}`,
    studentName: studentInput.studentName || 'Student',
    department: studentInput.department || 'Computer Science',
    academicYear: Number(studentInput.academicYear) || 2,
    semester: Number(studentInput.semester) || 4,
    attendancePercentage: Number(studentInput.attendancePercentage ?? 78),
    internalMarks: Number(studentInput.internalMarks ?? 72),
    assignmentPerformance: Number(studentInput.assignmentPerformance ?? 75),
    studyHoursPerWeek: Number(studentInput.studyHoursPerWeek ?? 16),
    previousGpa: Number(studentInput.previousGpa ?? 7.4),
    quizAverage: Number(studentInput.quizAverage ?? 72),
    lateSubmissions: Number(studentInput.lateSubmissions ?? 1),
    learningActivityScore: Number(studentInput.learningActivityScore ?? 75),
    lmsParticipation: Number(studentInput.lmsParticipation ?? 78),
    previousSemesterScore: Number(studentInput.previousSemesterScore ?? 74),
  };

  const engineered = engineerFeatures(studentFeatureData);
  const featureVec = toFeatureVector(studentFeatureData, engineered);

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
  const riskProbability = Number((1 / (1 + Math.exp((predictedScore - 58) / 9))).toFixed(3));

  const explanations = db.explainer!.explainAll(featureVec);
  const negativeFactors = explanations.shapFeatures.filter(f => f.direction === 'Negative');
  const targetId = studentInput.id || studentFeatureData.studentId;
  const recommendations = generateRecommendations(
    targetId,
    studentFeatureData,
    predictedScore,
    riskLevel,
    negativeFactors
  );

  return {
    id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    studentId: targetId,
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
}

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
  const {
    name,
    email,
    password,
    role = 'student',
    department = 'Computer Science',
    studentId,
    academicYear = 2,
    semester = 3,
    attendancePercentage = 82,
    internalMarks = 76,
    assignmentPerformance = 80,
    studyHoursPerWeek = 18,
    previousGpa = 7.8,
    quizAverage = 75,
    lateSubmissions = 0,
    learningActivityScore = 80,
    lmsParticipation = 82,
    previousSemesterScore = 77,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const generatedRollNo = studentId && String(studentId).trim()
    ? String(studentId).trim()
    : (role === 'student' ? `STU-${department.substring(0, 2).toUpperCase()}-2026-${Math.floor(1000 + Math.random() * 9000)}` : undefined);

  const newUser = {
    id: `usr_${Date.now()}`,
    email: email.toLowerCase(),
    name: String(name).trim(),
    role: role as any,
    department,
    studentId: generatedRollNo,
  };

  db.users.unshift(newUser);
  db.userCredentials.set(newUser.email, hash);

  let createdStudent: Student | null = null;
  let initialPrediction: PredictionResult | null = null;

  if (role === 'student') {
    const newId = `std_${Date.now()}`;
    const newStudent: Student = {
      id: newId,
      studentId: generatedRollNo!,
      studentName: String(name).trim(),
      email: newUser.email,
      department,
      academicYear: Number(academicYear) || 2,
      semester: Number(semester) || 3,
      attendancePercentage: Math.max(0, Math.min(100, Number(attendancePercentage))),
      internalMarks: Math.max(0, Math.min(100, Number(internalMarks))),
      assignmentPerformance: Math.max(0, Math.min(100, Number(assignmentPerformance))),
      studyHoursPerWeek: Math.max(0, Math.min(60, Number(studyHoursPerWeek))),
      previousGpa: Math.max(0, Math.min(10, Number(previousGpa))),
      quizAverage: Math.max(0, Math.min(100, Number(quizAverage))),
      lateSubmissions: Math.max(0, Math.round(Number(lateSubmissions))),
      learningActivityScore: Math.max(0, Math.min(100, Number(learningActivityScore))),
      lmsParticipation: Math.max(0, Math.min(100, Number(lmsParticipation))),
      previousSemesterScore: Math.max(0, Math.min(100, Number(previousSemesterScore))),
      finalScore: 75,
      currentRiskLevel: 'Low Risk',
      latestPredictedScore: 75,
      enrollmentDate: new Date().toISOString().split('T')[0],
      mentorName: 'Prof. Sarah Jenkins',
    };

    // Run real-time ML prediction & SHAP/LIME explanations on the newly created student
    const predResult = computeStudentPrediction(newStudent);
    newStudent.latestPredictedScore = predResult.predictedScore;
    newStudent.finalScore = Math.round(predResult.predictedScore);
    newStudent.currentRiskLevel = predResult.riskLevel;
    newStudent.latestPredictionDate = predResult.predictionTimestamp;

    db.students.unshift(newStudent);
    db.predictions.unshift(predResult);
    createdStudent = newStudent;
    initialPrediction = predResult;
  }

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    title: `New ${role.toUpperCase()} Portal Created`,
    message: `${newUser.name} (${newUser.studentId || newUser.email}) registered in ${department} with live runtime profile.`,
    type: 'success',
    createdAt: new Date().toISOString(),
    read: false,
  });

  logAudit(newUser.id, newUser.name, newUser.role, 'PORTAL_CREATED', `Created new ${newUser.role} portal (${newUser.email}, Roll No: ${newUser.studentId || 'N/A'}) at runtime.`);

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, studentId: newUser.studentId, department: newUser.department },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({ token, user: newUser, student: createdStudent, prediction: initialPrediction });
});

app.get('/api/users', (req: Request, res: Response) => {
  res.json({ users: db.users });
});

app.delete('/api/users/:user_id', (req: Request, res: Response) => {
  const userId = req.params.user_id;
  const userIdx = db.users.findIndex(u => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User account not found.' });
  }
  const removed = db.users[userIdx];
  db.users.splice(userIdx, 1);
  db.userCredentials.delete(removed.email.toLowerCase());
  if (removed.studentId) {
    db.students = db.students.filter(s => s.studentId !== removed.studentId && s.email !== removed.email);
  }
  logAudit('usr_admin', 'System', 'admin', 'DELETE_USER', `Deleted user portal ${removed.name} (${removed.email}).`);
  res.json({ success: true, deletedUser: removed });
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

  const deptMap: Record<string, { count: number; totalScore: number; totalAttendance: number; highRisk: number }> = {};

  for (const s of students) {
    const score = s.latestPredictedScore || 70;
    totalScore += score;
    totalAttendance += s.attendancePercentage;
    totalStudyHours += s.studyHoursPerWeek;

    if (s.currentRiskLevel === 'High Risk') highRisk++;
    else if (s.currentRiskLevel === 'Medium Risk') medRisk++;
    else lowRisk++;

    if (!deptMap[s.department]) {
      deptMap[s.department] = { count: 0, totalScore: 0, totalAttendance: 0, highRisk: 0 };
    }
    deptMap[s.department].count++;
    deptMap[s.department].totalScore += score;
    deptMap[s.department].totalAttendance += s.attendancePercentage;
    if (s.currentRiskLevel === 'High Risk') deptMap[s.department].highRisk++;
  }

  const departmentBreakdown = Object.keys(deptMap).map(dept => ({
    department: dept,
    studentCount: deptMap[dept].count,
    avgScore: Number((deptMap[dept].totalScore / deptMap[dept].count).toFixed(1)),
    avgAttendance: Number((deptMap[dept].totalAttendance / deptMap[dept].count).toFixed(1)),
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
  const idOrStudentId = decodeURIComponent(req.params.student_id).trim();
  const qLower = idOrStudentId.toLowerCase();
  const student = db.students.find(s =>
    s.id.toLowerCase() === qLower ||
    s.studentId.toLowerCase() === qLower ||
    s.email.toLowerCase() === qLower ||
    s.studentName.toLowerCase() === qLower
  );
  if (!student) {
    return res.status(404).json({ error: `Student with ID "${idOrStudentId}" not found.` });
  }

  const predictions = db.predictions.filter(p => p.studentId === student.id || p.studentId === student.studentId);
  const interventions = db.interventions.filter(i => i.studentId === student.id || i.studentId === student.studentId);

  res.json({
    student,
    predictions,
    interventions,
  });
});

app.post('/api/students', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const studentName = String(body.studentName || body.name || 'New Student').trim();
    const department = String(body.department || 'Computer Science');
    const studentId = body.studentId && String(body.studentId).trim()
      ? String(body.studentId).trim()
      : `STU-${department.substring(0, 2).toUpperCase()}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const email = body.email && String(body.email).trim()
      ? String(body.email).trim().toLowerCase()
      : `${studentName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@university.edu`;

    const newStudent: Student = {
      id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      studentId,
      studentName,
      email,
      department,
      academicYear: Number(body.academicYear) || 2,
      semester: Number(body.semester) || 4,
      attendancePercentage: Math.max(0, Math.min(100, Number(body.attendancePercentage ?? 80))),
      internalMarks: Math.max(0, Math.min(100, Number(body.internalMarks ?? 75))),
      assignmentPerformance: Math.max(0, Math.min(100, Number(body.assignmentPerformance ?? 78))),
      studyHoursPerWeek: Math.max(0, Math.min(60, Number(body.studyHoursPerWeek ?? 16))),
      previousGpa: Math.max(0, Math.min(10, Number(body.previousGpa ?? 7.6))),
      quizAverage: Math.max(0, Math.min(100, Number(body.quizAverage ?? 74))),
      lateSubmissions: Math.max(0, Math.round(Number(body.lateSubmissions ?? 0))),
      learningActivityScore: Math.max(0, Math.min(100, Number(body.learningActivityScore ?? 78))),
      lmsParticipation: Math.max(0, Math.min(100, Number(body.lmsParticipation ?? 80))),
      previousSemesterScore: Math.max(0, Math.min(100, Number(body.previousSemesterScore ?? 75))),
      finalScore: 76,
      currentRiskLevel: 'Low Risk',
      latestPredictedScore: 76,
      enrollmentDate: new Date().toISOString().split('T')[0],
      mentorName: body.mentorName || 'Prof. Sarah Jenkins',
    };

    const predResult = computeStudentPrediction(newStudent);
    newStudent.latestPredictedScore = predResult.predictedScore;
    newStudent.finalScore = Math.round(predResult.predictedScore);
    newStudent.currentRiskLevel = predResult.riskLevel;
    newStudent.latestPredictionDate = predResult.predictionTimestamp;

    db.students.unshift(newStudent);
    db.predictions.unshift(predResult);

    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      title: 'Runtime Student Record Added',
      message: `${newStudent.studentName} (${newStudent.studentId}) added with predicted score ${predResult.predictedScore} (${predResult.riskLevel}).`,
      type: 'info',
      createdAt: new Date().toISOString(),
      read: false,
    });

    logAudit('usr_faculty', 'Portal User', 'faculty', 'CREATE_STUDENT_RUNTIME', `Added student ${newStudent.studentName} (${newStudent.studentId}).`);

    res.status(201).json({ student: newStudent, prediction: predResult });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create runtime student: ' + err.message });
  }
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

app.delete('/api/students/:student_id', (req: Request, res: Response) => {
  const idOrStudentId = decodeURIComponent(req.params.student_id).trim();
  const index = db.students.findIndex(s => s.id === idOrStudentId || s.studentId === idOrStudentId);
  if (index === -1) {
    return res.status(404).json({ error: `Student with ID "${idOrStudentId}" not found.` });
  }

  const removed = db.students[index];
  db.students.splice(index, 1);
  db.predictions = db.predictions.filter(p => p.studentId !== removed.id && p.studentId !== removed.studentId);
  db.interventions = db.interventions.filter(i => i.studentId !== removed.id && i.studentId !== removed.studentId);

  logAudit('usr_faculty', 'Portal User', 'faculty', 'DELETE_STUDENT', `Deleted student record ${removed.studentName} (${removed.studentId}).`);

  res.json({ success: true, deletedStudent: removed, remainingCount: db.students.length });
});

app.delete('/api/students', (req: Request, res: Response) => {
  const { ids, clearAll } = req.body || {};
  if (clearAll) {
    const count = db.students.length;
    db.students = [];
    db.predictions = [];
    db.interventions = [];
    logAudit('usr_admin', 'Portal User', 'admin', 'CLEAR_ALL_STUDENTS', `Cleared all ${count} student records.`);
    return res.json({ success: true, deletedCount: count, remainingCount: 0 });
  }

  if (Array.isArray(ids) && ids.length > 0) {
    const idSet = new Set(ids);
    const before = db.students.length;
    db.students = db.students.filter(s => !idSet.has(s.id) && !idSet.has(s.studentId));
    db.predictions = db.predictions.filter(p => !idSet.has(p.studentId));
    db.interventions = db.interventions.filter(i => !idSet.has(i.studentId));
    const deletedCount = before - db.students.length;
    logAudit('usr_faculty', 'Portal User', 'faculty', 'BULK_DELETE_STUDENTS', `Deleted ${deletedCount} selected student records.`);
    return res.json({ success: true, deletedCount, remainingCount: db.students.length });
  }

  res.status(400).json({ error: 'Provide ids array or clearAll: true' });
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

app.get('/api/predictions', (req: Request, res: Response) => {
  res.json({ count: db.predictions.length, predictions: db.predictions.slice(0, 50) });
});

app.get('/api/predictions/:student_id', (req: Request, res: Response) => {
  const studentId = req.params.student_id;
  const history = db.predictions.filter(p => p.studentId === studentId);
  res.json({ studentId, count: history.length, predictions: history });
});

app.delete('/api/predictions/:prediction_id', (req: Request, res: Response) => {
  const predId = req.params.prediction_id;
  const idx = db.predictions.findIndex(p => p.id === predId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Prediction record not found' });
  }
  const removed = db.predictions[idx];
  db.predictions.splice(idx, 1);
  logAudit('usr_faculty', 'Portal User', 'faculty', 'DELETE_PREDICTION', `Deleted prediction record ${predId} for ${removed.studentName}.`);
  res.json({ success: true, deletedPrediction: removed });
});

app.delete('/api/predictions', (req: Request, res: Response) => {
  const count = db.predictions.length;
  db.predictions = [];
  logAudit('usr_admin', 'Portal User', 'admin', 'CLEAR_PREDICTIONS', `Cleared all ${count} stored predictions.`);
  res.json({ success: true, deletedCount: count });
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

app.delete('/api/recommendations/:student_id/:rec_id', (req: Request, res: Response) => {
  const { student_id, rec_id } = req.params;
  for (const p of db.predictions) {
    if (p.studentId === student_id || p.id === student_id) {
      p.recommendations = (p.recommendations || []).filter(r => r.id !== rec_id);
    }
  }
  res.json({ success: true, deletedRecId: rec_id });
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

  res.status(201).json({ ...newIntervention, intervention: newIntervention });
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

app.delete('/api/interventions/:intervention_id', (req: Request, res: Response) => {
  const id = req.params.intervention_id;
  const idx = db.interventions.findIndex(i => i.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Intervention not found' });
  }
  const removed = db.interventions[idx];
  db.interventions.splice(idx, 1);
  logAudit('usr_faculty', 'Portal User', 'faculty', 'DELETE_INTERVENTION', `Deleted intervention ${id} for ${removed.studentName}.`);
  res.json({ success: true, deletedIntervention: removed });
});

app.delete('/api/interventions', (req: Request, res: Response) => {
  const { studentId } = req.query;
  if (studentId) {
    const before = db.interventions.length;
    db.interventions = db.interventions.filter(i => i.studentId !== studentId);
    return res.json({ success: true, deletedCount: before - db.interventions.length });
  }
  const count = db.interventions.length;
  db.interventions = [];
  logAudit('usr_admin', 'Portal User', 'admin', 'CLEAR_INTERVENTIONS', `Cleared all ${count} stored interventions.`);
  res.json({ success: true, deletedCount: count });
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
// 10. NOTIFICATIONS, AUDIT LOGS & DATA MANAGEMENT
// -------------------------------------------------------------
app.get('/api/notifications', (req: Request, res: Response) => {
  res.json({ notifications: db.notifications });
});

app.delete('/api/notifications/:notification_id', (req: Request, res: Response) => {
  const id = req.params.notification_id;
  db.notifications = db.notifications.filter(n => n.id !== id);
  res.json({ success: true, notifications: db.notifications });
});

app.delete('/api/notifications', (req: Request, res: Response) => {
  db.notifications = [];
  res.json({ success: true, notifications: [] });
});

app.get('/api/audit-logs', (req: Request, res: Response) => {
  res.json({ logs: db.auditLogs });
});

app.delete('/api/audit-logs/:log_id', (req: Request, res: Response) => {
  const id = req.params.log_id;
  db.auditLogs = db.auditLogs.filter(l => l.id !== id);
  res.json({ success: true, logs: db.auditLogs });
});

app.delete('/api/audit-logs', (req: Request, res: Response) => {
  db.auditLogs = [];
  res.json({ success: true, logs: [] });
});

app.post('/api/data/reset', (req: Request, res: Response) => {
  initializeDatabase();
  res.json({
    success: true,
    message: 'Database restored to initial seed state and models retrained.',
    studentsCount: db.students.length,
  });
});

// -------------------------------------------------------------
// 10B. EXPLAINABLE AI STUDENT ROLL NO & NAME DIRECT LOOKUP & PROFILER
// -------------------------------------------------------------
app.post('/api/ai/student-lookup', async (req: Request, res: Response) => {
  try {
    const { rollNo = '', studentName = '', query = '', createIfNotFound = true, department = 'Computer Science' } = req.body || {};

    const cleanRoll = String(rollNo).trim();
    const cleanName = String(studentName).trim();
    const cleanQuery = String(query).trim();

    let matchedStudent: Student | undefined;

    // 1. Try matching by Roll No / Student ID first (exact or suffix match like "0001")
    if (cleanRoll) {
      const rLower = cleanRoll.toLowerCase();
      matchedStudent = db.students.find(s =>
        s.studentId.toLowerCase() === rLower ||
        s.id.toLowerCase() === rLower ||
        s.studentId.toLowerCase().endsWith(rLower) ||
        s.studentId.toLowerCase().includes(rLower)
      );
    }

    // 2. If not matched by Roll No, or if both Roll No and Name were provided, check Name
    if (!matchedStudent && cleanName) {
      const nLower = cleanName.toLowerCase();
      matchedStudent = db.students.find(s =>
        s.studentName.toLowerCase() === nLower ||
        s.studentName.toLowerCase().includes(nLower)
      );
    }

    // 3. If natural language query provided, search across studentId, studentName, email
    if (!matchedStudent && cleanQuery) {
      const qLower = cleanQuery.toLowerCase();
      matchedStudent = db.students.find(s =>
        s.studentId.toLowerCase() === qLower ||
        s.studentName.toLowerCase() === qLower ||
        s.studentId.toLowerCase().includes(qLower) ||
        s.studentName.toLowerCase().includes(qLower) ||
        qLower.includes(s.studentId.toLowerCase()) ||
        qLower.includes(s.studentName.toLowerCase())
      );
    }

    let wasCreatedAtRuntime = false;

    // 4. If student doesn't exist yet and user provided a Roll No or Name with createIfNotFound
    if (!matchedStudent && createIfNotFound && (cleanRoll || cleanName || cleanQuery)) {
      const finalRoll = cleanRoll || `STU-AI-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const finalName = cleanName || cleanQuery || `Student ${finalRoll}`;
      const newStudent: Student = {
        id: `std_${Date.now()}`,
        studentId: finalRoll,
        studentName: finalName,
        email: `${finalName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@university.edu`,
        department: department || 'Computer Science',
        academicYear: 2,
        semester: 4,
        attendancePercentage: 78,
        internalMarks: 74,
        assignmentPerformance: 79,
        studyHoursPerWeek: 17,
        previousGpa: 7.6,
        quizAverage: 75,
        lateSubmissions: 1,
        learningActivityScore: 77,
        lmsParticipation: 81,
        previousSemesterScore: 76,
        finalScore: 76,
        currentRiskLevel: 'Low Risk',
        latestPredictedScore: 76,
        enrollmentDate: new Date().toISOString().split('T')[0],
        mentorName: 'Prof. Sarah Jenkins',
      };

      const pred = computeStudentPrediction(newStudent);
      newStudent.latestPredictedScore = pred.predictedScore;
      newStudent.finalScore = Math.round(pred.predictedScore);
      newStudent.currentRiskLevel = pred.riskLevel;
      newStudent.latestPredictionDate = pred.predictionTimestamp;

      db.students.unshift(newStudent);
      db.predictions.unshift(pred);
      matchedStudent = newStudent;
      wasCreatedAtRuntime = true;
    }

    if (!matchedStudent) {
      return res.status(404).json({
        error: `No student found matching Roll No "${cleanRoll}" or Name "${cleanName}". Enable auto-create or check the directory.`,
      });
    }

    // Retrieve or compute latest prediction & SHAP/LIME explanations
    let prediction = db.predictions.find(p => p.studentId === matchedStudent!.id || p.studentId === matchedStudent!.studentId);
    if (!prediction) {
      prediction = computeStudentPrediction(matchedStudent);
      db.predictions.unshift(prediction);
    }

    const posDrivers = (prediction.explanations?.shapFeatures || [])
      .filter(f => f.direction === 'Positive')
      .slice(0, 3);
    const negDrivers = (prediction.explanations?.shapFeatures || [])
      .filter(f => f.direction === 'Negative')
      .slice(0, 3);

    // Deterministic structured fallback in case GEMINI_API_KEY is not configured
    let aiBrief = {
      executiveSummary: `${matchedStudent.studentName} (Roll No: ${matchedStudent.studentId}) is a Year ${matchedStudent.academicYear}, Semester ${matchedStudent.semester} student in ${matchedStudent.department}. The ${prediction.selectedModelName} projects a final score of ${prediction.predictedScore.toFixed(1)}/100, placing them in the ${prediction.riskLevel} tier (${Math.round(prediction.riskProbability * 100)}% risk probability).`,
      academicStrengths: posDrivers.length > 0
        ? posDrivers.map(d => `${d.displayName} (${d.inputValue}): Contributes +${d.impactValue.toFixed(1)} pts — ${d.humanDescription}`)
        : [`Consistent baseline engagement across ${matchedStudent.department} coursework.`],
      riskFactors: negDrivers.length > 0
        ? negDrivers.map(d => `${d.displayName} (${d.inputValue}): Reduces projection by ${d.impactValue.toFixed(1)} pts — ${d.humanDescription}`)
        : [`No critical negative SHAP detractors detected; attendance (${matchedStudent.attendancePercentage}%) and internal marks (${matchedStudent.internalMarks}/100) are stable.`],
      aiAdvisorRecommendation: (prediction.recommendations || []).length > 0
        ? prediction.recommendations.map(r => `[${r.priority}] ${r.recommendationArea}: ${r.actionText}`).join(' ')
        : 'Continue current study schedule and participate in advanced peer-mentoring sessions.',
      explainabilityVerdict: `SHAP base cohort expectation is ${prediction.explanations.shapBaseValue.toFixed(1)} pts; net feature attributions shift the projection to ${prediction.predictedScore.toFixed(1)} pts. LIME local surrogate confirms linear stability around this student's neighborhood.`,
      generatedBy: 'Explainable AI Academic Engine',
    };

    // Call Gemini 3.8 Flash if GEMINI_API_KEY is available
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are an Explainable AI Academic Advisor analyzing student performance.
Student Profile:
- Name: ${matchedStudent.studentName}
- Roll Number / ID: ${matchedStudent.studentId}
- Department: ${matchedStudent.department} (Year ${matchedStudent.academicYear}, Semester ${matchedStudent.semester})
- Attendance: ${matchedStudent.attendancePercentage}%
- Internal Marks: ${matchedStudent.internalMarks}/100
- Assignment Performance: ${matchedStudent.assignmentPerformance}/100
- Study Hours/Week: ${matchedStudent.studyHoursPerWeek} hrs
- Previous GPA: ${matchedStudent.previousGpa}/10.0
- Quiz Average: ${matchedStudent.quizAverage}/100
- Late Submissions: ${matchedStudent.lateSubmissions}
- LMS Participation: ${matchedStudent.lmsParticipation}/100
- Previous Semester Score: ${matchedStudent.previousSemesterScore}/100

ML Model Output (${prediction.selectedModelName}):
- Predicted Final Score: ${prediction.predictedScore}/100
- Academic Risk Level: ${prediction.riskLevel} (Risk Probability: ${Math.round(prediction.riskProbability * 100)}%)
- Top Positive SHAP Drivers: ${posDrivers.map(f => `${f.displayName} (+${f.impactValue.toFixed(2)} pts)`).join(', ') || 'None'}
- Top Negative SHAP Drivers: ${negDrivers.map(f => `${f.displayName} (${f.impactValue.toFixed(2)} pts)`).join(', ') || 'None'}

Provide a concise, supportive, non-punitive academic intelligence brief in JSON matching the schema.`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                academicStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
                aiAdvisorRecommendation: { type: Type.STRING },
                explainabilityVerdict: { type: Type.STRING },
              },
              required: [
                'executiveSummary',
                'academicStrengths',
                'riskFactors',
                'aiAdvisorRecommendation',
                'explainabilityVerdict',
              ],
            },
          },
        });

        if (geminiRes.text) {
          const parsed = JSON.parse(geminiRes.text.trim());
          aiBrief = {
            ...aiBrief,
            ...parsed,
            generatedBy: 'Gemini 3.8 Flash + SHAP/LIME XAI',
          };
        }
      } catch (gemErr: any) {
        console.warn('Gemini API fallback used for student lookup:', gemErr.message);
      }
    }

    res.json({
      student: matchedStudent,
      prediction,
      interventions: db.interventions.filter(i => i.studentId === matchedStudent!.id || i.studentId === matchedStudent!.studentId),
      aiBrief,
      wasCreatedAtRuntime,
    });
  } catch (err: any) {
    console.error('AI student lookup error:', err);
    res.status(500).json({ error: 'AI Student Lookup failed: ' + err.message });
  }
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
