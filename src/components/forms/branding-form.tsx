"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

import { updateBrandingAction, type SettingsState } from "@/lib/actions/school-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  // Preview ao vivo do logo (atualiza enquanto digita a URL).
  const [logoUrl, setLogoUrl] = useState(defaults.logoUrl ?? "");
  const [logoBroken, setLogoBroken] = useState(false);
  const showLogo = /^https?:\/\//i.test(logoUrl.trim()) && !logoBroken;

  // Imagem de capa (Hero) do catálogo: upload para o storage + preview.
  const [heroUrl, setHeroUrl] = useState(defaults.heroImageUrl ?? "");
  const [heroUploading, setHeroUploading] = useState(false);

  async function uploadHero(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (PNG, JPG ou WEBP).");
      return;
    }
    setHeroUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Falha no upload.");
        return;
      }
      setHeroUrl(data.url);
      toast.success("Imagem de capa enviada.");
    } catch {
      toast.error("Falha no upload. Tente novamente.");
    } finally {
      setHeroUploading(false);
    }
  }

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
        <div className="flex flex-col gap-2">
          <Label htmlFor="logoUrl">URL do logo</Label>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {showLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl.trim()}
                  alt="Pré-visualização do logo"
                  className="h-full w-full object-cover"
                  onError={() => setLogoBroken(true)}
                />
              ) : (
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
              )}
            </span>
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              placeholder="https://..."
              defaultValue={defaults.logoUrl ?? ""}
              onChange={(e) => {
                setLogoBroken(false);
                setLogoUrl(e.target.value);
              }}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Recomendado: imagem <strong>quadrada</strong> de 256×256px (mín.
            128px). Formatos: <strong>PNG</strong> (de preferência com fundo
            transparente), <strong>SVG</strong>, JPG ou WEBP. Use uma URL pública
            e direta para o arquivo (terminando em .png, .svg, etc.).
          </p>
          {logoUrl.trim() && !/^https?:\/\//i.test(logoUrl.trim()) && (
            <p className="text-xs text-muted-foreground">
              A URL precisa começar com https:// (ex.: https://site.com/logo.png).
            </p>
          )}
          <Field messages={state?.fieldErrors?.logoUrl} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="faviconUrl">URL do favicon</Label>
          <Input id="faviconUrl" name="faviconUrl" type="url" defaultValue={defaults.faviconUrl ?? ""} />
          <p className="text-xs text-muted-foreground">
            Recomendado: quadrado de 32×32 ou 64×64px. Formatos:{" "}
            <strong>PNG</strong> ou .ico.
          </p>
          <Field messages={state?.fieldErrors?.faviconUrl} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="heroImageUrl">Imagem de capa do catálogo (Hero)</Label>
        <div className="flex items-start gap-3">
          <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-md border bg-muted">
            {/^https?:\/\//i.test(heroUrl.trim()) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroUrl.trim()} alt="Pré-visualização da capa" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                sem imagem
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onChange={uploadHero}
              disabled={heroUploading}
            />
            <Input
              id="heroImageUrl"
              name="heroImageUrl"
              type="url"
              placeholder="https://… ou envie uma imagem"
              value={heroUrl}
              onChange={(e) => setHeroUrl(e.target.value)}
            />
            {heroUploading && (
              <p className="text-xs text-muted-foreground">Enviando…</p>
            )}
            <Field messages={state?.fieldErrors?.heroImageUrl} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Fundo do banner no topo do catálogo público.{" "}
          <strong>Dimensão recomendada: 1920×1080px</strong> (paisagem 16:9;
          mínimo 1280×720). Formatos: PNG, JPG ou WEBP (até 20&nbsp;MB). Prefira
          uma imagem <strong>horizontal</strong> e de boa resolução — ela ocupa
          toda a largura. Sem imagem, usa a capa do curso em destaque.
        </p>
      </div>

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
