"""Seçili Quaternius glTF modellerini GLB'ye paketle (Python 3 + ImageMagick).

Kaynak geometri korunur; yeni modellerin dokuları web için en çok 512 px olur.
Kullanım: python scripts/pack-nature-assets.py 'Stylized Nature MegaKit[Standard]/glTF'
"""
import json
from pathlib import Path
import struct
import subprocess
import sys

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'assets/environment/quaternius_nature'
for name in ['Pine_5', 'Pine_2', 'DeadTree_2', 'CommonTree_3', 'Rock_Medium_3',
             'Pebble_Square_2', 'Grass_Common_Short', 'Fern_1']:
    model = json.loads((source / f'{name}.gltf').read_text())
    binary = bytearray()
    offsets = []
    for buffer in model['buffers']:
        binary.extend(b'\0' * (-len(binary) % 4))
        offsets.append(len(binary))
        binary.extend((source / buffer['uri']).read_bytes())
    for view in model['bufferViews']:
        view['byteOffset'] = view.get('byteOffset', 0) + offsets[view['buffer']]
        view['buffer'] = 0
    for image in model.get('images', []):
        pixels = subprocess.run(['magick', str(source / image.pop('uri')), '-resize', '512x512>',
                                 'png:-'], check=True, capture_output=True).stdout
        binary.extend(b'\0' * (-len(binary) % 4))
        image.update(bufferView=len(model['bufferViews']), mimeType='image/png')
        model['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(pixels)})
        binary.extend(pixels)
    model['buffers'] = [{'byteLength': len(binary)}]
    metadata = json.dumps(model, separators=(',', ':')).encode()
    metadata += b' ' * (-len(metadata) % 4)
    binary.extend(b'\0' * (-len(binary) % 4))
    glb = (struct.pack('<III', 0x46546C67, 2, 28 + len(metadata) + len(binary))
           + struct.pack('<II', len(metadata), 0x4E4F534A) + metadata
           + struct.pack('<II', len(binary), 0x004E4942) + binary)
    (target / f'{name}.glb').write_bytes(glb)
    print(f'{name}: {len(glb):,} bayt')
