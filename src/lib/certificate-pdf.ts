import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Gera o PDF do certificado — layout padrão elegante (A4 paisagem), sem
 * dependência de arte do cliente. Usa fontes padrão do PDF (sem bundle de
 * arquivos). Retorna os bytes prontos para download.
 */

export type CertificatePdfData = {
  studentName: string;
  courseTitle: string;
  schoolName: string;
  issuedAt: Date;
  workloadHours: number | null;
  certificateNumber: string;
  verificationCode: string;
  verifyUrl: string | null;
};

const PAGE_W = 842; // A4 paisagem (pts)
const PAGE_H = 595;

const NAVY = rgb(0.09, 0.13, 0.28);
const GOLD = rgb(0.72, 0.55, 0.19);
const GRAY = rgb(0.35, 0.38, 0.45);
const INK = rgb(0.12, 0.14, 0.2);

function drawCentered(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color = INK,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_W - width) / 2, y, size, font, color });
}

/** Reduz o tamanho da fonte até o texto caber em maxWidth. */
function fitSize(font: PDFFont, text: string, desired: number, maxWidth: number): number {
  let size = desired;
  while (size > 10 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

export async function buildCertificatePdf(data: CertificatePdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificado — ${data.courseTitle}`);
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);

  // Molduras (dupla, com toque dourado).
  page.drawRectangle({
    x: 24, y: 24, width: PAGE_W - 48, height: PAGE_H - 48,
    borderColor: NAVY, borderWidth: 3,
  });
  page.drawRectangle({
    x: 34, y: 34, width: PAGE_W - 68, height: PAGE_H - 68,
    borderColor: GOLD, borderWidth: 1,
  });

  const dateStr = data.issuedAt.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // Cabeçalho
  drawCentered(page, "CERTIFICADO", serifBold, 40, PAGE_H - 120, NAVY);
  drawCentered(page, "DE CONCLUSÃO", sans, 14, PAGE_H - 146, GOLD);

  // Corpo
  drawCentered(page, "Certificamos que", serif, 15, PAGE_H - 210, GRAY);

  const nameSize = fitSize(serifBold, data.studentName, 34, PAGE_W - 160);
  drawCentered(page, data.studentName, serifBold, nameSize, PAGE_H - 256, INK);

  drawCentered(page, "concluiu com êxito o curso", serif, 15, PAGE_H - 300, GRAY);

  const titleSize = fitSize(serifBold, data.courseTitle, 24, PAGE_W - 160);
  drawCentered(page, data.courseTitle, serifBold, titleSize, PAGE_H - 340, NAVY);

  const meta = data.workloadHours
    ? `Carga horária: ${data.workloadHours} horas  •  Emitido por ${data.schoolName} em ${dateStr}`
    : `Emitido por ${data.schoolName} em ${dateStr}`;
  const metaSize = fitSize(sans, meta, 12, PAGE_W - 160);
  drawCentered(page, meta, sans, metaSize, PAGE_H - 384, GRAY);

  // Rodapé: identificação e verificação
  page.drawLine({
    start: { x: 80, y: 96 }, end: { x: PAGE_W - 80, y: 96 },
    color: rgb(0.85, 0.87, 0.9), thickness: 1,
  });
  page.drawText(`Nº ${data.certificateNumber}`, {
    x: 80, y: 74, size: 9, font: sans, color: GRAY,
  });
  page.drawText(`Código de verificação: ${data.verificationCode}`, {
    x: 80, y: 60, size: 9, font: sans, color: GRAY,
  });
  if (data.verifyUrl) {
    const label = `Verifique em ${data.verifyUrl}`;
    const w = sans.widthOfTextAtSize(label, 9);
    page.drawText(label, { x: PAGE_W - 80 - w, y: 60, size: 9, font: sans, color: GRAY });
  }

  return pdf.save();
}
