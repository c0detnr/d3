/** Metres; fixed positions keep the central battlefield reproducible. */
export const KUL_FIELD_RELIEF = [
  { x: -62, z: -128, rx: 28, rz: 13, height: 2.7 },
  { x: 62, z: 128, rx: 28, rz: 13, height: 2.7 },
  { x: 67, z: -30, rx: 26, rz: 17, height: 2.8 },
  { x: -67, z: 30, rx: 26, rz: 17, height: 2.8 },
  { x: -67, z: -62, rx: 19, rz: 18, height: -1.6 },
  { x: 67, z: 62, rx: 19, rz: 18, height: -1.6 },
  { x: 9, z: -42, rx: 13, rz: 11, height: -1.2 },
  { x: -9, z: 42, rx: 13, rz: 11, height: -1.2 },
];
export const KUL_FIELD_COVER = [
  { x: -67, z: -142, width: 8.4, depth: 3.5, height: 2.672 },
  { x: 67, z: 142, width: 8.4, depth: 3.5, height: 2.672 },
  { x: 82, z: -4, width: 8.4, depth: 3.5, height: 2.672 },
  { x: -82, z: 4, width: 8.4, depth: 3.5, height: 2.672 },
  { x: -65, z: -38, width: 8.4, depth: 3.5, height: 2.672 },
  { x: 65, z: 38, width: 8.4, depth: 3.5, height: 2.672 },
];
export const KUL_FIELD_ROCKS = [
  { x: 48, z: -140, scale: 6 }, { x: -48, z: 140, scale: 6 },
  { x: 103, z: -42, scale: 5 }, { x: -103, z: 42, scale: 5 },
  { x: -90, z: -66, scale: 4 }, { x: 90, z: 66, scale: 4 },
];

// Loose, overlapping woodland pockets; intervening gaps keep the ridge silhouette broken.
export const KUL_RIDGE_GROVES = [
  { x: -281, z: -207 }, { x: -218, z: -133 }, { x: -283, z: -43 },
  { x: -210, z: 52 }, { x: -282, z: 140 }, { x: -225, z: 216 },
];
export const KUL_CORNER_GROVES = [
  { x: 268, z: 269 }, { x: 318, z: 281 }, { x: 292, z: 323 },
];
