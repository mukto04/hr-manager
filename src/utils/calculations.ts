import { differenceInMonths, format, isSameMonth } from "date-fns";

export function calculateSalaryBreakdown(totalSalary: number, structure?: any[]) {
  const defaultStructure = [
    { id: "basic", label: "Basic Salary", percent: 50 },
    { id: "hra", label: "H.R.A", percent: 25 },
    { id: "medical", label: "M.A", percent: 12.5 },
    { id: "travel", label: "T.A", percent: 5 },
    { id: "others", label: "Others", percent: 7.5 }
  ];

  // If structure is the old object format, convert to array
  let fields: any[] = [];
  if (Array.isArray(structure)) {
    fields = structure;
  } else if (structure && typeof structure === 'object') {
    fields = Object.entries(structure).map(([key, val]: [string, any]) => ({
      id: key,
      label: typeof val === 'object' ? (val.label || key) : key,
      percent: typeof val === 'object' ? (val.percent || 0) : (val || 0)
    }));
  } else {
    fields = defaultStructure;
  }

  const result: any = { festivalBonus: 0, labels: {}, values: {} };
  
  // Calculate each field
  fields.forEach(field => {
    const amount = round(totalSalary * (field.percent / 100));
    result.values[field.id] = amount;
    result.labels[field.id] = field.label;
  });

  // Legacy field mapping for DB compatibility
  return {
    basicSalary: result.values.basic || 0,
    hra: result.values.hra || 0,
    medicalAllowance: result.values.medical || 0,
    travelAllowance: result.values.travel || 0,
    others: result.values.others || 0,
    festivalBonus: 0,
    // Add dynamic breakdown for storage
    breakdown: fields.map(f => ({ ...f, amount: result.values[f.id] })),
    labels: result.labels,
    values: result.values // Keep flat values for UI/logic if needed
  };
}

export function calculateDueAmount(loanAmount: number, paidAmount: number) {
  return round(loanAmount - paidAmount);
}

export function calculateDuration(joiningDate: string | Date) {
  const months = differenceInMonths(new Date(), new Date(joiningDate));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years}y ${remainingMonths}m`;
}

export function getJoiningYear(joiningDate: string | Date) {
  return new Date(joiningDate).getFullYear();
}

export function getDayName(date: string | Date) {
  return format(new Date(date), "EEEE");
}

export function isBirthdayThisMonth(dateOfBirth: string | Date) {
  return isSameMonth(new Date(dateOfBirth), new Date());
}

export function isAnniversaryThisMonth(joiningDate: string | Date) {
  return isSameMonth(new Date(joiningDate), new Date());
}

export function getBirthdayWish(name: string, dateOfBirth: string | Date) {
  const date = new Date(dateOfBirth);
  const now = new Date();
  if (date.getMonth() === now.getMonth()) {
    return `Wish ${name} a happy birthday this month`;
  }
  return "-";
}

export function getAnniversaryWish(name: string, joiningDate: string | Date) {
  const date = new Date(joiningDate);
  const now = new Date();
  if (date.getMonth() === now.getMonth()) {
    return `Celebrate ${name}'s work anniversary`;
  }
  return "-";
}

export function formatCurrency(amount: number, currencySymbol: string = "৳") {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount ?? 0);
  return `${currencySymbol}${formatted}`;
}

export function round(value: number) {
  return Number(value.toFixed(2));
}
