import { createEffect, createSignal } from "solid-js";
import type { SketchOp } from "../../api/types";
import { HEIGHT, type Mark, WIDTH, applyOps, fillAt, paint, strokeLine, toDrawing } from "./drawing";

/**
 * The drawing, replayed from its steps as they come; for the drawer (`onDraw`) the `tool`
 * too: a pen of `colour` and `size`, or a bucket filling with `colour`.
 */
export default function SketchCanvas(props: {
  drawing: { epoch: number; ops: SketchOp[]; length: number };
  onDraw?: (op: SketchOp) => void;
  colour: number;
  size: number;
  tool: "pen" | "fill";
}) {
  let canvas!: HTMLCanvasElement;
  const [ctx, setCtx] = createSignal<CanvasRenderingContext2D>();
  let marks: Mark[] = [];
  let epoch = -1;
  let applied = 0;
  createEffect(() => {
    const c = ctx();
    const { epoch: current, ops, length } = props.drawing;
    if (!c) return;
    if (current !== epoch || length < applied) {
      epoch = current;
      applied = length;
      marks = applyOps([], ops.slice(0, length));
      return paint(c, marks);
    }
    const fresh = ops.slice(applied, length);
    applied = length;
    // taking back or clearing means painting it all again; new points just add on
    if (fresh.some((op) => op.k === "undo" || op.k === "clear")) {
      applyOps(marks, fresh);
      return paint(c, marks);
    }
    for (const op of fresh) {
      if (op.k === "line") {
        const line = { k: "line" as const, c: op.c, w: op.w, p: [...op.p] };
        marks.push(line);
        strokeLine(c, line);
      } else if (op.k === "fill") {
        marks.push({ ...op });
        fillAt(c, op.x, op.y, op.c);
      } else if (op.k === "more") {
        const last = marks.at(-1);
        if (last?.k !== "line") continue;
        const from = last.p.length / 2;
        last.p.push(...op.p);
        strokeLine(c, last, from);
      }
    }
  });

  let down = false;
  let at: [number, number] = [0, 0];
  const point = (e: PointerEvent) => toDrawing(e.clientX, e.clientY, canvas.getBoundingClientRect());
  function start(e: PointerEvent) {
    if (!props.onDraw || e.button !== 0) return;
    e.preventDefault();
    at = point(e);
    if (props.tool === "fill") return props.onDraw({ k: "fill", c: props.colour, x: at[0], y: at[1] });
    canvas.setPointerCapture(e.pointerId);
    down = true;
    props.onDraw({ k: "line", c: props.colour, w: props.size, p: [...at] });
  }
  function move(e: PointerEvent) {
    if (!down || !props.onDraw) return;
    for (const each of e.getCoalescedEvents?.() ?? [e]) {
      const next = point(each);
      // a point barely away from the last adds nothing
      if (Math.hypot(next[0] - at[0], next[1] - at[1]) < 2) continue;
      at = next;
      props.onDraw({ k: "more", p: [...next] });
    }
  }
  const end = () => (down = false);

  return (
    <canvas
      ref={(el) => {
        canvas = el;
        // (fills read the pixels back)
        setCtx(el.getContext("2d", { willReadFrequently: true }) ?? undefined);
      }}
      data-testid="sketch-canvas"
      data-ops={props.drawing.length}
      width={WIDTH}
      height={HEIGHT}
      class={`block aspect-[4/3] w-full touch-none rounded-lg ${props.onDraw ? (props.tool === "fill" ? "cursor-cell" : "cursor-crosshair") : ""}`}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
}
