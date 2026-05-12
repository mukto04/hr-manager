export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { loans, advanceSalaries, monthlySalaries, officeCosts, employees } from "@/lib/db/schema";
import { eq, and, gt, asc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const db = await getTenantDb();

    const [loansRaw, advancesRaw, salariesRaw, officeCostsData] = await Promise.all([
      // 1. Running Loans (employees with outstanding debt)
      db
        .select({
          id: loans.id,
          employeeId: loans.employeeId,
          loanAmount: loans.loanAmount,
          paidAmount: loans.paidAmount,
          dueAmount: loans.dueAmount,
          installmentAmount: loans.installmentAmount,
          startMonth: loans.startMonth,
          startYear: loans.startYear,
          note: loans.note,
          createdAt: loans.createdAt,
          updatedAt: loans.updatedAt,
          employeeName: employees.name,
          employeeCode: employees.employeeCode,
          employeeDesignation: employees.designation,
        })
        .from(loans)
        .leftJoin(employees, eq(loans.employeeId, employees.id))
        .where(gt(loans.dueAmount, 0))
        .orderBy(asc(employees.name)),

      // 2. Advance Salary for the month
      db
        .select({
          id: advanceSalaries.id,
          employeeId: advanceSalaries.employeeId,
          amount: advanceSalaries.amount,
          month: advanceSalaries.month,
          year: advanceSalaries.year,
          isDeducted: advanceSalaries.isDeducted,
          note: advanceSalaries.note,
          createdAt: advanceSalaries.createdAt,
          updatedAt: advanceSalaries.updatedAt,
          employeeName: employees.name,
          employeeCode: employees.employeeCode,
          employeeDesignation: employees.designation,
        })
        .from(advanceSalaries)
        .leftJoin(employees, eq(advanceSalaries.employeeId, employees.id))
        .where(and(eq(advanceSalaries.month, month), eq(advanceSalaries.year, year)))
        .orderBy(asc(employees.name)),

      // 3. Monthly Salary (Payroll) for the month
      db
        .select({
          id: monthlySalaries.id,
          employeeId: monthlySalaries.employeeId,
          month: monthlySalaries.month,
          year: monthlySalaries.year,
          totalSalary: monthlySalaries.totalSalary,
          workingDays: monthlySalaries.workingDays,
          workingDaySalary: monthlySalaries.workingDaySalary,
          advanceSalaryAmount: monthlySalaries.advanceSalaryAmount,
          loanAdjustAmount: monthlySalaries.loanAdjustAmount,
          leaveDeductionAmount: monthlySalaries.leaveDeductionAmount,
          payableSalary: monthlySalaries.payableSalary,
          basicSalary: monthlySalaries.basicSalary,
          hra: monthlySalaries.hra,
          medicalAllowance: monthlySalaries.medicalAllowance,
          travelAllowance: monthlySalaries.travelAllowance,
          others: monthlySalaries.others,
          festivalBonus: monthlySalaries.festivalBonus,
          totalSalaryPaid: monthlySalaries.totalSalaryPaid,
          isPaid: monthlySalaries.isPaid,
          isHeld: monthlySalaries.isHeld,
          breakdown: monthlySalaries.breakdown,
          advanceSalary: monthlySalaries.advanceSalary,
          loanAdjust: monthlySalaries.loanAdjust,
          status: monthlySalaries.status,
          createdAt: monthlySalaries.createdAt,
          updatedAt: monthlySalaries.updatedAt,
          employeeName: employees.name,
          employeeCode: employees.employeeCode,
          employeeDesignation: employees.designation,
          employeeDepartment: employees.department,
        })
        .from(monthlySalaries)
        .leftJoin(employees, eq(monthlySalaries.employeeId, employees.id))
        .where(and(eq(monthlySalaries.month, month), eq(monthlySalaries.year, year)))
        .orderBy(asc(employees.name)),

      // 4. Office Cost (Daily Expenses) for the month
      db
        .select()
        .from(officeCosts)
        .where(and(eq(officeCosts.month, month), eq(officeCosts.year, year)))
        .orderBy(asc(officeCosts.date)),
    ]);

    // Shape the joined data to match Prisma include format
    const loansResult = loansRaw.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      loanAmount: r.loanAmount,
      paidAmount: r.paidAmount,
      dueAmount: r.dueAmount,
      installmentAmount: r.installmentAmount,
      startMonth: r.startMonth,
      startYear: r.startYear,
      note: r.note,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      employee: {
        name: r.employeeName,
        employeeCode: r.employeeCode,
        designation: r.employeeDesignation,
      },
    }));

    const advancesResult = advancesRaw.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      amount: r.amount,
      month: r.month,
      year: r.year,
      isDeducted: r.isDeducted,
      note: r.note,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      employee: {
        name: r.employeeName,
        employeeCode: r.employeeCode,
        designation: r.employeeDesignation,
      },
    }));

    const salariesResult = salariesRaw.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      month: r.month,
      year: r.year,
      totalSalary: r.totalSalary,
      workingDays: r.workingDays,
      workingDaySalary: r.workingDaySalary,
      advanceSalaryAmount: r.advanceSalaryAmount,
      loanAdjustAmount: r.loanAdjustAmount,
      leaveDeductionAmount: r.leaveDeductionAmount,
      payableSalary: r.payableSalary,
      basicSalary: r.basicSalary,
      hra: r.hra,
      medicalAllowance: r.medicalAllowance,
      travelAllowance: r.travelAllowance,
      others: r.others,
      festivalBonus: r.festivalBonus,
      totalSalaryPaid: r.totalSalaryPaid,
      isPaid: r.isPaid,
      isHeld: r.isHeld,
      breakdown: r.breakdown,
      advanceSalary: r.advanceSalary,
      loanAdjust: r.loanAdjust,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      employee: {
        name: r.employeeName,
        employeeCode: r.employeeCode,
        designation: r.employeeDesignation,
        department: r.employeeDepartment,
      },
    }));

    return NextResponse.json({
      loans: loansResult,
      advances: advancesResult,
      salaries: salariesResult,
      officeCosts: officeCostsData,
      meta: {
        month,
        year,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error generating consolidated report data:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch report data" },
      { status: 500 }
    );
  }
}
