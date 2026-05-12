"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  RefreshCcw, 
  Wifi, 
  WifiOff, 
  Info,
  ExternalLink,
  Settings2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Smartphone,
  Server
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { sendJson } from "@/lib/http";
import { useDialog } from "@/components/ui/dialog-provider";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { format, formatDistanceToNow } from "date-fns";
import { useTranslation } from "@/hooks/use-translation";

interface AttendanceDevice {
  id: string;
  deviceName: string;
  serialNumber: string;
  ipAddress: string | null;
  status: string;
  lastSync: string | null;
  lastSeen: string | null;
  description: string | null;
  createdAt: string;
}

export function DeviceSetupClient() {
  const devices = useAsyncData<AttendanceDevice[]>("/api/attendance/devices", []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const dialog = useDialog();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    deviceName: "",
    serialNumber: "",
    description: ""
  });

  async function handleAddDevice(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendJson("/api/attendance/devices", "POST", formData);
      setOpen(false);
      setFormData({ deviceName: "", serialNumber: "", description: "" });
      await devices.refresh();
      dialog.alert(t("Success"), t("Device added successfully. Now configure your device with the ADMS settings shown in the guide."));
    } catch (error: any) {
      dialog.alert(t("Error"), error.message || t("Failed to add device."));
    } finally {
      setLoading(false);
    }
  }

  async function deleteDevice(id: string) {
    const ok = await dialog.danger(t("Delete Device?"), t("Are you sure you want to remove this device? Attendance data from this device will no longer be synced."));
    if (!ok) return;

    try {
      await fetch(`/api/attendance/devices?id=${id}`, { method: "DELETE" });
      await devices.refresh();
    } catch (error: any) {
      dialog.alert(t("Error"), t("Failed to delete device."));
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (devices.loading) return <LoadingState />;
  if (devices.error) return <ErrorState message={devices.error} />;

  const serverHost = typeof window !== 'undefined' ? window.location.host : 'aeropark.appdevs.team';
  const tenantSlug = typeof window !== 'undefined' 
    ? window.location.pathname.split('/').filter(p => p && p !== 'attendance' && p !== 'setup')[0]?.replace('-hr', '') 
    : 'demo';
  const admsUrl = `${serverHost}/api/attendance/adms/${tenantSlug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">{t("Devices")}</h1>
           <p className="text-sm text-slate-500">Home • Devices</p>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" className="bg-white border-slate-200">
             <RefreshCcw className="mr-2 h-4 w-4" /> {t("Refresh")}
           </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> {t("Add Biometric Device")}
        </Button>
        <Button variant="outline" className="border-slate-300">
          <Smartphone className="mr-2 h-4 w-4 text-slate-500" /> {t("Push Employees To Devices")}
        </Button>
      </div>

      {/* Device Configuration Guide */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <button 
          onClick={() => setGuideExpanded(!guideExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings2 className="w-5 h-5 text-slate-600" />
            <span className="font-bold text-slate-800">{t("Device Configuration Guide")}</span>
            <span className="text-xs text-slate-400 font-medium ml-2">{guideExpanded ? "Click to Collapse" : "Click to Expand"}</span>
          </div>
          {guideExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>
        
        {guideExpanded && (
          <div className="p-6 border-t border-slate-100 space-y-6">
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>Important Note:</strong> This configuration supports almost all <strong>ZKTeco</strong> devices that have <strong>ADMS</strong> or <strong>Cloud Server Settings</strong> capability.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div className="flex gap-4">
                     <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="font-bold text-slate-900 mb-1">{t("Check Device ADMS Support")}</h4>
                        <p className="text-sm text-slate-500">Your ZKTeco must support ADMS mode. Look for "ADMS" or "Cloud Server Settings" in the menu or manual.</p>
                     </div>
                  </div>

                  <div className="flex gap-4">
                     <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <Settings2 className="w-5 h-5" />
                     </div>
                     <div className="flex-1">
                        <h4 className="font-bold text-slate-900 mb-1">{t("Configure ADMS Settings")}</h4>
                        <p className="text-sm text-slate-500 mb-4">Steps: 1. Menu → 2. Communication → 3. Cloud Server Settings</p>
                        
                        <div className="space-y-3">
                           {[
                             { label: "Server Mode", value: "ADMS" },
                             { label: "Enable Domain Name", value: "ON" },
                             { label: "Server Address", value: admsUrl, copyable: true },
                             { label: "Enable Proxy Server", value: "OFF" },
                             { label: "HTTPS", value: "ON (depends on your server)" }
                           ].map((item) => (
                             <div key={item.label} className="flex items-center justify-between border-b border-slate-50 pb-2">
                                <span className="text-sm text-slate-600">{item.label}</span>
                                <div className="flex items-center gap-2">
                                   <span className="text-sm font-bold text-slate-900">{item.value}</span>
                                   {item.copyable && (
                                     <button 
                                       onClick={() => copyToClipboard(item.value, 'adms-url')}
                                       className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                                     >
                                       {copiedId === 'adms-url' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                     </button>
                                   )}
                                </div>
                             </div>
                           ))}
                        </div>

                        <div className="mt-6 p-4 bg-cyan-50 border border-cyan-100 rounded-lg">
                           <p className="text-sm text-cyan-800">
                             <strong>Note:</strong> After adding your device, simply clock in using your device so that it recognizes your system.
                           </p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                     </div>
                     <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Cloud Server Setting</span>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6 space-y-4 font-sans border border-slate-700">
                     <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                        <span className="text-amber-400 text-sm font-bold">Server Mode</span>
                        <span className="text-white text-sm font-bold">ADMS</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                        <span className="text-slate-300 text-sm">Enable Domain Name</span>
                        <div className="w-12 h-6 bg-blue-600 rounded-full flex items-center justify-end px-1 relative">
                           <span className="text-[9px] text-white font-bold absolute left-2">ON</span>
                           <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                     </div>
                     <div className="flex flex-col gap-1 border-b border-slate-700 pb-3">
                        <span className="text-slate-300 text-sm">Server Address</span>
                        <span className="text-amber-400 text-xs font-mono">{admsUrl}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                        <span className="text-slate-300 text-sm">Enable Proxy Server</span>
                        <div className="w-12 h-6 bg-slate-600 rounded-full flex items-center justify-start px-1 relative">
                           <span className="text-[9px] text-slate-400 font-bold absolute right-2">OFF</span>
                           <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-sm">HTTPS</span>
                        <div className="w-12 h-6 bg-blue-600 rounded-full flex items-center justify-end px-1 relative">
                           <span className="text-[9px] text-white font-bold absolute left-2">ON</span>
                           <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Waiting for Connection Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4 animate-pulse">
         <div className="relative">
            <RefreshCcw className="w-6 h-6 text-amber-600 animate-spin" />
         </div>
         <div>
            <h5 className="font-bold text-amber-900 text-sm flex items-center gap-2">
               <Clock className="w-4 h-4" /> {t("Waiting for Device Connection")}
            </h5>
            <p className="text-xs text-amber-800">
               Please perform a clock in/out action on your biometric device to establish the connection. The device status will update automatically once connected.
            </p>
         </div>
      </div>

      {/* Device List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
         <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
               <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t("Device Name")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t("Serial Number")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t("Device IP")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t("Last Online")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{t("Status")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t("Actions")}</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {devices.data.length === 0 ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                       {t("No devices added yet. Click 'Add Biometric Device' to begin.")}
                    </td>
                 </tr>
               ) : (
                 devices.data.map(device => (
                   <tr key={device.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                               <Smartphone className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-slate-900">{device.deviceName}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">{device.serialNumber}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{device.ipAddress || "—"}</td>
                      <td className="px-6 py-4">
                         {device.lastSeen ? (
                            <div className="space-y-0.5">
                               <div className="text-sm font-medium text-slate-900">{formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}</div>
                               <div className="text-[10px] text-slate-400">{format(new Date(device.lastSeen), "dd MMMM yyyy HH:mm a")}</div>
                            </div>
                         ) : (
                            <span className="text-sm text-slate-400">—</span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            device.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-slate-100 text-slate-500'
                         }`}>
                            {t(device.status === 'ACTIVE' ? 'Online' : 'Pending')}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => deleteDevice(device.id)}>
                               <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                            </Button>
                         </div>
                      </td>
                   </tr>
                 ))
               )}
            </tbody>
         </table>
      </div>

      {/* Add Device Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={t("Add Biometric Device")} size="lg">
         <form onSubmit={handleAddDevice} className="space-y-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
               <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold">
                  <Info className="w-5 h-5 text-blue-600" /> {t("How to Find Your Device Serial Number")}
               </div>
               
               <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-3 text-xs text-cyan-800 mb-6">
                  <strong>Note:</strong> The serial number can be found in your device by navigating to <strong>Menu -&gt; System Info -&gt; Device Info</strong>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 text-center">
                     <div className="aspect-video bg-slate-200 rounded-lg border border-slate-300 flex items-center justify-center overflow-hidden">
                        <img src="/assets/images/zk-step-1.png" alt="Step 1" className="w-full h-full object-cover" />
                     </div>
                     <p className="text-[10px] font-medium text-slate-600">Step 1: Access the Menu</p>
                  </div>
                  <div className="space-y-2 text-center">
                     <div className="aspect-video bg-slate-200 rounded-lg border border-slate-300 flex items-center justify-center overflow-hidden">
                        <img src="/assets/images/zk-step-2.png" alt="Step 2" className="w-full h-full object-cover" />
                     </div>
                     <p className="text-[10px] font-medium text-slate-600">Step 2: Select System Info</p>
                  </div>
                  <div className="space-y-2 text-center">
                     <div className="aspect-video bg-slate-200 rounded-lg border border-slate-300 flex items-center justify-center overflow-hidden">
                        <img src="/assets/images/zk-step-3.png" alt="Step 3" className="w-full h-full object-cover" />
                     </div>
                     <p className="text-[10px] font-medium text-slate-600">Step 3: Find Serial Number in Device Info</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("Device Name")} <span className="text-red-500">*</span></label>
                  <Input 
                     required 
                     placeholder="e.g. ZKTeco iClock, Anviz VF30 etc." 
                     value={formData.deviceName}
                     onChange={e => setFormData({...formData, deviceName: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400">Provide a unique identifiable name for this device.</p>
               </div>
               
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("Serial Number")} <span className="text-red-500">*</span></label>
                  <Input 
                     required 
                     placeholder="e.g. GED7241800000" 
                     value={formData.serialNumber}
                     onChange={e => setFormData({...formData, serialNumber: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400">Enter the device serial number exactly as shown on the device label.</p>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("Description")}</label>
               <Input 
                  placeholder="e.g. Reception Desk Device" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
               />
            </div>

            <div className="pt-4 flex justify-start gap-3">
               <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-8">
                 {loading ? t("Saving...") : t("Save")}
               </Button>
               <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="bg-white border-slate-200">
                  {t("Cancel")}
               </Button>
            </div>
         </form>
      </Modal>
    </div>
  );
}
