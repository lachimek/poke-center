import {
  CARD_LOGICAL_HEIGHT,
  CARD_LOGICAL_WIDTH,
} from "@/lib/centering/constants";
import type { CompanyCenteringSummary } from "@/lib/centering/gradeEstimate";
import { loadImageElement } from "@/lib/centering/imageUtils";
import { clampGuides, guideStrokeColors } from "@/lib/centering/math";
import type { CardSideState, SideResult } from "@/lib/centering/types";

export const EXPORT_PANEL_GAP = 24;

const CELL_W = CARD_LOGICAL_WIDTH;
const CELL_H = CARD_LOGICAL_HEIGHT;

const FONT_TITLE = "600 16px system-ui, sans-serif";
const FONT_BODY = "14px system-ui, sans-serif";
const FONT_SMALL = "12px system-ui, sans-serif";

type FooterBlockKind = "title" | "small" | "emphasis" | "body";

type FooterBlock = {
  kind: FooterBlockKind;
  lines: string[];
};

const LINE_H: Record<FooterBlockKind, number> = {
  title: 22,
  small: 16,
  emphasis: 18,
  body: 18,
};

const SECTION_GAP = 10;

function wrapLineToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0] ?? "";
  for (let i = 1; i < words.length; i++) {
    const w = words[i] as string;
    const test = `${current} ${w}`;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = w;
    }
  }
  lines.push(current);
  return lines;
}

function drawCellBackground(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, CELL_H);
  g.addColorStop(0, "#0a0a0c");
  g.addColorStop(1, "#050506");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CELL_W, CELL_H);
}

/** Draw one 630×880 panel at origin (0,0) in ctx; caller sets transform for position. */
export async function drawCardCell(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  side: CardSideState,
): Promise<void> {
  drawCellBackground(ctx);

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (nw > 0 && nh > 0) {
    const scale = Math.min(CELL_W / nw, CELL_H / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const ox = (CELL_W - dw) / 2;
    const oy = (CELL_H - dh) / 2;
    ctx.drawImage(img, ox, oy, dw, dh);
  }

  const g = clampGuides(side.guides);
  const { main } = guideStrokeColors(side.guideColor);

  ctx.strokeStyle = main;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(g.left + 0.5, 0);
  ctx.lineTo(g.left + 0.5, CELL_H);
  ctx.moveTo(g.right + 0.5, 0);
  ctx.lineTo(g.right + 0.5, CELL_H);
  ctx.moveTo(0, g.top + 0.5);
  ctx.lineTo(CELL_W, g.top + 0.5);
  ctx.moveTo(0, g.bottom + 0.5);
  ctx.lineTo(CELL_W, g.bottom + 0.5);
  ctx.stroke();

  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.fillStyle = main;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("L", g.left + 4, 6);
  ctx.textAlign = "right";
  ctx.fillText("R", g.right - 4, 6);
  ctx.textAlign = "left";
  ctx.fillText("T", 6, g.top + 4);
  ctx.fillText("B", 6, g.bottom + 4);
}

function gradeLine(entry: CompanyCenteringSummary): string {
  const tier =
    entry.qualifies && entry.bestTier ? entry.bestTier : "Below listed tiers";
  return `${entry.company}: ${tier}`;
}

function buildFooterBlocks(
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
  frontResult: SideResult,
  backResult: SideResult,
  gradeSummary: CompanyCenteringSummary[],
): FooterBlock[] {
  const blocks: FooterBlock[] = [];

  blocks.push({ kind: "title", lines: ["PokéCentering — export"] });

  ctx.font = FONT_SMALL;
  blocks.push({
    kind: "small",
    lines: wrapLineToWidth(
      ctx,
      "Guides in logical card space; image fit may differ from on-screen pan.",
      maxWidth,
    ),
  });

  ctx.font = FONT_BODY;
  blocks.push({ kind: "emphasis", lines: ["Your ratios"] });
  ctx.font = FONT_SMALL;
  blocks.push({
    kind: "small",
    lines: wrapLineToWidth(
      ctx,
      "Each pair is smaller% / larger% margin share. Horizontal uses left vs right guides; vertical uses top vs bottom.",
      maxWidth,
    ),
  });
  ctx.font = FONT_BODY;
  blocks.push({
    kind: "body",
    lines: [
      `Front — horizontal (left ↔ right): ${frontResult.horizontalDisplay}`,
      `Front — vertical (top ↔ bottom): ${frontResult.verticalDisplay}`,
    ],
  });
  blocks.push({
    kind: "body",
    lines: [
      `Back — horizontal (left ↔ right): ${backResult.horizontalDisplay}`,
      `Back — vertical (top ↔ bottom): ${backResult.verticalDisplay}`,
    ],
  });
  blocks.push({
    kind: "emphasis",
    lines: ["Centering grade hints (centering only; not official grading)"],
  });
  for (const g of gradeSummary) {
    blocks.push({ kind: "body", lines: [gradeLine(g)] });
  }

  return blocks;
}

function measureFooterHeight(blocks: FooterBlock[]): number {
  let height = 20;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i] as FooterBlock;
    const lh = LINE_H[b.kind];
    height += b.lines.length * lh;
    if (i < blocks.length - 1) height += SECTION_GAP;
  }
  height += 24;
  return height;
}

