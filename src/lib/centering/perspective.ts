import {
  CARD_LOGICAL_HEIGHT,
  CARD_LOGICAL_WIDTH,
} from "@/lib/centering/constants";
import type { PerspectiveQuad, Point2 } from "@/lib/centering/types";

const MIN_AREA_RATIO = 1e-4;

function getCanvasImageSourceSize(source: CanvasImageSource): {
  w: number;
  h: number;
} {
  if (source instanceof HTMLImageElement) {
    const w = source.naturalWidth || source.width;
    const h = source.naturalHeight || source.height;
    return { w, h };
  }
  if (source instanceof HTMLCanvasElement) {
    return { w: source.width, h: source.height };
  }
  if (
    typeof OffscreenCanvas !== "undefined" &&
    source instanceof OffscreenCanvas
  ) {
    return { w: source.width, h: source.height };
  }
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return { w: source.width, h: source.height };
  }
  if (source instanceof HTMLVideoElement) {
    return {
      w: source.videoWidth || source.width,
      h: source.videoHeight || source.height,
    };
  }
  return { w: 0, h: 0 };
}

/** ~5% inset from natural edges. */
export function defaultPerspectiveQuad(
  naturalWidth: number,
  naturalHeight: number,
): PerspectiveQuad {
  const mx = naturalWidth * 0.05;
  const my = naturalHeight * 0.05;
  return {
    tl: { x: mx, y: my },
    tr: { x: naturalWidth - mx, y: my },
    br: { x: naturalWidth - mx, y: naturalHeight - my },
    bl: { x: mx, y: naturalHeight - my },
  };
}

function cross2(o: Point2, a: Point2, b: Point2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function polygonAreaAbs(quad: PerspectiveQuad): number {
  const { tl, tr, br, bl } = quad;
  const shoelace =
    tl.x * tr.y -
    tr.x * tl.y +
    tr.x * br.y -
    br.x * tr.y +
    br.x * bl.y -
    bl.x * br.y +
    bl.x * tl.y -
    tl.x * bl.y;
  return Math.abs(shoelace) * 0.5;
}

/** True if TL→TR→BR→BL is a strictly convex quad (consistent winding). */
export function isPerspectiveQuadValid(
  quad: PerspectiveQuad,
  naturalWidth: number,
  naturalHeight: number,
): { ok: true } | { ok: false; hint: string } {
  const { tl, tr, br, bl } = quad;
  const pts = [tl, tr, br, bl];
  const crosses: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p0 = pts[i]!;
    const p1 = pts[(i + 1) % 4]!;
    const p2 = pts[(i + 2) % 4]!;
    crosses.push(cross2(p0, p1, p2));
  }
  const pos = crosses.filter((c) => c > 1e-6).length;
  const neg = crosses.filter((c) => c < -1e-6).length;
  if (pos > 0 && neg > 0) {
    return {
      ok: false,
      hint: "Corners must form a convex quadrilateral (no bow-tie).",
    };
  }
  if (crosses.some((c) => Math.abs(c) < 1e-6)) {
    return { ok: false, hint: "Corners are too close to collinear." };
  }
  const area = polygonAreaAbs(quad);
  const minArea = MIN_AREA_RATIO * naturalWidth * naturalHeight;
  if (area < minArea) {
    return { ok: false, hint: "Quad area is too small." };
  }
  return { ok: true };
}

type Pt = readonly [number, number];

/**
 * Homography H (3×3, h33 = 1) mapping destination (u,v) to source (x,y):
 * λ [x,y,1]^T = H [u,v,1]^T
 */
function homographyDstToSrc(dst: Pt[], src: Pt[]): number[] | null {
  const n = 4;
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < n; i++) {
    const [du, dv] = dst[i]!;
    const [sx, sy] = src[i]!;
    A.push([du, dv, 1, 0, 0, 0, -sx * du, -sx * dv]);
    b.push(sx);
    A.push([0, 0, 0, du, dv, 1, -sy * du, -sy * dv]);
    b.push(sy);
  }
  return solve8x8(A, b);
}

