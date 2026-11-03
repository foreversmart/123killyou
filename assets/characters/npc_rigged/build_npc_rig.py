import bpy
import math
import os
import zipfile
from mathutils import Vector
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../web/public/art/world'))
BLEND_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'npc_rigged.blend'))
GLB_PATH = os.path.join(OUT_DIR, 'npc_rigged.glb')
ZIP_PATH = os.path.join(OUT_DIR, 'npc_rigged.zip')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.render.fps = 30
scene.frame_start = 1
scene.frame_end = 72
world = bpy.data.worlds.new('npc_world')
scene.world = world
world.color = (0.03, 0.03, 0.025)
PALETTE = {
    'skin': (0.36, 0.19, 0.12, 1),
    'robe': (0.18, 0.21, 0.17, 1),
    'robe_dark': (0.09, 0.10, 0.09, 1),
    'hair': (0.025, 0.02, 0.018, 1),
    'shoe': (0.07, 0.065, 0.055, 1),
    'candle': (0.56, 0.08, 0.045, 1),
}
def mat(name, color, rough=0.9):
    m = bpy.data.materials.new(name)
    m.diffuse_color = color
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = rough
    return m
MATS = {name: mat('npc_' + name, color) for name, color in PALETTE.items()}
arm_data = bpy.data.armatures.new('npc_skeleton')
arm = bpy.data.objects.new('npc_skeleton', arm_data)
bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def add_bone(name, head, tail, parent=None, use_connect=False):
    b = arm_data.edit_bones.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = arm_data.edit_bones[parent]
        b.use_connect = use_connect
    return b
add_bone('root', (0, 0, 0), (0, 0.16, 0))
add_bone('pelvis', (0, 0.78, 0), (0, 0.98, 0), 'root')
add_bone('spine', (0, 0.98, 0), (0, 1.22, 0), 'pelvis', True)
add_bone('chest', (0, 1.22, 0), (0, 1.42, 0), 'spine', True)
add_bone('neck', (0, 1.42, 0), (0, 1.53, 0), 'chest', True)
add_bone('head', (0, 1.53, 0), (0, 1.78, 0), 'neck', True)
for side, x in [('l', 1), ('r', -1)]:
    add_bone('upper_arm_' + side, (x * 0.19, 1.36, 0), (x * 0.43, 1.12, 0), 'chest')
    add_bone('forearm_' + side, (x * 0.43, 1.12, 0), (x * 0.56, 0.87, 0), 'upper_arm_' + side)
    add_bone('hand_' + side, (x * 0.56, 0.87, 0), (x * 0.59, 0.78, 0), 'forearm_' + side, True)
    add_bone('thigh_' + side, (x * 0.095, 0.78, 0), (x * 0.1, 0.42, 0), 'pelvis')
    add_bone('shin_' + side, (x * 0.1, 0.42, 0), (x * 0.1, 0.08, 0), 'thigh_' + side)
    add_bone('foot_' + side, (x * 0.1, 0.08, 0), (x * 0.1, 0.03, 0.18), 'shin_' + side, True)
bpy.ops.object.mode_set(mode='POSE')
for pb in arm.pose.bones:
    pb.rotation_mode = 'XYZ'
