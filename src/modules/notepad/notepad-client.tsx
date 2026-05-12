"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Trash2, 
  Pin, 
  PinOff, 
  Palette, 
  MoreVertical,
  Search,
  Loader2,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Edit2,
  Bell,
  Clock,
  CheckCircle2,
  Bold,
  ListOrdered,
  Type
} from "lucide-react";
import { format } from "date-fns";
import { getJson, sendJson } from "@/lib/http";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

interface Note {
  id: string;
  title: string | null;
  content: string;
  isPinned: boolean;
  color: string;
  order: number;
  reminderAt: string | null;
  isReminderNotified: boolean;
  createdAt: string;
  updatedAt: string;
}

const COLORS = [
  { name: "White", value: "white", bg: "bg-white", border: "border-slate-200" },
  { name: "Red", value: "#f28b82", bg: "bg-[#f28b82]", border: "border-red-300" },
  { name: "Orange", value: "#fbbc04", bg: "bg-[#fbbc04]", border: "border-orange-300" },
  { name: "Yellow", value: "#fff475", bg: "bg-[#fff475]", border: "border-yellow-300" },
  { name: "Green", value: "#ccff90", bg: "bg-[#ccff90]", border: "border-green-300" },
  { name: "Teal", value: "#a7ffeb", bg: "bg-[#a7ffeb]", border: "border-teal-300" },
  { name: "Blue", value: "#cbf0f8", bg: "bg-[#cbf0f8]", border: "border-blue-300" },
  { name: "Dark Blue", value: "#aecbfa", bg: "bg-[#aecbfa]", border: "border-blue-400" },
  { name: "Purple", value: "#d7aefb", bg: "bg-[#d7aefb]", border: "border-purple-300" },
  { name: "Pink", value: "#fdcfe8", bg: "bg-[#fdcfe8]", border: "border-pink-300" },
  { name: "Brown", value: "#e6c9a8", bg: "bg-[#e6c9a8]", border: "border-amber-300" },
  { name: "Gray", value: "#e8eaed", bg: "bg-[#e8eaed]", border: "border-slate-300" },
];

