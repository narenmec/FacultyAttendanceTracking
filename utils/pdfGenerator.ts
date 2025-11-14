// FIX: Changed to a default import for jsPDF. The 'jspdf-autotable' plugin
// augments the default export, and the previous named import ('{ jsPDF }') did not have
// the correct type information for the plugin, causing errors with 'autoTable' and 'internal.getNumberOfPages'.
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { MonthlySummary } from '../types';

export const generateSummaryPDF = (data: MonthlySummary[], month: string, workingDays: number) => {
  const doc = new jsPDF();
  
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
  const tableColumn = ["ID", "Name", "Dept", "Designation", "Present", "Perm.", "Leaves", "Payable", "Salary (INR)"];
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
      item.designation,
      item.presentDays,
      item.permissions,
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
        fontSize: 9,
        cellPadding: 2,
    },
    alternateRowStyles: {
        fillColor: '#f7fafc'
    },
    footStyles: {
        fontStyle: 'bold',
        fillColor: '#e2e8f0'
    },
    // Set explicit column widths to prevent text wrapping and improve layout.
    // The final column ('auto') will take up the remaining space.
    columnStyles: {
        0: { cellWidth: 10, halign: 'right' },   // Emp. ID
        1: { cellWidth: 40 },                    // Name
        2: { cellWidth: 25 },                    // Dept
        3: { cellWidth: 25 },                    // Designation
        4: { cellWidth: 15, halign: 'right' },   // Present
        5: { cellWidth: 15, halign: 'right' },   // Permissions
        6: { cellWidth: 15, halign: 'right' },   // Leaves
        7: { cellWidth: 15, halign: 'right' },   // Payable Days
        8: { cellWidth: 'auto', halign: 'right' }, // Salary (INR)
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
