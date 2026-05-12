"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  className?: string;
}

const sizeClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-[95vw]'
};

export function Modal({ open, title, description, onClose, children, size = 'md', className }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={`w-full ${sizeClasses[size]} rounded-[32px] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${className || ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">{title}</h2>
            {description && <p className="text-xs font-bold text-slate-500">{description}</p>}
          </div>
          <button 
            onClick={onClose} 
            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>
        
        {/* Body */}
        <div className="px-8 py-8 max-h-[80vh] overflow-y-auto custom-scrollbar bg-white">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