function solve8x8(A: number[][], b: number[]): number[] | null {
  const m = 8;
  const aug = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < m; col++) {
    let pivot = col;
    let best = Math.abs(aug[pivot]![col]!);
    for (let r = col + 1; r < m; r++) {
      const v = Math.abs(aug[r]![col]!);
      if (v > best) {
        best = v;
        pivot = r;
      }
    }
    if (best < 1e-12) return null;
    if (pivot !== col) {
      const tmp = aug[col]!;
      aug[col] = aug[pivot]!;
      aug[pivot] = tmp;
    }
    const div = aug[col]![col]!;
    for (let c = col; c <= m; c++) aug[col]![c]! /= div;
    for (let r = 0; r < m; r++) {
      if (r === col) continue;
      const f = aug[r]![col]!;
      if (Math.abs(f) < 1e-15) continue;
      for (let c = col; c <= m; c++) aug[r]![c]! -= f * aug[col]![c]!;
    }
  }
  return aug.map((row) => row[m]!);
}

function sampleBilinear(
  data: Uint8ClampedArray,
  nw: number,
  nh: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const xf = Math.max(0, Math.min(nw - 1, x));
  const yf = Math.max(0, Math.min(nh - 1, y));
  const x0 = Math.floor(xf);
  const y0 = Math.floor(yf);
  const x1 = Math.min(nw - 1, x0 + 1);
  const y1 = Math.min(nh - 1, y0 + 1);
  const tx = xf - x0;
  const ty = yf - y0;
  const idx = (xx: number, yy: number) => (yy * nw + xx) * 4;
  const i00 = idx(x0, y0);
  const i10 = idx(x1, y0);
  const i01 = idx(x0, y1);
  const i11 = idx(x1, y1);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const r = Math.round(
    lerp(
      lerp(data[i00]!, data[i10]!, tx),
      lerp(data[i01]!, data[i11]!, tx),
      ty,
    ),
  );
  const g = Math.round(
    lerp(
      lerp(data[i00 + 1]!, data[i10 + 1]!, tx),
      lerp(data[i01 + 1]!, data[i11 + 1]!, tx),
      ty,
    ),
  );
  const bch = Math.round(
    lerp(
      lerp(data[i00 + 2]!, data[i10 + 2]!, tx),
      lerp(data[i01 + 2]!, data[i11 + 2]!, tx),
      ty,
    ),
  );
  const a = Math.round(
    lerp(
      lerp(data[i00 + 3]!, data[i10 + 3]!, tx),
      lerp(data[i01 + 3]!, data[i11 + 3]!, tx),
      ty,
    ),
  );
  return [r, g, bch, a];
}

/**
 * Inverse homography warp: output rectangle → quad in source; bilinear sample.
 */
