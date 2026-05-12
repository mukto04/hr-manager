"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useDialog } from "@/components/ui/dialog-provider";
import { CheckCircle, XCircle, Clock, Search, Filter, Coffee } from "lucide-react";
import { ServiceGuard } from "@/components/shared/service-guard";

export default function BreakRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [hrNote, setHrNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const dialog = useDialog();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance/break-requests?status=${filterStatus === "ALL" ? "" : filterStatus}`);
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
      "Approve Break Request?",
      `Are you sure you want to approve the break request for ${request.employee.name} on ${format(new Date(request.date), "dd MMM, yyyy")}?`
    );
    if (!confirmed) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/attendance/break-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (res.ok) {
        fetchRequests();
      } else {
        const err = await res.json();
        dialog.alert("Error", err.message || "Failed to approve request");
      }
    } catch (error) {
      console.error(error);
      dialog.alert("Error", "An unexpected error occurred");
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
      dialog.alert("Error", "Please provide a reason for rejection.");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/attendance/break-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", hrNote }),
      });

      if (res.ok) {
        setIsRejectModalOpen(false);
        fetchRequests();
      } else {
        const err = await res.json();
        dialog.alert("Error", err.message || "Failed to reject request");
      }
    } catch (error) {
      console.error(error);
      dialog.alert("Error", "An unexpected error occurred");
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
        title="Break Time Requests"
        subtitle="Review and process manual break submissions from employees"
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
              {status}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-slate-200 shadow-soft-xl">
        <DataTable
          loading={loading}
          data={requests}
          columns={[
            {
              key: "employee",
              title: "Employee",
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
              title: "Requested Date",
              render: (row) => (
                <div className="font-medium text-slate-700">
                  {format(new Date(row.date), "dd MMM, yyyy")}
                </div>
              ),
            },
            {
              key: "times",
              title: "Requested Break Time",
              render: (row) => (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    {format(new Date(row.startTime), "hh:mm a")}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    {format(new Date(row.endTime), "hh:mm a")}
                  </span>
                </div>
              ),
            },
            {
              key: "reason",
              title: "Reason",
              render: (row) => (
                <div className="max-w-xs text-sm text-slate-500 italic line-clamp-2" title={row.reason}>
                  "{row.reason}"
                </div>
              ),
            },
            {
              key: "status",
              title: "Status",
              render: (row) => (
                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColors[row.status]}`}>
                  {row.status}
                </span>
              ),
            },
            {
              key: "actions",
              title: "Actions",
              render: (row) => (
                <div className="flex items-center gap-2">
                  {row.status === "PENDING" ? (
                    <>
                      <button
                        onClick={() => handleApprove(row)}
                        disabled={processing}
                        className="h-9 px-4 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all font-bold text-xs flex items-center gap-2 border border-emerald-100"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button
                        onClick={() => openRejectModal(row)}
                        disabled={processing}
                        className="h-9 px-4 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all font-bold text-xs flex items-center gap-2 border border-rose-100"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                      Processed on {format(new Date(row.updatedAt), "dd MMM")}
                    </span>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={isRejectModalOpen}
        title="Reject Break Request"
        onClose={() => setIsRejectModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <p className="text-sm font-medium text-rose-900">
              You are rejecting the break request for <strong>{selectedRequest?.employee?.name}</strong> on {selectedRequest && format(new Date(selectedRequest.date), "dd MMM, yyyy")}.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Rejection Reason (HR Note)</label>
            <Textarea
              placeholder="Provide a reason for rejection..."
              value={hrNote}
              onChange={(e) => setHrNote(e.target.value)}
              required
            />
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-50">
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="ghost" className="bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200" onClick={handleReject} disabled={processing}>
              {processing ? "Processing..." : "Confirm Rejection"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    </ServiceGuard>
  );
}
