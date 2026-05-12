"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Settings2, Save, Plus, Trash2, LayoutGrid, Tag } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";

interface FieldConfig {
  visible: string[];
  mandatory: string[];
}

interface CustomField {
  id: string;
  label: string;
  type: string;
  category: "basic" | "identity" | "guardian";
}

interface EmployeeSettingsModalProps {
  open: boolean;
  onClose: () => void;
  config: FieldConfig;
  customFields: CustomField[];
  onSave: (newConfig: FieldConfig, newCustomFields: CustomField[]) => Promise<void>;
}

const availableFields = [
  { id: "fingerprintId", label: "Fingerprint ID (Device)" },
  { id: "email", label: "Email Address" },
  { id: "phone", label: "Phone Number" },
  { id: "bloodGroup", label: "Blood Group" },
  { id: "nidNumber", label: "NID Card Number" },
  { id: "educationStatus", label: "Education Status" },
  { id: "guardianDetails", label: "Guardian Details (Name, Phone, Relation)" },
];

export function EmployeeSettingsModal({ open, onClose, config, customFields, onSave }: EmployeeSettingsModalProps) {
  const [localConfig, setLocalConfig] = useState<FieldConfig>(config);
  const [localCustomFields, setLocalCustomFields] = useState<CustomField[]>(customFields);
  const [saving, setSaving] = useState(false);
  const [newField, setNewField] = useState<Omit<CustomField, "id">>({ label: "", type: "text", category: "basic" });
  const dialog = useDialog();

  useEffect(() => {
    setLocalConfig(config);
    setLocalCustomFields(customFields);
  }, [config, customFields]);

  const toggleVisible = (fieldId: string) => {
    setLocalConfig(prev => {
      const isVisible = prev.visible.includes(fieldId);
      return {
        ...prev,
        visible: isVisible 
          ? prev.visible.filter(f => f !== fieldId) 
          : [...prev.visible, fieldId]
      };
    });
  };

  const addCustomField = () => {
    if (!newField.label) return;
    const id = newField.label.toLowerCase().replace(/\s+/g, "_");
    if (localCustomFields.find(f => f.id === id)) {
      dialog.alert("Error", "A field with this name already exists.");
      return;
    }
    setLocalCustomFields([...localCustomFields, { ...newField, id } as CustomField]);
    setNewField({ label: "", type: "text", category: "basic" });
  };

  const removeCustomField = (id: string) => {
    setLocalCustomFields(localCustomFields.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localConfig, localCustomFields);
      dialog.alert("Success", "Configuration updated successfully.");
      onClose();
    } catch (err) {
      dialog.alert("Error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Employee Form Builder" size="3xl">
      <div className="space-y-8 pt-4 pb-6">
        {/* Standard Fields Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Standard Fields</h3>
              <p className="text-[10px] text-slate-400 font-bold">Toggle visibility of built-in employee information fields.</p>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest border border-indigo-100">System Defaults</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableFields.map(field => (
              <div 
                key={field.id}
                onClick={() => toggleVisible(field.id)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                  localConfig.visible.includes(field.id) 
                    ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                    : "bg-white border-slate-100 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
                    localConfig.visible.includes(field.id) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                  }`}>
                    <Settings2 size={14} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${localConfig.visible.includes(field.id) ? "text-indigo-900" : "text-slate-600"}`}>
                      {field.label}
                    </p>
                  </div>
                </div>
                <div className={`h-5 w-10 rounded-full relative transition-colors ${
                  localConfig.visible.includes(field.id) ? "bg-indigo-600" : "bg-slate-200"
                }`}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                    localConfig.visible.includes(field.id) ? "right-0.5" : "left-0.5"
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Custom Fields Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em]">Custom Fields</h3>
              <p className="text-[10px] text-slate-400 font-bold">Add fields and choose where they should appear.</p>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-100">User Defined</div>
          </div>

          {/* New Field Creator */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl space-y-4 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Field Label</label>
                <Input 
                  placeholder="e.g. Passport No."
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Placement (Category)</label>
                <Select
                  value={newField.category}
                  onChange={(e) => setNewField({ ...newField, category: e.target.value as any })}
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs"
                >
                  <option value="basic">Employee Info (Top)</option>
                  <option value="identity">Identity & Education</option>
                  <option value="guardian">Guardian Info (Bottom)</option>
                </Select>
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Input Type</label>
                <Select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="email">Email</option>
                  <option value="textarea">Paragraph</option>
                </Select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button 
                  onClick={addCustomField}
                  disabled={!newField.label}
                  className="w-full h-10 rounded-xl shadow-lg shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus size={18} />
                </Button>
              </div>
            </div>
          </div>

          {/* List of Custom Fields */}
          <div className="space-y-2">
            {localCustomFields.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-3xl">
                <LayoutGrid className="mx-auto h-8 w-8 text-slate-200 mb-2" />
                <p className="text-xs font-bold text-slate-400">No custom fields added yet.</p>
              </div>
            ) : (
              localCustomFields.map(field => (
                <div key={field.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl group hover:border-emerald-200 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase">
                      {field.category[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{field.label}</p>
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1">
                           <Tag size={10} /> {field.type}
                         </span>
                         <span className="text-[9px] text-indigo-400 uppercase tracking-widest font-black border-l border-slate-200 pl-2">
                           {field.category === "basic" ? "Basic Info" : field.category === "identity" ? "Identity Section" : "Guardian Section"}
                         </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeCustomField(field.id)}
                    className="h-8 w-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="shadow-lg shadow-brand-200">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Apply Configuration"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
