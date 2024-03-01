import * as THREE from 'three';

import { MyAxis } from './MyAxis.js';

import { MyNurbsBuilder } from './MyNurbsBuilder.js';


class MyContents  {

    constructor(app) {

        this.app = app

        this.axis = null

        this.lightColor = "rgb(255,255,255)";
        this.lightIntensity = 100;
        this.lightDistance = 0;
        this.lightSpotAngle = 60;
        this.lightPenumbraRatio = 0;
        this.lightDecay = 2;
        this.lightPosX = 0;
        this.lightPosY = 20;
        this.lightTargetX = 0;
        this.lightTargetY = 0;

        // box related attributes
        this.boxMesh = null
        this.boxMeshSize = 1.0
        this.boxEnabled = true
        this.lastBoxEnabled = null
        this.boxDisplacement = new THREE.Vector3(0,1.5,0)

         // plane related attributes

            //texture

        this.tableTopTexture =
            new THREE.TextureLoader().load('textures/woodText.jpg');

        this.tableTopTexture.wrapS = THREE.RepeatWrapping;

        this.tableTopTexture.wrapT = THREE.RepeatWrapping;

        this.tableTopMaterial = new THREE.MeshLambertMaterial({map: this.tableTopTexture})


                // material

        this.diffuseLegsColor =  "#ffff77"

        this.specularLegsColor = "#ffff77"

        this.legsShininess = 30

        this.tableLegsMaterial = new THREE.MeshPhongMaterial({

                color: this.diffuseLegsColor,

                specular: this.specularLegsColor,

                emissive: "#000000", shininess: this.legsShininess})

        this.diffusePlaneColor = "#00ffff"
        this.planeMaterial = new THREE.MeshLambertMaterial({ color: this.diffusePlaneColor})

        this.diffuseVaseColor =  "#86644f"

        this.specularVaseColor = "#ffff77"

        this.vaseShininess = 30

        this.vaseMaterial = new THREE.MeshPhongMaterial({

                color: this.diffuseVaseColor,

                specular: this.specularVaseColor,

                side: THREE.DoubleSide,

                emissive: "#000000", shininess: this.vaseShininess})

        this.diffusePlaneColor = "#00ffff"
        this.planeMaterial = new THREE.MeshLambertMaterial({ color: this.diffusePlaneColor})


        const journalText =

            new THREE.TextureLoader().load( 'textures/journal.jpg' );

        journalText.wrapS = journalText.wrapT = THREE.RepeatWrapping;

        journalText.anisotropy = 16;

        journalText.colorSpace = THREE.SRGBColorSpace;

        this.journalMaterial = new THREE.MeshLambertMaterial( { map: journalText,

                        side: THREE.DoubleSide} );


        this.builder = new MyNurbsBuilder()
        
        this.meshes = []


        this.samplesU = 24         // maximum defined in MyGuiInterface

        this.samplesV = 24         // maximum defined in MyGuiInterface


        this.init()
    }

    /**
     * initializes the contents
     */
    init() {
        const ambientLight = new THREE.AmbientLight( 0x555555 );
        this.app.scene.add( ambientLight );
        
        this.updateLight(this.lightColor)
        // create once

        if (this.axis === null) {

            // create and attach the axis to the scene

            this.axis = new MyAxis(this)

            this.app.scene.add(this.axis)

        }


        // variables to hold the curves

        this.polyline = null

        // number of samples to use for the curves (not for polyline)

        this.numberOfSamples = 50


        // hull material and geometry

        this.hullMaterial =

            new THREE.MeshBasicMaterial( {color: 0xffffff,

                    opacity: 1, transparent: true} );

        this.quadraticBezierCurve = null;
        this.cubicBezierCurve = null;
        this.catmullRomCurve = null;
        this.painting = new THREE.Mesh();
        this.flower = new THREE.Mesh()
        this.vase = new THREE.Mesh()

        this.buildRoom();
        this.buildSolids();

        // curve recomputation

        this.buildCurves();


        this.createNurbsSurfaces()

    }



    /**

     * updates the contents

     * this method is called from the render method of the app

     *

     */

    update() {    
        this.updateLight(this.lightColor, this.spotAngle)

    }

