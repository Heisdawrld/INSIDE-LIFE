"""Derive clothed adult body geometry and a compact rig from CC0 graphical assets.

Usage: python scripts/import-human-body.py ../makehuman-reference
Pinned upstream revision and license are recorded in THIRD_PARTY.md.
No MakeHuman application code is imported.
"""
import json
import sys
from pathlib import Path

source = Path(sys.argv[1]) / 'makehuman/data'
root = Path(__file__).resolve().parents[1]
vertices, faces, groups = [], [], {}
group = ''
for line in (source / '3dobjs/base.obj').read_text().splitlines():
    if line.startswith('v '):
        vertices.append([float(v) for v in line.split()[1:4]])
    elif line.startswith('g '):
        group = line[2:]
        groups.setdefault(group, [])
    elif line.startswith('f '):
        groups[group].append([int(v.split('/')[0]) - 1 for v in line.split()[1:]])

rig = json.loads((source / 'rigs/default.mhskel').read_text())
weights = json.loads((source / 'rigs/default_weights.mhw').read_text())['weights']
bone_names = ['root']
parents = [-1]
for side in ['L', 'R']:
    start = len(bone_names)
    bone_names += [f'upperarm01.{side}', f'lowerarm01.{side}', f'wrist.{side}',
                   f'upperleg01.{side}', f'lowerleg01.{side}', f'foot.{side}']
    parents += [0, start, start + 1, 0, start + 3, start + 4]

def compact_bone(name):
    side = name[-1]
    if side not in ['L', 'R']:
        return 0
    offset = 1 if side == 'L' else 7
    for prefixes, delta in [(('upperarm',), 0), (('lowerarm',), 1),
                            (('hand', 'wrist', 'finger', 'metacarpal'), 2),
                            (('upperleg',), 3), (('lowerleg',), 4), (('foot', 'toe'), 5)]:
        if name.startswith(prefixes):
            return offset + delta
    return 0

influences = [{} for _ in vertices]
for name, entries in weights.items():
    bone = compact_bone(name)
    for index, weight in entries:
        influences[index][bone] = influences[index].get(bone, 0) + weight

