export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

// GET - Employee fetches their own requests
export async function GET(req: Request) {
  try {
    const employeeId = await getEmployeeIdFromSession();
    if (!employeeId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const prisma = await getTenantPrisma();
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // loan | advance | leave

    if (type === "loan") {
      const requests = await (prisma as any).loanRequest.findMany({
        where: { employeeId },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(requests);
    }

    if (type === "advance") {
      const requests = await (prisma as any).advanceSalaryRequest.findMany({
        where: { employeeId },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(requests);
    }

    if (type === "leave") {
      const requests = await (prisma as any).leaveRequest.findMany({
        where: { employeeId },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(requests);
    }

    // Return all
    const [loans, advances, leaves] = await Promise.all([
      (prisma as any).loanRequest.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } }),
      (prisma as any).advanceSalaryRequest.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } }),
      (prisma as any).leaveRequest.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } }),
    ]);
    return NextResponse.json({ loans, advances, leaves });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST - Employee submits a request
export async function POST(req: Request) {
  try {
    const employeeId = await getEmployeeIdFromSession();
    if (!employeeId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const prisma = await getTenantPrisma();
    const body = (await req.json()) as any;
    const { type, ...data } = body;

    // Fetch employee salary structure and active loans for validation
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        salaryStructure: true,
        loans: { where: { dueAmount: { gt: 0 } } }
      }
    });

    const salary = employee?.salaryStructure?.totalSalary || 0;

    if (type === "loan") {
      const requestedAmount = parseFloat(data.requestedAmount);
      const installmentAmount = parseFloat(data.installmentAmount);
      
      if (installmentAmount > requestedAmount) {
        return NextResponse.json({ message: "Monthly installment cannot be greater than the total requested amount." }, { status: 400 });
      }
      
      if (installmentAmount > salary) {
        return NextResponse.json({ message: `Monthly installment cannot exceed your total salary of ${salary}.` }, { status: 400 });
      }

      const request = await (prisma as any).loanRequest.create({
        data: {
          employeeId,
          requestedAmount: requestedAmount,
          installmentAmount: installmentAmount,
          startMonth: data.startMonth ? parseInt(data.startMonth) : null,
          startYear: data.startYear ? parseInt(data.startYear) : null,
          reason: data.reason,
        }
      });
      // Notify HR
      await prisma.notification.create({
        data: {
          employeeId: null,
          title: "New Loan Request",
          message: `${employee?.name} applied for a loan of ${requestedAmount}`,
          type: "LOAN_REQUEST"
        }
      });
      return NextResponse.json(request);
    }

    if (type === "advance") {
      const requestedAmount = parseFloat(data.requestedAmount);
      const targetMonth = parseInt(data.month);
      const targetYear = parseInt(data.year);

      // Calculate existing loan installments for that month
      let totalLoanInstallments = 0;
      if (employee?.loans) {
        employee.loans.forEach((loan: any) => {
          // If loan starts on or before target month/year
          const startMonth = loan.startMonth || 1;
          const startYear = loan.startYear || 0;
          if (targetYear > startYear || (targetYear === startYear && targetMonth >= startMonth)) {
             totalLoanInstallments += loan.installmentAmount;
          }
        });
      }

      const maxAvailable = salary - totalLoanInstallments;

      if (requestedAmount > maxAvailable) {
        return NextResponse.json({ 
          message: maxAvailable > 0 
            ? `You can request a maximum of ${maxAvailable} as advance for this month (Your salary: ${salary}, Active loan deduction: ${totalLoanInstallments}).`
            : `You cannot request an advance because your active loan installment (${totalLoanInstallments}) already exceeds or equals your monthly salary (${salary}).`
        }, { status: 400 });
      }

      const request = await (prisma as any).advanceSalaryRequest.create({
        data: {
          employeeId,
          requestedAmount: requestedAmount,
          month: targetMonth,
          year: targetYear,
          reason: data.reason,
        }
      });
      await prisma.notification.create({
        data: {
          employeeId: null,
          title: "New Advance Salary Request",
          message: `${employee?.name} applied for advance salary of ${requestedAmount}`,
          type: "ADVANCE_REQUEST"
        }
      });
      return NextResponse.json(request);
    }

    if (type === "leave") {
      const request = await (prisma as any).leaveRequest.create({
        data: {
          employeeId,
          fromDate: new Date(data.fromDate),
          toDate: new Date(data.toDate),
          days: parseFloat(data.days),
          reason: data.reason,
        }
      });
      await prisma.notification.create({
        data: {
          employeeId: null,
          title: "New Leave Request",
          message: `${employee?.name} applied for ${data.days} day(s) leave`,
          type: "LEAVE_REQUEST"
        }
      });
      return NextResponse.json(request);
    }

    return NextResponse.json({ message: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("Request API Error:", error);
    return NextResponse.json({ 
      message: "An error occurred while processing your request. Please try again later." 
    }, { status: 500 });
  }
}

