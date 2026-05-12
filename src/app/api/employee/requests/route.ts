export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { loanRequests, advanceSalaryRequests, leaveRequests, notifications, employees, salaryStructures, loans } from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

// GET - Employee fetches their own requests
export async function GET(req: Request) {
  try {
    const employeeId = await getEmployeeIdFromSession();
    if (!employeeId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const db = await getTenantDb();
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // loan | advance | leave

    if (type === "loan") {
      const requests = await db
        .select()
        .from(loanRequests)
        .where(eq(loanRequests.employeeId, employeeId))
        .orderBy(desc(loanRequests.createdAt));
      return NextResponse.json(requests);
    }

    if (type === "advance") {
      const requests = await db
        .select()
        .from(advanceSalaryRequests)
        .where(eq(advanceSalaryRequests.employeeId, employeeId))
        .orderBy(desc(advanceSalaryRequests.createdAt));
      return NextResponse.json(requests);
    }

    if (type === "leave") {
      const requests = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.employeeId, employeeId))
        .orderBy(desc(leaveRequests.createdAt));
      return NextResponse.json(requests);
    }

    // Return all
    const [loanReqs, advanceReqs, leaveReqs] = await Promise.all([
      db.select().from(loanRequests).where(eq(loanRequests.employeeId, employeeId)).orderBy(desc(loanRequests.createdAt)),
      db.select().from(advanceSalaryRequests).where(eq(advanceSalaryRequests.employeeId, employeeId)).orderBy(desc(advanceSalaryRequests.createdAt)),
      db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId)).orderBy(desc(leaveRequests.createdAt)),
    ]);
    return NextResponse.json({ loans: loanReqs, advances: advanceReqs, leaves: leaveReqs });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST - Employee submits a request
export async function POST(req: Request) {
  try {
    const employeeId = await getEmployeeIdFromSession();
    if (!employeeId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const db = await getTenantDb();
    const body = (await req.json()) as any;
    const { type, ...data } = body;

    // Fetch employee salary structure and active loans for validation
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .get();

    const empSalaryStructure = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.employeeId, employeeId))
      .get();

    const empLoans = await db
      .select()
      .from(loans)
      .where(and(eq(loans.employeeId, employeeId), gt(loans.dueAmount, 0)));

    const salary = empSalaryStructure?.totalSalary || 0;

    if (type === "loan") {
      const requestedAmount = parseFloat(data.requestedAmount);
      const installmentAmount = parseFloat(data.installmentAmount);

      if (installmentAmount > requestedAmount) {
        return NextResponse.json({ message: "Monthly installment cannot be greater than the total requested amount." }, { status: 400 });
      }

      if (installmentAmount > salary) {
        return NextResponse.json({ message: `Monthly installment cannot exceed your total salary of ${salary}.` }, { status: 400 });
      }

      const request = await db
        .insert(loanRequests)
        .values({
          id: newId(),
          employeeId,
          requestedAmount,
          installmentAmount,
          startMonth: data.startMonth ? parseInt(data.startMonth) : null,
          startYear: data.startYear ? parseInt(data.startYear) : null,
          reason: data.reason,
          createdAt: now(),
          updatedAt: now()
        })
        .returning()
        .get();

      // Notify HR
      await db.insert(notifications).values({
        id: newId(),
        employeeId: null,
        title: "New Loan Request",
        message: `${employee?.name} applied for a loan of ${requestedAmount}`,
        type: "LOAN_REQUEST",
        createdAt: now(),
        updatedAt: now()
      });

      return NextResponse.json(request);
    }

    if (type === "advance") {
      const requestedAmount = parseFloat(data.requestedAmount);
      const targetMonth = parseInt(data.month);
      const targetYear = parseInt(data.year);

      // Calculate existing loan installments for that month
      let totalLoanInstallments = 0;
      if (empLoans) {
        empLoans.forEach((loan: any) => {
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

      const request = await db
        .insert(advanceSalaryRequests)
        .values({
          id: newId(),
          employeeId,
          requestedAmount,
          month: targetMonth,
          year: targetYear,
          reason: data.reason,
          createdAt: now(),
          updatedAt: now()
        })
        .returning()
        .get();

      await db.insert(notifications).values({
        id: newId(),
        employeeId: null,
        title: "New Advance Salary Request",
        message: `${employee?.name} applied for advance salary of ${requestedAmount}`,
        type: "ADVANCE_REQUEST",
        createdAt: now(),
        updatedAt: now()
      });

      return NextResponse.json(request);
    }

    if (type === "leave") {
      const request = await db
        .insert(leaveRequests)
        .values({
          id: newId(),
          employeeId,
          fromDate: new Date(data.fromDate).toISOString(),
          toDate: new Date(data.toDate).toISOString(),
          days: parseFloat(data.days),
          reason: data.reason,
          createdAt: now(),
          updatedAt: now()
        })
        .returning()
        .get();

      await db.insert(notifications).values({
        id: newId(),
        employeeId: null,
        title: "New Leave Request",
        message: `${employee?.name} applied for ${data.days} day(s) leave`,
        type: "LEAVE_REQUEST",
        createdAt: now(),
        updatedAt: now()
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
