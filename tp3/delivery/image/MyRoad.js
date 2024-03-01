import * as THREE from 'three';

class MyRoad{
    constructor(scene, path, isSegment = false){
        this.scene = scene
        //Curve related attributes
        this.curveSegments = 200;
        this.curveWidth = 7;
        this.curveTextureRepeat = 1;
        this.curveShowWireframe = false;
        this.curveShowMesh = true;
        this.curveShowLine = true;
        this.closedCurve = !isSegment;
        this.isSegment = isSegment
    
        this.path = path;
    }
    buildRoad(){
        this.createCurveMaterialsTextures()
        this.createCurveObjects()
    }
    createCurveMaterialsTextures() {
        const texture = new THREE.TextureLoader().load("./image/roadTexture.jpg");
        texture.wrapS = THREE.RepeatWrapping;
  
        this.curveMaterial = new THREE.MeshBasicMaterial({ map: texture });
        this.curveMaterial.map.repeat.set(3 - 2.5*this.isSegment, 3);
        this.curveMaterial.map.wrapS = THREE.RepeatWrapping;
        this.curveMaterial.map.wrapT = THREE.RepeatWrapping;
  
        this.wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x0000ff,
            opacity: 0.3,
            wireframe: true,
            transparent: true,
        });
  
        this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    }
  
    /**
     * Creates the mesh, the line and the wireframe used to visualize the curve
     */
    createCurveObjects() {
        let path = this.path;
        let geometry = new THREE.TubeGeometry(
            path,
            this.curveSegments,
            this.curveWidth,
            3,
            this.closedCurve
        );
        this.curveMesh = new THREE.Mesh(geometry, this.curveMaterial);
        this.wireframe = new THREE.Mesh(geometry, this.wireframeMaterial);
    
        let points = path.getPoints(100);
        let bGeometry = new THREE.BufferGeometry().setFromPoints(points);
    
        // Create the final object to add to the scene
        this.line = new THREE.Line(bGeometry, this.lineMaterial);
    
        this.curve = new THREE.Group();
    
        this.curveMesh.visible = this.curveShowMesh;
        this.wireframe.visible = this.curveShowWireframe;
        this.line.visible = this.curveShowLine;
    
        this.curve.add(this.curveMesh);
        this.curve.add(this.wireframe);
        this.curve.add(this.line);
    
        this.curve.rotateZ(Math.PI);
        this.curve.rotateY(Math.PI/2);
        this.curve.scale.set(1,0.2,1);
        this.scene.add(this.curve);
    }
}


export { MyRoad };