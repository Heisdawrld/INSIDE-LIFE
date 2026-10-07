"""Build the CC0 adult head assets from a pinned MakeHuman asset checkout.

Usage: python scripts/import-human-head.py /path/to/makehuman-checkout
Only graphical assets are consumed; no upstream application code is copied.
"""
import json
import sys
from pathlib import Path

source = Path(sys.argv[1])
root = Path(__file__).resolve().parents[1]
vertices = []
groups = {}
group = ''
for line in (source / 'makehuman/data/3dobjs/base.obj').read_text().splitlines():
    if line.startswith('v '):
        vertices.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('g '):
        group = line[2:]
        groups.setdefault(group, [])
    elif line.startswith('f '):
        groups[group].append([int(x.split('/')[0]) - 1 for x in line.split()[1:]])

result = {}
for frame, target_name in [('feminine', 'african-female-young'), ('masculine', 'african-male-young')]:
    positions = [v[:] for v in vertices]
    for line in (source / f'makehuman/data/targets/macrodetails/{target_name}.target').read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        index, *delta = line.split()
        for axis in range(3):
            positions[int(index)][axis] += float(delta[axis])
    body_ids = set(i for face in groups['body'] for i in face)
    minimum = min(positions[i][1] for i in body_ids)
    maximum = max(positions[i][1] for i in body_ids)
    scale = 1.87 / (maximum - minimum)
    normalized = [[p[0] * scale, (p[1] - minimum) * scale, p[2] * scale] for p in positions]
    # Head/upper neck only. Never distribute or render an unclothed body mesh.
    faces = []
    cutoff = 1.60
    intersections = {}
    for face in groups['body']:
        clipped = []
        for j, current in enumerate(face):
            previous = face[j - 1]
            p, q = normalized[previous], normalized[current]
            if (p[1] >= cutoff) != (q[1] >= cutoff):
                edge = tuple(sorted((previous, current)))
                if edge not in intersections:
                    t = (cutoff - p[1]) / (q[1] - p[1])
                    intersections[edge] = len(normalized)
                    normalized.append([p[a] + t * (q[a] - p[a]) for a in range(3)])
                clipped.append(intersections[edge])
            if q[1] >= cutoff:
                clipped.append(current)
        if len(clipped) >= 3:
            faces.append(clipped)
    ids = sorted(set(i for f in faces for i in f))
    mapping = {original: index for index, original in enumerate(ids)}
    indices = []
    for face in faces:
        for j in range(1, len(face) - 1):
            indices.extend([mapping[face[0]], mapping[face[j]], mapping[face[j + 1]]])
    eyes = []
    for eye in ['joint-r-eye', 'joint-l-eye']:
        eye_ids = set(i for f in groups[eye] for i in f)
        eyes.append([round(sum(normalized[i][a] for i in eye_ids) / len(eye_ids), 6) for a in range(3)])
    result[frame] = {'positions': [round(n, 6) for i in ids for n in normalized[i]], 'indices': indices, 'eyes': eyes}
    print(frame, len(ids), 'vertices', len(indices) // 3, 'triangles', 'eyes', eyes)
destination = root / 'src/assets/human-head.json'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(result, separators=(',', ':')) + '\n')
license_dir = root / 'public/licenses'
license_dir.mkdir(parents=True, exist_ok=True)
(license_dir / 'MakeHuman-CC0.txt').write_text((source / 'LICENSE.ASSETS.md').read_text())
