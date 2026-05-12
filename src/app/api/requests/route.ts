import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

// GET - HR fetches all requests
export async function GET(req: Request) {
  try {
    const prisma = await getTenantPrisma();
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // loan | advance | leave
    const status = url.searchParams.get("status"); // PENDING | APPROVED | REJECTED | all
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");

    let whereClause: any = status && status !== "all" ? { status } : {};

    // Apply period filters
    if (year || month) {
      if (type === "loan") {
        if (year) whereClause.startYear = parseInt(year);
        if (month) whereClause.startMonth = parseInt(month);
      } else if (type === "advance") {
        if (year) whereClause.year = parseInt(year);
        if (month) whereClause.month = parseInt(month);
      } else if (type === "leave") {
        // For leaves, we filter by fromDate year/month
        if (year) {
          const startDate = new Date(parseInt(year), 0, 1);
          const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
          whereClause.fromDate = { gte: startDate, lte: endDate };
        }
        // Month filtering for leaves is more complex with Prisma, 
        // usually we do year filtering for leaves or rely on createdAt for simple history
      }
    }

    if (type === "loan") {
      const requests = await (prisma as any).loanRequest.findMany({
        where: whereClause,
        include: { employee: { select: { id: true, name: true, employeeCode: true, designation: true, image: true } } },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(requests);
    }

    if (type === "advance") {
      const requests = await (prisma as any).advanceSalaryRequest.findMany({
        where: whereClause,
        include: { employee: { select: { id: true, name: true, employeeCode: true, designation: true, image: true } } },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(requests);
    }

    if (type === "leave") {
      const requests = await (prisma as any).leaveRequest.findMany({
        where: whereClause,
        include: { employee: { select: { id: true, name: true, employeeCode: true, designation: true, image: true } } },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(requests);
    }

    // All counts for badge
    const [loanCount, advanceCount, leaveCount] = await Promise.all([
      (prisma as any).loanRequest.count({ where: { status: "PENDING" } }),
      (prisma as any).advanceSalaryRequest.count({ where: { status: "PENDING" } }),
      (prisma as any).leaveRequest.count({ where: { status: "PENDING" } }),
    ]);
    return NextResponse.json({ loanCount, advanceCount, leaveCount, total: loanCount + advanceCount + leaveCount });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// PATCH - HR approves or rejects a request
export async function PATCH(req: Request) {
  try {
    const prisma = await getTenantPrisma();
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // loan | advance | leave
    const body = await req.json();
    const { id, action, hrNote } = body; // action: APPROVED | REJECTED

    if (!id || !action || !type) {
      return NextResponse.json({ message: "id, type, and action are required" }, { status: 400 });
    }

    // ─── LOAN ────────────────────────────────────────────────────────────────
    if (type === "loan") {
      const request = await (prisma as any).loanRequest.update({
        where: { id },
        data: { status: action, hrNote: hrNote || null },
        include: { employee: true }
      });

      if (action === "APPROVED") {
        // Check for existing active loan (dueAmount > 0)
        const existingLoan = await prisma.loan.findFirst({
          where: { employeeId: request.employeeId, dueAmount: { gt: 0 } }
        });

        if (existingLoan) {
          // Top up existing loan
          await prisma.loan.update({
            where: { id: existingLoan.id },
            data: {
              loanAmount: { increment: request.requestedAmount },
              dueAmount: { increment: request.requestedAmount },
              installmentAmount: request.installmentAmount || existingLoan.installmentAmount,
              startMonth: request.startMonth || existingLoan.startMonth,
              startYear: request.startYear || existingLoan.startYear,
              note: `${existingLoan.note}\nTop-up: ${request.requestedAmount} approved on ${new Date().toLocaleDateString()}. Reason: ${request.reason}`
            }
          });
        } else {
          // Create new Loan record
          await prisma.loan.create({
            data: {
              employeeId: request.employeeId,
              loanAmount: request.requestedAmount,
              paidAmount: 0,
              dueAmount: request.requestedAmount,
              installmentAmount: request.installmentAmount || 0,
              startMonth: request.startMonth,
              startYear: request.startYear,
              note: `Auto-created from request. Reason: ${request.reason}`,
            }
          });
        }
      }

      // Notify employee
      await prisma.notification.create({
        data: {
          employeeId: request.employeeId,
          title: `Loan Request ${action === "APPROVED" ? "Approved ✅" : "Rejected ❌"}`,
          message: action === "APPROVED"
            ? `Your loan request of ${request.requestedAmount} has been approved.`
            : `Your loan request was rejected. ${hrNote ? `Reason: ${hrNote}` : ""}`,
          type: "LOAN_UPDATE"
        }
      });

      return NextResponse.json(request);
    }

    // ─── ADVANCE SALARY ───────────────────────────────────────────────────────
    if (type === "advance") {
      const request = await (prisma as any).advanceSalaryRequest.update({
        where: { id },
        data: { status: action, hrNote: hrNote || null },
        include: { employee: true }
      });

      if (action === "APPROVED") {
        // Check for existing advance in same month/year that isn't deducted yet
        const existingAdvance = await prisma.advanceSalary.findFirst({
          where: { 
            employeeId: request.employeeId, 
            month: request.month, 
            year: request.year,
            isDeducted: false
          }
        });

        if (existingAdvance) {
          await prisma.advanceSalary.update({
            where: { id: existingAdvance.id },
            data: { 
              amount: { increment: request.requestedAmount },
              note: `${existingAdvance.note}\nAdditional: ${request.requestedAmount} added on ${new Date().toLocaleDateString()}. Reason: ${request.reason}`
            }
          });
        } else {
          // Auto-create AdvanceSalary record
          await prisma.advanceSalary.create({
            data: {
              employeeId: request.employeeId,
              amount: request.requestedAmount,
              month: request.month,
              year: request.year,
              isDeducted: false,
              note: `Auto-created from request. Reason: ${request.reason}`,
            }
          });
        }
      }

      await prisma.notification.create({
        data: {
          employeeId: request.employeeId,
          title: `Advance Salary Request ${action === "APPROVED" ? "Approved ✅" : "Rejected ❌"}`,
          message: action === "APPROVED"
            ? `Your advance salary request of ${request.requestedAmount} has been approved.`
            : `Your advance salary request was rejected. ${hrNote ? `Reason: ${hrNote}` : ""}`,
          type: "ADVANCE_UPDATE"
        }
      });

      return NextResponse.json(request);
    }

    // ─── LEAVE ────────────────────────────────────────────────────────────────
    // Leave approval only records the decision and notifies the employee.
    // Leave balance deduction is NOT automatic — HR manages leave balance manually.
    if (type === "leave") {
      const request = await (prisma as any).leaveRequest.update({
        where: { id },
        data: { status: action, hrNote: hrNote || null },
        include: { employee: true }
      });

      await prisma.notification.create({
        data: {
          employeeId: request.employeeId,
          title: `Leave Request ${action === "APPROVED" ? "Approved ✅" : "Rejected ❌"}`,
          message: action === "APPROVED"
            ? `Your leave request for ${request.days} day(s) has been approved by HR.`
            : `Your leave request was rejected. ${hrNote ? `Reason: ${hrNote}` : ""}`,
          type: "LEAVE_UPDATE"
        }
      });

      return NextResponse.json(request);
    }

    return NextResponse.json({ message: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
