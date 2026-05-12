import { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "./input";
import { Card } from "./card";

export function SearchFilterBar({
  value,
  onChange,
  placeholder = "Search...",
  rightSlot
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
        {rightSlot}
      </div>
    </Card>
  );
}
