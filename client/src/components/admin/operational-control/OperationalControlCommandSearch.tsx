import type { OperationalControlContainerRow } from "@/api/operational-control";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  formatGpsAge,
  formatOperationalDateTime,
  rutafyStatusLabel,
} from "@/lib/operationalControlConstants";
import { matchesCommandSearch } from "@/lib/operationalControlUx";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  rows: OperationalControlContainerRow[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (row: OperationalControlContainerRow) => void;
};

export function OperationalControlCommandSearch({
  rows,
  query,
  onQueryChange,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = rows.filter((row) => matchesCommandSearch(row, query)).slice(0, 12);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left shadow-sm hover:border-[#2A9D8F]/40 hover:shadow-md transition-all"
      >
        <Search className="h-5 w-5 text-[#2A9D8F] shrink-0" aria-hidden />
        <span className="flex-1 text-sm text-gray-500">
          {query.trim() ? query : "Buscar contenedor…"}
        </span>
        <kbd className="hidden sm:inline-flex h-6 items-center rounded border border-gray-200 bg-gray-50 px-2 text-[10px] text-gray-500">
          Ctrl+K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscar contenedor"
        description="Buscar por contenedor, placa, conductor, cédula o programa"
      >
        <CommandInput
          placeholder="Contenedor, placa, conductor, cédula, programa…"
          value={query}
          onValueChange={onQueryChange}
        />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Contenedores">
            {results.map((row) => (
              <CommandItem
                key={row.container_id}
                value={row.container_label ?? row.container_id}
                onSelect={() => {
                  onSelect(row);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-[#1E3A5F] truncate">
                    {row.container_label?.trim() || row.container_id}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {rutafyStatusLabel(row.rutafy_status)} · {row.plate?.trim() || "—"} ·{" "}
                    {row.driver_name?.trim() || "Sin conductor"}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
