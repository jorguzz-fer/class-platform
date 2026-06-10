"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";

import { updateBrandingAction, type SettingsState } from "@/lib/actions/school-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const fileInputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Field({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

/**
 * Campo de imagem com upload (storage R2) + URL manual + preview ao vivo.
 * Reutilizado para logo, favicon e capa do catálogo (Hero). O servidor valida
 * o tipo por assinatura; aqui o `accept` é só uma dica para o seletor.
 */
function ImageUploadField({
  label,
  name,
  defaultUrl,
  error,
  hint,
  accept,
  wide = false,
}: {
  label: string;
  name: string;
  defaultUrl: string;
  error?: string[];
  hint: React.ReactNode;
  accept: string;
  wide?: boolean;
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);
  const showImg = /^https?:\/\//i.test(url.trim()) && !broken;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setBroken(false);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Falha no upload.");
        return;
      }
      setUrl(data.url);
      toast.success("Imagem enviada.");
    } catch {
      toast.error("Falha no upload. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-md border bg-muted",
            wide ? "aspect-video w-40" : "h-12 w-12",
          )}
        >
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url.trim()}
              alt="Pré-visualização"
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            type="file"
            accept={accept}
            className={fileInputClass}
            onChange={upload}
            disabled={uploading}
          />
          <Input
            id={name}
            name={name}
            type="url"
            placeholder="https://… ou envie um arquivo acima"
            value={url}
            onChange={(e) => {
              setBroken(false);
              setUrl(e.target.value);
            }}
          />
          {uploading && <p className="text-xs text-muted-foreground">Enviando…</p>}
          <Field messages={error} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

type Defaults = {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  heroImageUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
};

export function BrandingForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateBrandingAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Marca atualizada.");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome da escola</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required />
        <Field messages={state?.fieldErrors?.name} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={defaults.description ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUploadField
          label="Logo"
          name="logoUrl"
          defaultUrl={defaults.logoUrl ?? ""}
          error={state?.fieldErrors?.logoUrl}
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
          hint={
            <>
              Recomendado: imagem <strong>quadrada</strong> de 256×256px (mín.
              128px). Formatos: <strong>PNG</strong> (de preferência com fundo
              transparente), SVG, JPG ou WEBP.
            </>
          }
        />
        <ImageUploadField
          label="Favicon"
          name="faviconUrl"
          defaultUrl={defaults.faviconUrl ?? ""}
          error={state?.fieldErrors?.faviconUrl}
          accept="image/png,image/x-icon,.ico,image/svg+xml,.svg"
          hint={
            <>
              Recomendado: quadrado de 32×32 ou 64×64px. Formatos:{" "}
              <strong>PNG</strong>, .ico ou SVG.
            </>
          }
        />
      </div>

      <ImageUploadField
        wide
        label="Imagem de capa do catálogo (Hero)"
        name="heroImageUrl"
        defaultUrl={defaults.heroImageUrl ?? ""}
        error={state?.fieldErrors?.heroImageUrl}
        accept="image/png,image/jpeg,image/webp"
        hint={
          <>
            Fundo do banner no topo do catálogo público.{" "}
            <strong>Dimensão recomendada: 1920×1080px</strong> (paisagem 16:9;
            mínimo 1280×720). Formatos: PNG, JPG ou WEBP (até 20&nbsp;MB).
            Prefira uma imagem <strong>horizontal</strong> e de boa resolução —
            ela ocupa toda a largura. Sem imagem, usa a capa do curso em
            destaque.
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {(["primaryColor", "secondaryColor", "backgroundColor"] as const).map((field) => (
          <div key={field} className="flex flex-col gap-2">
            <Label htmlFor={field}>
              {field === "primaryColor"
                ? "Cor primária"
                : field === "secondaryColor"
                  ? "Cor secundária"
                  : "Cor de fundo"}
            </Label>
            <Input
              id={field}
              name={field}
              placeholder="#000000"
              defaultValue={defaults[field] ?? ""}
            />
            <Field messages={state?.fieldErrors?.[field]} />
          </div>
        ))}
      </div>
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
