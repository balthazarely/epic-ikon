import * as THREE from "three";

export function makeClusterTexture(count: number, hex: number, hex2?: number, fraction = 0.5): THREE.CanvasTexture {
  // Extra padding so the drop shadow isn't clipped
  const SIZE = 80;
  const CX = SIZE / 2;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const color1 = `#${hex.toString(16).padStart(6, "0")}`;
  const color2 = hex2 !== undefined ? `#${hex2.toString(16).padStart(6, "0")}` : color1;

  // Angles for the proportional split (color1 takes `fraction` of the circle)
  const splitAngle = -Math.PI / 2 + fraction * Math.PI * 2;

  // Drop shadow on the outer halo
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  if (hex2 !== undefined) {
    ctx.beginPath();
    ctx.arc(CX, CX, 30, -Math.PI / 2, splitAngle);
    ctx.lineTo(CX, CX);
    ctx.closePath();
    ctx.fillStyle = `${color1}44`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CX, CX, 30, splitAngle, -Math.PI / 2);
    ctx.lineTo(CX, CX);
    ctx.closePath();
    ctx.fillStyle = `${color2}44`;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(CX, CX, 30, 0, Math.PI * 2);
    ctx.fillStyle = `${color1}44`;
    ctx.fill();
  }

  // Clear shadow for inner circle and text
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (hex2 !== undefined) {
    ctx.beginPath();
    ctx.arc(CX, CX, 22, -Math.PI / 2, splitAngle);
    ctx.lineTo(CX, CX);
    ctx.closePath();
    ctx.fillStyle = color1;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CX, CX, 22, splitAngle, -Math.PI / 2);
    ctx.lineTo(CX, CX);
    ctx.closePath();
    ctx.fillStyle = color2;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(CX, CX, 22, 0, Math.PI * 2);
    ctx.fillStyle = color1;
    ctx.fill();
  }

  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${count > 99 ? 18 : 24}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(count), CX, CX);
  ctx.shadowColor = "transparent";
  return new THREE.CanvasTexture(canvas);
}

export function makePinTexture(img: HTMLImageElement): THREE.CanvasTexture {
  const PAD = 12;
  const w = img.naturalWidth || 128;
  const h = img.naturalHeight || 128;
  const canvas = document.createElement("canvas");
  canvas.width = w + PAD * 2;
  canvas.height = h + PAD * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;
  ctx.drawImage(img, PAD, PAD, w, h);
  return new THREE.CanvasTexture(canvas);
}

export function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(32, 32, 8, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,0.45)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.15)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
