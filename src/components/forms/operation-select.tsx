import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * Dropdown "Operação" do cadastro do aluno. Só aparece quando a escola tem
 * operações configuradas (Configurações → Operações); nas demais, não renderiza.
 */
export function OperationSelect({
  operations,
  defaultValue = "",
  error,
}: {
  operations: string[];
  defaultValue?: string;
  error?: string[];
}) {
  if (operations.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="operation">Operação</Label>
      <select
        id="operation"
        name="operation"
        defaultValue={defaultValue}
        className={selectClass}
      >
        <option value="">Selecione a operação…</option>
        {operations.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
      {error?.length ? <p className="text-sm text-destructive">{error[0]}</p> : null}
    </div>
  );
}
