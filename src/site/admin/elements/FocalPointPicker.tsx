import React from "react";
import { Locale } from "@churchapps/apphelper";

type Props = {
  imageUrl: string;
  value?: string; // "x% y%"
  onChange: (value: string) => void;
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

const parse = (value?: string): [number, number] => {
  const parts = (value || "50% 50%").split(" ");
  const x = parseFloat(parts[0]);
  const y = parseFloat(parts[1]);
  return [isNaN(x) ? 50 : x, isNaN(y) ? 50 : y];
};

export function FocalPointPicker({ imageUrl, value, onChange }: Props) {
  const [x, y] = parse(value);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = clamp(Math.round(((e.clientX - rect.left) / rect.width) * 100));
    const py = clamp(Math.round(((e.clientY - rect.top) / rect.height) * 100));
    onChange(`${px}% ${py}%`);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{Locale.label("site.pickColors.focalPointHelper")}</div>
      <div
        onClick={handleClick}
        role="button"
        aria-label={Locale.label("site.pickColors.focalPoint")}
        style={{ position: "relative", display: "inline-block", cursor: "crosshair", lineHeight: 0 }}
        data-testid="focal-point-picker"
      >
        <img src={imageUrl} alt="" style={{ maxHeight: 140, maxWidth: "100%", width: "auto", display: "block", objectFit: "cover", objectPosition: `${x}% ${y}%` }} />
        <span
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            width: 16,
            height: 16,
            marginLeft: -8,
            marginTop: -8,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,1)",
            boxShadow: "0 0 0 2px rgba(0,0,0,.6)",
            background: "rgba(0,0,0,.15)",
            pointerEvents: "none"
          }}
        />
      </div>
    </div>
  );
}
