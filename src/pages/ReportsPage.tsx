import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  AlertTriangle, 
  Users, 
  Activity, 
  CheckCircle2,
  Calendar,
  Building
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Student, Intervention } from '../types/index';
import { RiskBadge } from '../components/RiskBadge';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'high_risk' | 'department' | 'attendance' | 'interventions'>('high_risk');
  const [students, setStudents] = useState<Student[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stRes, inRes] = await Promise.all([
        fetch('/api/students?limit=250'),
        fetch('/api/interventions'),
      ]);
      if (stRes.ok) {
        const d = await stRes.json();
        setStudents(d?.students || []);
      }
      if (inRes.ok) {
        const d = await inRes.json();
        setInterventions(d?.interventions || []);
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const highRiskStudents = (students || []).filter(s => s.currentRiskLevel === 'High Risk');
  const lowAttendanceStudents = (students || []).filter(s => s.attendancePercentage < 75);

  const exportCSV = () => {
    let filename = `academic_report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    let headers: string[] = [];
    let rows: any[] = [];

    if (reportType === 'high_risk') {
      headers = ['Student ID', 'Name', 'Department', 'Attendance %', 'Internal Marks', 'GPA', 'Projected Score', 'Risk Level'];
      rows = (highRiskStudents || []).map(s => [
        s.studentId, `"${s.studentName}"`, `"${s.department}"`, s.attendancePercentage, s.internalMarks, s.previousGpa, s.latestPredictedScore || '', s.currentRiskLevel
      ]);
    } else if (reportType === 'attendance') {
      headers = ['Student ID', 'Name', 'Department', 'Attendance %', 'Projected Score', 'Late Subs', 'Risk Level'];
      rows = (lowAttendanceStudents || []).map(s => [
        s.studentId, `"${s.studentName}"`, `"${s.department}"`, s.attendancePercentage, s.latestPredictedScore || '', s.lateSubmissions, s.currentRiskLevel
      ]);
    } else if (reportType === 'interventions') {
      headers = ['Date', 'Student ID', 'Student Name', 'Department', 'Intervention Type', 'Advisor', 'Status', 'Notes'];
      rows = (interventions || []).map(i => [
        new Date(i.createdAt).toISOString().slice(0, 10), i.studentId, `"${i.studentName}"`, `"${i.department}"`, `"${i.interventionType}"`, `"${i.facultyName}"`, i.status, `"${(i.notes || '').replace(/"/g, '""')}"`
      ]);
    } else {
      headers = ['Department', 'Total Students', 'High Risk Count', 'Medium Risk Count', 'Avg Score', 'Avg Attendance'];
      const depts = ['Computer Science', 'Data Science', 'Information Technology', 'Electrical Engineering', 'Mechanical Engineering', 'Business Analytics'];
      rows = (depts || []).map(d => {
        const ds = (students || []).filter(s => s.department === d);
        const count = ds.length || 1;
        const hr = ds.filter(s => s.currentRiskLevel === 'High Risk').length;
        const mr = ds.filter(s => s.currentRiskLevel === 'Medium Risk').length;
        const avgScore = (ds.reduce((acc, s) => acc + (s.latestPredictedScore || 70), 0) / count).toFixed(1);
        const avgAtt = (ds.reduce((acc, s) => acc + s.attendancePercentage, 0) / count).toFixed(1);
        return [`"${d}"`, count, hr, mr, avgScore, avgAtt];
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...(rows || []).map(r => (r || []).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica');

    // Title
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Explainable AI Academic Performance Report', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated: ${new Date().toLocaleString()} | Scope: ${reportType.toUpperCase()}`, 14, 25);
    doc.text('Institutional Compliance: FERPA & Responsible Academic Guidance Charter', 14, 30);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 33, 196, 33);

    let y = 42;
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);

    if (reportType === 'high_risk') {
      doc.text(`High-Risk Student Watchlist (${highRiskStudents.length} Students)`, 14, y);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('ID', 14, y);
      doc.text('Name', 45, y);
      doc.text('Department', 90, y);
      doc.text('Attendance', 140, y);
      doc.text('Proj Score', 170, y);
      y += 6;

      doc.line(14, y - 2, 196, y - 2);

      highRiskStudents.slice(0, 25).forEach(s => {
        doc.text(s.studentId, 14, y);
        doc.text(s.studentName.slice(0, 20), 45, y);
        doc.text(s.department.slice(0, 22), 90, y);
        doc.text(`${s.attendancePercentage}%`, 140, y);
        doc.text(`${s.latestPredictedScore ? s.latestPredictedScore.toFixed(1) : '—'}`, 170, y);
        y += 6;
      });
    } else if (reportType === 'interventions') {
      doc.text(`Interventions & Advisory Tracking Log (${interventions.length} Records)`, 14, y);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Date', 14, y);
      doc.text('Student', 38, y);
      doc.text('Type', 80, y);
      doc.text('Advisor', 135, y);
      doc.text('Status', 170, y);
      y += 6;

      doc.line(14, y - 2, 196, y - 2);

      interventions.slice(0, 25).forEach(i => {
        doc.text(new Date(i.createdAt).toISOString().slice(0, 10), 14, y);
        doc.text(i.studentName.slice(0, 18), 38, y);
        doc.text(i.interventionType.slice(0, 24), 80, y);
        doc.text(i.facultyName.slice(0, 16), 135, y);
        doc.text(i.status, 170, y);
        y += 6;
      });
    } else {
      doc.text('Academic Cohort Summary Breakdown', 14, y);
      y += 8;
      doc.text(`Total Records Analyzed: ${students.length}`, 14, y);
      y += 6;
      doc.text(`High Risk Watchlist: ${highRiskStudents.length} students`, 14, y);
      y += 6;
      doc.text(`Attendance Below Threshold: ${lowAttendanceStudents.length} students`, 14, y);
    }

    doc.save(`academic_audit_report_${reportType}.pdf`);
  };

  return (
    <div id="reports-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Academic Reports & Compliance Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export official cohort audit dossiers, intervention histories, and department analytics in CSV & PDF
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download CSV Data</span>
          </button>
          <button
            onClick={exportPDF}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Official PDF Dossier</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setReportType('high_risk')}
          className={`p-4 rounded-xl border text-left transition-all ${
            reportType === 'high_risk'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className={`w-5 h-5 mb-2 ${reportType === 'high_risk' ? 'text-rose-600' : 'text-slate-400'}`} />
          <div className="font-bold text-xs text-slate-900">High-Risk Student Audit</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{highRiskStudents.length} Students Flagged</div>
        </button>

        <button
          onClick={() => setReportType('department')}
          className={`p-4 rounded-xl border text-left transition-all ${
            reportType === 'department'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building className={`w-5 h-5 mb-2 ${reportType === 'department' ? 'text-blue-600' : 'text-slate-400'}`} />
          <div className="font-bold text-xs text-slate-900">Department Performance</div>
          <div className="text-[11px] text-slate-500 mt-0.5">6 Academic Disciplines</div>
        </button>

        <button
          onClick={() => setReportType('attendance')}
          className={`p-4 rounded-xl border text-left transition-all ${
            reportType === 'attendance'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Activity className={`w-5 h-5 mb-2 ${reportType === 'attendance' ? 'text-purple-600' : 'text-slate-400'}`} />
          <div className="font-bold text-xs text-slate-900">Attendance Risk Audit</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{lowAttendanceStudents.length} Below 75% Min</div>
        </button>

        <button
          onClick={() => setReportType('interventions')}
          className={`p-4 rounded-xl border text-left transition-all ${
            reportType === 'interventions'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className={`w-5 h-5 mb-2 ${reportType === 'interventions' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <div className="font-bold text-xs text-slate-900">Intervention Tracking</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{interventions.length} Action Plans Logged</div>
        </button>
      </div>

      {/* Report Preview Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 capitalize">
              {reportType.replace('_', ' ')} Dossier Preview
            </h2>
            <p className="text-xs text-slate-500">Live preview of filtered cohort records prior to export</p>
          </div>
          <span className="text-xs text-slate-400">Showing top 15 records</span>
        </div>

        <div className="overflow-x-auto">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(highRiskStudents || []).slice(0, 15).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.studentName} ({s.studentId})</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.department}</td>
                    <td className="py-2.5 px-3 text-rose-600 font-bold">{s.attendancePercentage}%</td>
                    <td className="py-2.5 px-3">{s.internalMarks}/100</td>
                    <td className="py-2.5 px-3 font-bold text-rose-700">{s.latestPredictedScore ? s.latestPredictedScore.toFixed(1) : '—'}</td>
                    <td className="py-2.5 px-3"><RiskBadge level={s.currentRiskLevel} size="sm" /></td>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(interventions || []).slice(0, 15).map(i => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(reportType === 'department' || reportType === 'attendance') && (
            <div className="p-8 text-center text-slate-400 text-xs">
              Data table prepared. Click "Download CSV" or "Export Official PDF Dossier" above to generate the full document.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
