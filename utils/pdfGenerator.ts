// FIX: Changed to a default import for jsPDF. The 'jspdf-autotable' plugin
// augments the default export, and the previous named import ('{ jsPDF }') did not have
// the correct type information for the plugin, causing errors with 'autoTable' and 'internal.getNumberOfPages'.
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { MonthlySummary, FacultyRecord } from '../types';

export const generateSummaryPDF = (data: MonthlySummary[], month: string, workingDays: number) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor('#38b2ac');
  doc.text('Faculty Attendance & Salary Summary', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor('#2d3748');
  const selectedDate = new Date(`${month}-02`); // Use day 2 to avoid timezone issues
  const monthYear = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  doc.text(`Report for: ${monthYear}`, 14, 32);
  doc.text(`Total Working Days in Month: ${workingDays}`, 14, 38);

  // Table
  const tableColumn = ["ID", "Name", "Dept", "Present", "CL Avail.", "CL Used", "Unpaid", "Permissions", "Half-Day", "Total Leaves", "Payable", "Salary (INR)"];
  const tableRows: any[][] = [];

  const sortedData = [...data].sort((a, b) => {
    const deptCompare = a.dept.localeCompare(b.dept);
    if (deptCompare !== 0) return deptCompare;

    const designationCompare = a.designation.localeCompare(b.designation);
    if (designationCompare !== 0) return designationCompare;

    return a.name.localeCompare(b.name);
  });

  sortedData.forEach(item => {
    const rowData = [
      item.empId,
      item.name,
      item.dept,
      item.presentDays,
      item.casualLeavesAvailable,
      item.casualLeavesUsed,
      item.unpaidLeave,
      item.permissions,
      item.halfDayLeaves,
      item.totalLeaves.toFixed(1),
      item.payableDays.toFixed(1),
      // FIX: The default jsPDF font doesn't support the Rupee symbol (₹).
      // Format as a plain number and specify the currency in the table header.
      item.calculatedSalary.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    ];
    tableRows.push(rowData);
  });

  // FIX: Cast `doc` to `any` to call the `autoTable` method from the jspdf-autotable plugin.
  // This is a workaround for a TypeScript type definition issue where the plugin's
  // method is not recognized on the jsPDF instance.
  (doc as any).autoTable({
    startY: 50,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
        fillColor: '#38b2ac',
        textColor: '#ffffff',
        fontStyle: 'bold',
    },
    styles: {
        fontSize: 8,
        cellPadding: 2,
    },
    alternateRowStyles: {
        fillColor: '#f7fafc'
    },
    footStyles: {
        fontStyle: 'bold',
        fillColor: '#e2e8f0'
    },
    columnStyles: {
        0: { cellWidth: 10, halign: 'right' },
        1: { cellWidth: 40 },
        2: { cellWidth: 25 },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 15, halign: 'right' },
        5: { cellWidth: 15, halign: 'right' },
        6: { cellWidth: 15, halign: 'right' },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 18, halign: 'right' },
        9: { cellWidth: 18, halign: 'right' },
        10: { cellWidth: 15, halign: 'right' },
        11: { cellWidth: 'auto', halign: 'right' },
    }
  });

  // FIX: Cast `doc.internal` to `any` to access `getNumberOfPages`. This is a workaround
  // for an incorrect or incomplete type definition for the jsPDF `internal` object.
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor('#718096');
    const text = `Page ${i} of ${pageCount} | Generated on: ${new Date().toLocaleDateString()}`;
    const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
    const textX = (doc.internal.pageSize.getWidth() - textWidth) / 2;
    doc.text(text, textX, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`attendance_summary_${month}.pdf`);
};

export const generateBriefSummaryPDF = (data: MonthlySummary[], month: string, workingDays: number) => {
  const doc = new jsPDF({ orientation: 'portrait' });
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor('#38b2ac');
  doc.text('Brief Faculty Salary Summary', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor('#2d3748');
  const selectedDate = new Date(`${month}-02`);
  const monthYear = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  doc.text(`Report for: ${monthYear}`, 14, 32);
  doc.text(`Total Working Days in Month: ${workingDays}`, 14, 38);

  // Table
  const tableColumn = ["S.No", "ID", "Name", "Dept", "Payable Days", "Salary (INR)"];
  const tableRows: any[][] = [];

  const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));

  sortedData.forEach((item, index) => {
    const rowData = [
      index + 1,
      item.empId,
      item.name,
      item.dept,
      item.payableDays.toFixed(1),
      item.calculatedSalary.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    ];
    tableRows.push(rowData);
  });

  (doc as any).autoTable({
    startY: 50,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
        fillColor: '#38b2ac',
        textColor: '#ffffff',
        fontStyle: 'bold',
    },
    styles: {
        fontSize: 9,
        cellPadding: 2,
    },
    alternateRowStyles: {
        fillColor: '#f7fafc'
    },
    columnStyles: {
        0: { cellWidth: 10, halign: 'right' },
        1: { cellWidth: 15, halign: 'right' },
        2: { cellWidth: 60 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 'auto', halign: 'right' },
    }
  });

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor('#718096');
    const text = `Page ${i} of ${pageCount} | Generated on: ${new Date().toLocaleDateString()}`;
    const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
    const textX = (doc.internal.pageSize.getWidth() - textWidth) / 2;
    doc.text(text, textX, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`brief_summary_${month}.pdf`);
};

export interface LeaveApplicationDetails {
    faculty: FacultyRecord;
    startDate: string;
    endDate: string;
    reason: string;
    leaveType: string;
    applicationId: string;
    submissionTimestamp: Date;
}

export const generateLeaveApplicationPDF = (details: LeaveApplicationDetails) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor('#38b2ac');
    doc.text('Leave Application', 105, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor('#2d3748');
    
    doc.text(`Submission Date: ${details.submissionTimestamp.toLocaleDateString()}`, 150, 30, { align: 'right' });
    doc.setFontSize(9);
    doc.setTextColor('#718096');
    doc.text(`Application ID: ${details.applicationId}`, 150, 35, { align: 'right' });
    doc.setFontSize(11);
    doc.setTextColor('#2d3748');

    doc.text('To,', 20, 45);
    doc.text('The Principal,', 20, 51);
    doc.text('[Your Institution Name],', 20, 57);
    doc.text('[Your Institution Address]', 20, 63);

    doc.setFont('helvetica', 'bold');
    doc.text(`Subject: Application for ${details.leaveType}`, 20, 75);
    doc.setFont('helvetica', 'normal');

    doc.text('Respected Sir/Madam,', 20, 85);

    const body = `I, ${details.faculty.name}, ${details.faculty.designation} in the Department of ${details.faculty.dept} (Emp. ID: ${details.faculty.empId}), am writing to formally request a leave of absence.

I would like to apply for ${details.leaveType} from ${details.startDate} to ${details.endDate}.

The reason for my leave is as follows:
${details.reason}

I have made the necessary arrangements for my duties and responsibilities to be covered during my absence to ensure that work is not disrupted.

I kindly request your approval for this leave. Thank you for your consideration.`;

    doc.text(body, 20, 95, { maxWidth: 170 });
    
    doc.text('Sincerely,', 20, 165);
    
    doc.text(details.faculty.name, 20, 180);
    doc.text(`(${details.faculty.designation})`, 20, 186);

    doc.save(`leave_application_${details.faculty.empId}_${details.startDate}.pdf`);
};