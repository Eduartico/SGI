import * as THREE from 'three';
import { MyAxis } from './MyAxis.js';
import { MyFileReader } from './parser/MyFileReader.js';
import { MyNurbsBuilder } from './MyNurbsBuilder.js';
/**
 *  This class contains the contents of out application
 */
class MyContents  {

    /**
       constructs the object
       @param {MyApp} app The application object
    */  
    constructor(app) {
        this.app = app
        this.axis = null

        this.lightIds = ["spotlight", "pointlight", "directionallight"]

        this.reader = new MyFileReader(app, this, this.onSceneLoaded);
		this.reader.open("scenes/t01g10/SGI_TP2_XML_T01_G10_v01.xml");	

        
    }

    /**
     * initializes the contents
     */
    init() {
        // create once 
        if (this.axis === null) {
            // create and attach the axis to the scene
            this.axis = new MyAxis(this)
            this.app.scene.add(this.axis)
        }
    }

    /**
     * Called when the scene xml file load is complete
     * @param {MySceneData} data the entire scene data object
     */
    onSceneLoaded(data) {
        console.info("scene data loaded " + data + ". visit MySceneData javascript class to check contents for each data item.")
        this.onAfterSceneLoadedAndBeforeRender(data);
    }

    output(obj, indent = 0) {
        console.log("" + new Array(indent * 4).join(' ') + " - " + obj.type + " " + (obj.id !== undefined ? "'" + obj.id + "'" : ""))
    }

    onAfterSceneLoadedAndBeforeRender(data) {
       
        this.textures = new Map();
        this.materials = new Map();
        this.materialStack = new Array();
        this.cameras = new Map();
        this.lights = new Map();
        this.activeCameraId = data.activeCameraId;
        this.materialStack.push("defaultMaterial");
        this.materials["defaultMaterial"] = new THREE.MeshPhongMaterial();
        this.nurbsBuilder = new MyNurbsBuilder();

        this.output(data.options)

        this.loadTextures(data.textures);
        
        this.loadMaterials(data.materials);

        this.loadCameras(data.cameras);

        let scene = this.recursiveLoadNode(data.getNode(data.rootId));
        
        scene.add(this.getSkyBox(data.skyboxes))

        this.app.scene.add(scene);

        for (var key in data.lods) {
            let lod = data.lods[key]
            this.output(lod, 1)
            if (lod.loaded === false) {
                console.error("" + new Array(2 * 4).join(' ') + " not loaded. Possibly refered as a node child but not defined in scene.")
            }
            for (let i=0; i< lod.children.length; i++) {
                let child = lod.children[i]
                console.log("" + new Array(2 * 4).join(' ') + " - " + child.type + " "  + child.node.id + ", min distance: " + child.mindist)
            }
        }
    }

    
    loadTextures(textures){
        console.log("textures:")
        for (var key in textures) {
            let texture = textures[key]
            let textureLoaded = new THREE.TextureLoader().load(texture.filepath)
            textureLoaded.wrapS = THREE.RepeatWrapping 
            textureLoaded.wrapT = THREE.RepeatWrapping 
            this.textures[texture.id] =  textureLoaded
            this.output(texture)
        }
    }

    loadMaterials(materials){
        console.log("materials:")
        for (var key in materials) {
            let material = materials[key]

            let loadedMaterial = new THREE.MeshPhongMaterial({color: material.color,
                emisive: material.emisive, specular: material.specular,
                shininess: material.shininess, side: material.twosided ? THREE.DoubleSide : THREE.FrontSide,
                flatShading: material.shading === 'flat', wireframe: material.wireframe});
   
           if (material.textureref != undefined) {
               let texture = this.textures[material.textureref].clone()
               loadedMaterial.map = texture
           }
            
            this.materials[material.id] = loadedMaterial;
            this.output(material)
        }
    }

    loadCameras(cameras){
        console.log("cameras:")
        for (var key in cameras) {
            let camera = cameras[key]
            this.output(camera, 1)
        }
    }

