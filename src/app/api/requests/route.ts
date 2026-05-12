export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import {
  loanRequests,
  advanceSalaryRequests,
  leaveRequests,
  loans,
  advanceSalaries,
  notifications,
  employees
} from "@/lib/db/schema";
import { eq, and, gte, lte, gt, desc, count, inArray } from "drizzle-orm";

// GET - HR fetches all requests
export async function GET(req: Request) {
  try {
    const db = await getTenantDb();
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // loan | advance | leave
    const status = url.searchParams.get("status"); // PENDING | APPROVED | REJECTED | all
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");

    if (type === "loan") {
      // Build where conditions
      const conditions = [];
      if (status && status !== "all") conditions.push(eq(loanRequests.status, status));
      if (year) conditions.push(eq(loanRequests.startYear, parseInt(year)));
      if (month) conditions.push(eq(loanRequests.startMonth, parseInt(month)));

      const requests = await db
        .select()
        .from(loanRequests)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(loanRequests.createdAt));

      // Attach employee data
      const empIds = [...new Set(requests.map((r) => r.employeeId))];
      const emps = empIds.length
        ? await db
            .select({
              id: employees.id,
              name: employees.name,
              employeeCode: employees.employeeCode,
              designation: employees.designation,
              image: employees.image
            })
            .from(employees)
            .where(inArray(employees.id, empIds))
        : [];
      const empMap = Object.fromEntries(emps.map((e) => [e.id, e]));

      return NextResponse.json(requests.map((r) => ({ ...r, employee: empMap[r.employeeId] ?? null })));
    }

    if (type === "advance") {
      const conditions = [];
      if (status && status !== "all") conditions.push(eq(advanceSalaryRequests.status, status));
      if (year) conditions.push(eq(advanceSalaryRequests.year, parseInt(year)));
      if (month) conditions.push(eq(advanceSalaryRequests.month, parseInt(month)));

      const requests = await db
        .select()
        .from(advanceSalaryRequests)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(advanceSalaryRequests.createdAt));

      const empIds = [...new Set(requests.map((r) => r.employeeId))];
      const emps = empIds.length
        ? await db
            .select({
              id: employees.id,
              name: employees.name,
              employeeCode: employees.employeeCode,
              designation: employees.designation,
              image: employees.image
            })
            .from(employees)
            .where(inArray(employees.id, empIds))
        : [];
      const empMap = Object.fromEntries(emps.map((e) => [e.id, e]));

      return NextResponse.json(requests.map((r) => ({ ...r, employee: empMap[r.employeeId] ?? null })));
    }

    if (type === "leave") {
      const conditions = [];
      if (status && status !== "all") conditions.push(eq(leaveRequests.status, status));
      if (year) {
        const startDate = new Date(parseInt(year), 0, 1).toISOString();
        const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59).toISOString();
        conditions.push(gte(leaveRequests.fromDate, startDate));
        conditions.push(lte(leaveRequests.fromDate, endDate));
      }

      const requests = await db
        .select()
        .from(leaveRequests)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(leaveRequests.createdAt));

      const empIds = [...new Set(requests.map((r) => r.employeeId))];
      const emps = empIds.length
        ? await db
            .select({
              id: employees.id,
              name: employees.name,
              employeeCode: employees.employeeCode,
              designation: employees.designation,
              image: employees.image
            })
            .from(employees)
            .where(inArray(employees.id, empIds))
        : [];
      const empMap = Object.fromEntries(emps.map((e) => [e.id, e]));

      return NextResponse.json(requests.map((r) => ({ ...r, employee: empMap[r.employeeId] ?? null })));
    }

    // All counts for badge
    const [loanCountRow, advanceCountRow, leaveCountRow] = await Promise.all([
      db.select({ count: count() }).from(loanRequests).where(eq(loanRequests.status, "PENDING")).get(),
      db.select({ count: count() }).from(advanceSalaryRequests).where(eq(advanceSalaryRequests.status, "PENDING")).get(),
      db.select({ count: count() }).from(leaveRequests).where(eq(leaveRequests.status, "PENDING")).get()
    ]);
    const loanCount = loanCountRow?.count ?? 0;
    const advanceCount = advanceCountRow?.count ?? 0;
    const leaveCount = leaveCountRow?.count ?? 0;
    return NextResponse.json({ loanCount, advanceCount, leaveCount, total: loanCount + advanceCount + leaveCount });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// PATCH - HR approves or rejects a request
