export interface MapPosition { x: number; z: number }
/** +Z is north (canvas up), +X east. span is the visible width in metres. */
export function worldToMinimap(point: MapPosition, center: MapPosition, size: number, span: number) {
  return { x: size / 2 + (point.x - center.x) * size / span,
    y: size / 2 - (point.z - center.z) * size / span };
}
export class MinimapContacts {
  private readonly seen = new Map<string, MapPosition & { time: number }>();
  observe(id: string, position: MapPosition, time: number) { this.seen.set(id, { x: position.x, z: position.z, time }); }
  markers(time: number) {
    const markers: (MapPosition & { alpha: number })[] = [];
    for (const [id, contact] of this.seen) {
      const alpha = Math.max(0, 1 - (time - contact.time) / 4);
      if (alpha === 0) this.seen.delete(id);
      else markers.push({ x: contact.x, z: contact.z, alpha });
    }
    return markers;
  }
  clear() { this.seen.clear(); }
}
