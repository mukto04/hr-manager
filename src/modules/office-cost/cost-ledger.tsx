"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Settings2,
  Trash2,
  Tag,
  FileText,
  Loader2,
  X,
  CreditCard,
  Wallet,
  ChevronDown,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { getJson, sendJson } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CustomSelect } from "@/components/ui/custom-select";
import { useGlobalSettings } from "@/components/providers/global-settings-provider";
import { useTranslation } from "@/hooks/use-translation";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string;
  _count?: { transactions: number };
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  details: string;
  category: Category;
}

export function CostLedger() {
  const { currencySymbol } = useGlobalSettings();
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString()}`;
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [prevBalance, setPrevBalance] = useState(0);

  const months = [
    { label: "January", value: 1 },
    { label: "February", value: 2 },
    { label: "March", value: 3 },
    { label: "April", value: 4 },
    { label: "May", value: 5 },
    { label: "June", value: 6 },
    { label: "July", value: 7 },
    { label: "August", value: 8 },
    { label: "September", value: 9 },
    { label: "October", value: 10 },
    { label: "November", value: 11 },
    { label: "December", value: 12 },
  ].map(m => ({ ...m, label: t(m.label) }));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Custom Select State
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const [txForm, setTxForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    categoryId: "",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    details: ""
  });

  const [catForm, setCatForm] = useState({
    name: "",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    color: "#4f46e5"
  });

  useEffect(() => {
    fetchData();
    
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsSelectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedMonth, selectedYear]);

  async function fetchData() {
    setLoading(true);
    try {
      const [txData, catData] = await Promise.all([
        getJson<{ transactions: Transaction[], previousBalance: number }>(`/api/office-cost/transactions?month=${selectedMonth}&year=${selectedYear}`),
        getJson<Category[]>("/api/office-cost/categories")
      ]);
      setTransactions(txData.transactions);
      setPrevBalance(txData.previousBalance);
      setCategories(catData);
      
      // Initial category selection based on default type (EXPENSE)
      if (!txForm.categoryId) {
        const firstExpense = catData.find(c => c.type === "EXPENSE");
        if (firstExpense) setTxForm(prev => ({ ...prev, categoryId: firstExpense.id }));
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(c => c.type === txForm.type);

  // Update category when type changes
  const handleTypeChange = (newType: "INCOME" | "EXPENSE") => {
    setTxForm(prev => {
      const firstMatching = categories.find(c => c.type === newType);
      return { 
        ...prev, 
        type: newType, 
        categoryId: firstMatching ? firstMatching.id : "" 
      };
    });
  };

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!txForm.categoryId) return alert(t("Please select a category"));
    try {
      await sendJson("/api/office-cost/transactions", "POST", {
        ...txForm,
        amount: parseFloat(txForm.amount)
      });
      setShowAddModal(false);
      setTxForm({ ...txForm, amount: "", details: "" });
      fetchData();
    } catch (error) {
      alert(t("Failed to save transaction"));
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      await sendJson("/api/office-cost/categories", "POST", catForm);
      setCatForm({ ...catForm, name: "" });
      fetchData();
    } catch (error) {
      alert(t("Failed to create category"));
    }
  }

  async function deleteTransaction(id: string) {
    if (!confirm(t("Delete this transaction?"))) return;
    try {
      await sendJson(`/api/office-cost/transactions?id=${id}`, "DELETE", {});
      fetchData();
    } catch (error) {
      alert(t("Delete failed"));
    }
  }

  const totals = transactions.reduce((acc, tx) => {
    if (tx.type === "INCOME") acc.income += tx.amount;
    else acc.expense += tx.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const currentBalance = prevBalance + totals.income - totals.expense;

  const selectedCategory = categories.find(c => c.id === txForm.categoryId);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <PageHeader 
        title={t("Global Office Costing")}
        subtitle={t("Manage flexible expenses and income with dynamic categories.")}
        actions={
          <div className="flex flex-wrap items-center gap-4">
             <CustomSelect 
                options={months}
                value={selectedMonth}
                onChange={setSelectedMonth}
                className="min-w-[160px]"
             />
             <CustomSelect 
                options={years.map(y => ({ label: String(y), value: y }))}
                value={selectedYear}
                onChange={setSelectedYear}
                className="min-w-[100px]"
             />

             <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowCategoryModal(true)} className="rounded-xl border-slate-200 hover:bg-slate-50 transition-all duration-300">
                  <Settings2 className="w-4 h-4 mr-2" /> {t("Categories")}
                </Button>
                <Button onClick={() => setShowAddModal(true)} className="rounded-xl bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all duration-300">
                  <Plus className="w-4 h-4 mr-2" /> {t("Add Transaction")}
                </Button>
             </div>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Opening Balance")}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(prevBalance)}</div>
         </div>

         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Total Deposit")}</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">{formatCurrency(totals.income)}</div>
         </div>

         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-rose-50 rounded-xl group-hover:scale-110 transition-transform">
                <ArrowDownRight className="w-5 h-5 text-rose-600" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Total Expense")}</span>
            </div>
            <div className="text-2xl font-bold text-rose-600 tabular-nums">{formatCurrency(totals.expense)}</div>
         </div>

         <div className="bg-slate-900 p-6 rounded-2xl shadow-xl shadow-slate-200 relative overflow-hidden group">
            <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
               <CreditCard className="w-32 h-32 text-white" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t("Closing Balance")}</div>
               <div className="text-3xl font-bold text-white tabular-nums tracking-tight">{formatCurrency(currentBalance)}</div>
            </div>
         </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/40 overflow-hidden">
         <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <FileText className="w-4 h-4 text-indigo-500" />
              </div>
              {t("General Ledger")}
            </h3>
            <div className="flex items-center gap-3">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input placeholder={t("Search transactions...")} className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-72 transition-all duration-300 hover:border-slate-300" />
               </div>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                     <th className="px-8 py-4">{t("Date")}</th>
                     <th className="px-8 py-4">{t("Category")}</th>
                     <th className="px-8 py-4">{t("Details")}</th>
                     <th className="px-8 py-4 text-right">{t("Amount")}</th>
                     <th className="px-8 py-4 text-center">{t("Action")}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-200" />
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-400 italic">{t("No transactions found for this period.")}</td>
                    </tr>
                  ) : transactions.map(tx => (
                    <tr key={tx.id} className="group hover:bg-slate-50/80 transition-colors">
                       <td className="px-8 py-5">
                          <div className="flex flex-col">
                             <span className="text-sm font-bold text-slate-700">{format(new Date(tx.date), "dd MMM, yyyy")}</span>
                             <span className="text-[10px] text-slate-400 font-mono">{format(new Date(tx.date), "HH:mm")}</span>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold shadow-sm" style={{ backgroundColor: `${tx.category?.color}15`, color: tx.category?.color, border: `1px solid ${tx.category?.color}30` }}>
                             <Tag className="w-3 h-3 mr-1" /> {tx.category?.name}
                          </span>
                       </td>
                       <td className="px-8 py-5">
                          <p className="text-sm text-slate-500 line-clamp-1 max-w-xs">{tx.details || "-"}</p>
                       </td>
                       <td className={`px-8 py-5 text-right font-black tabular-nums ${tx.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>
                          {tx.type === "INCOME" ? "+" : "-"} {formatCurrency(tx.amount)}
                       </td>
                       <td className="px-8 py-5 text-center">
                          <button onClick={() => deleteTransaction(tx.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2.5 bg-brand-600 rounded-2xl shadow-lg shadow-brand-200">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    {t("New Transaction")}
                 </h3>
                 <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <form onSubmit={handleAddTransaction} className="p-8 space-y-7">
                 <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                       <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t("Date")}</label>
                       <div className="relative">
                          <input type="date" value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-sm font-semibold transition-all" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t("Type")}</label>
                       <div className="flex p-1 bg-slate-100 rounded-2xl">
                          <button type="button" onClick={() => handleTypeChange('EXPENSE')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${txForm.type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t("Expense")}</button>
                          <button type="button" onClick={() => handleTypeChange('INCOME')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${txForm.type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t("Deposit")}</button>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t("Category")} ({txForm.type === 'EXPENSE' ? t("Expense") : t("Deposit")})</label>
                    <div className="relative" ref={selectRef}>
                       <button 
                        type="button"
                        onClick={() => setIsSelectOpen(!isSelectOpen)}
                        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-sm font-bold transition-all group"
                       >
                          <div className="flex items-center gap-3">
                             {selectedCategory ? (
                               <>
                                 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCategory.color }} />
                                 <span className="text-slate-800">{selectedCategory.name}</span>
                               </>
                             ) : (
                               <span className="text-slate-400">{txForm.type === 'EXPENSE' ? t("Select Expense Category...") : t("Select Deposit Category...")}</span>
                             )}
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isSelectOpen ? 'rotate-180' : ''}`} />
                       </button>

                       {isSelectOpen && (
                         <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in slide-in-from-top-2 duration-200">
                            <div className="max-h-[280px] overflow-y-auto p-2 custom-scroll">
                               {filteredCategories.length === 0 ? (
                                 <div className="p-4 text-center text-xs text-slate-400 italic">{txForm.type === 'EXPENSE' ? t("No expense categories yet") : t("No deposit categories yet")}</div>
                               ) : filteredCategories.map(cat => (
                                 <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    setTxForm({...txForm, categoryId: cat.id});
                                    setIsSelectOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-1 ${txForm.categoryId === cat.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                 >
                                    <div className="flex items-center gap-3">
                                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                       <span className="font-bold text-sm">{cat.name}</span>
                                    </div>
                                    {txForm.categoryId === cat.id && <Check className="w-4 h-4 text-brand-600" />}
                                 </button>
                               ))}
                            </div>
                            <div className="p-2 bg-slate-50 border-t border-slate-100">
                               <button type="button" onClick={() => { setShowAddModal(false); setShowCategoryModal(true); }} className="w-full py-2 text-[10px] font-bold text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-widest">
                                  {t("+ Manage Categories")}
                               </button>
                            </div>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t("Amount")}</label>
                    <div className="relative">
                       <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xl">{currencySymbol}</span>
                       <input autoFocus type="number" required value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} className="w-full pl-12 pr-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-3xl font-bold tabular-nums transition-all placeholder:text-slate-200" placeholder="0.00" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t("Note (Optional)")}</label>
                    <textarea value={txForm.details} onChange={e => setTxForm({...txForm, details: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-sm font-medium min-h-[100px] transition-all resize-none" placeholder={t("Add transaction details...")} />
                 </div>

                 <Button type="submit" className="w-full py-7 rounded-2xl bg-brand-600 hover:bg-brand-700 text-lg font-bold shadow-xl shadow-brand-100 transition-all duration-300 transform active:scale-[0.98]">
                    {t("Save Transaction Record")}
                 </Button>
              </form>
           </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2.5 bg-brand-600 rounded-2xl shadow-lg shadow-brand-200">
                      <Tag className="w-5 h-5 text-white" />
                    </div>
                    {t("Cost Heads (Categories)")}
                 </h3>
                 <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-8 space-y-8">
                 <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t("Create New Category")}</p>
                    <form onSubmit={handleAddCategory} className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <input required placeholder={t("Category name...")} value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 outline-none text-sm font-bold transition-all" />
                          <div className="flex p-1 bg-white border border-slate-200 rounded-xl">
                             <button type="button" onClick={() => setCatForm({...catForm, type: 'EXPENSE'})} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${catForm.type === 'EXPENSE' ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:bg-slate-50'}`}>{t("Expense")}</button>
                             <button type="button" onClick={() => setCatForm({...catForm, type: 'INCOME'})} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${catForm.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}>{t("Deposit")}</button>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2">
                             <span className="text-xs font-bold text-slate-400">{t("Pick Color")}</span>
                             <input type="color" value={catForm.color} onChange={e => setCatForm({...catForm, color: e.target.value})} className="w-8 h-8 rounded-lg border-2 border-slate-50 shadow-sm cursor-pointer p-0 overflow-hidden" />
                          </div>
                          <Button type="submit" className="rounded-xl px-10 h-12 bg-brand-600 hover:bg-brand-700 transition-all duration-300 shadow-md shadow-brand-100">{t("Add Category")}</Button>
                       </div>
                    </form>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                       <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{t("Existing Categories")}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scroll">
                       {categories.length === 0 ? (
                          <div className="col-span-2 text-center py-10">
                             <Tag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                             <p className="text-sm text-slate-400">{t("No categories created yet.")}</p>
                          </div>
                       ) : categories.map(cat => (
                          <div key={cat.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/20 transition-all duration-300 group">
                             <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-lg shadow-sm border-2 border-white" style={{ backgroundColor: cat.color }} />
                                <div>
                                   <p className="font-bold text-slate-700 leading-tight text-xs">{cat.name}</p>
                                   <p className={`text-[9px] font-bold uppercase tracking-tighter mt-0.5 ${cat.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>{cat.type === 'INCOME' ? t("Deposit") : t("Expense")}</p>
                                </div>
                             </div>
                             {cat._count?.transactions === 0 && (
                                <button onClick={async () => {
                                   await sendJson(`/api/office-cost/categories?id=${cat.id}`, "DELETE", {});
                                   fetchData();
                                }} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                   <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             )}
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        
        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }
      `}} />
    </div>
  );
}