function drawFooterBlocks(
  ctx: CanvasRenderingContext2D,
  yStart: number,
  padX: number,
  blocks: FooterBlock[],
): void {
  let y = yStart;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i] as FooterBlock;
    const lh = LINE_H[b.kind];

    if (b.kind === "title") {
      ctx.font = FONT_TITLE;
      ctx.fillStyle = "#f4f4f5";
    } else if (b.kind === "small") {
      ctx.font = FONT_SMALL;
      ctx.fillStyle = "#a1a1aa";
    } else if (b.kind === "emphasis") {
      ctx.font = FONT_BODY;
      ctx.fillStyle = "#d4d4d8";
    } else {
      ctx.font = FONT_BODY;
      ctx.fillStyle = "#e4e4e7";
    }

    for (const line of b.lines) {
      ctx.fillText(line, padX, y);
      y += lh;
    }
    y += SECTION_GAP;
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG export failed"));
      },
      "image/png",
      1,
    );
  });
}

export type RenderCenteringExportParams = {
  front: CardSideState;
  back: CardSideState;
  frontResult: SideResult;
  backResult: SideResult;
  gradeSummary: CompanyCenteringSummary[];
};

export async function renderCenteringExportPng(
  params: RenderCenteringExportParams,
): Promise<Blob> {
  const { front, back, frontResult, backResult, gradeSummary } = params;

  if (!front.imageSrc || !back.imageSrc) {
    throw new Error("Both card sides must have an image to export");
  }

  const [imgFront, imgBack] = await Promise.all([
    loadImageElement(front.imageSrc),
    loadImageElement(back.imageSrc),
  ]);

  const canvasW = CELL_W + EXPORT_PANEL_GAP + CELL_W;
  const padX = 24;

  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = canvasW;
  const mctx = measureCanvas.getContext("2d");
  if (!mctx) throw new Error("Canvas not supported");

  const blocks = buildFooterBlocks(
    mctx,
    canvasW - padX * 2,
    frontResult,
    backResult,
    gradeSummary,
  );
  const footerHeight = measureFooterHeight(blocks);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = CELL_H + footerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  await drawCardCell(ctx, imgFront, front);
  ctx.restore();

  ctx.save();
  ctx.translate(CELL_W + EXPORT_PANEL_GAP, 0);
  await drawCardCell(ctx, imgBack, back);
  ctx.restore();

  ctx.strokeStyle = "#27272a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, CELL_H + 0.5);
  ctx.lineTo(canvasW, CELL_H + 0.5);
  ctx.stroke();

  drawFooterBlocks(ctx, CELL_H + 16, padX, blocks);

  return canvasToPngBlob(canvas);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
