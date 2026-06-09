import { ModeToggle } from "@/components/mode-toggle";

/** Seletor de tema fixo no canto superior direito (telas de autenticação). */
export function CornerModeToggle() {
  return (
    <div className="fixed right-4 top-4 z-10">
      <ModeToggle />
    </div>
  );
}
