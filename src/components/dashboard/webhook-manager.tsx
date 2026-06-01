"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createWebhookAction,
  deleteWebhookAction,
  type WebhookState,
} from "@/lib/actions/webhook-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EVENT_OPTIONS = [
  { value: "enrollment.created", label: "Matrícula criada" },
  { value: "course.published", label: "Curso publicado" },
  { value: "certificate.issued", label: "Certificado emitido" },
  { value: "student.created", label: "Aluno cadastrado" },
];

type WebhookView = {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  deliveries: number;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adicionando..." : "Adicionar webhook"}
    </Button>
  );
}

export function WebhookManager({ webhooks }: { webhooks: WebhookView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useActionState<WebhookState, FormData>(
    createWebhookAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Webhook adicionado.");
      router.refresh();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="url">URL do endpoint (ex.: fluxo n8n)</Label>
              <Input id="url" name="url" type="url" placeholder="https://seu-n8n.com/webhook/..." required />
              {state?.fieldErrors?.url && (
                <p className="text-sm text-destructive">{state.fieldErrors.url[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Eventos</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {EVENT_OPTIONS.map((e) => (
                  <label key={e.value} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="events" value={e.value} />
                    {e.label}
                  </label>
                ))}
              </div>
              {state?.fieldErrors?.events && (
                <p className="text-sm text-destructive">{state.fieldErrors.events[0]}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Cada entrega é assinada (HMAC-SHA256) no cabeçalho{" "}
              <code>X-ClassOS-Signature</code>. O segredo é gerado ao criar o webhook.
            </p>
            <div>
              <SubmitButton />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhooks ativos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {webhooks.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Nenhum webhook configurado.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">Eventos</th>
                  <th className="px-4 py-3 font-medium">Entregas</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {webhooks.map((w) => (
                  <tr key={w.id} className="border-b last:border-0">
                    <td className="max-w-[240px] truncate px-4 py-3 font-mono text-xs">{w.url}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {w.events.map((e) => (
                          <Badge key={e} variant="secondary" className="text-[10px]">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">{w.deliveries}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm("Remover este webhook?")) return;
                          startTransition(async () => {
                            const result = await deleteWebhookAction(w.id);
                            if (result?.error) toast.error(result.error);
                            else {
                              toast.success("Webhook removido.");
                              router.refresh();
                            }
                          });
                        }}
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
