import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export function generatePayslipPDF(employee: any, salary: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // 1. Header Section
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138); // Indigo-900
  doc.text("AppDevs HR", 20, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Official Salary Statement / Payslip", 20, 28);
  
  // Right-side Date
  doc.setFontSize(9);
  doc.text(`Generated on: ${format(new Date(), "dd MMM, yyyy")}`, pageWidth - 20, 20, { align: "right" });
  doc.text(`Statement ID: PAY-${salary.id.slice(-8).toUpperCase()}`, pageWidth - 20, 25, { align: "right" });

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.line(20, 35, pageWidth - 20, 35);

  // 2. Employee Details Block
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYEE DETAILS", 20, 45);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  
  const leftCol = 20;
  const rightCol = pageWidth / 2 + 10;
  let y = 52;

  doc.text("Name:", leftCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text(employee.name, leftCol + 35, y);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Employee ID:", rightCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text(employee.employeeCode, rightCol + 35, y);
  
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Designation:", leftCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text(employee.designation, leftCol + 35, y);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Department:", rightCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text(employee.department || "General", rightCol + 35, y);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Pay Period:", leftCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text(format(new Date(salary.year, salary.month - 1), "MMMM yyyy"), leftCol + 35, y);

  // 3. Earnings & Deductions Tables
  y += 15;
  
  // Earnings Table
  autoTable(doc, {
    startY: y,
    head: [['Earnings (Allowances)', 'Amount (TK)']],
    body: [
      ['Basic Salary', salary.basicSalary.toLocaleString()],
      ['House Rent (HRA)', salary.hra.toLocaleString()],
      ['Medical Allowance', salary.medicalAllowance.toLocaleString()],
      ['Travel Allowance', salary.travelAllowance.toLocaleString()],
      ['Others / Bonuses', (salary.others + (salary.festivalBonus || 0)).toLocaleString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], fontSize: 11 },
    foot: [['Total Gross Earnings', salary.totalSalary.toLocaleString()]],
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
    margin: { left: 20, right: pageWidth / 2 + 5 }
  });

  // Deductions Table (Drawn manually or using another autoTable placed alongside)
  const deductionY = y;
  autoTable(doc, {
    startY: deductionY,
    head: [['Deductions', 'Amount (TK)']],
    body: [
      ['Advance Recovery', salary.advanceSalaryAmount.toLocaleString()],
      ['Loan Adjustment', salary.loanAdjustAmount.toLocaleString()],
      ['Tax / Others', '0.00'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [185, 28, 28], fontSize: 11 }, // Red-700
    foot: [['Total Deductions', (salary.advanceSalaryAmount + salary.loanAdjustAmount).toLocaleString()]],
    footStyles: { fillColor: [254, 242, 242], textColor: [185, 28, 28], fontStyle: 'bold' },
    margin: { left: pageWidth / 2 + 5, right: 20 }
  });

  // 4. Summary & Net Payable
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  doc.setDrawColor(30, 58, 138);
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(20, finalY, pageWidth - 40, 30, 3, 3, 'FD');
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("NET PAYABLE AMOUNT", pageWidth / 2, finalY + 10, { align: "center" });
  
  doc.setFontSize(24);
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.setFont("helvetica", "bold");
  doc.text(`TK. ${salary.totalSalaryPaid.toLocaleString()}`, pageWidth / 2, finalY + 22, { align: "center" });

  // 5. Footer & Authenticity
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150);
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.text("This is an electronically generated document. No signature is required.", pageWidth / 2, footerY, { align: "center" });
  doc.text("AppDevs HR Management System | Secure Portal", pageWidth / 2, footerY + 5, { align: "center" });

  // Save the PDF
  doc.save(`Payslip_${employee.employeeCode}_${format(new Date(salary.year, salary.month - 1), "MMM_yyyy")}.pdf`);
}