    loadNodes(nodes){
        console.log("nodes:")
        for (var key in nodes) {
            let node = nodes[key]
            this.output(node, 1)
            for (let i=0; i< node.children.length; i++) {
                let child = node.children[i]
                if (child.type === "primitive") {
                    console.log("" + new Array(2 * 4).join(' ') + " - " + child.type + " with "  + child.representations.length + " " + child.subtype + " representation(s)")
                    if (child.subtype === "nurbs") {
                        console.log("" + new Array(3 * 4).join(' ') + " - " + child.representations[0].controlpoints.length + " control points")
                    }
                }
                else {
                    this.output(child, 2)
                }
            }
        }
        for(var key in nodes){
            this.recursiveLoadNode(nodes[key]);
        }
    }

    recursiveLoadNode(node){
        if (node.materialIds != null && node.materialIds != undefined && node.materialIds.length > 0) {
            this.materialStack.push(node.materialIds[0]);
        }
        let group = this.instantiateNode(node);
        if(node.children != undefined){
            for (let i=0; i< node.children.length; i++) {
                let childNode = node.children[i];
                let childGroup = this.recursiveLoadNode(childNode);
                if(childGroup != null) {
                    group.add(childGroup)
                }
            }
        }
        if (node.materialIds != undefined && node.materialIds.length > 0)
          this.materialStack.pop()
        return group;
    }

    instantiateNode(node){
        let group = new THREE.Group();
        if(this.lightIds.includes(node.type))
            group = this.innitLight(node);
        else if(node.type === "primitive")
            group = this.getPrimitive(node);
        else if(node.type === "lodnoderef")
            group = this.instantiateNode(node.node);

        if(node.transformations != undefined)
            return this.applyTransforms(group, node.transformations);
        return group;
    }

