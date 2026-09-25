import { Recommendation, StudentFeatureData, RiskLevel, ExplanationFeature } from '../../src/types/index';

export function generateRecommendations(
  studentId: string,
  features: StudentFeatureData,
  predictedScore: number,
  riskLevel: RiskLevel,
  negativeFactors: ExplanationFeature[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const now = new Date().toISOString();

  // Helper to make unique IDs
  const createRec = (
    area: string,
    actionText: string,
    priority: 'High' | 'Medium' | 'Low',
    reason: string
  ): Recommendation => ({
    id: `rec_${studentId}_${Math.random().toString(36).substring(2, 9)}`,
    studentId,
    recommendationArea: area,
    actionText,
    priority,
    reason,
    completed: false,
    createdAt: now,
  });

  // 1. Attendance checks
  if (features.attendancePercentage < 75) {
    recommendations.push(
      createRec(
        'Attendance Optimization',
        'Enroll in structured attendance recovery sessions and set calendar notifications for early lecture check-ins.',
        features.attendancePercentage < 65 ? 'High' : 'Medium',
        `Current attendance is ${features.attendancePercentage}%, which is below the academic readiness threshold of 75%.`
      )
    );
  }

  // 2. Internal marks / academic concepts
  if (features.internalMarks < 60) {
    recommendations.push(
      createRec(
        'Faculty Mentorship & Concept Revision',
        'Schedule bi-weekly office hour consultations with course instructors and review topic summaries for weak modules.',
        features.internalMarks < 45 ? 'High' : 'Medium',
        `Internal assessment score of ${features.internalMarks}/100 indicates key foundational concepts need reinforcement before finals.`
      )
    );
  }

  // 3. Study routine
  if (features.studyHoursPerWeek < 12) {
    recommendations.push(
      createRec(
        'Study Routine Restructuring',
        'Adopt a structured 2-hour daily focused study block utilizing the Pomodoro technique with distraction-free tracking.',
        'Medium',
        `Reported study time of ${features.studyHoursPerWeek} hrs/week leaves insufficient practice buffer for rigorous coursework.`
      )
    );
  }

  // 4. Assignments and late submissions
  if (features.lateSubmissions >= 2 || features.assignmentPerformance < 65) {
    recommendations.push(
      createRec(
        'Milestone-Based Submission Planning',
        'Break multi-part course projects into 48-hour intermediate checkpoints and set automated reminder alerts.',
        features.lateSubmissions >= 4 ? 'High' : 'Medium',
        `Accumulated ${features.lateSubmissions} late submissions, creating deadline friction and avoidable grade penalties.`
      )
    );
  }

  // 5. Digital learning & LMS participation
  if (features.lmsParticipation < 60 || features.learningActivityScore < 60) {
    recommendations.push(
      createRec(
        'Digital LMS & Peer Collaboration',
        'Participate in course discussion forums, complete supplementary online quiz modules, and access digital lecture recordings.',
        'Low',
        `LMS participation score (${features.lmsParticipation}/100) indicates under-utilization of digital course resources.`
      )
    );
  }

  // 6. High risk urgency check
  if (riskLevel === 'High Risk' && recommendations.length > 0) {
    recommendations.unshift(
      createRec(
        'Academic Advisory Counseling',
        'Meet with your assigned academic advisor this week to co-design an individualized academic success contract.',
        'High',
        `Proactive early intervention is recommended while ${100 - features.attendancePercentage}% of the term remains to reverse projected risk.`
      )
    );
  }

  // 7. High performance enrichment
  if (predictedScore >= 80 && riskLevel === 'Low Risk') {
    recommendations.push(
      createRec(
        'Honors Enrichment & Peer Mentorship',
        'Explore undergraduate research opportunities, applied capstone challenges, or become a peer study group facilitator.',
        'Low',
        `Exemplary projected performance (${predictedScore.toFixed(1)}/100) demonstrates readiness for advanced academic leadership.`
      )
    );
  }

  // Ensure at least 2 constructive recommendations exist
  if (recommendations.length === 0) {
    recommendations.push(
      createRec(
        'Continuous Improvement Practice',
        'Maintain current study cadence and review past semester exam problem sets to preserve top-tier performance.',
        'Low',
        'Consistent habits across attendance and internal assessments place performance in good standing.'
      )
    );
  }

  return recommendations;
}