    updateLight(color){
        if(this.spotLight !== undefined || this.spotLight !== null){
            this.app.scene.remove(this.spotLight);
            this.app.scene.remove(this.spotLightHelper);
        }
        // add a point light on top of the model
        let angle = this.lightSpotAngle*Math.PI/180
        const spotLight = new THREE.SpotLight( color, this.lightIntensity, this.lightDistance, angle, this.lightPenumbraRatio, this.lightDecay );
        spotLight.position.set( this.lightPosX, this.lightPosY, 0 );
        spotLight.target.position.set(this.lightTargetX, this.lightTargetY, 0);
        this.spotLight = spotLight;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 512;
        spotLight.shadow.mapSize.height = 512;
        spotLight.shadow.camera.near = 0.5;
        spotLight.shadow.camera.far = 500;
        spotLight.shadow.camera.fov = 30;
        this.app.scene.add( spotLight );

        // add a point light helper for the previous point light
        const sphereSize = 0.5;
        const spotLightHelper = new THREE.SpotLightHelper( spotLight, sphereSize );
        this.spotLightHelper = spotLightHelper;
        this.app.scene.add( spotLightHelper );

        this.lightColor = color;


    }

    /**
     * builds the box mesh with material assigned
     */
    buildBox() {    
        let boxMaterial = new THREE.MeshPhongMaterial({ color: "#ffff77", 
        specular: "#000000", emissive: "#000000", shininess: 90 })
        // Create a Cube Mesh with basic material
        let box = new THREE.BoxGeometry(  this.boxMeshSize,  this.boxMeshSize,  this.boxMeshSize );
        this.boxMesh = new THREE.Mesh( box, boxMaterial );
        this.boxMesh.rotation.x = -Math.PI / 2;
        this.boxMesh.position.y = this.boxDisplacement.y;
        this.boxMesh.scale.z = 0.1;
        this.boxMesh.scale.y = 3;
        this.boxMesh.scale.x = 2;
    }


        
    

    buildTable(x, y, z) {
        
        const tableTopMaterial = this.tableTopMaterial;
    
        // Create a Cube Mesh for the table top
        const tableTopGeometry = new THREE.BoxGeometry(x, y, z);
        const tableTopMesh = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
        tableTopMesh.rotation.x = -Math.PI / 2;
        tableTopMesh.position.y = this.boxDisplacement.y;

        tableTopMesh.castShadow = true;
        tableTopMesh.receiveShadow = true;
    
        this.app.scene.add(tableTopMesh);
    
        // Create the table legs
        const legMaterial = this.tableLegsMaterial;
    
        const legPositions = [
            { x: x/2.5, y: y/3, z: -z * 8 },
            { x: -x/2.5, y: y/3, z: -z * 8 },
            { x: x/2.5, y: -y/3, z: -z * 8 },
            { x: -x/2.5, y: -y/3, z: -z * 8 },
        ];
    
        for (const position of legPositions) {
            const legGeometry = new THREE.CylinderGeometry(0.09, 0.09, y/2, 60, 3);
            const legMesh = new THREE.Mesh(legGeometry, legMaterial);
            legMesh.position.set(position.x, position.y, position.z);
            legMesh.rotation.set(Math.PI/2,0,0)
            legMesh.castShadow = true;
            legMesh.receiveShadow = true;
            tableTopMesh.add(legMesh);
        }
    }
    
    
    

    buildPlate() {    
        let plateMaterial = new THREE.MeshPhongMaterial({ color: "#ffffff", 
        specular: "#000000", emissive: "#000000", shininess: 90 })

        this.plateY = 1.575;
        this.plateRadius = 0.6;
        this.plateHeight = 0.05;

        // Create a Cilinder Mesh with white materialp
        let plate = new THREE.CylinderGeometry(this.plateRadius, this.plateRadius, this.plateHeight);
        this.plateMesh = new THREE.Mesh( plate, plateMaterial );
        this.plateMesh.position.y = this.plateY;

        this.plateMesh.castShadow = true; 
        this.plateMesh.receiveShadow = true;

        this.app.scene.add( this.plateMesh );
    }

