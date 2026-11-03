"""Rebuild scan weights from the fitted skeleton; no authoring files are modified."""
import json
import os
import sys
import time

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree

directory = sys.argv[sys.argv.index('--') + 1]
with open(os.path.join(directory, 'input.json')) as stream:
    data = json.load(stream)
bpy.ops.wm.read_factory_settings(use_empty=True)
positions = [(data['positions'][i], -data['positions'][i + 2], data['positions'][i + 1])
             for i in range(0, len(data['positions']), 3)]
faces = [data['indices'][i:i + 3] for i in range(0, len(data['indices']), 3)]
mesh = bpy.data.meshes.new('weight_surface')
mesh.from_pydata(positions, [], faces)
mesh.update()
character = bpy.data.objects.new('linlan', mesh)
bpy.context.collection.objects.link(character)
editable = bmesh.new()
editable.from_mesh(mesh)
editable.verts.ensure_lookup_table()
region_layer = editable.verts.layers.int.new('region')
for vertex in editable.verts:
    vertex[region_layer] = data['regions'][vertex.index]
# Weld UV duplicates within each semantic surface, preserving the contact cuts.
for region in range(3):
    bmesh.ops.remove_doubles(editable,
        verts=[vertex for vertex in editable.verts if vertex[region_layer] == region], dist=0.00001)
bmesh.ops.recalc_face_normals(editable, faces=list(editable.faces))
editable.to_mesh(mesh)
editable.free()
mesh.update()
armature = bpy.data.armatures.new('scan_skeleton')
rig = bpy.data.objects.new('scan_rig', armature)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
convert = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
for index, source in enumerate(data['bones']):
    matrix = convert @ Matrix([source['matrix'][i:i + 4] for i in range(0, 16, 4)]).transposed()
    bone = armature.edit_bones.new(source['name'])
    bone.head = matrix.translation
    direction = (matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
    children = [child for child in data['bones'] if child['parent'] == index]
    length = 0.028
    if children:
        child = children[0]['matrix']
        length = max(0.015, ((convert @ Vector(child[12:15])) - bone.head).length)
    bone.tail = bone.head + direction * length
    bone.use_deform = source['name'] not in ['root', 'neutral_bone']
for source in data['bones']:
    if source['parent'] >= 0:
        armature.edit_bones[source['name']].parent = armature.edit_bones[data['bones'][source['parent']]['name']]
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
character.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
started = time.monotonic()
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
group_ids = {group.index: next(index for index, bone in enumerate(data['bones'])
                             if bone['name'] == group.name) for group in character.vertex_groups}
trees = []
region_values = mesh.attributes['region'].data
for region in range(3):
    vertices = [vertex for vertex in mesh.vertices if region_values[vertex.index].value == region]
    tree = KDTree(len(vertices))
    for vertex in vertices:
        tree.insert(vertex.co, vertex.index)
    tree.balance()
    trees.append(tree)
weights = []
missing = 0
valid_body = [vertex for vertex in mesh.vertices if region_values[vertex.index].value == 0
              and any(group.weight > 0.0000001 for group in vertex.groups)]
if len(valid_body) < len(mesh.vertices) * 0.85:
    raise RuntimeError('Bone heat did not bind enough of the body surface.')
fallback = KDTree(len(valid_body))
for vertex in valid_body:
    fallback.insert(vertex.co, vertex.index)
fallback.balance()
maximum_repair_distance = 0
for index, position in enumerate(positions):
    region = data['regions'][index]
    _, nearest, _ = trees[region].find(Vector(position))
    influences = [(group_ids[group.group], group.weight) for group in mesh.vertices[nearest].groups
                  if group.weight > 0.0000001]
    if not influences and region == 0:
        missing += 1
        # Tiny disconnected scan slivers may not receive bone-heat weights.
        # Transfer from the nearest freshly bound body surface, never source weights.
        _, donor, distance = fallback.find(Vector(position))
        if distance > 0.08:
            raise RuntimeError('Unbound body island is too far from the rebound surface.')
        maximum_repair_distance = max(maximum_repair_distance, distance)
        influences = [(group_ids[group.group], group.weight) for group in mesh.vertices[donor].groups
                      if group.weight > 0.0000001]
    weights.append(influences)
if missing > len(positions) * 0.01:
    raise RuntimeError('Bone heat left too many disconnected body vertices: %d.' % missing)
with open(os.path.join(directory, 'weights.json'), 'w') as stream:
    json.dump(weights, stream)
print('REBIND', json.dumps({'vertices': len(positions), 'weldedVertices': len(mesh.vertices),
    'bones': len(data['bones']), 'repairedIslands': missing,
    'maximumRepairDistance': maximum_repair_distance,
    'seconds': round(time.monotonic() - started, 3)}), flush=True)
