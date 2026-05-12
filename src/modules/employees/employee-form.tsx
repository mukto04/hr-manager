"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Employee } from "@/types";

const departments = [
  "CEO",
  "CO-CEO",
  "Front End Developer",
  "Backend Developer",
  "Designer",
  "Video Editor",
  "SQA",
  "SEO",
  "HR",
  "Office Assistant",
  "Other"
];

export function EmployeeForm({
  initialData,
  onSubmit,
  onCancel,
  config,
  customFields
}: {
  initialData?: Partial<Employee & { customData?: any }>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  config?: { visible: string[], mandatory: string[] };
  customFields?: { id: string, label: string, type: string, category: string }[];
}) {
  const [form, setForm] = useState<any>({
    employeeCode: "",
    fingerprintId: "",
    name: "",
    designation: "",
    department: "",
    email: "",
    phone: "",
    joiningDate: "",
    dateOfBirth: "",
    salary: 0,
    bloodGroup: "",
    guardianName: "",
    guardianRelation: "",
    guardianPhone: "",
    nidNumber: "",
    educationStatus: "",
    customData: {}
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        employeeCode: initialData.employeeCode ?? "",
        fingerprintId: initialData.fingerprintId ?? "",
        name: initialData.name ?? "",
        designation: initialData.designation ?? "",
        department: initialData.department ?? "",
        email: initialData.email ?? "",
        phone: initialData.phone ?? "",
        joiningDate: initialData.joiningDate ? initialData.joiningDate.slice(0, 10) : "",
        dateOfBirth: initialData.dateOfBirth ? initialData.dateOfBirth.slice(0, 10) : "",
        salary: initialData.salaryStructure?.totalSalary ?? 0,
        bloodGroup: initialData.bloodGroup ?? "",
        guardianName: initialData.guardianName ?? "",
        guardianRelation: initialData.guardianRelation ?? "",
        guardianPhone: initialData.guardianPhone ?? "",
        nidNumber: initialData.nidNumber ?? "",
        educationStatus: initialData.educationStatus ?? "",
        customData: initialData.customData ?? {}
      });
    }
  }, [initialData]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err.message || "Failed to save employee. Please check your inputs.");
    } finally {
      setSaving(false);
    }
  }

  const renderCustomFields = (category: string) => {
    if (!customFields) return null;
    return customFields
      .filter((f) => f.category === category)
      .map((field) => (
        <div key={field.id} className={`space-y-1.5 ${field.type === "textarea" ? "md:col-span-12" : "md:col-span-4"}`}>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
          {field.type === "textarea" ? (
            <textarea
              className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              value={form.customData?.[field.id] || ""}
              onChange={(e) => setForm({ 
                ...form, 
                customData: { ...form.customData, [field.id]: e.target.value } 
              })}
            />
          ) : (
            <Input 
              type={field.type} 
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              value={form.customData?.[field.id] || ""}
              onChange={(e) => setForm({ 
                ...form, 
                customData: { ...form.customData, [field.id]: e.target.value } 
              })}
            />
          )}
        </div>
      ));
  };

  return (
    <form className="relative space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-x-6 gap-y-5 grid-cols-1 md:grid-cols-12 items-start">
        {/* Section: Basic Info */}
        <div className="space-y-1.5 md:col-span-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</label>
          <Input placeholder="Employee name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        
        <div className="space-y-1.5 md:col-span-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</label>
          <Input placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required />
        </div>

        <div className="space-y-1.5 md:col-span-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
          <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employee ID (Code)</label>
          <Input placeholder="E.g. ADE..." value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} required />
        </div>

        {/* Custom fields for Basic Info */}
        {renderCustomFields("basic")}

        {config?.visible.includes("fingerprintId") && (
          <div className="space-y-1.5 md:col-span-4">
            <label className="text-xs font-bold text-brand-600 uppercase tracking-wider">Fingerprint ID</label>
            <Input placeholder="Device ID (e.g. 1)" value={form.fingerprintId} onChange={(e) => setForm({ ...form, fingerprintId: e.target.value })} />
          </div>
        )}

        <div className="space-y-1.5 md:col-span-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Salary</label>
          <Input type="number" min="0" placeholder="Monthly Gross" value={form.salary || ""} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} />
        </div>

        <div className="space-y-1.5 md:col-span-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Joining Date</label>
          <Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} required />
        </div>
        
        <div className="space-y-1.5 md:col-span-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
          <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} required />
        </div>

        {config?.visible.includes("bloodGroup") && (
          <div className="space-y-1.5 md:col-span-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Group</label>
            <Input placeholder="e.g. A+, O-" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
          </div>
        )}

        {config?.visible.includes("email") && (
          <div className="space-y-1.5 md:col-span-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <Input type="email" placeholder="email@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        )}
        
        {config?.visible.includes("phone") && (
          <div className="space-y-1.5 md:col-span-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
            <Input placeholder="+8801..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        )}

        {/* Section: Identity & Education */}
        {(config?.visible.includes("nidNumber") || config?.visible.includes("educationStatus") || customFields?.some(f => f.category === "identity")) && (
          <div className="md:col-span-12 border-t border-slate-100 pt-6 mt-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Identity & Background</h4>
          </div>
        )}

        {config?.visible.includes("nidNumber") && (
          <div className="space-y-1.5 md:col-span-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">NID Card Number</label>
            <Input placeholder="National ID number" value={form.nidNumber} onChange={(e) => setForm({ ...form, nidNumber: e.target.value })} />
          </div>
        )}

        {config?.visible.includes("educationStatus") && (
          <div className="space-y-1.5 md:col-span-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Education Status</label>
            <Input placeholder="Qualifcation/Degree" value={form.educationStatus} onChange={(e) => setForm({ ...form, educationStatus: e.target.value })} />
          </div>
        )}

        {/* Custom fields for Identity Section */}
        {renderCustomFields("identity")}

        {/* Section: Guardian Info */}
        {(config?.visible.includes("guardianDetails") || customFields?.some(f => f.category === "guardian")) && (
          <div className="md:col-span-12 border-t border-slate-100 pt-6 mt-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Guardian Records</h4>
          </div>
        )}

        {config?.visible.includes("guardianDetails") && (
          <>
            <div className="space-y-1.5 md:col-span-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Guardian Name</label>
              <Input placeholder="Name" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
            </div>

            <div className="space-y-1.5 md:col-span-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Relation</label>
              <Input placeholder="e.g. Father/Husband" value={form.guardianRelation} onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })} />
            </div>

            <div className="space-y-1.5 md:col-span-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Guardian Contact</label>
              <Input placeholder="Phone number" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
            </div>
          </>
        )}

        {/* Custom fields for Guardian Section */}
        {renderCustomFields("guardian")}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Employee"}</Button>
      </div>

      {error && (
        <div className="p-4 mt-2 rounded-xl bg-red-50 border border-red-200 text-red-600 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 font-bold mb-1">
             <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
             Save Error
          </div>
          <p className="text-sm font-medium leading-relaxed">{error}</p>
        </div>
      )}
    </form>
  );
}