    /**
     * builds the cake
     */
    buildCake() {    

        // Add a spotlight to focus on the cake
        const spotLight = new THREE.SpotLight(0xffffff, 1);
        spotLight.position.set(0, 2.75, 0); 
        spotLight.angle = Math.PI / 4; 
        spotLight.distance = 10;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        spotLight.shadow.camera.near = 0.5;
        spotLight.shadow.camera.far = 500;
        spotLight.shadow.camera.fov = 30;
        this.app.scene.add(spotLight);

        let cakeMaterial = new THREE.MeshPhongMaterial({ color: "#ffc0cb", 
        specular: "#000000", emissive: "#000000", shininess: 90 })

        this.cakeY = this.plateY + this.plateHeight*3.5;
        this.cakeRadius = 0.5;
        this.cakeHeight = 0.3

        // Create a Cilinder Mesh with pink material
        let cake = new THREE.CylinderGeometry(this.cakeRadius, this.cakeRadius, this.cakeHeight,20,3,false,0,Math.PI*2*(9/10));
        this.cakeMesh = new THREE.Mesh( cake, cakeMaterial );
        this.cakeMesh.position.y = this.cakeY;

        this.cakeMesh.castShadow = true; 
        this.cakeMesh.receiveShadow = true;

        // Create a Planes Mesh with pink material to close off cake
        let innerCakePlane = new THREE.PlaneGeometry( this.cakeRadius, this.cakeHeight );
        this.innerCakePlaneMesh1 = new THREE.Mesh( innerCakePlane, cakeMaterial );
        this.innerCakePlaneMesh1.rotation.y = -Math.PI / 2;
        this.innerCakePlaneMesh1.position.z = this.cakeRadius/2;
        this.cakeMesh.add( this.innerCakePlaneMesh1 );
        this.innerCakePlaneMesh2 = new THREE.Mesh( innerCakePlane, cakeMaterial );
        let angle = Math.PI*(3/10);
        this.innerCakePlaneMesh2.position.x = -Math.cos(angle)*(this.cakeRadius/2);
        this.innerCakePlaneMesh2.position.z = Math.sin(angle)*(this.cakeRadius/2);
        this.innerCakePlaneMesh2.rotateY(angle);
        this.cakeMesh.add( this.innerCakePlaneMesh2 );
        
        this.app.scene.add( this.cakeMesh );
    }

    buildCandle() {
        // base mesh for candle
        let candleMaterial = new THREE.MeshPhongMaterial({ color: "#F5F5DC", 
        specular: "#000000", emissive: "#000000", shininess: 90 })

        let candleRadius = 0.02;
        let candleHeight = 0.2;
        let candleY = this.cakeHeight/2 + this.cakeY + candleHeight/2;
        let candle = new THREE.CylinderGeometry(candleRadius, candleRadius, candleHeight,20,3,false,0,Math.PI*4);
        this.candleMesh = new THREE.Mesh( candle, candleMaterial );
        this.candleMesh.position.y = candleY;
            
        this.candleMesh.castShadow = true; 
        this.candleMesh.receiveShadow = true;
        this.app.scene.add(this.candleMesh);

        // fire
        let fireMaterial = new THREE.MeshPhongMaterial({ color: "#F50000", 
        specular: "#000000", emissive: "#000000", shininess: 90 });
        let fireBottom = new THREE.SphereGeometry(candleRadius, 20, 20,0, Math.PI);
        this.fireBottomMesh = new THREE.Mesh( fireBottom, fireMaterial );
        this.fireBottomMesh.position.y = candleY + candleHeight/2 + candleRadius;
        this.fireBottomMesh.rotation.x = Math.PI/2;
        this.app.scene.add(this.fireBottomMesh);

        let fireTop = new THREE.ConeGeometry(candleRadius, candleRadius*1.5)
        this.fireTopMesh = new THREE.Mesh( fireTop, fireMaterial );
        this.fireTopMesh.position.y = candleY + candleHeight/2 + candleRadius*1.75;
        this.app.scene.add(this.fireTopMesh);
    }


