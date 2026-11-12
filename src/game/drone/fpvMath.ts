export interface TargetProjected {
  id: string;
  name: string;
  distance: number;
  inFront: boolean;
  screenX: number;
  screenY: number;
  onScreen: boolean;
  position: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
}

export function selectLockedTarget(
  targets: readonly TargetProjected[],
  width: number,
  height: number
): { lockedIndex: number; nearestOffscreenIndex: number } {
  let lockedIndex = -1;
  let bestScore = Infinity;
  let nearestOffscreenIndex = -1;
  let nearestOffscreenDist = Infinity;

  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.hypot(centerX, centerY) || 1;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (t.onScreen) {
      const screenDist = Math.hypot(t.screenX - centerX, t.screenY - centerY);
      const normScreen = screenDist / maxRadius;
      const normDist = t.distance / 200;
      const score = normDist * 0.4 + normScreen * 0.6;
      if (score < bestScore) {
        bestScore = score;
        lockedIndex = i;
      }
    } else {
      if (t.distance < nearestOffscreenDist) {
        nearestOffscreenDist = t.distance;
        nearestOffscreenIndex = i;
      }
    }
  }

  return { lockedIndex, nearestOffscreenIndex };
}

export function projectEdgePoint(
  dx: number,
  dy: number,
  width: number,
  height: number,
  marginX = 48,
  marginY = 48
): { x: number; y: number; angleDeg: number } {
  const wHalf = Math.max(10, width / 2 - marginX);
  const hHalf = Math.max(10, height / 2 - marginY);
  let safeDx = dx;
  let safeDy = dy;
  if (Math.abs(safeDx) < 1e-6 && Math.abs(safeDy) < 1e-6) safeDy = hHalf;
  const scale = Math.min(wHalf / Math.max(1e-4, Math.abs(safeDx)), hHalf / Math.max(1e-4, Math.abs(safeDy)));
  return {
    x: width / 2 + safeDx * scale,
    y: height / 2 + safeDy * scale,
    angleDeg: Math.atan2(safeDy, safeDx) * 180 / Math.PI,
  };
}

export function calculateClosingSpeed(
  dronePos: { x: number; y: number; z: number },
  droneVel: { x: number; y: number; z: number },
  targetPos: { x: number; y: number; z: number },
  targetVel?: { x: number; y: number; z: number }
): { closingSpeed: number; eta: number | null } {
  const dx = targetPos.x - dronePos.x;
  const dy = targetPos.y - dronePos.y;
  const dz = targetPos.z - dronePos.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.1) return { closingSpeed: 0, eta: 0 };

  const ux = dx / dist;
  const uy = dy / dist;
  const uz = dz / dist;

  const rvx = droneVel.x - (targetVel?.x ?? 0);
  const rvy = droneVel.y - (targetVel?.y ?? 0);
  const rvz = droneVel.z - (targetVel?.z ?? 0);

  const closingSpeed = rvx * ux + rvy * uy + rvz * uz;
  const eta = closingSpeed > 0.5 ? dist / closingSpeed : null;

  return { closingSpeed, eta };
}

export function calculatePitchLadderTransform(
  pitchRad: number,
  rollRad: number,
  pixelsPerRadian = 229.183
): { translateY: number; rotateRad: number } {
  return {
    translateY: Math.max(-120, Math.min(120, pitchRad * pixelsPerRadian)),
    rotateRad: rollRad,
  };
}

export function calculateTargetBoxSize(distance: number, minSize = 28, maxSize = 110): number {
  if (distance <= 0) return maxSize;
  return Math.max(minSize, Math.min(maxSize, 1400 / distance));
}

const GLITCH_CHARS = '0123456789ABCDEF#%&*<>[]/?~';
export function corruptText(text: string, strength: number): string {
  if (strength <= 0) return text;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ' || ch === '\n' || ch === ':' || ch === '.') {
      out += ch;
    } else if (Math.random() < strength * 0.35) {
      out += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
    } else {
      out += ch;
    }
  }
  return out;
}
