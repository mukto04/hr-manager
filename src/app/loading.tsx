export default function Loading() {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[70vh]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          {/* Pulse layers */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-indigo-50/50 rounded-full animate-ping duration-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-indigo-100/50 rounded-full animate-pulse"></div>
          
          {/* Main animated ring */}
          <div className="w-12 h-12 border-[3px] border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
        
        <div className="flex flex-col items-center">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Synchronizing</p>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