    buildRoom(){
        // Create floor
        
        let plane = new THREE.PlaneGeometry( 10, 10 );
        this.planeMesh = new THREE.Mesh( plane, this.planeMaterial );
        this.planeMesh.rotation.x = -Math.PI / 2;
        this.planeMesh.position.y = -0;
        this.planeMesh.receiveShadow = true;
        
        this.app.scene.add( this.planeMesh );

        // Create walls
        
        let wallPlane = new THREE.PlaneGeometry( 10, 5 );
        this.wallPlaneMesh1 = new THREE.Mesh( wallPlane, this.planeMaterial );
        this.wallPlaneMesh1.position.y = 2.5;
        this.wallPlaneMesh1.position.z = -5;
        this.wallPlaneMesh1.receiveShadow = true;
        this.app.scene.add( this.wallPlaneMesh1 );
        
        this.wallPlaneMesh2 = new THREE.Mesh( wallPlane, this.planeMaterial );
        this.wallPlaneMesh2.rotation.x = Math.PI;
        this.wallPlaneMesh2.position.z = 5;
        this.wallPlaneMesh2.position.y = 2.5;
        this.wallPlaneMesh2.receiveShadow = true;
        this.app.scene.add( this.wallPlaneMesh2 );

        this.wallPlaneMesh3 = new THREE.Mesh( wallPlane, this.planeMaterial );
        this.wallPlaneMesh3.rotation.y = -Math.PI/2;
        this.wallPlaneMesh3.position.x = 5;
        this.wallPlaneMesh3.position.y = 2.5;
        this.wallPlaneMesh3.receiveShadow = true;
        this.app.scene.add( this.wallPlaneMesh3 );

        this.wallPlaneMesh4 = new THREE.Mesh( wallPlane, this.planeMaterial );
        this.wallPlaneMesh4.rotation.y = Math.PI/2;
        this.wallPlaneMesh4.position.x = -5;
        this.wallPlaneMesh4.position.y = 2.5;
        this.wallPlaneMesh4.receiveShadow = true;
        this.app.scene.add( this.wallPlaneMesh4 );

        // Create wall decor
        
        let adamTexture =
            new THREE.TextureLoader().load('textures/fotoAdam.jpeg');

        adamTexture.wrapS = THREE.RepeatWrapping;

        adamTexture.wrapT = THREE.RepeatWrapping;

        let adamMaterial = new THREE.MeshPhongMaterial({map: adamTexture, shininess: 30, specular: 0xffffff});

        let quadro = new THREE.PlaneGeometry( 1.5, 2 );
        this.quadroMeshAdam = new THREE.Mesh( quadro,  adamMaterial);
        this.quadroMeshAdam.rotation.y = -Math.PI / 2;
        this.quadroMeshAdam.position.y = 3;
        this.quadroMeshAdam.position.x = 4.9;
        this.quadroMeshAdam.position.z = 2;
        this.app.scene.add( this.quadroMeshAdam );

        let eduTexture =
            new THREE.TextureLoader().load('textures/fotoEdu.jpg');

        eduTexture.wrapS = THREE.RepeatWrapping;

        eduTexture.wrapT = THREE.RepeatWrapping;

        let eduMaterial = new THREE.MeshPhongMaterial({map: eduTexture, shininess: 30, specular: 0xffffff});

        this.quadroMeshEdu = new THREE.Mesh( quadro,  eduMaterial);
        this.quadroMeshEdu.rotation.y = -Math.PI / 2;
        this.quadroMeshEdu.position.y = 3;
        this.quadroMeshEdu.position.x = 4.9;
        this.quadroMeshEdu.position.z = -2;
        this.app.scene.add( this.quadroMeshEdu );

        let windowTexture = new THREE.TextureLoader().load('textures/window.jpg');
        windowTexture.wrapS = THREE.RepeatWrapping;
        windowTexture.wrapT = THREE.RepeatWrapping;

        // Create a material
        let windowMaterial = new THREE.MeshPhongMaterial({
            map: windowTexture,
            shininess: 100
        });

        let window = new THREE.PlaneGeometry( 4, 2 );
        let quadroMeshWindow = new THREE.Mesh(window, windowMaterial);
        quadroMeshWindow.rotation.y = Math.PI / 2;
        quadroMeshWindow.position.y = 3;
        quadroMeshWindow.position.x = -4.9;
        this.app.scene.add(quadroMeshWindow);


    }

    buildSolids(){
        this.buildPlate()
        this.buildCake()
        this.buildCandle()
        this.buildTable(2,3,0.1)
    }



    // Deletes the contents of the line if it exists and recreates them

