import qrcode from "qrcode-generator";

/** A QR code for `text`, dark on light whatever the theme (phones read it best that way). */
export default function QrCode(props: { text: string; label: string }) {
  const path = () => {
    const qr = qrcode(0, "M");
    qr.addData(props.text);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) if (qr.isDark(row, col)) d += `M${col + 4} ${row + 4}h1v1h-1z`;
    return { d, size: n + 8 };
  };
  return (
    <svg
      data-testid="remote-qr"
      role="img"
      aria-label={props.label}
      viewBox={`0 0 ${path().size} ${path().size}`}
      class="h-56 w-56 rounded-lg"
      shape-rendering="crispEdges"
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      <path d={path().d} fill="#000000" />
    </svg>
  );
}
