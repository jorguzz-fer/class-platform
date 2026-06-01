/**
 * Registry de providers de vídeo (Fase: hospedagem de vídeo).
 *
 * Cada provider sabe:
 * - `kind`: como o conteúdo entra ("link" = cola URL/ID; "upload" = sobe arquivo).
 * - `parse`: normaliza o que o usuário forneceu em { videoId?, videoUrl? }.
 * - `toEmbed`: transforma os dados salvos numa fonte renderizável pelo player.
 *
 * Adicionar um provider novo = adicionar uma entrada aqui. Player e formulário
 * são genéricos e não precisam mudar.
 *
 * O modelo Lesson já guarda: videoProvider (id deste registry), videoId, videoUrl.
 */

export type VideoProviderKind = "link" | "upload";

/** Como o player deve renderizar a fonte. */
export type EmbedTarget =
  | { type: "iframe"; src: string } // YouTube, Vimeo, embeds
  | { type: "native"; src: string } // arquivo .mp4/.m3u8 via <video>
  | { type: "none" };

export interface ParsedVideo {
  videoId: string | null;
  videoUrl: string | null;
}

export interface VideoProvider {
  /** Identificador salvo em Lesson.videoProvider. */
  id: string;
  /** Rótulo exibido na UI. */
  label: string;
  kind: VideoProviderKind;
  /** Dica de placeholder no formulário. */
  inputHint: string;
  /** Normaliza a entrada do usuário (URL ou ID) para { videoId, videoUrl }. */
  parse(raw: string): ParsedVideo;
  /** Converte os dados salvos numa fonte para o player. */
  toEmbed(data: ParsedVideo): EmbedTarget;
}

// ---- Providers de LINK ----------------------------------------------------

const youtube: VideoProvider = {
  id: "youtube",
  label: "YouTube",
  kind: "link",
  inputHint: "Cole a URL do YouTube ou o ID do vídeo",
  parse(raw) {
    const id = extractYouTubeId(raw.trim());
    return { videoId: id, videoUrl: null };
  },
  toEmbed({ videoId }) {
    if (!videoId) return { type: "none" };
    return { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${videoId}` };
  },
};

const vimeo: VideoProvider = {
  id: "vimeo",
  label: "Vimeo",
  kind: "link",
  inputHint: "Cole a URL do Vimeo ou o ID numérico",
  parse(raw) {
    const id = extractVimeoId(raw.trim());
    return { videoId: id, videoUrl: null };
  },
  toEmbed({ videoId }) {
    if (!videoId) return { type: "none" };
    return { type: "iframe", src: `https://player.vimeo.com/video/${videoId}` };
  },
};

const fileUrl: VideoProvider = {
  id: "file",
  label: "Arquivo direto (URL .mp4/.m3u8)",
  kind: "link",
  inputHint: "Cole a URL pública do arquivo de vídeo (.mp4 ou .m3u8)",
  parse(raw) {
    return { videoId: null, videoUrl: raw.trim() || null };
  },
  toEmbed({ videoUrl }) {
    if (!videoUrl) return { type: "none" };
    return { type: "native", src: videoUrl };
  },
};

// ---------------------------------------------------------------------------

const PROVIDERS: VideoProvider[] = [youtube, vimeo, fileUrl];

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

/** Providers disponíveis (para popular selects na UI). */
export function listVideoProviders(): VideoProvider[] {
  return PROVIDERS;
}

export function getVideoProvider(id: string | null | undefined): VideoProvider | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

// Hosts confiáveis para embed via iframe no fallback (provider desconhecido,
// ex.: aulas antigas). NUNCA renderizamos um iframe de origem arbitrária —
// isso evitaria clickjacking/phishing dentro do domínio confiável da escola.
const TRUSTED_EMBED_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
];

/** Valida que a URL é https e (para iframe) de um host confiável. */
function safeEmbedFromUrl(rawUrl: string): EmbedTarget {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { type: "none" };
  }
  // Só https (bloqueia javascript:, data:, http: misto).
  if (url.protocol !== "https:") return { type: "none" };

  // Arquivo direto de mídia → player nativo (qualquer host https é aceitável;
  // <video> não executa scripts da origem).
  if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url.pathname)) {
    return { type: "native", src: url.toString() };
  }

  // Iframe só de host confiável.
  if (TRUSTED_EMBED_HOSTS.includes(url.hostname)) {
    return { type: "iframe", src: url.toString() };
  }
  return { type: "none" };
}

/** Resolve a fonte do player a partir dos dados salvos na aula. */
export function resolveEmbed(data: {
  videoProvider: string | null;
  videoId: string | null;
  videoUrl: string | null;
}): EmbedTarget {
  const provider = getVideoProvider(data.videoProvider);
  if (provider) {
    return provider.toEmbed({ videoId: data.videoId, videoUrl: data.videoUrl });
  }
  // Provider desconhecido (ex.: aula antiga "mux"/"bunny"): se guardou uma URL,
  // tenta resolver com validação estrita de protocolo/host.
  if (data.videoUrl) {
    return safeEmbedFromUrl(data.videoUrl);
  }
  return { type: "none" };
}

// ---- Helpers de extração de ID --------------------------------------------

function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  // Já é um ID (11 chars típicos do YouTube).
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return url.pathname.slice(1) || null;
    }
    // Igualdade exata de host (evita evilyoutube.com etc.).
    if (host === "youtube.com" || host === "m.youtube.com") {
      // /watch?v=ID
      const v = url.searchParams.get("v");
      if (v) return v;
      // /embed/ID, /shorts/ID, /live/ID
      const m = url.pathname.match(/\/(embed|shorts|live|v)\/([a-zA-Z0-9_-]+)/);
      if (m) return m[2];
    }
  } catch {
    // não era URL
  }
  return null;
}

function extractVimeoId(input: string): string | null {
  if (!input) return null;
  if (/^\d+$/.test(input)) return input;
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");
    // Igualdade exata de host (evita fakevimeo.com etc.).
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const m = url.pathname.match(/\/(\d+)/);
      if (m) return m[1];
    }
  } catch {
    // não era URL
  }
  return null;
}