    buildCurves() {

        if (this.polyline !== null) this.app.scene.remove(this.polyline)

        if (this.quadraticBezierCurve !== null)

            this.app.scene.remove(this.quadraticBezierCurve)

        if (this.cubicBezierCurve !== null)

            this.app.scene.remove(this.cubicBezierCurve)

        if (this.catmullRomCurve !== null)

            this.app.scene.remove(this.catmullRomCurve)

        this.buildPainting();
        this.buildMola();
        this.buildFlower();
    }

    buildPainting(){
        this.painting.add(this.initCatmullRomCircle([5, 0, 0], 16, 3, Math.PI))
        this.painting.add(this.initCatmullRomCircle([-5, 0, 0], 16, 3, Math.PI))
        this.painting.add(this.initCatmullRomCircle([0, 0, 0], 24, 8, Math.PI, Math.PI/2))
        this.painting.add(this.initCatmullRomCircle([0, 4, 0], 16, 4, Math.PI/2))
        this.painting.add(this.initCatmullRomCircle([4, 0, 0], 16, 4, Math.PI/2))
        let framePoints = [    
            new THREE.Vector3( -11, -3, 0.0 ),    
            new THREE.Vector3(  -11, 12, 0.0 ),    
            new THREE.Vector3(  11, 12, 0.0 ),
            new THREE.Vector3(  11, -3, 0.0 ),
            new THREE.Vector3( -11, -3, 0.0 )
        ]
        this.painting.add(this.initPolyline(framePoints))
        this.painting.scale.x = 0.1;
        this.painting.scale.y = 0.1;

        this.painting.translateZ(-4.99);

        this.painting.translateY(2.5);

        this.app.scene.add( this.painting );
    }

    buildMola(){
        this.mola = new THREE.Mesh();
        let upCircle = this.initCatmullRomCircle([0, 3, 0]);
        let downCircle = this.initCatmullRomCircle();
        upCircle.rotateX(Math.PI/2);
        downCircle.rotateX(Math.PI/2);
        this.mola.add(upCircle);
        this.mola.add(downCircle);

        let points = []

        for(let i = 0; i < 3; i+= 0.01){
            points.push(new THREE.Vector3(Math.cos(Math.PI*4*i),Math.sin(Math.PI*4*i),i));
        }
        
        let spiral = this.initCatmullRomCurve(points, [0,0,0], 128);
        spiral.rotateX(-Math.PI/2);
        this.mola.add(spiral);

        this.mola.scale.x = 0.1;
        this.mola.scale.y = 0.1;
        this.mola.scale.z = 0.1;

        this.mola.translateY(1.551);
        this.mola.translateX(0.6);
        this.mola.translateZ(0.9);
        this.app.scene.add(this.mola);
    }