bpy.ops.object.mode_set(mode='OBJECT')
def finish_mesh(obj, bone_name, material):
    obj.name = 'npc_' + bone_name
    obj.data.materials.append(material)
    world = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = 'OBJECT'
    obj.matrix_world = world
    mod = obj.modifiers.new('npc_armature', 'ARMATURE')
    mod.object = arm
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    return obj
def uv_sphere(name, location, scale, bone, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_mesh(obj, bone, material)
def cube(name, location, scale, bone, material, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        bevel_mod = obj.modifiers.new('soft_edges', 'BEVEL')
        bevel_mod.width = bevel
        bevel_mod.segments = 2
    return finish_mesh(obj, bone, material)
def cylinder(name, location, radius, depth, bone, material, direction=(0, 1, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(direction).normalized())
    return finish_mesh(obj, bone, material)
uv_sphere('torso', (0, 1.18, 0), (0.28, 0.42, 0.16), 'chest', MATS['robe'])
uv_sphere('robe_skirt', (0, 0.88, 0), (0.34, 0.32, 0.19), 'pelvis', MATS['robe_dark'])
uv_sphere('head', (0, 1.63, 0), (0.17, 0.2, 0.16), 'head', MATS['skin'])
uv_sphere('hair', (0, 1.76, -0.02), (0.18, 0.12, 0.17), 'head', MATS['hair'])
for side, x in [('l', 1), ('r', -1)]:
    cylinder('upper_arm_' + side, (x * 0.31, 1.23, 0), 0.075, 0.42, 'upper_arm_' + side, MATS['robe'], (x * 0.24, -0.24, 0))
    cylinder('forearm_' + side, (x * 0.50, 0.99, 0), 0.065, 0.38, 'forearm_' + side, MATS['robe'], (x * 0.13, -0.25, 0))
    uv_sphere('hand_' + side, (x * 0.57, 0.8, 0), (0.07, 0.08, 0.06), 'hand_' + side, MATS['skin'])
    cylinder('thigh_' + side, (x * 0.1, 0.60, 0), 0.095, 0.46, 'thigh_' + side, MATS['robe_dark'], (0, -0.35, 0))
    cylinder('shin_' + side, (x * 0.1, 0.25, 0), 0.075, 0.44, 'shin_' + side, MATS['robe'], (0, -0.34, 0))
    cube('foot_' + side, (x * 0.1, 0.06, 0.08), (0.09, 0.05, 0.15), 'foot_' + side, MATS['shoe'])
cylinder('candle_prop', (-0.58, 0.82, 0.04), 0.035, 0.18, 'hand_r', MATS['candle'], (0, 1, 0))
preview_root = bpy.data.objects.new('npc_preview_root', None)
bpy.context.collection.objects.link(preview_root)
preview_root.rotation_euler = (math.radians(90), 0, 0)
preview_root.parent = None
arm.parent = preview_root
# Pose helpers.
def pose(name, rot=None, loc=None):
    pb = arm.pose.bones[name]
    if rot is not None:
        pb.rotation_euler = rot
    if loc is not None:
        pb.location = loc
def reset_pose():
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
def key_all(frame):
    for pb in arm.pose.bones:
        pb.keyframe_insert(data_path='rotation_euler', frame=frame, group=pb.name)
        if pb.name == 'root':
            pb.keyframe_insert(data_path='location', frame=frame, group='root')
def action(name, end, builder):
    reset_pose()
    act = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = act
    for frame in range(1, end + 1):
        reset_pose()
        builder(frame, end)
        key_all(frame)
    return act
def walk(f, end):
    p = (f - 1) / (end - 1) * math.tau
    s = math.sin(p)
    c = math.cos(p)
    pose('root', loc=(0, abs(s) * 0.035, 0))
    pose('pelvis', rot=(0, s * 0.055, 0))
    pose('spine', rot=(0, -s * 0.03, c * 0.02))
    pose('upper_arm_l', rot=(-s * 0.35, 0, 0.02))
    pose('upper_arm_r', rot=(s * 0.35, 0, -0.02))
    pose('forearm_l', rot=(-max(0, s) * 0.2, 0, 0))
    pose('forearm_r', rot=(-max(0, -s) * 0.2, 0, 0))
    pose('thigh_l', rot=(s * 0.5, 0, 0))
    pose('thigh_r', rot=(-s * 0.5, 0, 0))
    pose('shin_l', rot=(max(0, -s) * 0.6, 0, 0))
    pose('shin_r', rot=(max(0, s) * 0.6, 0, 0))
    pose('foot_l', rot=(-max(0, s) * 0.22, 0, 0))
    pose('foot_r', rot=(-max(0, -s) * 0.22, 0, 0))
def welcome(f, end):
    t = (f - 1) / (end - 1)
    wave = math.sin(t * math.tau * 2.0) * (0.16 if 0.25 < t < 0.78 else 0.04)
    raise_amt = min(1, t / 0.24) * min(1, (1 - t) / 0.18)
    pose('spine', rot=(0.05 * raise_amt, 0, 0))
    pose('upper_arm_r', rot=(-1.1 * raise_amt, 0.12 * raise_amt, -0.2 * raise_amt))
    pose('forearm_r', rot=(-0.7 * raise_amt + wave, 0, 0.05))
    pose('hand_r', rot=(0, 0, wave * 0.5))
    pose('head', rot=(0.04 * raise_amt, -0.08 * raise_amt, 0))
    pose('upper_arm_l', rot=(-0.12, 0, 0.06))
    pose('forearm_l', rot=(-0.16, 0, 0))
def observe(f, end):
    t = (f - 1) / (end - 1)
    sweep = math.sin(t * math.tau)
    pose('head', rot=(0.03 * math.sin(t * math.tau * 2), sweep * 0.52, 0.02 * math.sin(t * math.tau)))
    pose('spine', rot=(0, sweep * 0.12, 0))
    pose('chest', rot=(0, sweep * 0.07, 0))
    pose('upper_arm_l', rot=(-0.12, 0, 0.04))
    pose('upper_arm_r', rot=(-0.12, 0, -0.04))
    pose('forearm_l', rot=(-0.14, 0, 0))
    pose('forearm_r', rot=(-0.14, 0, 0))
def write(f, end):
    t = (f - 1) / (end - 1)
    stroke = math.sin(t * math.tau * 3.0)
    settle = 0.85 + 0.15 * math.cos(t * math.tau * 3.0)
    pose('spine', rot=(0.28, 0, 0))
    pose('head', rot=(0.3, 0.02, 0))
    pose('upper_arm_l', rot=(-0.72, 0.08, 0.15))
    pose('forearm_l', rot=(-0.92 + stroke * 0.08, 0, 0.08))
    pose('hand_l', rot=(0, 0, stroke * 0.05))
    pose('upper_arm_r', rot=(-0.55, -0.08, -0.18))
    pose('forearm_r', rot=(-0.9 + stroke * 0.12, 0, -0.05))
    pose('hand_r', rot=(0, 0, -stroke * 0.08))
    pose('pelvis', rot=(0, stroke * 0.02 * settle, 0))
def eat(f, end):
    t = (f - 1) / (end - 1)
    bite = max(0, math.sin(t * math.tau))
    pose('spine', rot=(0.1 + 0.04 * bite, 0, 0))
    pose('head', rot=(0.12 + 0.08 * bite, 0, 0))
    pose('upper_arm_l', rot=(-0.8 - 0.24 * bite, 0.12, 0.1))
    pose('forearm_l', rot=(-0.9 - 0.45 * bite, 0, 0.1))
    pose('hand_l', rot=(0.16 * bite, 0, 0))
    pose('upper_arm_r', rot=(-0.55, -0.1, -0.2))
    pose('forearm_r', rot=(-0.9, 0, -0.1))
def offer_candle(f, end):
    t = (f - 1) / (end - 1)
    reach = min(1, t / 0.32) * min(1, (1 - t) / 0.24)
    pose('spine', rot=(0.05 * reach, 0.06 * reach, 0))
    pose('upper_arm_r', rot=(-0.52 * reach, 0.18 * reach, -0.25 * reach))
    pose('forearm_r', rot=(-0.72 * reach, 0, 0.05))
    pose('hand_r', rot=(0, 0, -0.1 * reach))
    pose('upper_arm_l', rot=(-0.3 * reach, 0, 0.15))
    pose('forearm_l', rot=(-0.45 * reach, 0, 0))
    pose('head', rot=(0.08 * reach, 0.12 * reach, 0))
def night(f, end):
    t = (f - 1) / (end - 1)
    breath = math.sin(t * math.tau) * 0.03
    caution = 0.5 + 0.5 * math.sin(t * math.tau * 0.5)
    pose('spine', rot=(0.08 + breath, 0, 0))
    pose('chest', rot=(0.04 + breath, 0, 0))
    pose('head', rot=(0.12 + 0.05 * caution, -0.2 * caution, 0))
    pose('upper_arm_r', rot=(-0.46, 0.08, -0.08))
    pose('forearm_r', rot=(-0.86, 0, 0.05))
    pose('upper_arm_l', rot=(-0.35, -0.08, 0.08))
    pose('forearm_l', rot=(-0.68, 0, 0))
def turn_body(f, end):
    t = (f - 1) / (end - 1)
    yaw = math.sin(t * math.tau * 0.5) * math.pi * 0.52
    pose('root', rot=(0, yaw, 0))
    pose('pelvis', rot=(0, yaw * 0.15, 0))
    pose('spine', rot=(0, -yaw * 0.1, 0))
    pose('head', rot=(0, -yaw * 0.24, 0))
    pose('upper_arm_l', rot=(-0.12, 0, 0.03))
    pose('upper_arm_r', rot=(-0.12, 0, -0.03))
ACTIONS = [
    action('walk', 25, walk),
    action('welcome', 45, welcome),
    action('observe', 60, observe),
    action('write', 48, write),
    action('eat', 72, eat),
    action('offer_candle', 54, offer_candle),
    action('night', 60, night),
    action('turn_body', 48, turn_body),
]
for clip in ACTIONS:
    clip.use_fake_user = True
reset_pose()
arm.animation_data.action = None
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
arm.parent = None
preview_root.rotation_euler = (0, 0, 0)
for obj in bpy.context.selected_objects:
    obj.select_set(False)
arm.select_set(True)
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(
    filepath=GLB_PATH,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_nla_strips=False,
    export_force_sampling=True,
    export_frame_step=1,
    export_apply=True,
)
with zipfile.ZipFile(ZIP_PATH, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    archive.write(GLB_PATH, arcname='npc_rigged.glb')
os.remove(GLB_PATH)
print('WROTE', BLEND_PATH)
print('WROTE', ZIP_PATH)
print('ACTIONS', ','.join(a.name for a in ACTIONS))
