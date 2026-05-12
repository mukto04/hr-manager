"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useGlobalSettings } from "@/components/providers/global-settings-provider";

interface CurrencyAmountProps {
  amount: number | string;
  className?: string;
  showEye?: boolean;
}

export function CurrencyAmount({ amount, className = "", showEye = true }: CurrencyAmountProps) {
  const [isVisible, setIsVisible] = useState(!showEye);
  const { currencySymbol } = useGlobalSettings();

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="font-bold">
        {currencySymbol}{isVisible ? amount : "****"}
      </span>
      {showEye && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsVisible(!isVisible);
          }}
          className="p-1 hover:bg-slate-100 rounded-md transition text-slate-400 hover:text-indigo-600 focus:outline-none"
          title={isVisible ? "Hide amount" : "Show amount"}
        >
          {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </span>
  );
}
