import { StudentFeatureData, EngineeredFeatures } from '../../src/types/index';

export const NUMERIC_FEATURE_KEYS = [
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
  'performanceAverage',
] as const;

export const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  attendancePercentage: 'Attendance Rate (%)',
  internalMarks: 'Internal Exam Marks',
  assignmentPerformance: 'Assignment Score',
  studyHoursPerWeek: 'Weekly Study Hours',
  previousGpa: 'Cumulative GPA (0-10)',
  quizAverage: 'Quiz Average Score',
  lateSubmissions: 'Late Submissions Count',
  learningActivityScore: 'Learning Activity Score',
  lmsParticipation: 'LMS Platform Activity',
  previousSemesterScore: 'Previous Semester Score',
  attendanceInternalInteraction: 'Attendance × Internal Interaction',
  engagementIndex: 'Holistic Engagement Index',
  studyEfficiencyScore: 'Study Efficiency Ratio',
  submissionPressureScore: 'Submission Pressure Index',
  academicConsistencyScore: 'Academic Consistency Score',
  learningActivityTrend: 'Learning Activity Trend',
  normalizedGpa: 'Normalized GPA (0-100)',
  performanceAverage: 'Core Academic Average',
};

export function engineerFeatures(data: StudentFeatureData): EngineeredFeatures {
  const attendance = Math.max(0, Math.min(100, Number(data.attendancePercentage) || 0));
  const internalMarks = Math.max(0, Math.min(100, Number(data.internalMarks) || 0));
  const assignmentPerf = Math.max(0, Math.min(100, Number(data.assignmentPerformance) || 0));
  const studyHours = Math.max(0, Math.min(60, Number(data.studyHoursPerWeek) || 0));
  const gpa = Math.max(0, Math.min(10, Number(data.previousGpa) || 0));
  const quizAvg = Math.max(0, Math.min(100, Number(data.quizAverage) || 0));
  const lateSubs = Math.max(0, Number(data.lateSubmissions) || 0);
  const learningAct = Math.max(0, Math.min(100, Number(data.learningActivityScore) || 0));
  const lms = Math.max(0, Math.min(100, Number(data.lmsParticipation) || 0));
  const prevSemester = Math.max(0, Math.min(100, Number(data.previousSemesterScore) || 0));

  // 1. Attendance and internal-mark interaction
  const attendanceInternalInteraction = Number(((attendance * internalMarks) / 100).toFixed(2));

  // 2. Engagement index (0.4 LMS + 0.3 Learning Act + 0.3 Attendance)
  const engagementIndex = Number(((0.4 * lms) + (0.3 * learningAct) + (0.3 * attendance)).toFixed(2));

  // 3. Study efficiency score
  const studyEfficiencyScore = studyHours > 0 
    ? Number((internalMarks / (studyHours * 2.5)).toFixed(2))
    : 0;

  // 4. Submission pressure score
  const submissionPressureScore = Number(((lateSubs * 4.0) + ((100 - assignmentPerf) * 0.2)).toFixed(2));

  // 5. Academic consistency score
  const scores = [internalMarks, quizAvg, assignmentPerf, prevSemester];
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const academicConsistencyScore = Number(Math.max(0, Math.min(100, 100 - (stdDev * 2.5))).toFixed(2));

  // 6. Learning activity trend
  const learningActivityTrend = Number((learningAct - prevSemester).toFixed(2));

  // 7. Normalized GPA (0 - 100 scale)
  const normalizedGpa = Number((gpa * 10).toFixed(2));

  // 8. Performance average
  const performanceAverage = Number((mean).toFixed(2));

  return {
    attendanceInternalInteraction,
    engagementIndex,
    studyEfficiencyScore,
    submissionPressureScore,
    academicConsistencyScore,
    learningActivityTrend,
    normalizedGpa,
    performanceAverage,
  };
}

export function toFeatureVector(student: StudentFeatureData, engineered: EngineeredFeatures): number[] {
  return [
    student.attendancePercentage,
    student.internalMarks,
    student.assignmentPerformance,
    student.studyHoursPerWeek,
    student.previousGpa,
    student.quizAverage,
    student.lateSubmissions,
    student.learningActivityScore,
    student.lmsParticipation,
    student.previousSemesterScore,
    engineered.attendanceInternalInteraction,
    engineered.engagementIndex,
    engineered.studyEfficiencyScore,
    engineered.submissionPressureScore,
    engineered.academicConsistencyScore,
    engineered.learningActivityTrend,
    engineered.normalizedGpa,
    engineered.performanceAverage,
  ];
}
