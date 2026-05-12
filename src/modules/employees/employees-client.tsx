"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, History, Pencil, Plus, Trash2, KeyRound, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Employee, ModalMode } from "@/types";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { sendJson } from "@/lib/http";
import { EmployeeForm } from "./employee-form";
import { EmployeeDetails } from "./employee-details";
import { calculateDuration, getJoiningYear } from "@/utils/calculations";
import { format } from "date-fns";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/dialog-provider";
import { Input } from "@/components/ui/input";
import { EmployeeSettingsModal } from "./employee-settings-modal";
import { useTranslation } from "@/hooks/use-translation";

export function EmployeesClient() {
  const router = useRouter();
  // Active employees only
  const { data, loading, error, refresh } = useAsyncData<Employee[]>("/api/employees", []);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("create");
  const [selected, setSelected] = useState<Employee | undefined>();
  const dialog = useDialog();
  const { t } = useTranslation();

  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState<{ visible: string[], mandatory: string[] }>({
    visible: ["fingerprintId", "email", "phone", "bloodGroup", "guardianName", "guardianRelation", "guardianPhone", "nidNumber", "educationStatus"],
    mandatory: ["name", "employeeCode", "designation", "joiningDate", "dateOfBirth"]
  });
  const [customFields, setCustomFields] = useState<any[]>([]);

  // Fetch settings on mount
  useMemo(async () => {
    try {
      const res = await fetch("/api/settings/attendance");
      if (res.ok) {
        const settings = await res.json();
        if (settings.employeeFieldsConfig) {
          setFieldsConfig(settings.employeeFieldsConfig);
        }
        if (settings.customFields) {
          setCustomFields(settings.customFields);
        }
      }
    } catch (e) {
      console.error("Failed to fetch employee settings", e);
    }
  }, []);

  async function handleSaveSettings(newConfig: any, newCustomFields: any[]) {
    try {
      // Get existing settings first to preserve attendance settings
      const currentRes = await fetch("/api/settings/attendance");
      const currentSettings = await currentRes.json();

      await fetch("/api/settings/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentSettings,
          employeeFieldsConfig: newConfig,
          customFields: newCustomFields
        })
      });
      setFieldsConfig(newConfig);
      setCustomFields(newCustomFields);
    } catch (e) {
      console.error("Failed to save settings", e);
      throw e;
    }
  }

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      [item.name, item.employeeCode, item.designation, item.department || "", item.email || ""]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [data, query]);

  async function handleSubmit(payload: Record<string, unknown>) {
    try {
      if (mode === "create") {
        await sendJson("/api/employees", "POST", payload);
      } else if (selected && mode === "edit") {
        await sendJson(`/api/employees/${selected.id}`, "PUT", payload);
      }
      setOpen(false);
      setSelected(undefined);
      await refresh();
    } catch (error: any) {
      // Re-throw so the child form's local try-catch can catch it
      throw error;
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || newPassword.length < 6) {
      alert(t("Password must be at least 6 characters."));
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await sendJson(`/api/employees/${selected.id}/password`, "PUT", { password: newPassword });
      setOpen(false);
      setNewPassword("");
      setSelected(undefined);
    } catch(err) {
      alert(t("Failed to update password."));
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function handleDelete(item: Employee) {
    const ok = await dialog.danger(
      t("Disable {name}?", { name: item.name }),
      <p className="text-sm text-slate-600">{t("This employee will be disabled and moved to History. You can restore them later.")}</p>
    );
    if (!ok) return;
    await sendJson(`/api/employees/${item.id}`, "DELETE");
    await refresh();
  }

  const columns = [
    { key: "employeeCode", title: t("Code"), render: (row: Employee) => row.employeeCode },
    {
      key: "name",
      title: t("Employee"),
      render: (row: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200 shrink-0">
             {row.image ? (
               <img src={row.image} alt={row.name} className="w-full h-full object-cover" />
             ) : (
               <span className="text-sm font-bold text-indigo-600">{row.name.charAt(0)}</span>
             )}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{row.name}</p>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{row.designation}</p>
          </div>
        </div>
      )
    },
    {
      key: "dates",
      title: t("Dates"),
      render: (row: Employee) => (
        <div className="space-y-1 text-xs">
          <p>{t("Joining")}: {format(new Date(row.joiningDate), "dd MMM yyyy")}</p>
          <p>{t("DOB")}: {format(new Date(row.dateOfBirth), "dd MMM yyyy")}</p>
        </div>
      )
    },
    {
      key: "birthday",
      title: t("Birthday Wish"),
      render: (row: Employee) => <span className="text-xs font-medium">{format(new Date(row.dateOfBirth), "dd MMM")}</span>
    },
    {
      key: "anniversary",
      title: t("Anniversary Wish"),
      render: (row: Employee) => <span className="text-xs font-medium">{format(new Date(row.joiningDate), "dd MMM")}</span>
    },
    { key: "year", title: t("Joining Year"), render: (row: Employee) => getJoiningYear(row.joiningDate) },
    { key: "duration", title: t("Duration"), render: (row: Employee) => calculateDuration(row.joiningDate) },
    {
      key: "actions",
      title: t("Actions"),
      render: (row: Employee) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="h-9 px-3 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-none"
            onClick={() => { setMode("password"); setSelected(row); setNewPassword(""); setOpen(true); }}
            title={t("Change Login Credentials")}
          >
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            className="h-9 px-3 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-none"
            onClick={() => { setMode("details"); setSelected(row); setOpen(true); }}
            title={t("View Details")}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            className="h-9 px-3 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-none"
            onClick={() => { setMode("edit"); setSelected(row); setOpen(true); }}
            title={t("Edit Employee")}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="danger"
            className="h-9 px-3"
            onClick={() => handleDelete(row)}
            title={t("Disable Employee")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Employee Database")}
        subtitle={t("Manage employee information with reusable CRUD flows.")}
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings2 className="mr-2 h-4 w-4" /> {t("Setup Form")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/employees/history")}
            >
              <History className="mr-2 h-4 w-4" /> {t("History")}
            </Button>
            <Button onClick={() => { setMode("create"); setSelected(undefined); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> {t("Add Employee")}
            </Button>
          </div>
        }
      />

      <SearchFilterBar value={query} onChange={setQuery} placeholder={t("Search employees...")} />

      <DataTable data={filteredData} columns={columns} />

      <Modal
        open={open}
        title={mode === "create" ? t("Add Employee") : mode === "edit" ? t("Edit Employee") : mode === "password" ? t("Update Login Details") : t("Employee Details")}
        size="4xl"
        description={
          mode === "details"
            ? t("View all collected information for this employee.")
            : mode === "password" 
            ? t("Change the portal login password for {name}.", { name: selected?.name || t("Employee") })
            : t("All modules use this employee data as a shared source of truth.")
        }
        onClose={() => setOpen(false)}
      >
        {mode === "details" && selected ? (
          <EmployeeDetails employee={selected} onClose={() => setOpen(false)} customFields={customFields} />
        ) : mode === "password" ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t("New Password")}</label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder={t("Enter at least 6 characters")} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  minLength={6}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
               <Button type="button" variant="secondary" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
               <Button type="submit" disabled={isUpdatingPassword || newPassword.length < 6}>
                 {isUpdatingPassword ? t("Updating Engine...") : t("Save Password")}
               </Button>
            </div>
          </form>
        ) : (
          <EmployeeForm 
            initialData={selected} 
            onSubmit={handleSubmit} 
            onCancel={() => setOpen(false)} 
            config={fieldsConfig}
            customFields={customFields}
          />
        )}
      </Modal>

      <EmployeeSettingsModal 
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={fieldsConfig}
        customFields={customFields}
        onSave={handleSaveSettings}
      />

    </div>
  );
}