result = {}
for frame, sex in [('feminine', 'female'), ('masculine', 'male')]:
    positions = [v[:] for v in vertices]
    for line in (source / f'targets/macrodetails/african-{sex}-young.target').read_text().splitlines():
        if line and not line.startswith('#'):
            index, *delta = line.split()
            for axis in range(3):
                positions[int(index)][axis] += float(delta[axis])
    body_ids = set(i for f in groups['body'] for i in f)
    minimum = min(positions[i][1] for i in body_ids)
    scale = 1.87 / (max(positions[i][1] for i in body_ids) - minimum)
    normalized = [[v[0] * scale, (v[1] - minimum) * scale, v[2] * scale] for v in positions]
    mass = [[0., 0., 0.] for _ in vertices]
    for line in (source / f'targets/macrodetails/universal-{sex}-young-averagemuscle-maxweight.target').read_text().splitlines():
        if line and not line.startswith('#'):
            index, *delta = line.split()
            mass[int(index)] = [float(v) * scale for v in delta]
    bones = []
    for name in bone_names:
        if name == 'root':
            bones.append([0, 0, 0])
        else:
            ids = rig['joints'][rig['bones'][name]['head']]
            bones.append([sum(normalized[i][a] for i in ids) / len(ids) for a in range(3)])
    vertex_weights = [dict(w) for w in influences]
    # Clip at exactly the same plane as the head so there is no detached neck.
    clipped_faces, intersections = [], {}
    for f in groups['body']:
        clipped = []
        for j, current in enumerate(f):
            previous = f[j - 1]
            p, q = normalized[previous], normalized[current]
            if (p[1] <= 1.6) != (q[1] <= 1.6):
                edge = tuple(sorted((previous, current)))
                if edge not in intersections:
                    t = (1.6 - p[1]) / (q[1] - p[1])
                    intersections[edge] = len(normalized)
                    normalized.append([p[a] + t * (q[a] - p[a]) for a in range(3)])
                    mass.append([mass[previous][a] * (1-t) + mass[current][a] * t for a in range(3)])
                    wp, wq = vertex_weights[previous], vertex_weights[current]
                    vertex_weights.append({k: wp.get(k, 0) * (1-t) + wq.get(k, 0) * t for k in wp.keys() | wq.keys()})
                clipped.append(intersections[edge])
            if q[1] <= 1.6:
                clipped.append(current)
        if len(clipped) >= 3:
            clipped_faces.append(clipped)
    # Split at garment hems before material assignment; no sawtooth cloth edges.
    for plane in [1.04, 1.575, .115, bones[1][1] - .13, bones[7][1] - .13]:
        split_faces = []
        edges = {}
        for face in clipped_faces:
            low, high = [], []
            for j, current in enumerate(face):
                previous = face[j-1]
                p, q = normalized[previous], normalized[current]
                if (p[1] < plane) != (q[1] < plane):
                    edge = tuple(sorted((previous, current)))
                    if edge not in edges:
                        t = (plane - p[1]) / (q[1] - p[1])
                        edges[edge] = len(normalized)
                        normalized.append([p[a] + t * (q[a]-p[a]) for a in range(3)])
                        mass.append([mass[previous][a] * (1-t) + mass[current][a] * t for a in range(3)])
                        wp, wq = vertex_weights[previous], vertex_weights[current]
                        vertex_weights.append({k: wp.get(k, 0)*(1-t)+wq.get(k, 0)*t for k in wp.keys() | wq.keys()})
                    low.append(edges[edge]); high.append(edges[edge])
                (low if q[1] < plane else high).append(current)
            split_faces.extend(f for f in [low, high] if len(f) >= 3)
        clipped_faces = split_faces
    ids = sorted(set(i for f in clipped_faces for i in f))
    mapping = {index: n for n, index in enumerate(ids)}
    # Regions: skin, knit top, denim, shoes. All torso/pelvis faces stay clothed.
    regions = [[] for _ in range(4)]
    for face in clipped_faces:
        center = [sum(normalized[i][a] for i in face) / len(face) for a in range(3)]
        x, y, z = center
        arm = sum(sum(vertex_weights[i].get(k, 0) for k in [1, 2, 3, 7, 8, 9]) for i in face) / len(face)
        material = 0 if y > 1.575 else 1 if y >= 1.04 else 2
        if arm > .5:
            shoulder_y = bones[1 if x > 0 else 7][1]
            material = 0 if y < shoulder_y - .13 else 1
        elif y < .115:
            material = 3
        for j in range(1, len(face)-1):
            regions[material].extend([mapping[face[0]], mapping[face[j]], mapping[face[j+1]]])
    output_positions = [normalized[i][:] for i in ids]
    # Relax fabric over anatomical detail. This removes skin creases from garments.
    neighbours = [set() for _ in ids]
    fabric = set()
    for material in [1, 2, 3]:
        indices = regions[material]
        for j in range(0, len(indices), 3):
            tri = indices[j:j+3]
            fabric.update(tri)
            for i in tri:
                neighbours[i].update(k for k in tri if k != i)
    boundaries = set()
    memberships = [set() for _ in ids]
    for material, region in enumerate(regions):
        for i in region:
            memberships[i].add(material)
    boundaries = {i for i, m in enumerate(memberships) if len(m) > 1}
    for _ in range(32):
        previous = [v[:] for v in output_positions]
        for i in fabric:
            if neighbours[i] and i not in boundaries:
                for a in range(3):
                    output_positions[i][a] = previous[i][a] * .55 + sum(previous[k][a] for k in neighbours[i]) / len(neighbours[i]) * .45
    skin_indices, skin_weights = [], []
    for i in ids:
        top = sorted(vertex_weights[i].items(), key=lambda item: -item[1])[:4] or [(0, 1)]
        total = sum(w for _, w in top)
        skin_indices += [k for k, _ in top] + [0] * (4-len(top))
        skin_weights += [round(w/total, 6) for _, w in top] + [0] * (4-len(top))
    result[frame] = {
        'positions': [round(v, 6) for p in output_positions for v in p],
        'mass': [round(v, 6) for i in ids for v in mass[i]],
        'regions': regions, 'skinIndices': skin_indices, 'skinWeights': skin_weights,
        'bones': [[round(v, 6) for v in p] for p in bones], 'parents': parents,
    }
    print(frame, len(ids), 'vertices', sum(len(r) for r in regions)//3, 'triangles', 'shoulder/elbow', bones[1:3])

(root / 'src/assets/human-body.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
