import bpy,json,math,os
from mathutils import Vector
root=os.path.dirname(__file__)
with open(os.path.join(root,'guardians.json')) as f: statues=json.load(f)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1800;scene.render.resolution_y=950;scene.render.resolution_percentage=100
scene.world.color=(0.035,0.035,0.035)
scene.view_settings.view_transform='AgX'
cache={}
world_root=os.path.abspath(os.path.join(root,'../../web/public/art/world'))
with open(os.path.join(world_root,'library.json')) as f: surfaces=json.load(f)['surfaces']
def material(m):
 key=tuple(m)
 if key in cache:return cache[key]
 mat=bpy.data.materials.new('pigment_'+str(len(cache)));mat.use_nodes=True;mat.node_tree.nodes.clear()
 bs=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled');out=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(bs.outputs['BSDF'],out.inputs['Surface'])
 rgb=m[:3]
 has_texture=m[5]>=41 and int(m[5])-16<len(surfaces)
 if m[5] in [41,42] and not has_texture:rgb=[rgb[0]*.65,rgb[1]*.45,rgb[2]*.23]
 bs.inputs['Base Color'].default_value=(*rgb,1)
 bs.inputs['Roughness'].default_value=m[3];bs.inputs['Metallic'].default_value=m[4]
 if has_texture:
  surface=surfaces[int(m[5])-16];nodes=mat.node_tree.nodes;links=mat.node_tree.links
  tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(os.path.join(world_root,surface['albedo']),check_existing=True)
  multiply=nodes.new('ShaderNodeVectorMath');multiply.operation='MULTIPLY';multiply.inputs[1].default_value=rgb
  links.new(tex.outputs['Color'],multiply.inputs[0]);links.new(multiply.outputs['Vector'],bs.inputs['Base Color'])
  normal_tex=nodes.new('ShaderNodeTexImage');normal_tex.image=bpy.data.images.load(os.path.join(world_root,surface['normal']),check_existing=True);normal_tex.image.colorspace_settings.name='Non-Color'
  normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65;links.new(normal_tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
  arm=nodes.new('ShaderNodeTexImage');arm.image=bpy.data.images.load(os.path.join(world_root,surface['arm']),check_existing=True);arm.image.colorspace_settings.name='Non-Color'
  separate=nodes.new('ShaderNodeSeparateColor');links.new(arm.outputs['Color'],separate.inputs['Color'])
  rough=nodes.new('ShaderNodeMath');rough.operation='MULTIPLY';rough.inputs[1].default_value=m[3];links.new(separate.outputs['Green'],rough.inputs[0]);links.new(rough.outputs[0],bs.inputs['Roughness'])
 cache[key]=mat;return mat
objects={}
for i,statue in enumerate(statues):
 group=[]
 for source in statue['meshes']:
  mesh=bpy.data.meshes.new(source['name']);mesh.from_pydata(source['positions'],[],source['faces']);mesh.update()
  mesh.normals_split_custom_set_from_vertices(source['normals'])
  for poly in mesh.polygons:poly.use_smooth=True
  uv=mesh.uv_layers.new(name='UVMap')
  for poly in mesh.polygons:
   for idx in poly.loop_indices:uv.data[idx].uv=source['uv'][mesh.loops[idx].vertex_index]
  obj=bpy.data.objects.new(statue['kind']+'_'+source['name'],mesh);scene.collection.objects.link(obj)
  for m in source['materials']:obj.data.materials.append(material(m))
  for poly,idx in zip(mesh.polygons,source['faceMaterials']):poly.material_index=idx
  obj.location=(i*2.6-3.9,0,0);group.append(obj)
 objects[statue['kind']]=group
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object
mat=bpy.data.materials.new('stone floor');mat.diffuse_color=(.065,.06,.053,1);floor.data.materials.append(mat)
def area(name,p,power,size):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
 obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=p;obj.rotation_euler=(Vector((0,0,1.6))-obj.location).to_track_quat('-Z','Y').to_euler()
area('warm key',(-4,-5,8),1800,6);area('fill',(5,-2,4),950,5);area('rim',(1,3,7),2000,4)
camera_data=bpy.data.cameras.new('camera');camera=bpy.data.objects.new('camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera
camera_data.type='ORTHO';camera_data.ortho_scale=12.1
camera.location=(0,-12,5.2);camera.rotation_euler=(Vector((0,0,1.7))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=os.path.join(root,'quartet.png');bpy.ops.render.render(write_still=True)
for name,group in objects.items():
 for obj in group:obj.hide_render=name!='pipa'
for obj in objects['pipa']:obj.location=(0,0,0)
camera_data.ortho_scale=2.25;camera.location=(2.5,-5,3.1);camera.rotation_euler=(Vector((0,-.15,2.3))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1050;scene.render.resolution_y=1200
scene.render.filepath=os.path.join(root,'pipa_close.png');bpy.ops.render.render(write_still=True)