export async function PATCH(req: Request) {
  try {
    const db = await getTenantDb();
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // loan | advance | leave
    const body = (await req.json()) as any;
    const { id, action, hrNote } = body; // action: APPROVED | REJECTED

    if (!id || !action || !type) {
      return NextResponse.json({ message: "id, type, and action are required" }, { status: 400 });
    }

    // --- LOAN ---
    if (type === "loan") {
      const request = await db
        .update(loanRequests)
        .set({ status: action, hrNote: hrNote || null, updatedAt: now() })
        .where(eq(loanRequests.id, id))
        .returning()
        .get();

      if (!request) return NextResponse.json({ message: "Request not found" }, { status: 404 });

      // Fetch employee
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .get();

      if (action === "APPROVED") {
        // Check for existing active loan (dueAmount > 0)
        const existingLoan = await db
          .select()
          .from(loans)
          .where(and(eq(loans.employeeId, request.employeeId), gt(loans.dueAmount, 0)))
          .limit(1)
          .get();

        if (existingLoan) {
          // Top up existing loan
          await db
            .update(loans)
            .set({
              loanAmount: existingLoan.loanAmount + request.requestedAmount,
              dueAmount: existingLoan.dueAmount + request.requestedAmount,
              installmentAmount: request.installmentAmount ?? existingLoan.installmentAmount,
              startMonth: request.startMonth ?? existingLoan.startMonth,
              startYear: request.startYear ?? existingLoan.startYear,
              note: `${existingLoan.note ?? ""}\nTop-up: ${request.requestedAmount} approved on ${new Date().toLocaleDateString()}. Reason: ${request.reason}`,
              updatedAt: now()
            })
            .where(eq(loans.id, existingLoan.id));
        } else {
          // Create new Loan record
          await db.insert(loans).values({
            id: newId(),
            employeeId: request.employeeId,
            loanAmount: request.requestedAmount,
            paidAmount: 0,
            dueAmount: request.requestedAmount,
            installmentAmount: request.installmentAmount ?? 0,
            startMonth: request.startMonth,
            startYear: request.startYear,
            note: `Auto-created from request. Reason: ${request.reason}`,
            createdAt: now(),
            updatedAt: now()
          });
        }
      }

      // Notify employee
      await db.insert(notifications).values({
        id: newId(),
        employeeId: request.employeeId,
        title: `Loan Request ${action === "APPROVED" ? "Approved ✅" : "Rejected ❌"}`,
        message:
          action === "APPROVED"
            ? `Your loan request of ${request.requestedAmount} has been approved.`
            : `Your loan request was rejected. ${hrNote ? `Reason: ${hrNote}` : ""}`,
        type: "LOAN_UPDATE",
        createdAt: now(),
        updatedAt: now()
      });

      return NextResponse.json({ ...request, employee: employee ?? null });
    }

    // --- ADVANCE SALARY ---
    if (type === "advance") {
      const request = await db
        .update(advanceSalaryRequests)
        .set({ status: action, hrNote: hrNote || null, updatedAt: now() })
        .where(eq(advanceSalaryRequests.id, id))
        .returning()
        .get();

      if (!request) return NextResponse.json({ message: "Request not found" }, { status: 404 });

      // Fetch employee
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .get();

      if (action === "APPROVED") {
        // Check for existing advance in same month/year that isn't deducted yet
        const existingAdvance = await db
          .select()
          .from(advanceSalaries)
          .where(
            and(
              eq(advanceSalaries.employeeId, request.employeeId),
              eq(advanceSalaries.month, request.month),
              eq(advanceSalaries.year, request.year),
              eq(advanceSalaries.isDeducted, false)
            )
          )
          .limit(1)
          .get();

        if (existingAdvance) {
          await db
            .update(advanceSalaries)
            .set({
              amount: existingAdvance.amount + request.requestedAmount,
              note: `${existingAdvance.note ?? ""}\nAdditional: ${request.requestedAmount} added on ${new Date().toLocaleDateString()}. Reason: ${request.reason}`,
              updatedAt: now()
            })
            .where(eq(advanceSalaries.id, existingAdvance.id));
        } else {
          // Auto-create AdvanceSalary record
          await db.insert(advanceSalaries).values({
            id: newId(),
            employeeId: request.employeeId,
            amount: request.requestedAmount,
            month: request.month,
            year: request.year,
            isDeducted: false,
            note: `Auto-created from request. Reason: ${request.reason}`,
            createdAt: now(),
            updatedAt: now()
          });
        }
      }

      await db.insert(notifications).values({
        id: newId(),
        employeeId: request.employeeId,
        title: `Advance Salary Request ${action === "APPROVED" ? "Approved ✅" : "Rejected ❌"}`,
        message:
          action === "APPROVED"
            ? `Your advance salary request of ${request.requestedAmount} has been approved.`
            : `Your advance salary request was rejected. ${hrNote ? `Reason: ${hrNote}` : ""}`,
        type: "ADVANCE_UPDATE",
        createdAt: now(),
        updatedAt: now()
      });

      return NextResponse.json({ ...request, employee: employee ?? null });
    }

    // --- LEAVE ---
    // Leave approval only records the decision and notifies the employee.
    // Leave balance deduction is NOT automatic — HR manages leave balance manually.
    if (type === "leave") {
      const request = await db
        .update(leaveRequests)
        .set({ status: action, hrNote: hrNote || null, updatedAt: now() })
        .where(eq(leaveRequests.id, id))
        .returning()
        .get();

      if (!request) return NextResponse.json({ message: "Request not found" }, { status: 404 });

      // Fetch employee
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .get();

      await db.insert(notifications).values({
        id: newId(),
        employeeId: request.employeeId,
        title: `Leave Request ${action === "APPROVED" ? "Approved ✅" : "Rejected ❌"}`,
        message:
          action === "APPROVED"
            ? `Your leave request for ${request.days} day(s) has been approved by HR.`
            : `Your leave request was rejected. ${hrNote ? `Reason: ${hrNote}` : ""}`,
        type: "LEAVE_UPDATE",
        createdAt: now(),
        updatedAt: now()
      });

      return NextResponse.json({ ...request, employee: employee ?? null });
    }

    return NextResponse.json({ message: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
