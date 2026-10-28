#!/usr/bin/env python3
"""Copy delivered GLBs and licence notes from assets/ to unity/Assets/Imported/.

Sources stay untouched. glTFast throws on glTF scenes without nodes, so empty
scenes are dropped from the Unity copy and the default scene index is remapped.
"""
import json, shutil, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC, DST = ROOT / 'assets', ROOT / 'unity' / 'Assets' / 'Imported'
SKIP = {'vfx'}


def strip_empty_scenes(data: bytes) -> bytes:
    magic, version, _ = struct.unpack('<4sII', data[:12])
    length, ctype = struct.unpack('<I4s', data[12:20])
    assert magic == b'glTF' and ctype == b'JSON'
    doc = json.loads(data[20:20 + length])
    scenes = doc.get('scenes', [])
    keep = [i for i, s in enumerate(scenes) if s.get('nodes')]
    if len(keep) == len(scenes):
        return data
    remap = {old: new for new, old in enumerate(keep)}
    doc['scenes'] = [scenes[i] for i in keep]
    doc['scene'] = remap.get(doc.get('scene', 0), 0)
    body = json.dumps(doc, separators=(',', ':')).encode()
    body += b' ' * (-len(body) % 4)
    rest = data[20 + length:]
    out = struct.pack('<I4s', len(body), b'JSON') + body + rest
    return struct.pack('<4sII', magic, version, 12 + len(out)) + out


def main() -> int:
    count = 0
    for src in sorted(SRC.rglob('*')):
        rel = src.relative_to(SRC)
        if rel.parts[0] in SKIP or not src.is_file():
            continue
        if src.suffix == '.glb' or src.name in ('README.md', 'LICENSE.txt') and len(rel.parts) > 2:
            dst = DST / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            if src.suffix == '.glb':
                dst.write_bytes(strip_empty_scenes(src.read_bytes()))
            else:
                shutil.copyfile(src, dst)
            count += 1
    print(f'synced {count} files to {DST.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