    buildFlower(){
        this.flower.add(this.initCatmullRomCircle([0, 0, 0], 24, 0.4))
        let petal1 = this.initPolyline([new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0.5, 0), 
            new THREE.Vector3(2.5, 2.5, 0), new THREE.Vector3(0.5, 2, 0), new THREE.Vector3(0, 0, 0)])
        let petal2 = this.initPolyline([new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0.5, 0), 
            new THREE.Vector3(2.5, 2.5, 0), new THREE.Vector3(0.5, 2, 0), new THREE.Vector3(0, 0, 0)])
        petal2.rotateZ(Math.PI/2)
        let petal3 = this.initPolyline([new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0.5, 0), 
            new THREE.Vector3(2.5, 2.5, 0), new THREE.Vector3(0.5, 2, 0), new THREE.Vector3(0, 0, 0)])
        petal3.rotateZ(Math.PI)
        let petal4 = this.initPolyline([new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0.5, 0), 
            new THREE.Vector3(2.5, 2.5, 0), new THREE.Vector3(0.5, 2, 0), new THREE.Vector3(0, 0, 0)])
        petal4.rotateZ(-Math.PI/2)
        this.flower.add(petal1)
        this.flower.add(petal2)
        this.flower.add(petal3)
        this.flower.add(petal4)

        let stalk = this.initCatmullRomCurve([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1, -2, 0), 
            new THREE.Vector3(0, -4, 0), new THREE.Vector3(0.5, -6, 0), new THREE.Vector3(0, -8, 0), new THREE.Vector3(0, -15, 0)]);

        this.flower.add(stalk)

        this.flower.scale.set(0.1,0.1,0.1)

        this.flower.position.set(4, 1.5, 4)
        
        this.app.scene.add(this.flower)
    }

    createNurbsSurfaces() {  


        // are there any meshes to remove?

        if (this.meshes !== null) {

            // traverse mesh array

            for (let i=0; i<this.meshes.length; i++) {

                // remove all meshes from the scene

                this.app.scene.remove(this.meshes[i])

            }

            this.meshes = [] // empty the array  

        }

        this.buildJournal()
        this.buildVase()



    }

    buildJournal(){
        let controlPoints;

        controlPoints =

            [   // U = 0

                [ // V = 0..1;

                    [ -1.5, -10, 0.0, 1 ],

                    [ -1.5,  10, 0.0, 1 ]

                ],
            
                // U = 1

                [ // V = 0..1

                    [ 0, -10, 3.0, 1 ],

                    [ 0,  10, 3.0, 1 ]

                ],

                // U = 2

                    [ // V = 0..1

                        [ 1.5, -10, 0.0, 1 ],

                        [ 1.5,  10, 0.0, 1 ]
                ]
            ]

        let journalMesh = this.buildSurfaceMesh(controlPoints, 0.8, 0.47, -0.75, this.journalMaterial, 0.05)

        journalMesh.rotateX(-Math.PI/8);
        journalMesh.castShadow = true;

        this.app.scene.add(journalMesh)

    }

    buildVase(){
        let controlPoints;

        controlPoints =

        [   // U = 0
            [ // V = 0..2;
            
                    [ -1.0, -2.0, 0.0, 1 ],
            
                    [  0, -2.0, 0.0, 1 ],
            
                    [ 1.0, -2.0, 0, 1 ]
            
                ],

                [ // V = 0..2;
            
                    [ -1.0, -2.0, 0.0, 1 ],
            
                    [  0, -2.0, 2, 1 ],
            
                    [ 1.0, -2.0, 0, 1 ]
            
                ],
            
            // U = 1
            
                [ // V = 0..2
            
                    [  -2.0, -1.0, 0.0, 1 ],
            
                    [ 0, -1.0, 4.0, 1  ],
            
                    [ 2.0, -1.0, 0.0, 1 ]
            
                ],
            
            // U = 2
            
                [ // V = 0..2
            
                [ -1.0, 1.0, 0.0, 1 ],
            
                [ 0, 1.0, 2.0, 1  ],
        
                [ 1.0, 1.0, 0.0, 1 ]
            
                ],
            
            // U = 3
            
                [ // V = 0..2
            
                    [ -1.0, 2.0, 0.0, 1 ],
            
                    [ 0, 2.0, 2.0, 1  ],
            
                    [ 1.0, 2.0, 0.0, 1 ]
            
                ]    
        ]

        let vaseMesh1 = this.buildSurfaceMesh(controlPoints, 4, 0.4, 4, this.vaseMaterial, 0.2)
        let vaseMesh2 = this.buildSurfaceMesh(controlPoints, 4, 0.4, 4, this.vaseMaterial, 0.2)
        vaseMesh2.rotateY(Math.PI)
        vaseMesh1.castShadow = true;
        vaseMesh1.receiveShadow = true;
        vaseMesh2.castShadow = true;
        vaseMesh2.receiveShadow = true;
        this.vase.add(vaseMesh1)
        this.vase.add(vaseMesh2)
        this.app.scene.add(this.vase)
    }
    

    drawHull(position, points) {

       

        const geometry = new THREE.BufferGeometry().setFromPoints( points );

        let line = new THREE.Line( geometry, this.hullMaterial );

        // set initial position

        line.position.set(position.x,position.y,position.z);

        this.app.scene.add( line );

    }

    


    initPolyline(points, position = [0,0,0]) {


        // define geometry

        const geometry = new THREE.BufferGeometry().setFromPoints( points );


        // create the line from material and geometry

        this.polyline = new THREE.Line( geometry,

            new THREE.LineBasicMaterial( { color: 0xff0000 } ) );


        // set initial position

        this.polyline.position.set(position[0],position[1],position[2])


        // add the line to the scene

        return this.polyline;

    }

    initQuadraticBezierCurve() {


        let points = [
    
            new THREE.Vector3( -0.6, -0.6, 0.0 ), // starting point
    
            new THREE.Vector3(    0,  0.6, 0.0 ), // control point
    
            new THREE.Vector3(  0.6, -0.6, 0.0 )  // ending point
    
        ]
    
    
            let position = new THREE.Vector3 (-2,4,0)
    
            this.drawHull(position, points);
    
    
    
    
        let curve =
    
            new THREE.QuadraticBezierCurve3( points[0], points[1], points[2])
    
        // sample a number of points on the curve
    
        let sampledPoints = curve.getPoints( this.numberOfSamples );
    
    
        this.curveGeometry =
    
                new THREE.BufferGeometry().setFromPoints( sampledPoints )
    
        this.lineMaterial = new THREE.LineBasicMaterial( { color: 0x00ff00 } )
    
        this.lineObj = new THREE.Line( this.curveGeometry, this.lineMaterial )
    
        this.lineObj.position.set(position.x,position.y,position.z)
    
        this.app.scene.add( this.lineObj );

    
    
    }


    initCubicBezierCurve() {

        let points = [
    
            new THREE.Vector3( -0.6, -0.6, 0.0 ), // starting point
    
            new THREE.Vector3( -0.6,  0.6,  1 ), // control point1
    
            new THREE.Vector3(  0.6, -0.6, 1 ), // control point2
    
            new THREE.Vector3(  0.6, 0.6, 0.0 )  // ending point
    
        ]
    
    
            let position = new THREE.Vector3  (-4,0,0)
    
            this.drawHull(position, points);
    
    
    
    
        let curve =
    
            new THREE.CubicBezierCurve3( points[0], points[1], points[2], points[3])
    
        // sample a number of points on the curve
    
        let sampledPoints = curve.getPoints( this.numberOfSamples );
    
    
        this.curveGeometry =
    
                new THREE.BufferGeometry().setFromPoints( sampledPoints )
    
        this.lineMaterial = new THREE.LineBasicMaterial( { color: 0x00ff00 } )
    
        this.lineObj = new THREE.Line( this.curveGeometry, this.lineMaterial )
    
        this.lineObj.position.set(position.x,position.y,position.z)
    
        this.app.scene.add( this.lineObj );

    
    
    }

    initCatmullRomCurve(points, position = [0,0,0], nSample = this.numberOfSamples) {
    
        let curve =
    
            new THREE.CatmullRomCurve3( points)
    
        // sample a number of points on the curve
    
        let sampledPoints = curve.getPoints( nSample );
    
    
        this.curveGeometry =
    
                new THREE.BufferGeometry().setFromPoints( sampledPoints )
    
        this.lineMaterial = new THREE.LineBasicMaterial( { color: 0x00ff00 } )
    
        this.lineObj = new THREE.Line( this.curveGeometry, this.lineMaterial )
    
        this.lineObj.position.set(position[0],position[1],position[2])
    
        return this.lineObj;
    }

    initCatmullRomCircle(pos = [0, 0, 0], samples = 20, radius = 1, endAngle = Math.PI*2, startAngle = 0) {

        let points = []

        let angle = startAngle;
        while(angle < endAngle){
            points.push(new THREE.Vector3(radius*Math.cos(angle),radius*Math.sin(angle),0));
            angle += (endAngle - startAngle)/samples;
        }

        if(angle != endAngle){
            points.push(new THREE.Vector3(radius*Math.cos(endAngle),radius*Math.sin(endAngle),0));
        }

        if(endAngle == Math.PI*2){
            points.push(new THREE.Vector3(radius,0,0));
        }
    
        let curve =
    
            new THREE.CatmullRomCurve3( points)
    
        // sample a number of points on the curve
    
        let sampledPoints = curve.getPoints( this.numberOfSamples );
    
    
        this.curveGeometry =
    
                new THREE.BufferGeometry().setFromPoints( sampledPoints )
    
        this.lineMaterial = new THREE.LineBasicMaterial( { color: 0x00ff00 } )
    
        this.lineObj = new THREE.Line( this.curveGeometry, this.lineMaterial )
    
        this.lineObj.position.set(pos[0], pos[1], pos[2])
    
        return this.lineObj;
    }

    buildSurfaceMesh(controlPoints, x, y, z, material, scale = 1){
        // declare local variables

        let surfaceData;

        let mesh;

        let orderU = controlPoints.length - 1

        let orderV = controlPoints[0].length - 1


        // build nurb #1

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


export { MyContents };