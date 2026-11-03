"""Offline inspection of exported runtime geometry; this is not a game screenshot."""
import bpy, json, math, os, sys
import numpy as np
from mathutils import Vector

folder = os.path.dirname(__file__)
with open(os.path.join(folder, 'architecture.json')) as stream:
    source = json.load(stream)
project = source['project']
art = os.path.join(project, 'web/public/art/world')
with open(os.path.join(art, 'library.json')) as stream:
    library = json.load(stream)
only = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['gate','hall','corridor']

def world_vector(p): return (p[0], -p[2], p[1])
def texture_slot(pattern):
    return pattern-16 if pattern >= 16 else {1:2,4:1,7:4,8:0,9:3,10:5}.get(pattern)

for config in source['scenes']:
    if config['id'] not in only: continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.exposure = 0
    cache = {}
    image_cache = {}
    def image(name, data=False):
        key=(name,data)
        if key not in image_cache:
            im=bpy.data.images.load(name)
            if data: im.colorspace_settings.name='Non-Color'
            image_cache[key]=im
        return image_cache[key]
    def material(m):
        key=tuple(m)
        if key in cache:return cache[key]
        mat=bpy.data.materials.new('runtime_surface_'+str(len(cache)))
        mat.use_nodes=True
        nodes=mat.node_tree.nodes; links=mat.node_tree.links; nodes.clear()
        shader=nodes.new('ShaderNodeBsdfPrincipled'); out=nodes.new('ShaderNodeOutputMaterial')
        links.new(shader.outputs['BSDF'],out.inputs['Surface'])
        color=m[:3]; pattern=round(m[5]); tile=round(m[7]); rough=m[3]
        shader.inputs['Base Color'].default_value=(*color,1)
        shader.inputs['Roughness'].default_value=rough
        shader.inputs['Metallic'].default_value=m[4]
        slot=texture_slot(pattern)
        base_path=None; normal_path=None; arm_path=None
        if tile>=0: base_path=os.path.join(folder,f'label_{tile}.png')
        elif slot is not None:
            if slot>=len(library['surfaces']): raise RuntimeError(f'Missing material slot {slot}, pattern {pattern}')
            surface=library['surfaces'][slot]
            base_path=os.path.join(art,surface['albedo'])
            normal_path=os.path.join(art,surface['normal'])
            arm_path=os.path.join(art,surface['arm'])
        if base_path:
            tex=nodes.new('ShaderNodeTexImage');tex.image=image(base_path);tex.interpolation='Linear'
            multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
            multiply.inputs[2].default_value=(*color,1)
            links.new(tex.outputs['Color'],multiply.inputs[1])
            links.new(multiply.outputs[0],shader.inputs['Base Color'])
            if pattern>=16:links.new(tex.outputs['Alpha'],shader.inputs['Alpha'])
            if normal_path:
                normal_tex=nodes.new('ShaderNodeTexImage');normal_tex.image=image(normal_path,True)
                normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65
                links.new(normal_tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs['Normal'])
            if arm_path:
                arm_tex=nodes.new('ShaderNodeTexImage');arm_tex.image=image(arm_path,True)
                separate=nodes.new('ShaderNodeSeparateColor');links.new(arm_tex.outputs['Color'],separate.inputs['Color'])
                scale=nodes.new('ShaderNodeMath');scale.operation='MULTIPLY';scale.inputs[1].default_value=rough
                links.new(separate.outputs['Green'],scale.inputs[0]);links.new(scale.outputs[0],shader.inputs['Roughness'])
                metal=nodes.new('ShaderNodeMath');metal.operation='MULTIPLY';metal.inputs[1].default_value=m[4]
                links.new(separate.outputs['Blue'],metal.inputs[0]);links.new(metal.outputs[0],shader.inputs['Metallic'])
        elif pattern==5:
            tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=16
            mix=nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(*color,1);mix.inputs[2].default_value=(.035,.10,.075,1)
            ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.63;ramp.color_ramp.elements[1].position=.86
            links.new(tex.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs['Color'],mix.inputs[0]);links.new(mix.outputs[0],shader.inputs['Base Color'])
        if m[6] > 0:
            shader.inputs['Emission Color'].default_value=(*color,1)
            shader.inputs['Emission Strength'].default_value=m[6]*2
        cache[key]=mat
        return mat
    for mesh_source in config['meshes']:
        name=mesh_source['id']
        values=np.fromfile(os.path.join(folder,name+'_vertices.bin'),dtype='<f4').reshape((-1,8))
        indices=np.fromfile(os.path.join(folder,name+'_indices.bin'),dtype='<u4')
        material_ids=np.fromfile(os.path.join(folder,name+'_materials.bin'),dtype='<u2')
        mesh=bpy.data.meshes.new(mesh_source['name'])
        mesh.vertices.add(len(values));mesh.vertices.foreach_set('co',values[:,:3].ravel())
        mesh.loops.add(len(indices));mesh.loops.foreach_set('vertex_index',indices)
        mesh.polygons.add(len(indices)//3)
        mesh.polygons.foreach_set('loop_start',np.arange(0,len(indices),3,dtype=np.int32))
        mesh.polygons.foreach_set('loop_total',np.full(len(indices)//3,3,dtype=np.int32))
        mesh.polygons.foreach_set('use_smooth',np.ones(len(indices)//3,dtype=bool))
        mesh.update()
        mesh.normals_split_custom_set_from_vertices(values[:,3:6].tolist())
        uv=mesh.uv_layers.new(name='Runtime UV')
        uv.data.foreach_set('uv',values[indices,6:8].ravel())
        obj=bpy.data.objects.new(mesh_source['name'],mesh);scene.collection.objects.link(obj)
        for item in mesh_source['materials']:mesh.materials.append(material(item))
        mesh.polygons.foreach_set('material_index',material_ids[indices[::3]].astype(np.int32))
    light=config['lighting']
    world=bpy.data.worlds.new('Runtime daylight environment');scene.world=world;world.use_nodes=True
    nodes=world.node_tree.nodes;links=world.node_tree.links
    environment=nodes.new('ShaderNodeTexEnvironment');environment.image=image(os.path.join(art,'sky_day.webp'))
    links.new(environment.outputs[0],nodes.get('Background').inputs[0])
    nodes.get('Background').inputs[1].default_value=.45 if config['id'] not in ['hall','bedroom'] else .18
    def lamp(name,position,color,power,kind='POINT',size=.2,target=(0,0,2)):
        data=bpy.data.lights.new(name,kind);data.energy=power;data.color=color
        if kind=='AREA':data.shape='DISK';data.size=size
        elif kind=='POINT':data.shadow_soft_size=size
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=position
        obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
        return obj
    direction=Vector(world_vector(light['direction']))
    sun=lamp('Runtime sun',direction*20,tuple(c/max(light['sun']) for c in light['sun']),max(light['sun']),kind='SUN')
    sun.data.angle=.12
    for i,item in enumerate(light['lamps']):
        lamp('Runtime lamp '+str(i),world_vector(item['position']),item['color'],item['power']*4*math.pi)
    # The runtime uses a constant hemispheric ambient term. Broad entrance and
    # ceiling fill reproduce that visibility for inspection in a path tracer.
    if config['id'] in ['hall','register','refectory','bedroom','window']:
        lamp('Ambient entrance fill',(0,-3.4,4.4),(.78,.86,1),125,'AREA',5,(0,2,3.2))
        lamp('Ambient upper fill',(0,0,5.9),(.92,.85,.72),75,'AREA',4,(0,2,2.5))
    camera_data=bpy.data.cameras.new('Architecture inspection camera')
    camera=bpy.data.objects.new('Architecture inspection camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera
    camera_data.lens=config['lens'];camera_data.clip_end=200
    camera.location=world_vector(config['camera'])
    camera.rotation_euler=(Vector(world_vector(config['target']))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(folder,config['id']+'_raw.png')
    bpy.ops.render.render(write_still=True)
    print('OFFLINE_RENDER_READY',scene.render.filepath,flush=True)