    getPrimitive(node){
        let group = new THREE.Group();
        let mesh;
        let data = node.representations[0]
        const material = this.materials[this.materialStack[this.materialStack.length - 1]];
        if(node.subtype === "box"){
            const width = Math.abs(data.xyz2[0] - data.xyz1[0]);
            const height = Math.abs(data.xyz2[1] - data.xyz1[1]);
            const depth = Math.abs(data.xyz2[2] - data.xyz1[2]);
            mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth, data.parts_x, data.parts_y, data.parts_z),
                material);
            mesh.position.set(data.xyz1[0] + width/2, data.xyz1[1] + height/2, data.xyz1[2] + depth/2);
        } else if(node.subtype === "rectangle"){
            const width = Math.abs(data.xy2[0] - data.xy1[0]);
            const height = Math.abs(data.xy2[1] - data.xy1[1]);
            mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
                material);
            mesh.position.set(data.xy1[0] + width/2, data.xy1[1] + height/2, 0);
        } else if(node.subtype === "cylinder"){
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(data.top, data.base, data.height, 
                data.slices, data.stacks, data.capsclose, data.thetastart, data.thetalength),
                material);
        } else if (node.subtype === 'sphere') {
            mesh = new THREE.Mesh(
                new THREE.SphereGeometry(data.radius, data.slices, data.stacks, 
                    data.thetastart, data.thetalength, data.phistart, data.philength), 
                material);
        } else if (node.subtype === 'triangle') {
            // Igual a CG
            let triangleGeometry = new THREE.Geometry();
            triangleGeometry.vertices.push(new THREE.Vector3(data.xyz1[0], data.xyz1[1], data.xyz1[2]),
                new THREE.Vector3(data.xyz2[0], data.xyz2[1], data.xyz2[2]),
                new THREE.Vector3(data.xyz3[0], data.xyz3[1], data.xyz3[2]));
            triangleGeometry.faces.push(new THREE.Face3(0, 1, 2));
            triangleGeometry.computeFaceNormals();
            mesh = new THREE.Mesh(triangleGeometry, material);
        } else if (node.subtype === 'nurbs') {
            let normalizedControlPoints = [];
            for(let u = 0; u<=data.degree_u; u++){
                normalizedControlPoints.push([]);
                for(let v = 0; v<=data.degree_v; v++){
                    let point = data.controlpoints[u*(data.degree_v + 1) + v]
                    normalizedControlPoints[u].push([point.xx, point.yy, point.zz, 1]);
                }
            }
            let surfaceData = this.nurbsBuilder.build(normalizedControlPoints, 
                data.degree_u, data.degree_v, data.parts_u, data.parts_v, material)
            mesh = new THREE.Mesh(surfaceData, material);

        } else return group;
        group.add(mesh)
        return group;
    }

    applyTransforms(group, transforms){
        let translate = { x: 0, y: 0, z: 0 };
        let rotation = { x: 0, y: 0, z: 0 };
        let scale = { x: 1, y: 1, z: 1 };

        for (let transformation of transforms) {
            if (transformation.type === 'R') {
                rotation.x += transformation.rotation[0];
                rotation.y += transformation.rotation[1];
                rotation.z += transformation.rotation[2];
            }
            if (transformation.type === 'S') {
                scale.x *= transformation.scale[0];
                scale.y *= transformation.scale[1];
                scale.z *= transformation.scale[2];
            }
            if (transformation.type === 'T') {
                translate.x += transformation.translate[0];
                translate.y += transformation.translate[1];
                translate.z += transformation.translate[2];
            }
        }
        group.scale.set(scale.x, scale.y, scale.z);
        group.rotation.set(rotation.x * (Math.PI / 180), rotation.y * (Math.PI / 180), rotation.z * (Math.PI / 180));
        group.position.set(translate.x, translate.y, translate.z);
        return group;
    }

    getSkyBox(node) {
        let data = node[Object.keys(node)[0]];
        const geometry = new THREE.BoxGeometry(data.size[0], data.size[1], data.size[2], 1, 1, 1);
        const materials = [];
        const textureList = [data.front, data.back, data.up, data.down, data.right, data.left];
    
        for (let i = 0; i < textureList.length; i++) {
            let material = new THREE.MeshPhongMaterial({ emisive: data.emisive, emisiveIntensity: data.intensity });
            let texture = new THREE.TextureLoader().load(textureList[i]);
            material.map = texture;
            material.side = THREE.BackSide;
            materials.push(material);
        }
    
        let skybox = new THREE.Mesh(geometry, materials);
        skybox.position.set(data.center[0], data.center[1], data.center[2]);
        return skybox;
    }
    

    innitLight(node){
        const group = new THREE.Group();
        let light;
    
        if (node.type === 'pointlight') {
            light = new THREE.PointLight(new THREE.Color(node.color.r, node.color.g, node.color.b),
                node.intensity, node.distance, node.decay);
        } else if (node.type === 'spotlight') {
            light = new THREE.SpotLight(new THREE.Color(node.color.r, node.color.g, node.color.b), 
                node.intensity, node.distance, node.angle, node.penumbra, node.decay);
            light.target.position.set(node.target[0], node.target[1], node.target[2]);
        } else if (node.type === 'directionallight') {
            light = new THREE.DirectionalLight(new THREE.Color(node.color.r, node.color.g, node.color.b), 
                node.intensity);
            light.shadow.top = node.shadowtop;
            light.shadow.bottom = node.shadowbottom;
            light.shadow.left = node.shadowleft;
            light.shadow.right = node.shadowright;
        }
    
        light.position.set(node.position[0], node.position[1], node.position[2]);
        light.castShadow = node.castshadow;
        light.shadow.mapSize.width = node.shadowmapsize;
        light.shadow.mapSize.height = node.shadowmapsize;
        light.shadow.camera.far = node.shadowfar;
        light.visible = node.enabled;
        
        this.lights[node.id] = light
        group.add(light);
    
        return group;
    }

    

    update() {
        
    }

    buildSurfaceMesh(controlPoints, x, y, z, material, scale = 1){
        // declare local variables

        let surfaceData;

        let mesh;

        let orderU = controlPoints.length - 1

        let orderV = controlPoints[0].length - 1


        // build nurb

        surfaceData = this.builder.build(controlPoints,

                      orderU, orderV, this.samplesU,

                      this.samplesV, material)  

        mesh = new THREE.Mesh( surfaceData, material );

        mesh.rotation.x = 0

        mesh.rotation.y = 0

        mesh.rotation.z = 0

        mesh.scale.set( scale, scale, scale )

        mesh.position.set( x, y, z )

        this.meshes.push (mesh)

        return mesh;
    }

    
}
function printAttributes(obj, indent = 0) {
    const keys = Object.keys(obj);
    for (const key of keys) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            console.log(`${' '.repeat(indent)}${key}: `);
            printAttributes(obj[key], indent + 4);
        } else {
            console.log(`${' '.repeat(indent)}${key}: ${obj[key]}`);
        }
    }
}

export { MyContents };