"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDialog } from "@/components/ui/dialog-provider";
import { CheckCircle, XCircle, Clock, Search, Filter } from "lucide-react";
import { ServiceGuard } from "@/components/shared/service-guard";
import { useTranslation } from "@/hooks/use-translation";

export default function AttendanceRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [hrNote, setHrNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewDetails, setViewDetails] = useState<any>(null);
  const dialog = useDialog();
  const { t } = useTranslation();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance/requests?status=${filterStatus === "ALL" ? "" : filterStatus}`);
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (request: any) => {
    const confirmed = await dialog.confirm(
      t("Approve Request?"),
      t("Are you sure you want to approve the attendance request for {name} on {date}?", { name: request.employee.name, date: format(new Date(request.date), "dd MMM, yyyy") })
    );
    if (!confirmed) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/attendance/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (res.ok) {
        fetchRequests();
      } else {
        const err = await res.json();
        dialog.alert(t("Error"), err.message || t("Failed to approve request"));
      }
    } catch (error) {
      console.error(error);
      dialog.alert(t("Error"), t("An unexpected error occurred"));
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (request: any) => {
    setSelectedRequest(request);
    setHrNote("");
    setIsRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!hrNote.trim()) {
      dialog.alert(t("Error"), t("Please provide a reason for rejection."));
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/attendance/requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", hrNote }),
      });

      if (res.ok) {
        setIsRejectModalOpen(false);
        fetchRequests();
      } else {
        const err = await res.json();
        dialog.alert(t("Error"), err.message || t("Failed to reject request"));
      }
    } catch (error) {
      console.error(error);
      dialog.alert(t("Error"), t("An unexpected error occurred"));
    } finally {
      setProcessing(false);
    }
  };

  const statusColors: any = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-rose-100 text-rose-800",
  };

  return (
    <ServiceGuard id="attendance">
    <div className="space-y-6">
      <PageHeader
        title={t("Manual Attendance Requests")}
        subtitle={t("Review and process manual attendance submissions from employees")}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterStatus === status
                  ? "bg-brand-600 text-white shadow-brand-200 shadow-lg"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {t(status)}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-slate-200">
        <DataTable
          loading={loading}
          data={requests}
          columns={[
            {
              key: "employee",
              title: t("Employee"),
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                    {row.employee.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">{row.employee.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{row.employee.employeeCode}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "date",
              title: t("Requested Date"),
              render: (row) => (
                <div className="font-medium text-slate-700">
                  {format(new Date(row.date), "dd MMM, yyyy")}
                </div>
              ),
            },
            {
              key: "times",
              title: t("Requested Times"),
              render: (row) => (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    {row.checkIn ? format(new Date(row.checkIn), "hh:mm a") : "-"}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    {row.checkOut ? format(new Date(row.checkOut), "hh:mm a") : "-"}
                  </span>
                </div>
              ),
            },
            {
              key: "reason",
              title: t("Reason & Proof"),
              render: (row) => (
                <div className="flex flex-col items-start gap-2 max-w-xs">
                  <div className="text-sm text-slate-500 italic truncate w-full" title={row.reason}>
                    "{row.reason}"
                  </div>
                  <button
                    onClick={() => setViewDetails(row)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors text-xs font-bold border border-indigo-100"
                  >
                    <Search size={12} />
                    {row.attachment ? t("View Details & Proof") : t("View Details")}
                  </button>
                </div>
              ),
            },
            {
              key: "status",
              title: t("Status"),
              render: (row) => (
                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColors[row.status]}`}>
                  {t(row.status)}
                </span>
              ),
            },
            {
              key: "actions",
              title: t("Actions"),
              render: (row) => (
                <div className="flex items-center gap-2">
                  {row.status === "PENDING" ? (
                    <>
                      <button
                        onClick={() => handleApprove(row)}
                        disabled={processing}
                        className="h-9 px-4 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all font-bold text-xs flex items-center gap-2 border border-emerald-100"
                      >
                        <CheckCircle size={14} /> {t("Approve")}
                      </button>
                      <button
                        onClick={() => openRejectModal(row)}
                        disabled={processing}
                        className="h-9 px-4 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all font-bold text-xs flex items-center gap-2 border border-rose-100"
                      >
                        <XCircle size={14} /> {t("Reject")}
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                      {t("Processed on")} {format(new Date(row.updatedAt), "dd MMM")}
                    </span>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!viewDetails}
        onClose={() => setViewDetails(null)}
        title={t("Request Details")}
        size="4xl"
      >
        <div className="pt-4 space-y-6">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
               <Clock size={14} /> {t("Employee's Reason")}
            </h3>
            <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{viewDetails?.reason}</p>
          </div>
          
          {viewDetails?.attachment && (
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Search size={14} /> {t("Screenshot Proof")}
              </h3>
              <div className="max-h-[60vh] overflow-auto flex justify-center bg-slate-50 rounded-2xl border border-slate-200 p-2 shadow-sm">
                <img src={viewDetails.attachment} alt="Attendance Proof" className="w-full h-auto rounded-xl" />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-6">
          <Button onClick={() => setViewDetails(null)} variant="outline" className="rounded-xl font-bold px-6 border-slate-200">
            {t("Close Details")}
          </Button>
        </div>
      </Modal>

      <Modal
        open={isRejectModalOpen}
        title={t("Reject Attendance Request")}
        onClose={() => setIsRejectModalOpen(false)}
      >
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <p className="text-sm font-medium text-rose-900">
              {t("You are rejecting the request for {name} on {date}.", { name: selectedRequest?.employee?.name, date: selectedRequest && format(new Date(selectedRequest.date), "dd MMM, yyyy") })}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("Rejection Reason (HR Note)")}</label>
            <Textarea
              placeholder={t("Provide a reason for rejection...")}
              value={hrNote}
              onChange={(e) => setHrNote(e.target.value)}
              className="min-h-[100px] rounded-xl bg-slate-50"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleReject}
              disabled={processing}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
            >
              {processing ? t("Rejecting...") : t("Confirm Rejection")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsRejectModalOpen(false)}
              className="px-6 rounded-xl font-bold text-slate-500"
            >
              {t("Cancel")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    </ServiceGuard>
  );
}
