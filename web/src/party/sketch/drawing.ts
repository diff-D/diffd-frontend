import type { SketchOp } from "../../api/types";

/** The drawing's size; points are whole numbers within it. */
export const WIDTH = 800;
export const HEIGHT = 600;
/** The palette (`0xRRGGBB`): ink on paper, whatever the site's theme. */
export const COLOURS = [0x000000, 0xffffff, 0x8a8a8a, 0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x00acc1, 0x1e88e5, 0x8e24aa, 0xec407a, 0x6d4c41];
export const PEN_SIZES = [3, 6, 12, 24];
/** A batch sent at once: at most this many steps and coordinates (server: `valid_batch`). */
const MAX_OPS = 32;
export const MAX_NUMBERS = 600;
/** What a fill counts for against those (server: `FILL_NUMBERS`). */
const FILL_NUMBERS = 100;
/** How many coordinates one step carries at most as it is sent. */
const STEP_NUMBERS = 100;

/** `#rrggbb` for a colour. */
export const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

/** What the drawing is made of, in order: lines, and fills of the area around a point. */
export type Line = { k: "line"; c: number; w: number; p: number[] };
export type Mark = Line | { k: "fill"; c: number; x: number; y: number };

/** The marks a drawing's steps leave: undo takes the last one back, clear empties it. */
export function applyOps(marks: Mark[], ops: SketchOp[]): Mark[] {
  for (const op of ops) {
    if (op.k === "line") marks.push({ k: "line", c: op.c, w: op.w, p: [...op.p] });
    else if (op.k === "fill") marks.push({ ...op });
    else if (op.k === "more") {
      const last = marks.at(-1);
      if (last?.k === "line") last.p.push(...op.p);
    } else if (op.k === "undo") marks.pop();
    else marks.length = 0;
  }
  return marks;
}

/** The steps that draw `mark` again (a line in pieces small enough to send). */
export function stepsFor(mark: Mark): SketchOp[] {
  if (mark.k === "fill") return [{ ...mark }];
  const steps: SketchOp[] = [{ k: "line", c: mark.c, w: mark.w, p: mark.p.slice(0, STEP_NUMBERS) }];
  for (let i = STEP_NUMBERS; i < mark.p.length; i += STEP_NUMBERS) steps.push({ k: "more", p: mark.p.slice(i, i + STEP_NUMBERS) });
  return steps;
}

/** Draws `p` (from point `from`) of a line: a dot for a lone point, strokes otherwise. */
export function strokeLine(ctx: CanvasRenderingContext2D, line: Line, from = 0) {
  ctx.strokeStyle = ctx.fillStyle = hex(line.c);
  ctx.lineWidth = line.w;
  ctx.lineCap = ctx.lineJoin = "round";
  const points = line.p.length / 2;
  if (points === 1) {
    ctx.beginPath();
    ctx.arc(line.p[0], line.p[1], line.w / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const start = Math.max(0, from - 1);
  if (start + 1 >= points) return;
  ctx.beginPath();
  ctx.moveTo(line.p[start * 2], line.p[start * 2 + 1]);
  for (let i = start + 1; i < points; i++) ctx.lineTo(line.p[i * 2], line.p[i * 2 + 1]);
  ctx.stroke();
}

/**
 * How far (summed over red, green and blue) a pixel may be from the clicked one and still
 * fill: most of a line's soft edge fills too, so little halo is left against it.
 */
const FILL_TOLERANCE = 160;

/** Fills `pixels` (RGBA, `width` wide) from `(x, y)` over every connected pixel close to its colour, with `c`. */
export function floodFill(pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number, c: number) {
  const [r, g, b] = [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  const sx = Math.min(width - 1, Math.max(0, Math.round(x)));
  const sy = Math.min(height - 1, Math.max(0, Math.round(y)));
  const at = (sy * width + sx) * 4;
  const [tr, tg, tb] = [pixels[at], pixels[at + 1], pixels[at + 2]];
  if (Math.abs(tr - r) + Math.abs(tg - g) + Math.abs(tb - b) === 0) return;
  const near = (i: number) => Math.abs(pixels[i] - tr) + Math.abs(pixels[i + 1] - tg) + Math.abs(pixels[i + 2] - tb) <= FILL_TOLERANCE;
  const seen = new Uint8Array(width * height);
  const paint = (i: number) => {
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = 255;
  };
  const stack = [sy * width + sx];
  seen[stack[0]] = 1;
  while (stack.length > 0) {
    const p = stack.pop()!;
    paint(p * 4);
    const px = p % width;
    const py = (p - px) / width;
    for (const [nx, ny] of [
      [px - 1, py],
      [px + 1, py],
      [px, py - 1],
      [px, py + 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const n = ny * width + nx;
      if (seen[n]) continue;
      seen[n] = 1;
      if (near(n * 4)) stack.push(n);
    }
  }
}

/** Fills the area around `(x, y)` on the canvas. */
export function fillAt(ctx: CanvasRenderingContext2D, x: number, y: number, c: number) {
  const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  floodFill(image.data, WIDTH, HEIGHT, x, y, c);
  ctx.putImageData(image, 0, 0);
}

/** Draws one mark over what is there. */
function drawMark(ctx: CanvasRenderingContext2D, mark: Mark) {
  if (mark.k === "line") strokeLine(ctx, mark);
  else fillAt(ctx, mark.x, mark.y, mark.c);
}

/** The whole drawing afresh, on white paper. */
export function paint(ctx: CanvasRenderingContext2D, marks: Mark[]) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (const mark of marks) drawMark(ctx, mark);
}

/**
 * Collects the drawer's steps into batches the party accepts: `add` a step, `take` what's
 * waiting (at most one batch; call again while `waiting`).
 */
export function createBatcher() {
  const queue: SketchOp[] = [];
  const size = (op: SketchOp) => (op.k === "line" || op.k === "more" ? op.p.length : op.k === "fill" ? FILL_NUMBERS : 0);
  return {
    add(op: SketchOp) {
      // points on the line being drawn join its last step, while that stays small
      const last = queue.at(-1);
      if (op.k === "more" && last && (last.k === "line" || last.k === "more") && last.p.length + op.p.length <= STEP_NUMBERS) last.p.push(...op.p);
      else queue.push(op);
    },
    waiting: () => queue.length > 0,
    take(): SketchOp[] {
      const batch: SketchOp[] = [];
      let numbers = 0;
      while (queue.length > 0 && batch.length < MAX_OPS && numbers + size(queue[0]) <= MAX_NUMBERS) {
        const op = queue.shift()!;
        numbers += size(op);
        batch.push(op);
      }
      return batch;
    },
  };
}

/** A point on the drawing from one on the canvas's box, whole and within it. */
export function toDrawing(x: number, y: number, box: { left: number; top: number; width: number; height: number }): [number, number] {
  const px = Math.round(((x - box.left) / box.width) * WIDTH);
  const py = Math.round(((y - box.top) / box.height) * HEIGHT);
  return [Math.min(WIDTH, Math.max(0, px)), Math.min(HEIGHT, Math.max(0, py))];
}
