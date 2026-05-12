import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function breakdown(totalSalary: number) {
  return {
    basicSalary: +(totalSalary * 0.5).toFixed(2),
    hra: +(totalSalary * 0.5).toFixed(2),
    medicalAllowance: +(totalSalary * 0.25).toFixed(2),
    travelAllowance: +(totalSalary * 0.1).toFixed(2),
    others: +(totalSalary * 0.15).toFixed(2),
    festivalBonus: +(totalSalary * 0.3).toFixed(2),
  };
}

async function main() {
  await prisma.monthlySalary.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.employee.deleteMany();

  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        employeeCode: "EMP-001",
        name: "Ayesha Rahman",
        designation: "HR Executive",
        department: "Human Resources",
        email: "ayesha@example.com",
        phone: "01711111111",
        joiningDate: new Date("2022-03-15"),
        dateOfBirth: new Date("1998-04-12")
      }
    }),
    prisma.employee.create({
      data: {
        employeeCode: "EMP-002",
        name: "Nafis Karim",
        designation: "Accountant",
        department: "Finance",
        email: "nafis@example.com",
        phone: "01722222222",
        joiningDate: new Date("2021-04-05"),
        dateOfBirth: new Date("1996-04-25")
      }
    }),
    prisma.employee.create({
      data: {
        employeeCode: "EMP-003",
        name: "Sadia Islam",
        designation: "Frontend Developer",
        department: "Engineering",
        email: "sadia@example.com",
        phone: "01733333333",
        joiningDate: new Date("2023-07-10"),
        dateOfBirth: new Date("1999-09-05")
      }
    })
  ]);

  await Promise.all([
    prisma.holiday.create({
      data: { name: "Pohela Boishakh", date: new Date("2026-04-14"), totalDays: 1 }
    }),
    prisma.holiday.create({
      data: { name: "Eid Holiday", date: new Date("2026-04-21"), totalDays: 3 }
    }),
    prisma.holiday.create({
      data: { name: "Victory Day", date: new Date("2026-12-16"), totalDays: 1 }
    })
  ]);

  for (const [index, employee] of employees.entries()) {
    const totalLeave = 24;
    const dueLeave = [5, 2, 7][index];
    const totalSalary = [55000, 70000, 85000][index];
    const parts = breakdown(totalSalary);

    await prisma.leaveBalance.create({
      data: {
        employeeId: employee.id,
        year: 2026,
        totalLeave,
        dueLeave
      }
    });

    await prisma.salaryStructure.create({
      data: {
        employeeId: employee.id,
        totalSalary,
        ...parts
      }
    });

    await prisma.monthlySalary.create({
      data: {
        employeeId: employee.id,
        month: 4,
        year: 2026,
        totalSalary,
        workingDaySalary: +(totalSalary / 26).toFixed(2),
        ...parts,
        totalSalaryPaid: +(totalSalary + parts.festivalBonus).toFixed(2)
      }
    });
  }

  await prisma.loan.create({
    data: {
      employeeId: employees[1].id,
      loanAmount: 30000,
      paidAmount: 10000,
      dueAmount: 20000,
      note: "Laptop advance"
    }
  });

  await prisma.loan.create({
    data: {
      employeeId: employees[2].id,
      loanAmount: 50000,
      paidAmount: 15000,
      dueAmount: 35000,
      note: "Emergency loan"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