export function NotepadClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanding, setIsExpanding] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", content: "", isPinned: false, color: "white", reminderAt: "" });
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showEditTextColorPicker, setShowEditTextColorPicker] = useState(false);
  const { t } = useTranslation();
  
  const expanderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editEditorRef = useRef<HTMLDivElement>(null);

  // Sync content from div to state
  const handleContentChange = (e: React.FormEvent<HTMLDivElement>, isNew: boolean) => {
    const html = e.currentTarget.innerHTML;
    if (isNew) {
      setNewNote(prev => ({ ...prev, content: html }));
    } else {
      setEditingNote(prev => prev ? { ...prev, content: html } : null);
    }
  };

  const execCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
    if (editEditorRef.current) editEditorRef.current.focus();
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // Populate edit editor when modal opens
  useEffect(() => {
    if (editingNote && editEditorRef.current) {
      // Only set if different to avoid cursor jumping
      if (editEditorRef.current.innerHTML !== editingNote.content) {
        editEditorRef.current.innerHTML = editingNote.content;
      }
    }
  }, [editingNote]);

  async function fetchNotes() {
    setLoading(true);
    try {
      const data = await getJson<Note[]>("/api/notes");
      setNotes(data);
    } catch (error) {
      console.error(t("Failed to fetch notes"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNote() {
    if (!newNote.content.trim()) {
      setIsExpanding(false);
      return;
    }
    try {
      await sendJson("/api/notes", "POST", {
        ...newNote,
        reminderAt: newNote.reminderAt ? new Date(newNote.reminderAt).toISOString() : null
      });
      setNewNote({ title: "", content: "", isPinned: false, color: "white", reminderAt: "" });
      if (editorRef.current) editorRef.current.innerHTML = "";
      setIsExpanding(false);
      setShowReminderPicker(false);
      fetchNotes();
    } catch (error) {
      alert(t("Failed to create note"));
    }
  }

  async function handleUpdateNote(id: string, updates: Partial<Note>) {
    try {
      const payload = { ...updates };
      if (payload.reminderAt) {
        payload.reminderAt = new Date(payload.reminderAt).toISOString();
      }
      await sendJson(`/api/notes?id=${id}`, "PUT", payload);
      if (editingNote?.id === id) {
        setEditingNote(prev => prev ? { ...prev, ...updates } : null);
      }
      fetchNotes();
    } catch (error) {
      alert(t("Failed to update note"));
    }
  }

  async function handleDeleteNote(id: string) {
    if (!confirm(t("Delete this note?"))) return;
    try {
      await sendJson(`/api/notes?id=${id}`, "DELETE", {});
      if (editingNote?.id === id) {
        setEditingNote(null);
      }
      fetchNotes();
    } catch (error) {
      alert(t("Failed to delete note"));
    }
  }

  async function moveNote(id: string, direction: "up" | "down") {
    const sortedNotes = [...notes];
    const index = sortedNotes.findIndex(n => n.id === id);
    if (direction === "up" && index > 0) {
      const temp = sortedNotes[index].order;
      sortedNotes[index].order = sortedNotes[index - 1].order;
      sortedNotes[index - 1].order = temp;
    } else if (direction === "down" && index < sortedNotes.length - 1) {
      const temp = sortedNotes[index].order;
      sortedNotes[index].order = sortedNotes[index + 1].order;
      sortedNotes[index + 1].order = temp;
    } else {
      return;
    }

    try {
      await sendJson("/api/notes", "PUT", {
        orders: sortedNotes.map(n => ({ id: n.id, order: n.order }))
      });
      fetchNotes();
    } catch (error) {
      alert(t("Failed to reorder notes"));
    }
  }

  const pinnedNotes = notes.filter(n => n.isPinned && (n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase())));
  const otherNotes = notes.filter(n => !n.isPinned && (n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="flex flex-col gap-8 pb-20 animate-in fade-in duration-500">
      <PageHeader 
        title={t("Quick Notes")}
        subtitle={t("Capture thoughts and manage tasks in a Google Keep-style interface.")}
        actions={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder={t("Search notes...")} 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none w-64 transition-all"
            />
          </div>
        }
      />

      {/* Note Creation Area */}
      <div className="max-w-2xl mx-auto w-full px-4">
        <div 
          ref={expanderRef}
          className={`rounded-xl border border-slate-200 shadow-md transition-all duration-300 ${isExpanding ? 'ring-2 ring-brand-500/20 border-brand-500/30' : 'hover:shadow-lg'}`}
          style={{ backgroundColor: newNote.color === 'white' ? 'white' : newNote.color }}
        >
          {isExpanding && (
            <div className="px-5 py-3 flex items-center justify-between border-b border-slate-50">
               <input 
                 placeholder={t("Title")} 
                 value={newNote.title}
                 onChange={e => setNewNote({...newNote, title: e.target.value})}
                 className="w-full bg-transparent border-none outline-none font-bold text-slate-800 placeholder:text-slate-400"
               />
               <button 
                 onClick={() => setNewNote({...newNote, isPinned: !newNote.isPinned})}
                 className={`p-2 rounded-full transition-all ${newNote.isPinned ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
               >
                 {newNote.isPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
               </button>
            </div>
          )}
          
          <div className="p-5 space-y-3">
             <div className="flex items-center gap-1 mb-2 border-b border-slate-50 pb-2">
                <button 
                  onMouseDown={(e) => { e.preventDefault(); execCommand("bold"); }}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-all"
                  title={t("Bold")}
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button 
                  onMouseDown={(e) => { e.preventDefault(); execCommand("insertOrderedList"); }}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-all"
                  title={t("Numbered List")}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                    className={`p-1.5 rounded transition-all ${showTextColorPicker ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                    title={t("Text Color")}
                  >
                    <Type className="w-3.5 h-3.5" />
                  </button>
                  {showTextColorPicker && (
                    <div className="absolute top-full left-0 mt-1 flex gap-1.5 p-2 bg-white shadow-xl border border-slate-100 rounded-xl z-50 animate-in zoom-in-95 duration-200">
                      {["#000000", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#78350f"].map(color => (
                        <button 
                          key={color}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execCommand("foreColor", color);
                            setShowTextColorPicker(false);
                          }}
                          className="w-5 h-5 rounded-full border border-slate-200 hover:scale-125 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
             </div>
             <div 
               contentEditable
               suppressContentEditableWarning
               ref={editorRef}
               onFocus={() => setIsExpanding(true)}
               onInput={(e) => handleContentChange(e, true)}
               className="w-full min-h-[80px] bg-transparent border-none outline-none text-slate-600 placeholder:text-slate-400 font-medium empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 focus:empty:before:content-none prose prose-slate max-w-none prose-sm"
               data-placeholder={t("Take a note...")}
             />
          </div>

          {isExpanding && (
            <div className="px-5 py-3 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-2">
                  <div className="relative">
                     <button 
                       onClick={() => setShowColorPicker(!showColorPicker)}
                       className={`p-2 rounded-full text-slate-500 transition-all ${showColorPicker ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
                     >
                        <Palette className="w-4 h-4" />
                     </button>
                     {showColorPicker && (
                       <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-slate-100 rounded-xl shadow-xl flex gap-1 z-50 animate-in zoom-in-95 duration-200">
                          {COLORS.map(c => (
                             <button 
                               key={c.value} 
                               onClick={() => {
                                 setNewNote({...newNote, color: c.value});
                                 setShowColorPicker(false);
                               }}
                               className={`w-6 h-6 rounded-full border border-slate-100 ${c.bg} hover:scale-110 transition-transform ${newNote.color === c.value ? 'ring-2 ring-brand-500' : ''}`}
                             />
                          ))}
                       </div>
                     )}
                  </div>
                  <div className="relative">
                     <button 
                       onClick={() => setShowReminderPicker(!showReminderPicker)}
                       className={`p-2 rounded-full transition-all ${
                         newNote.reminderAt && new Date(newNote.reminderAt) > new Date() 
                         ? 'bg-brand-100 text-brand-600 ring-2 ring-brand-500/20' 
                         : 'text-slate-500 hover:bg-slate-100'
                       }`}
                       title={t("Set Reminder")}
                     >
                        <Bell className="w-4 h-4" />
                     </button>
                     {showReminderPicker && (
                       <div className="absolute top-full left-0 mt-2 p-4 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 animate-in zoom-in-95 duration-200 min-w-[200px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t("Set Reminder")}</p>
                          <input 
                            type="datetime-local" 
                            value={newNote.reminderAt}
                            onChange={(e) => setNewNote({...newNote, reminderAt: e.target.value})}
                            className="w-full p-2 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                          <div className="flex justify-end mt-3 gap-2">
                             <button onClick={() => { setNewNote({...newNote, reminderAt: ""}); setShowReminderPicker(false); }} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1">{t("Clear")}</button>
                             <button onClick={() => setShowReminderPicker(false)} className="text-[10px] font-bold text-brand-600 uppercase tracking-widest px-2 py-1">{t("Save")}</button>
                          </div>
                       </div>
                     )}
                  </div>
               </div>
               {newNote.reminderAt && (
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 rounded-full border border-brand-100">
                    <Clock className="w-3 h-3 text-brand-600" />
                    <span className="text-[10px] font-bold text-brand-700">{format(new Date(newNote.reminderAt), "MMM d, h:mm a")}</span>
                    <button onClick={() => setNewNote({...newNote, reminderAt: ""})} className="p-0.5 hover:bg-brand-100 rounded-full">
                       <X className="w-2.5 h-2.5 text-brand-500" />
                    </button>
                 </div>
               )}
               <div className="flex items-center gap-3">
                  <button onClick={() => { setIsExpanding(false); setNewNote({ title: "", content: "", isPinned: false, color: "white", reminderAt: "" }); setShowReminderPicker(false); }} className="text-sm font-bold text-slate-400 hover:text-slate-600 px-3 py-1">{t("Cancel")}</button>
                  <Button onClick={handleCreateNote} className="rounded-lg px-6 h-9 bg-brand-600 hover:bg-brand-700">{t("Done")}</Button>
               </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
           <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
           <p className="text-sm text-slate-400 font-medium italic">{t("Gathering your notes...")}</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">{t("Pinned")}</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4">
                  {pinnedNotes.map(note => (
                    <NoteCard 
                      key={note.id} 
                      note={note} 
                      onEdit={() => setEditingNote(note)}
                      onUpdate={(u) => handleUpdateNote(note.id, u)}
                      onDelete={() => handleDeleteNote(note.id)}
                      onMove={(d) => moveNote(note.id, d)}
                      t={t}
                    />
                  ))}
               </div>
            </div>
          )}

          {/* Other Notes */}
          <div className="space-y-4">
             {pinnedNotes.length > 0 && <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">{t("Others")}</p>}
             {otherNotes.length === 0 && pinnedNotes.length === 0 ? (
               <div className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                     <Edit2 className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-medium italic">{t("No notes found. Create your first note!")}</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4">
                  {otherNotes.map(note => (
                    <NoteCard 
                      key={note.id} 
                      note={note} 
                      onEdit={() => setEditingNote(note)}
                      onUpdate={(u) => handleUpdateNote(note.id, u)}
                      onDelete={() => handleDeleteNote(note.id)}
                      onMove={(d) => moveNote(note.id, d)}
                      t={t}
                    />
                  ))}
               </div>
             )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div 
             className="w-full max-w-xl rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300"
             style={{ backgroundColor: editingNote.color === 'white' ? 'white' : editingNote.color }}
           >
              <div className="p-8 space-y-6">
                 <div className="flex items-center justify-between">
                    <input 
                      value={editingNote.title || ""} 
                      onChange={e => setEditingNote({...editingNote, title: e.target.value})}
                      placeholder={t("Title")}
                      className="bg-transparent border-none outline-none font-bold text-xl text-slate-800 placeholder:text-slate-400 w-full"
                    />
                    <button 
                      onClick={() => handleUpdateNote(editingNote.id, { isPinned: !editingNote.isPinned })}
                      className={`p-2 rounded-full transition-all ${editingNote.isPinned ? 'bg-black/5 text-indigo-600' : 'text-slate-400 hover:bg-black/5'}`}
                    >
                      {editingNote.isPinned ? <Pin className="w-5 h-5 fill-current" /> : <PinOff className="w-5 h-5" />}
                    </button>
                 </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2 bg-black/5 p-2 rounded-2xl w-fit">
                        <button 
                          onMouseDown={(e) => { e.preventDefault(); execCommand("bold"); }}
                          className="p-2 hover:bg-black/10 rounded-xl text-slate-700 transition-all"
                          title={t("Bold")}
                        >
                          <Bold className="w-5 h-5" />
                        </button>
                        <button 
                          onMouseDown={(e) => { e.preventDefault(); execCommand("insertOrderedList"); }}
                          className="p-2 hover:bg-black/10 rounded-xl text-slate-700 transition-all"
                          title={t("Numbered List")}
                        >
                          <ListOrdered className="w-5 h-5" />
                        </button>
                        <div className="relative">
                          <button 
                            onClick={() => setShowEditTextColorPicker(!showEditTextColorPicker)}
                            className={`p-2 rounded-xl transition-all ${showEditTextColorPicker ? 'bg-black/10 text-slate-800' : 'text-slate-700 hover:bg-black/10'}`}
                            title={t("Text Color")}
                          >
                            <Type className="w-5 h-5" />
                          </button>
                          {showEditTextColorPicker && (
                            <div className="absolute bottom-full left-0 mb-2 flex gap-2.5 p-3 bg-white shadow-2xl border border-slate-100 rounded-2xl z-50 animate-in slide-in-from-bottom-2 duration-200">
                              {["#000000", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#78350f", "#64748b"].map(color => (
                                <button 
                                  key={color}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    execCommand("foreColor", color);
                                    setShowEditTextColorPicker(false);
                                  }}
                                  className="w-7 h-7 rounded-full border border-slate-200 hover:scale-125 transition-transform"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                    </div>
                    <div 
                      contentEditable
                      suppressContentEditableWarning
                      ref={editEditorRef}
                      onInput={(e) => handleContentChange(e, false)}
                      className="w-full min-h-[300px] bg-transparent border-none outline-none resize-none text-slate-600 font-medium placeholder:text-slate-400 text-lg leading-relaxed prose prose-slate max-w-none"
                    />
                  </div>
                 <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-black/5">
                    <div className="flex items-center gap-3">
                       <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                            className={`p-2.5 rounded-xl transition-all ${showColorPicker ? 'bg-black/10' : 'hover:bg-black/5'} text-slate-500`}
                            title={t("Change Color")}
                          >
                             <Palette className="w-5 h-5" />
                          </button>
                          {showColorPicker && (
                            <div className="absolute bottom-full left-0 mb-3 p-3 bg-white border border-slate-100 rounded-[20px] shadow-2xl flex flex-wrap gap-2 z-[60] animate-in slide-in-from-bottom-2 duration-200 w-48">
                               {COLORS.map(c => (
                                  <button 
                                    key={c.value} 
                                    onClick={() => {
                                      handleUpdateNote(editingNote.id, { color: c.value });
                                      setShowColorPicker(false);
                                    }}
                                    className={`w-7 h-7 rounded-full border border-black/10 ${c.bg} hover:scale-110 transition-transform ${editingNote.color === c.value ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`}
                                  />
                               ))}
                            </div>
                          )}
                       </div>

                       <div className="relative">
                           <button 
                             onClick={(e) => { e.stopPropagation(); setShowReminderPicker(!showReminderPicker); }}
                             className={`p-2.5 rounded-xl transition-all ${
                               editingNote.reminderAt && new Date(editingNote.reminderAt) > new Date() && !editingNote.isReminderNotified
                               ? 'bg-brand-100 text-brand-600 ring-2 ring-brand-500/20' 
                               : 'text-slate-500 hover:bg-black/5'
                             }`}
                             title={t("Set Reminder")}
                           >
                              <Bell className="w-5 h-5" />
                           </button>
                          {showReminderPicker && (
                            <div className="absolute bottom-full left-0 mb-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[60] animate-in slide-in-from-bottom-2 duration-200 min-w-[220px]">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t("Update Reminder")}</p>
                               <input 
                                 type="datetime-local" 
                                 value={editingNote.reminderAt ? format(new Date(editingNote.reminderAt), "yyyy-MM-dd'T'HH:mm") : ""}
                                 onChange={(e) => handleUpdateNote(editingNote.id, { reminderAt: e.target.value })}
                                 className="w-full p-2.5 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500/20"
                               />
                               {editingNote.reminderAt && (
                                 <button 
                                   onClick={() => handleUpdateNote(editingNote.id, { reminderAt: null })}
                                   className="w-full mt-3 py-2 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all"
                                 >
                                   {t("Remove Reminder")}
                                 </button>
                               )}
                            </div>
                          )}
                       </div>

                       <button 
                         onClick={() => handleDeleteNote(editingNote.id)} 
                         className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                         title={t("Delete Note")}
                       >
                          <Trash2 className="w-5 h-5" />
                       </button>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                       <Button 
                         onClick={() => { setEditingNote(null); setShowColorPicker(false); setShowReminderPicker(false); }} 
                         className="rounded-xl px-8 h-11 bg-brand-600 hover:bg-brand-700 font-bold w-full sm:w-auto"
                       >
                         {t("Done")}
                       </Button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, onEdit, onUpdate, onDelete, onMove, t }: { note: Note, onEdit: () => void, onUpdate: (u: Partial<Note>) => void, onDelete: () => void, onMove: (d: "up" | "down") => void, t: any }) {
  const [showTools, setShowTools] = useState(false);
  
  return (
    <div 
      onMouseEnter={() => setShowTools(true)}
      onMouseLeave={() => setShowTools(false)}
      onClick={onEdit}
      className={`relative group rounded-2xl p-6 border transition-all duration-300 hover:shadow-xl cursor-pointer flex flex-col justify-between min-h-[160px] ${note.color === 'white' ? 'bg-white border-slate-100 hover:border-brand-200' : `border-black/5 hover:brightness-95 shadow-sm`}`}
      style={{ backgroundColor: note.color === 'white' ? 'white' : note.color }}
    >
      <div className="space-y-3">
         <div className="flex items-center justify-between gap-3">
            <h4 className="font-bold text-slate-800 line-clamp-1 text-sm">{note.title}</h4>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate({ isPinned: !note.isPinned }); }}
              className={`p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 ${note.isPinned ? 'text-indigo-600' : 'text-slate-400 hover:bg-black/5'}`}
            >
              {note.isPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
            </button>
         </div>
         <div 
           className="text-slate-600 text-sm font-medium line-clamp-6 leading-relaxed whitespace-pre-wrap prose prose-slate max-w-none prose-sm"
           dangerouslySetInnerHTML={{ __html: note.content }}
         />
         
         {note.reminderAt && new Date(note.reminderAt) > new Date() && (
           <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-brand-50/50 border-brand-100/50 text-brand-600 w-fit">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-wider">{format(new Date(note.reminderAt), "MMM d, h:mm a")}</span>
           </div>
         )}
      </div>

      <div className={`flex items-center justify-between mt-6 transition-all duration-300 ${showTools ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
         <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onMove("up"); }} 
              className="p-1.5 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              title={t("Move Up")}
            >
               <ChevronUp className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMove("down"); }} 
              className="p-1.5 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              title={t("Move Down")}
            >
               <ChevronDown className="w-4 h-4" />
            </button>
         </div>
         <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 hover:bg-rose-50 rounded-xl text-slate-300 hover:text-rose-500 transition-all"
            >
               <Trash2 className="w-4 h-4" />
            </button>
         </div>
      </div>
    </div>
  );
}