export function warpToCardSize(
  image: CanvasImageSource,
  quad: PerspectiveQuad,
  outW = CARD_LOGICAL_WIDTH,
  outH = CARD_LOGICAL_HEIGHT,
): HTMLCanvasElement {
  const { w: nw, h: nh } = getCanvasImageSourceSize(image);
  if (nw < 2 || nh < 2) throw new Error("Image dimensions too small");

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = nw;
  srcCanvas.height = nh;
  const sctx = srcCanvas.getContext("2d");
  if (!sctx) throw new Error("2D context unavailable");
  sctx.drawImage(image, 0, 0);
  const srcData = sctx.getImageData(0, 0, nw, nh);

  const dstPts: Pt[] = [
    [0, 0],
    [outW - 1, 0],
    [outW - 1, outH - 1],
    [0, outH - 1],
  ];
  const srcPts: Pt[] = [
    [quad.tl.x, quad.tl.y],
    [quad.tr.x, quad.tr.y],
    [quad.br.x, quad.br.y],
    [quad.bl.x, quad.bl.y],
  ];

  const h8 = homographyDstToSrc(dstPts, srcPts);
  if (!h8) throw new Error("Degenerate homography");

  const h11 = h8[0]!;
  const h12 = h8[1]!;
  const h13 = h8[2]!;
  const h21 = h8[3]!;
  const h22 = h8[4]!;
  const h23 = h8[5]!;
  const h31 = h8[6]!;
  const h32 = h8[7]!;
  const h33 = 1;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const octx = outCanvas.getContext("2d");
  if (!octx) throw new Error("2D context unavailable");
  const outImg = octx.createImageData(outW, outH);
  const od = outImg.data;
  const sd = srcData.data;

  for (let v = 0; v < outH; v++) {
    for (let u = 0; u < outW; u++) {
      const xh = h11 * u + h12 * v + h13;
      const yh = h21 * u + h22 * v + h23;
      const wh = h31 * u + h32 * v + h33;
      if (Math.abs(wh) < 1e-12) continue;
      const xs = xh / wh;
      const ys = yh / wh;
      const [r, g, b, a] = sampleBilinear(sd, nw, nh, xs, ys);
      const o = (v * outW + u) * 4;
      od[o] = r;
      od[o + 1] = g;
      od[o + 2] = b;
      od[o + 3] = a;
    }
  }
  octx.putImageData(outImg, 0, 0);
  return outCanvas;
}

/** Letterboxed `object-fit: contain` layout inside the img element box. */
export function containLayoutForImage(
  imgRectWidth: number,
  imgRectHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): { ox: number; oy: number; renderedW: number; renderedH: number } {
  const rw = imgRectWidth;
  const rh = imgRectHeight;
  const renderedW = Math.min(rw, (rh * naturalWidth) / naturalHeight);
  const renderedH = Math.min(rh, (rw * naturalHeight) / naturalWidth);
  const ox = (rw - renderedW) / 2;
  const oy = (rh - renderedH) / 2;
  return { ox, oy, renderedW, renderedH };
}

export function clientToNaturalFromContain(
  clientX: number,
  clientY: number,
  imgRect: DOMRectReadOnly,
  naturalWidth: number,
  naturalHeight: number,
): Point2 {
  const { ox, oy, renderedW, renderedH } = containLayoutForImage(
    imgRect.width,
    imgRect.height,
    naturalWidth,
    naturalHeight,
  );
  const lx = clientX - imgRect.left;
  const ly = clientY - imgRect.top;
  const cx = lx - ox;
  const cy = ly - oy;
  return {
    x: (cx / renderedW) * naturalWidth,
    y: (cy / renderedH) * naturalHeight,
  };
}

export function naturalToOverlayPx(
  p: Point2,
  imgRect: DOMRectReadOnly,
  naturalWidth: number,
  naturalHeight: number,
): { x: number; y: number } {
  const { ox, oy, renderedW, renderedH } = containLayoutForImage(
    imgRect.width,
    imgRect.height,
    naturalWidth,
    naturalHeight,
  );
  return {
    x: ox + (p.x / naturalWidth) * renderedW,
    y: oy + (p.y / naturalHeight) * renderedH,
  };
}

/** Inverse of {@link naturalToOverlayPx}: coordinates in the img element box → natural pixels. */
export function overlayPxToNatural(
  overlayX: number,
  overlayY: number,
  imgRectWidth: number,
  imgRectHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): Point2 {
  const { ox, oy, renderedW, renderedH } = containLayoutForImage(
    imgRectWidth,
    imgRectHeight,
    naturalWidth,
    naturalHeight,
  );
  const cx = overlayX - ox;
  const cy = overlayY - oy;
  return {
    x: (cx / renderedW) * naturalWidth,
    y: (cy / renderedH) * naturalHeight,
  };
}
