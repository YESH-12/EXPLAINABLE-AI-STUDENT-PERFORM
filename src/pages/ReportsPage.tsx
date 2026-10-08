import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Building,
  Trash2,
  ShieldCheck,
  Users,
  Search,
  Filter,
  GraduationCap,
  SlidersHorizontal,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Student, Intervention, AuditLog } from '../types/index';
import { RiskBadge } from '../components/RiskBadge';

type ReportTab =
  | 'performance_summary'
  | 'high_risk'
  | 'department'
  | 'attendance'
  | 'interventions'
  | 'audit_logs';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportTab>('performance_summary');
  const [students, setStudents] = useState<Student[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Faculty Export Filter Controls
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Export customization options
  const [includeExecutiveSummary, setIncludeExecutiveSummary] = useState<boolean>(true);
  const [includeDepartmentStats, setIncludeDepartmentStats] = useState<boolean>(true);
  const [includeCourseworkDetails, setIncludeCourseworkDetails] = useState<boolean>(true);
  const [exportStatusMsg, setExportStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stRes, inRes, logRes] = await Promise.all([
        fetch('/api/students?limit=500'),
        fetch('/api/interventions'),
        fetch('/api/audit-logs'),
      ]);
      if (stRes.ok) {
        const d = await stRes.json();
        setStudents(d?.students || []);
      }
      if (inRes.ok) {
        const d = await inRes.json();
        setInterventions(d?.interventions || []);
      }
      if (logRes.ok) {
        const d = await logRes.json();
        setAuditLogs(d?.logs || []);
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerExportFeedback = (msg: string) => {
    setExportStatusMsg(msg);
    setTimeout(() => {
      setExportStatusMsg(prev => (prev === msg ? null : prev));
    }, 4500);
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Delete student failed:', err);
    }
  };

  const handleDeleteIntervention = async (id: string) => {
    try {
      const res = await fetch(`/api/interventions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInterventions(prev => prev.filter(i => i.id !== id));
      }
    } catch (err) {
      console.error('Delete intervention failed:', err);
    }
  };

  const handleClearAllInterventions = async () => {
    try {
      const res = await fetch('/api/interventions', { method: 'DELETE' });
      if (res.ok) {
        setInterventions([]);
      }
    } catch (err) {
      console.error('Clear interventions failed:', err);
    }
  };

  const handleDeleteAuditLog = async (id: string) => {
    try {
      const res = await fetch(`/api/audit-logs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAuditLogs(prev => prev.filter(l => l.id !== id));
      }
    } catch (err) {
      console.error('Delete audit log failed:', err);
    }
  };

  const handleClearAllAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs', { method: 'DELETE' });
      if (res.ok) {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Clear audit logs failed:', err);
    }
  };

  // Filtered student list for Student Performance Summary & other student reports
  const filteredStudents = (students || []).filter(s => {
    if (deptFilter !== 'All' && s.department !== deptFilter) return false;
    if (yearFilter !== 'All' && s.academicYear !== Number(yearFilter)) return false;
    if (riskFilter !== 'All' && s.currentRiskLevel !== riskFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.studentName.toLowerCase().includes(q);
      const matchRoll = s.studentId.toLowerCase().includes(q);
      const matchDept = s.department.toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchDept) return false;
    }
    return true;
  });

  const highRiskStudents = filteredStudents.filter(s => s.currentRiskLevel === 'High Risk');
  const mediumRiskStudents = filteredStudents.filter(s => s.currentRiskLevel === 'Medium Risk');
  const lowRiskStudents = filteredStudents.filter(s => s.currentRiskLevel === 'Low Risk');
  const lowAttendanceStudents = filteredStudents.filter(s => s.attendancePercentage < 75);

  // Cohort Summary Statistics
  const totalInScope = filteredStudents.length;
  const meanProjectedScore = totalInScope > 0
    ? Number((filteredStudents.reduce((acc, s) => acc + (s.latestPredictedScore || 70), 0) / totalInScope).toFixed(1))
    : 0;
  const meanAttendance = totalInScope > 0
    ? Number((filteredStudents.reduce((acc, s) => acc + s.attendancePercentage, 0) / totalInScope).toFixed(1))
    : 0;
  const meanInternal = totalInScope > 0
    ? Number((filteredStudents.reduce((acc, s) => acc + s.internalMarks, 0) / totalInScope).toFixed(1))
    : 0;
  const meanGpa = totalInScope > 0
    ? Number((filteredStudents.reduce((acc, s) => acc + s.previousGpa, 0) / totalInScope).toFixed(2))
    : 0;

  // Department Summary Breakdown
  const departmentList = [
    'Computer Science',
    'Data Science',
    'Information Technology',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Business Analytics',
  ];

  const departmentSummaryRows = departmentList.map(dept => {
    const ds = (students || []).filter(s => s.department === dept);
    const count = ds.length;
    const div = count || 1;
    const hr = ds.filter(s => s.currentRiskLevel === 'High Risk').length;
    const mr = ds.filter(s => s.currentRiskLevel === 'Medium Risk').length;
    const lr = ds.filter(s => s.currentRiskLevel === 'Low Risk').length;
    const avgScore = Number((ds.reduce((acc, s) => acc + (s.latestPredictedScore || 70), 0) / div).toFixed(1));
    const avgAtt = Number((ds.reduce((acc, s) => acc + s.attendancePercentage, 0) / div).toFixed(1));
    const avgInt = Number((ds.reduce((acc, s) => acc + s.internalMarks, 0) / div).toFixed(1));
    const avgGpa = Number((ds.reduce((acc, s) => acc + s.previousGpa, 0) / div).toFixed(2));
    return {
      department: dept,
      count,
      highRisk: hr,
      mediumRisk: mr,
      lowRisk: lr,
      avgScore: count > 0 ? avgScore : 0,
      avgAtt: count > 0 ? avgAtt : 0,
      avgInt: count > 0 ? avgInt : 0,
      avgGpa: count > 0 ? avgGpa : 0,
    };
  });

  // Helper to trigger browser file download for CSV
  const downloadCsvBlob = (csvString: string, filename: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Single Student Performance Summary (CSV)
  const exportSingleStudentCSV = (st: Student) => {
    const headers = [
      'Roll No / Student ID',
      'Student Name',
      'Email',
      'Department',
      'Academic Year',
      'Semester',
      'Attendance (%)',
      'Internal Marks (/100)',
      'Assignment Score (/100)',
      'Quiz Average (/100)',
      'Study Hours/Week',
      'Previous GPA (/10)',
      'Late Submissions',
      'LMS Participation (/100)',
      'Previous Semester Score (/100)',
      'Projected Final Score (/100)',
      'Academic Risk Level',
      'Advisor / Mentor',
    ];
    const row = [
      st.studentId,
      `"${st.studentName.replace(/"/g, '""')}"`,
      st.email,
      `"${st.department}"`,
      st.academicYear,
      st.semester,
      st.attendancePercentage,
      st.internalMarks,
      st.assignmentPerformance,
      st.quizAverage,
      st.studyHoursPerWeek,
      st.previousGpa,
      st.lateSubmissions,
      st.lmsParticipation,
      st.previousSemesterScore,
      st.latestPredictedScore ? st.latestPredictedScore.toFixed(1) : st.finalScore || 70,
      `"${st.currentRiskLevel}"`,
      `"${st.mentorName || 'Prof. Sarah Jenkins'}"`,
    ];

    const csvString = [headers.join(','), row.join(',')].join('\n');
    const filename = `student_performance_summary_${st.studentId}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsvBlob(csvString, filename);
    triggerExportFeedback(`Exported CSV summary for ${st.studentName} (${st.studentId})`);
  };

  // Export Single Student Performance Summary (PDF)
  const exportSingleStudentPDF = (st: Student) => {
    const doc = new jsPDF();
    doc.setFont('helvetica');

    // Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('Student Academic Performance Summary Dossier', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Roll No: ${st.studentId}  |  Generated: ${new Date().toLocaleString()}  |  Explainable AI Academic Platform`,
      14,
      24
    );

    // Student Identity Section
    let y = 44;
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`${st.studentName} (${st.studentId})`, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Department: ${st.department}  •  Academic Year ${st.academicYear}, Semester ${st.semester}  •  Email: ${st.email}`,
      14,
      y
    );
    y += 8;

    // Score & Risk Highlight Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, y, 182, 24, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('ML Projected Final Score:', 20, y + 10);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${(st.latestPredictedScore || 70).toFixed(1)} / 100`, 20, y + 18);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Academic Risk Classification:', 90, y + 10);
    doc.setFontSize(13);
    if (st.currentRiskLevel === 'High Risk') doc.setTextColor(225, 29, 72);
    else if (st.currentRiskLevel === 'Medium Risk') doc.setTextColor(217, 119, 6);
    else doc.setTextColor(5, 150, 105);
    doc.text(st.currentRiskLevel.toUpperCase(), 90, y + 18);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Faculty Mentor:', 150, y + 10);
    doc.setTextColor(15, 23, 42);
    doc.text(st.mentorName || 'Prof. Jenkins', 150, y + 18);

    y += 34;

    // Detailed Academic Metrics Table
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Academic & Behavioral Feature Breakdown', 14, y);
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, 196, y);
    y += 7;

    const metrics = [
      ['Lecture Attendance Percentage', `${st.attendancePercentage}%`, st.attendancePercentage >= 75 ? 'Meets 75% Institutional Target' : 'Below 75% Threshold (Action Needed)'],
      ['Internal Assessment Marks', `${st.internalMarks} / 100`, st.internalMarks >= 60 ? 'Satisfactory Midterm Mastery' : 'Needs Midterm Reinforcement'],
      ['Coursework & Assignment Score', `${st.assignmentPerformance} / 100`, `${st.lateSubmissions} Late Submission(s) Recorded`],
      ['Quiz & Formative Average', `${st.quizAverage} / 100`, 'Continuous Assessment Score'],
      ['Previous Cumulative GPA', `${st.previousGpa} / 10.0`, 'Historical Academic Baseline'],
      ['Previous Semester Score', `${st.previousSemesterScore} / 100`, 'Prior Term Final Grade'],
      ['Weekly Self-Study Hours', `${st.studyHoursPerWeek} hrs/week`, st.studyHoursPerWeek >= 14 ? 'Optimal Study Allocation' : 'Recommended: 15+ hrs/week'],
      ['LMS Digital Engagement Score', `${st.lmsParticipation} / 100`, 'Portal & Resource Activity'],
    ];

    doc.setFontSize(9.5);
    metrics.forEach(([label, val, note]) => {
      doc.setTextColor(51, 65, 85);
      doc.text(label, 16, y);
      doc.setTextColor(15, 23, 42);
      doc.text(val, 95, y);
      doc.setTextColor(100, 116, 139);
      doc.text(note, 130, y);
      y += 8;
    });

    y += 6;
    doc.line(14, y, 196, y);
    y += 8;

    // Student Interventions if any
    const stInterventions = (interventions || []).filter(i => i.studentId === st.id || i.studentId === st.studentId);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Logged Faculty Interventions (${stInterventions.length})`, 14, y);
    y += 7;

    doc.setFontSize(9);
    if (stInterventions.length === 0) {
      doc.setTextColor(100, 116, 139);
      doc.text('No formal advisory interventions logged for this student.', 16, y);
    } else {
      stInterventions.slice(0, 5).forEach(intv => {
        doc.setTextColor(15, 23, 42);
        doc.text(`• [${intv.status}] ${intv.interventionType} (${new Date(intv.createdAt).toLocaleDateString()}) — ${intv.facultyName}`, 16, y);
        y += 5;
        doc.setTextColor(71, 85, 105);
        doc.text(`  Notes: ${intv.notes.slice(0, 95)}`, 16, y);
        y += 7;
      });
    }

    const filename = `student_performance_summary_${st.studentId}.pdf`;
    doc.save(filename);
    triggerExportFeedback(`Exported PDF Dossier for ${st.studentName} (${st.studentId})`);
  };

  // Export Cohort / Active Report Tab (CSV)
  const exportCSV = () => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `faculty_${reportType}_export_${dateStamp}.csv`;
    const csvLines: string[] = [];

    if (includeExecutiveSummary && (reportType === 'performance_summary' || reportType === 'high_risk' || reportType === 'attendance')) {
      csvLines.push(`"EXPLAINABLE AI ACADEMIC PERFORMANCE SUMMARY REPORT"`);
      csvLines.push(`"Generated At","${new Date().toISOString()}","Scope","${reportType.toUpperCase()}"`);
      csvLines.push(`"Filters Applied","Department: ${deptFilter} | Year: ${yearFilter} | Risk: ${riskFilter}"`);
      csvLines.push(
        `"Total Students in Scope",${totalInScope},"Mean Projected Score",${meanProjectedScore},"Mean Attendance (%)",${meanAttendance},"Mean GPA",${meanGpa}`
      );
      csvLines.push(
        `"High Risk Count",${highRiskStudents.length},"Medium Risk Count",${mediumRiskStudents.length},"Low Risk Count",${lowRiskStudents.length}`
      );
      csvLines.push('');
    }

    if (reportType === 'performance_summary') {
      const headers = [
        'Roll No / Student ID',
        'Student Name',
        'Email',
        'Department',
        'Academic Year',
        'Semester',
        'Attendance (%)',
        'Internal Marks (/100)',
        ...(includeCourseworkDetails
          ? ['Assignment Score (/100)', 'Quiz Average (/100)', 'Study Hours/Week', 'Late Submissions', 'LMS Participation (/100)']
          : []),
        'Previous GPA (/10)',
        'Previous Semester Score (/100)',
        'Projected Final Score (/100)',
        'Risk Level',
        'Faculty Mentor',
      ];
      csvLines.push(headers.join(','));

      filteredStudents.forEach(s => {
        const row = [
          s.studentId,
          `"${s.studentName.replace(/"/g, '""')}"`,
          s.email,
          `"${s.department}"`,
          s.academicYear,
          s.semester,
          s.attendancePercentage,
          s.internalMarks,
          ...(includeCourseworkDetails
            ? [s.assignmentPerformance, s.quizAverage, s.studyHoursPerWeek, s.lateSubmissions, s.lmsParticipation]
            : []),
          s.previousGpa,
          s.previousSemesterScore,
          s.latestPredictedScore ? s.latestPredictedScore.toFixed(1) : '',
          `"${s.currentRiskLevel}"`,
          `"${s.mentorName || 'Prof. Sarah Jenkins'}"`,
        ];
        csvLines.push(row.join(','));
      });

      if (includeDepartmentStats) {
        csvLines.push('');
        csvLines.push('"DEPARTMENT BENCHMARK SUMMARY"');
        csvLines.push('Department,Total Students,High Risk,Medium Risk,Low Risk,Avg Projected Score,Avg Attendance (%),Avg Internal Marks,Avg GPA');
        departmentSummaryRows.forEach(d => {
          csvLines.push(
            `"${d.department}",${d.count},${d.highRisk},${d.mediumRisk},${d.lowRisk},${d.avgScore},${d.avgAtt},${d.avgInt},${d.avgGpa}`
          );
        });
      }
    } else if (reportType === 'high_risk') {
      const headers = ['Student ID', 'Name', 'Department', 'Year', 'Attendance %', 'Internal Marks', 'GPA', 'Projected Score', 'Risk Level'];
      csvLines.push(headers.join(','));
      highRiskStudents.forEach(s => {
        csvLines.push(
          [s.studentId, `"${s.studentName}"`, `"${s.department}"`, s.academicYear, s.attendancePercentage, s.internalMarks, s.previousGpa, s.latestPredictedScore || '', `"${s.currentRiskLevel}"`].join(',')
        );
      });
    } else if (reportType === 'attendance') {
      const headers = ['Student ID', 'Name', 'Department', 'Attendance %', 'Internal Marks', 'Projected Score', 'Late Submissions', 'Risk Level'];
      csvLines.push(headers.join(','));
      lowAttendanceStudents.forEach(s => {
        csvLines.push(
          [s.studentId, `"${s.studentName}"`, `"${s.department}"`, s.attendancePercentage, s.internalMarks, s.latestPredictedScore || '', s.lateSubmissions, `"${s.currentRiskLevel}"`].join(',')
        );
      });
    } else if (reportType === 'interventions') {
      const headers = ['Date', 'Student ID', 'Student Name', 'Department', 'Intervention Type', 'Advisor', 'Status', 'Notes'];
      csvLines.push(headers.join(','));
      interventions.forEach(i => {
        csvLines.push(
          [new Date(i.createdAt).toISOString().slice(0, 10), i.studentId, `"${i.studentName}"`, `"${i.department}"`, `"${i.interventionType}"`, `"${i.facultyName}"`, i.status, `"${(i.notes || '').replace(/"/g, '""')}"`].join(',')
        );
      });
    } else if (reportType === 'audit_logs') {
      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Details'];
      csvLines.push(headers.join(','));
      auditLogs.forEach(l => {
        csvLines.push(
          [l.timestamp, `"${l.userName}"`, l.role, l.action, `"${(l.details || '').replace(/"/g, '""')}"`].join(',')
        );
      });
    } else {
      const headers = ['Department', 'Total Students', 'High Risk Count', 'Medium Risk Count', 'Low Risk Count', 'Avg Score', 'Avg Attendance %', 'Avg Internal Marks', 'Avg GPA'];
      csvLines.push(headers.join(','));
      departmentSummaryRows.forEach(d => {
        csvLines.push(
          [`"${d.department}"`, d.count, d.highRisk, d.mediumRisk, d.lowRisk, d.avgScore, d.avgAtt, d.avgInt, d.avgGpa].join(',')
        );
      });
    }

    downloadCsvBlob(csvLines.join('\n'), filename);
    triggerExportFeedback(`Downloaded CSV (${filename}) with ${csvLines.length} rows`);
  };

  // Export Cohort / Active Report Tab (Multi-Page PDF Dossier)
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica');

    const addPageHeader = (pageTitle: string) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(pageTitle, 14, 13);
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated: ${new Date().toLocaleString()}  |  Filters: Dept=${deptFilter}, Year=${yearFilter}, Risk=${riskFilter}`,
        14,
        21
      );
    };

    addPageHeader('Explainable AI Student Performance Summary Report');
    let y = 36;

    // Executive Summary Box
    if (includeExecutiveSummary) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, y, 182, 24, 2, 2, 'FD');

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Cohort Scope: ${totalInScope} Students`, 18, y + 8);
      doc.text(`Mean Projected Score: ${meanProjectedScore} / 100`, 75, y + 8);
      doc.text(`Mean Attendance: ${meanAttendance}%`, 145, y + 8);

      doc.setFontSize(9);
      doc.setTextColor(225, 29, 72);
      doc.text(`High Risk: ${highRiskStudents.length}`, 18, y + 17);
      doc.setTextColor(217, 119, 6);
      doc.text(`Medium Risk: ${mediumRiskStudents.length}`, 60, y + 17);
      doc.setTextColor(5, 150, 105);
      doc.text(`Low Risk: ${lowRiskStudents.length}`, 108, y + 17);
      doc.setTextColor(71, 85, 105);
      doc.text(`Mean GPA: ${meanGpa} / 10`, 145, y + 17);

      y += 32;
    }

    // Department Breakdown Section (if enabled or on department tab)
    if (reportType === 'department' || (reportType === 'performance_summary' && includeDepartmentStats)) {
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Department Performance Summary Benchmarks', 14, y);
      y += 5;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, 'F');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Department', 16, y + 5);
      doc.text('Students', 75, y + 5);
      doc.text('Avg Score', 98, y + 5);
      doc.text('Attendance', 122, y + 5);
      doc.text('Avg GPA', 148, y + 5);
      doc.text('High Risk', 172, y + 5);
      y += 12;

      doc.setFontSize(8.5);
      departmentSummaryRows.forEach(d => {
        doc.setTextColor(15, 23, 42);
        doc.text(d.department, 16, y);
        doc.setTextColor(71, 85, 105);
        doc.text(String(d.count), 78, y);
        doc.text(`${d.avgScore}`, 100, y);
        doc.text(`${d.avgAtt}%`, 124, y);
        doc.text(`${d.avgGpa}`, 150, y);
        doc.setTextColor(225, 29, 72);
        doc.text(String(d.highRisk), 176, y);
        y += 6;
      });
      y += 6;
    }

    // Main Table Content
    if (reportType === 'performance_summary' || reportType === 'high_risk' || reportType === 'attendance') {
      const targetList =
        reportType === 'high_risk'
          ? highRiskStudents
          : reportType === 'attendance'
          ? lowAttendanceStudents
          : filteredStudents;

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Individual Student Performance Summary (${targetList.length} Records)`,
        14,
        y
      );
      y += 5;

      const drawStudentTableHeader = (topY: number) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(14, topY, 182, 7, 'F');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('Roll No / ID', 16, topY + 5);
        doc.text('Student Name', 50, topY + 5);
        doc.text('Department', 92, topY + 5);
        doc.text('Att %', 132, topY + 5);
        doc.text('Int', 146, topY + 5);
        doc.text('GPA', 158, topY + 5);
        doc.text('Score', 170, topY + 5);
        doc.text('Risk', 182, topY + 5);
        return topY + 11;
      };

      y = drawStudentTableHeader(y);

      targetList.slice(0, 120).forEach((s) => {
        if (y > 278) {
          doc.addPage();
          addPageHeader('Explainable AI Student Performance Summary (Continued)');
          y = drawStudentTableHeader(34);
        }
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(s.studentId.slice(0, 18), 16, y);
        doc.text(s.studentName.slice(0, 22), 50, y);
        doc.text(s.department.slice(0, 20), 92, y);
        doc.text(`${s.attendancePercentage}%`, 132, y);
        doc.text(`${s.internalMarks}`, 146, y);
        doc.text(`${s.previousGpa}`, 158, y);
        doc.text(`${s.latestPredictedScore ? s.latestPredictedScore.toFixed(1) : '—'}`, 170, y);

        if (s.currentRiskLevel === 'High Risk') doc.setTextColor(225, 29, 72);
        else if (s.currentRiskLevel === 'Medium Risk') doc.setTextColor(217, 119, 6);
        else doc.setTextColor(5, 150, 105);
        doc.text(s.currentRiskLevel.replace(' Risk', ''), 182, y);
        y += 6;
      });
    } else if (reportType === 'interventions') {
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Interventions & Advisory Log (${interventions.length} Records)`, 14, y);
      y += 7;

      interventions.slice(0, 40).forEach(i => {
        if (y > 275) {
          doc.addPage();
          addPageHeader('Interventions & Advisory Log (Continued)');
          y = 36;
        }
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(
          `${new Date(i.createdAt).toISOString().slice(0, 10)} | ${i.studentName} (${i.department}) | ${i.interventionType} [${i.status}]`,
          14,
          y
        );
        y += 5;
        doc.setTextColor(100, 116, 139);
        doc.text(`Advisor: ${i.facultyName} — "${(i.notes || '').slice(0, 90)}"`, 16, y);
        y += 7;
      });
    } else if (reportType === 'audit_logs') {
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`System Audit Log (${auditLogs.length} Events)`, 14, y);
      y += 7;

      auditLogs.slice(0, 45).forEach(l => {
        if (y > 275) {
          doc.addPage();
          addPageHeader('System Audit Log (Continued)');
          y = 36;
        }
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(`${new Date(l.timestamp).toLocaleTimeString()} | ${l.userName} (${l.role}) | ${l.action}`, 14, y);
        y += 4.5;
        doc.setTextColor(100, 116, 139);
        doc.text(`${l.details.slice(0, 100)}`, 16, y);
        y += 6.5;
      });
    }

    const pdfFilename = `faculty_${reportType}_summary_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(pdfFilename);
    triggerExportFeedback(`Downloaded PDF Dossier (${pdfFilename})`);
  };

  return (
    <div id="reports-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Faculty Student Performance Summary & Export Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter cohort performance summaries, customize report columns, and export downloadable PDF dossiers or CSV datasets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Performance Summary (CSV)</span>
          </button>
          <button
            onClick={exportPDF}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Export Performance Summary (PDF)</span>
          </button>
        </div>
      </div>

      {/* Export Confirmation Banner */}
      {exportStatusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportStatusMsg}</span>
          </div>
          <button
            onClick={() => setExportStatusMsg(null)}
            className="text-[11px] text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setReportType('performance_summary')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            reportType === 'performance_summary'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className={`w-5 h-5 mb-1.5 ${reportType === 'performance_summary' ? 'text-blue-600' : 'text-slate-400'}`} />
          <div className="font-bold text-xs text-slate-900">Performance Summary</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{filteredStudents.length} Students in Scope</div>
        </button>

        <button
          onClick={() => setReportType('high_risk')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            reportType === 'high_risk'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className={`w-5 h-5 mb-1.5 ${reportType === 'high_risk' ? 'text-rose-600' : 'text-slate-400'}`} />
          <div className="font-bold text-xs text-slate-900">High-Risk Audit</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{highRiskStudents.length} Flagged</div>
        </button>

        <button
          onClick={() => setReportType('department')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            reportType === 'department'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building className={`w-5 h-5 mb-1.5 ${reportType === 'department' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <div className="font-bold text-xs text-slate-900">Department Summary</div>
          <div className="text-[11px] text-slate-500 mt-0.5">6 Disciplines</div>
        </button>

        <button
          onClick={() => setReportType('attendance')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            reportType === 'attendance'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Activity className={`w-5 h-5 mb-1.5 ${reportType === 'attendance' ? 'text-purple-600' : 'text-slate-400'}`} />
          <div className="font-bold text-xs text-slate-900">Attendance Risk</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{lowAttendanceStudents.length} Below 75%</div>
        </button>

        <button
          onClick={() => setReportType('interventions')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            reportType === 'interventions'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className={`w-5 h-5 mb-1.5 ${reportType === 'interventions' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <div className="font-bold text-xs text-slate-900">Interventions</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{interventions.length} Action Plans</div>
        </button>

        <button
          onClick={() => setReportType('audit_logs')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            reportType === 'audit_logs'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className={`w-5 h-5 mb-1.5 ${reportType === 'audit_logs' ? 'text-amber-600' : 'text-slate-400'}`} />
          <div className="font-bold text-xs text-slate-900">System Audit Logs</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{auditLogs.length} Stored Events</div>
        </button>
      </div>

      {/* Export Scope Filters & Customizer Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Performance Summary Filter & Export Configuration
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeptFilter('All');
              setYearFilter('All');
              setRiskFilter('All');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Student / Roll No */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name or Roll No..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Departments</option>
            {departmentList.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Academic Years</option>
            <option value="1">Year 1 (Freshman)</option>
            <option value="2">Year 2 (Sophomore)</option>
            <option value="3">Year 3 (Junior)</option>
            <option value="4">Year 4 (Senior)</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Risk Classifications</option>
            <option value="High Risk">High Risk (&lt;50)</option>
            <option value="Medium Risk">Medium Risk (50–69)</option>
            <option value="Low Risk">Low Risk (&ge;70)</option>
          </select>
        </div>

        {/* Toggleable Report Sections for PDF & CSV */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-slate-700">Include in Export:</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeExecutiveSummary}
                onChange={(e) => setIncludeExecutiveSummary(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Executive KPI Summary Header</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDepartmentStats}
                onChange={(e) => setIncludeDepartmentStats(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Department Benchmark Table</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCourseworkDetails}
                onChange={(e) => setIncludeCourseworkDetails(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Extended Coursework & LMS Columns</span>
            </label>
          </div>
          <span className="text-[11px] text-slate-400">
            Ready to export <strong>{totalInScope}</strong> filtered student summaries
          </span>
        </div>
      </div>

      {/* Executive Performance Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Students in Export Scope</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalInScope}</div>
          <span className="text-[10px] text-slate-400">
            {highRiskStudents.length} High • {mediumRiskStudents.length} Med • {lowRiskStudents.length} Low Risk
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Mean Projected Final Score</span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{meanProjectedScore} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
          <span className="text-[10px] text-slate-400">Mean Internal Marks: {meanInternal}/100</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Mean Cohort Attendance</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{meanAttendance}%</div>
          <span className="text-[10px] text-rose-600 font-semibold">{lowAttendanceStudents.length} students &lt;75% min</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Mean Cumulative GPA</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{meanGpa} <span className="text-xs font-normal text-slate-400">/ 10.0</span></div>
          <span className="text-[10px] text-slate-400">Across selected academic filter</span>
        </div>
      </div>

      {/* Report Preview Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 capitalize">
              {reportType.replace('_', ' ')} Live Preview & Individual Export
            </h2>
            <p className="text-xs text-slate-500">
              Export the entire table above or download an individual student's PDF/CSV performance summary from any row
            </p>
          </div>
          <div className="flex items-center gap-2">
            {reportType === 'interventions' && interventions.length > 0 && (
              <button
                onClick={handleClearAllInterventions}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Interventions</span>
              </button>
            )}
            {reportType === 'audit_logs' && auditLogs.length > 0 && (
              <button
                onClick={handleClearAllAuditLogs}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Audit Logs</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {reportType === 'performance_summary' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Student & Roll No</th>
                  <th className="py-2.5 px-3">Department & Sem</th>
                  <th className="py-2.5 px-3">Attendance</th>
                  <th className="py-2.5 px-3">Internal</th>
                  {includeCourseworkDetails && (
                    <>
                      <th className="py-2.5 px-3">Assignments</th>
                      <th className="py-2.5 px-3">Study Hrs</th>
                    </>
                  )}
                  <th className="py-2.5 px-3">GPA</th>
                  <th className="py-2.5 px-3">Projected Score</th>
                  <th className="py-2.5 px-3">Risk Tier</th>
                  <th className="py-2.5 px-3 text-right">Individual Export & Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStudents.slice(0, 30).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{s.studentName}</div>
                      <div className="text-[10px] font-mono text-blue-600">{s.studentId}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{s.department}</div>
                      <div className="text-[10px] text-slate-400">Year {s.academicYear}, Sem {s.semester}</div>
                    </td>
                    <td className={`py-2.5 px-3 font-bold ${s.attendancePercentage < 75 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {s.attendancePercentage}%
                    </td>
                    <td className="py-2.5 px-3">{s.internalMarks}/100</td>
                    {includeCourseworkDetails && (
                      <>
                        <td className="py-2.5 px-3">{s.assignmentPerformance}/100</td>
                        <td className="py-2.5 px-3">{s.studyHoursPerWeek} hrs</td>
                      </>
                    )}
                    <td className="py-2.5 px-3">{s.previousGpa}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {s.latestPredictedScore ? s.latestPredictedScore.toFixed(1) : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <RiskBadge level={s.currentRiskLevel} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => exportSingleStudentPDF(s)}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Download Single Student PDF Dossier"
                        >
                          <FileText className="w-3 h-3 text-blue-300" />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => exportSingleStudentCSV(s)}
                          className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Download Single Student CSV Summary"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>CSV</span>
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete student record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'department' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Academic Department</th>
                  <th className="py-2.5 px-3">Enrolled Students</th>
                  <th className="py-2.5 px-3">Avg Projected Score</th>
                  <th className="py-2.5 px-3">Avg Attendance</th>
                  <th className="py-2.5 px-3">Avg Internal Marks</th>
                  <th className="py-2.5 px-3">Avg GPA</th>
                  <th className="py-2.5 px-3">Risk Breakdown (H / M / L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {departmentSummaryRows.map((d) => (
                  <tr key={d.department} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{d.department}</td>
                    <td className="py-3 px-3">{d.count}</td>
                    <td className="py-3 px-3 font-bold text-blue-700">{d.avgScore} / 100</td>
                    <td className="py-3 px-3">{d.avgAtt}%</td>
                    <td className="py-3 px-3">{d.avgInt}/100</td>
                    <td className="py-3 px-3">{d.avgGpa} / 10</td>
                    <td className="py-3 px-3">
                      <div className="inline-flex items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">{d.highRisk} High</span>
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">{d.mediumRisk} Med</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">{d.lowRisk} Low</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'high_risk' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Attendance</th>
                  <th className="py-2.5 px-3">Internal</th>
                  <th className="py-2.5 px-3">Predicted Score</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3 text-right">Export & Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(highRiskStudents || []).slice(0, 25).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.studentName} ({s.studentId})</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.department}</td>
                    <td className="py-2.5 px-3 text-rose-600 font-bold">{s.attendancePercentage}%</td>
                    <td className="py-2.5 px-3">{s.internalMarks}/100</td>
                    <td className="py-2.5 px-3 font-bold text-rose-700">{s.latestPredictedScore ? s.latestPredictedScore.toFixed(1) : '—'}</td>
                    <td className="py-2.5 px-3"><RiskBadge level={s.currentRiskLevel} size="sm" /></td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => exportSingleStudentPDF(s)}
                          className="px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-bold"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => exportSingleStudentCSV(s)}
                          className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete student record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'attendance' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Attendance</th>
                  <th className="py-2.5 px-3">Predicted Score</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3 text-right">Export & Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(lowAttendanceStudents || []).slice(0, 25).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.studentName} ({s.studentId})</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.department}</td>
                    <td className="py-2.5 px-3 text-rose-600 font-bold">{s.attendancePercentage}%</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{s.latestPredictedScore ? s.latestPredictedScore.toFixed(1) : '—'}</td>
                    <td className="py-2.5 px-3"><RiskBadge level={s.currentRiskLevel} size="sm" /></td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => exportSingleStudentPDF(s)}
                          className="px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-bold"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => exportSingleStudentCSV(s)}
                          className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete student record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'interventions' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Intervention Type</th>
                  <th className="py-2.5 px-3">Advisor</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(interventions || []).map(i => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-500">{new Date(i.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{i.studentName}</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-700">{i.interventionType}</td>
                    <td className="py-2.5 px-3 text-slate-600">{i.facultyName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {i.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{i.notes}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteIntervention(i.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete intervention"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'audit_logs' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(auditLogs || []).map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{new Date(l.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{l.userName}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-blue-600">{l.role}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800">{l.action}</td>
                    <td className="py-2.5 px-3 text-slate-600">{l.details}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteAuditLog(l.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete log entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
