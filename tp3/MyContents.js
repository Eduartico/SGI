import * as THREE from "three";
import { MyAxis } from "./MyAxis.js";
import { MyRoad } from "./MyRoad.js";
import { MyFileReader } from "./parser/MyFileReader.js";
import { MyNurbsBuilder } from "./MyNurbsBuilder.js";
import { OBJLoader } from "https://threejs.org/examples/jsm/loaders/OBJLoader.js";

/**
 *  This class contains the contents of out application
 */
class MyContents {
  /**
       constructs the object
       @param {MyApp} app The application object
    */
  constructor(app) {
    this.app = app;
    this.axis = null;
    this.data = null;

    this.enemyYCorrection = 226;
    this.playerYCorrection = 226;
    this.enemyPath = null;
    this.eLapTimer = null;
    this.immune = false;
    this.boosted = false;
    this.coneBaseObject = new THREE.Group();
    this.barrierBaseObject = new THREE.Group();

    this.lightIds = ["spotlight", "pointlight", "directionallight"];

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
      this.axis = new MyAxis(this);
      this.app.scene.add(this.axis);
      this.speed = 0;
      this.moveFront = false;
      this.maxspeed = 35;
      this.pressedKeys = new Set();
    }
  }

  initControls() {}
  /**
   * Called when the scene xml file load is complete
   * @param {MySceneData} data the entire scene data object
   */
  onSceneLoaded(data) {
    this.data = data;
  }

  actuallyLoadContents(){
    this.onAfterSceneLoadedAndBeforeRender(this.data);
    this.loadObjFiles();
    this.loadRoad();
    document.addEventListener("keydown", (event) => this.onKeyDown(event));
    document.addEventListener("keyup", (event) => this.onKeyUp(event));
    this.loadPickingArea();
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
    this.username = data.username;
    this.difficulty = data.difficulty;

    this.loadTextures(data.textures);

    this.loadMaterials(data.materials);

    this.loadCameras(data.cameras);

    let scene = this.recursiveLoadNode(data.getNode(data.rootId));

    scene.add(this.getSkyBox(data.skyboxes));

    this.app.scene.add(scene);

    for (var key in data.lods) {
      let lod = data.lods[key];
      if (lod.loaded === false) {
        console.error(
          "" +
            new Array(2 * 4).join(" ") +
            " not loaded. Possibly refered as a node child but not defined in scene."
        );
      }
      for (let i = 0; i < lod.children.length; i++) {
        let child = lod.children[i];
        //console.log(
          "" +
            new Array(2 * 4).join(" ") +
            " - " +
            child.type +
            " " +
            child.node.id +
            ", min distance: " +
            child.mindist
        //);
      }
    }
  }

  loadPickingArea(){
    let pickingStand = new THREE.Group();
    let pickingStandGeometry = new THREE.BoxGeometry(9, 3, 9);
    let pickingStandMaterial = new THREE.MeshPhongMaterial({ color: 0xD2B48C });
    let beigeBox = new THREE.Mesh(pickingStandGeometry, pickingStandMaterial);
    pickingStand.name = "pickingStand"
    pickingStand.add(beigeBox);

    let boundingBox = new THREE.Box3();
    boundingBox.setFromObject(beigeBox);
    const boxMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00, transparent: true, opacity: 0.2 });
    const boxGeometry = new THREE.BoxGeometry();
    let hitBox = new THREE.Mesh(boxGeometry, boxMaterial);
    hitBox.scale.copy(boundingBox.getSize(new THREE.Vector3()));
    hitBox.position.copy(boundingBox.getCenter(new THREE.Vector3()));
    hitBox.name = "boundingBox"
    pickingStand.add(hitBox)

    pickingStand.position.set(-12.5, -37, 12.5);
    this.app.scene.add(pickingStand);

    this.pickableObstacles = []
    this.app.scene.add(this.coneBaseObject)
    this.app.scene.add(this.barrierBaseObject)

  }

  loadTextures(textures) {
    //console.log("textures:");
    for (var key in textures) {
      let texture = textures[key];
      let textureLoaded = new THREE.TextureLoader().load(texture.filepath);
      textureLoaded.wrapS = THREE.RepeatWrapping;
      textureLoaded.wrapT = THREE.RepeatWrapping;
      this.textures[texture.id] = textureLoaded;
    }
  }

  loadMaterials(materials) {
    //console.log("materials:");
    for (var key in materials) {
      let material = materials[key];

      let loadedMaterial = new THREE.MeshPhongMaterial({
        color: material.color,
        emisive: material.emisive,
        specular: material.specular,
        shininess: material.shininess,
        side: material.twosided ? THREE.DoubleSide : THREE.FrontSide,
        flatShading: material.shading === "flat",
        wireframe: material.wireframe,
      });

      if (material.textureref != undefined) {
        let texture = this.textures[material.textureref].clone();
        loadedMaterial.map = texture;
      }

      this.materials[material.id] = loadedMaterial;
    }
  }

  loadCameras(cameras) {
    //console.log("cameras:");
    for (var key in cameras) {
      let camera = cameras[key];
    }
  }

  loadNodes(nodes) {
    //console.log("nodes:");
    for (var key in nodes) {
      let node = nodes[key];
      for (let i = 0; i < node.children.length; i++) {
        let child = node.children[i];
        if (child.type === "primitive") {
          //console.log(
            "" +
              new Array(2 * 4).join(" ") +
              " - " +
              child.type +
              " with " +
              child.representations.length +
              " " +
              child.subtype +
              " representation(s)"
          //);
          if (child.subtype === "nurbs") {
            //console.log(
              "" +
                new Array(3 * 4).join(" ") +
                " - " +
                child.representations[0].controlpoints.length +
                " control points"
            //);
          }
        }
      }
    }
    for (var key in nodes) {
      this.recursiveLoadNode(nodes[key]);
    }
  }

  recursiveLoadNode(node) {
    if (
      node.materialIds != null &&
      node.materialIds != undefined &&
      node.materialIds.length > 0
    ) {
      this.materialStack.push(node.materialIds[0]);
    }
    let group = this.instantiateNode(node);
    if (node.children != undefined) {
      for (let i = 0; i < node.children.length; i++) {
        let childNode = node.children[i];
        let childGroup = this.recursiveLoadNode(childNode);
        if (childGroup != null) {
          group.add(childGroup);
        }
      }
    }
    if (node.materialIds != undefined && node.materialIds.length > 0)
      this.materialStack.pop();
    return group;
  }

  instantiateNode(node) {
    let group = new THREE.Group();
    if (this.lightIds.includes(node.type)) group = this.innitLight(node);
    else if (node.type === "primitive") group = this.getPrimitive(node);
    else if (node.type === "lodnoderef")
      group = this.instantiateNode(node.node);

    if (node.transformations != undefined)
      return this.applyTransforms(group, node.transformations);
    return group;
  }

  getPrimitive(node) {
    let group = new THREE.Group();
    return group;
    let mesh;
    let data = node.representations[0];
    const material =
      this.materials[this.materialStack[this.materialStack.length - 1]];
    if (node.subtype === "box") {
      const width = Math.abs(data.xyz2[0] - data.xyz1[0]);
      const height = Math.abs(data.xyz2[1] - data.xyz1[1]);
      const depth = Math.abs(data.xyz2[2] - data.xyz1[2]);
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          width,
          height,
          depth,
          data.parts_x,
          data.parts_y,
          data.parts_z
        ),
        material
      );
      mesh.position.set(
        data.xyz1[0] + width / 2,
        data.xyz1[1] + height / 2,
        data.xyz1[2] + depth / 2
      );
    } else if (node.subtype === "rectangle") {
      const width = Math.abs(data.xy2[0] - data.xy1[0]);
      const height = Math.abs(data.xy2[1] - data.xy1[1]);
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      mesh.position.set(data.xy1[0] + width / 2, data.xy1[1] + height / 2, 0);
    } else if (node.subtype === "cylinder") {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          data.top,
          data.base,
          data.height,
          data.slices,
          data.stacks,
          data.capsclose,
          data.thetastart,
          data.thetalength
        ),
        material
      );
    } else if (node.subtype === "sphere") {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(
          data.radius,
          data.slices,
          data.stacks,
          data.thetastart,
          data.thetalength,
          data.phistart,
          data.philength
        ),
        material
      );
    } else if (node.subtype === "triangle") {
      // Igual a CG
      let triangleGeometry = new THREE.Geometry();
      triangleGeometry.vertices.push(
        new THREE.Vector3(data.xyz1[0], data.xyz1[1], data.xyz1[2]),
        new THREE.Vector3(data.xyz2[0], data.xyz2[1], data.xyz2[2]),
        new THREE.Vector3(data.xyz3[0], data.xyz3[1], data.xyz3[2])
      );
      triangleGeometry.faces.push(new THREE.Face3(0, 1, 2));
      triangleGeometry.computeFaceNormals();
      mesh = new THREE.Mesh(triangleGeometry, material);
    } else if (node.subtype === "nurbs") {
      let normalizedControlPoints = [];
      for (let u = 0; u <= data.degree_u; u++) {
        normalizedControlPoints.push([]);
        for (let v = 0; v <= data.degree_v; v++) {
          let point = data.controlpoints[u * (data.degree_v + 1) + v];
          normalizedControlPoints[u].push([point.xx, point.yy, point.zz, 1]);
        }
      }
      let surfaceData = this.nurbsBuilder.build(
        normalizedControlPoints,
        data.degree_u,
        data.degree_v,
        data.parts_u,
        data.parts_v,
        material
      );
      mesh = new THREE.Mesh(surfaceData, material);
    } else return group;
    group.add(mesh);
    return group;
  }

  applyTransforms(group, transforms) {
    let translate = { x: 0, y: 0, z: 0 };
    let rotation = { x: 0, y: 0, z: 0 };
    let scale = { x: 1, y: 1, z: 1 };

    for (let transformation of transforms) {
      if (transformation.type === "R") {
        rotation.x += transformation.rotation[0];
        rotation.y += transformation.rotation[1];
        rotation.z += transformation.rotation[2];
      }
      if (transformation.type === "S") {
        scale.x *= transformation.scale[0];
        scale.y *= transformation.scale[1];
        scale.z *= transformation.scale[2];
      }
      if (transformation.type === "T") {
        translate.x += transformation.translate[0];
        translate.y += transformation.translate[1];
        translate.z += transformation.translate[2];
      }
    }
    group.scale.set(scale.x, scale.y, scale.z);
    group.rotation.set(
      rotation.x * (Math.PI / 180),
      rotation.y * (Math.PI / 180),
      rotation.z * (Math.PI / 180)
    );
    group.position.set(translate.x, translate.y, translate.z);
    return group;
  }

  getSkyBox(node) {
    let data = node[Object.keys(node)[0]];
    const geometry = new THREE.BoxGeometry(
      data.size[0],
      data.size[1],
      data.size[2],
      1,
      1,
      1
    );
    const materials = [];
    const textureList = [
      data.front,
      data.back,
      data.up,
      data.down,
      data.right,
      data.left,
    ];

    for (let i = 0; i < textureList.length; i++) {
      let material = new THREE.MeshPhongMaterial({
        emisive: data.emisive,
        emisiveIntensity: data.intensity,
      });
      let texture = new THREE.TextureLoader().load(textureList[i]);
      material.map = texture;
      material.side = THREE.BackSide;
      materials.push(material);
    }

    let skybox = new THREE.Mesh(geometry, materials);
    skybox.position.set(data.center[0], data.center[1], data.center[2]);
    return skybox;
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    //console.log(key);
    this.pressedKeys.add(key);

    if (
      [
        "w",
        "a",
        "s",
        "d",
        "ArrowUp",
        "ArrowLeft",
        "ArrowDown",
        "ArrowRight",
      ].includes(key)
    ) {
      event.preventDefault();
    }

    this.handleKeyState();
  }

  onKeyUp(event) {
    const key = event.key.toLowerCase();
    //console.log(key);
    this.pressedKeys.delete(key);

    if (
      [
        "w",
        "a",
        "s",
        "d",
        "ArrowUp",
        "ArrowLeft",
        "ArrowDown",
        "ArrowRight",
      ].includes(key)
    ) {
      event.preventDefault();
    }

    this.handleKeyState();
  }

  handleKeyState() {
    if(!this.app.gameRunning)
      return
    const car = this.app.scene.getObjectByName("Player");
    //console.log(this.pressedKeys);
    if (car) {
      const forwardKeys = new Set(["w", "arrowup"]);
      const backwardKeys = new Set(["s", "arrowdown"]);
      const leftKeys = new Set(["a", "arrowleft"]);
      const rightKeys = new Set(["d", "arrowright"]);

      if (forwardKeys.hasAny(this.pressedKeys)) {
        this.moveCar("forward");
        this.moveFront = true;
      } else if (backwardKeys.hasAny(this.pressedKeys)) {
        this.moveCar("backward");
        this.moveFront = false;
      }

      if (leftKeys.hasAny(this.pressedKeys)) {
        this.rotateCar("left");
      } else if (rightKeys.hasAny(this.pressedKeys)) {
        this.rotateCar("right");
      }
    }
  }

  moveCar(direction) {
    const car = this.app.scene.getObjectByName("Player");

    if (car) {
      if (this.speed < -this.maxspeed) {
        this.speed = -this.maxspeed;
      }
      if (this.speed > this.maxspeed) {
        this.speed = this.maxspeed;
      }
      var translationDistance = 0;
      switch (direction) {
        case "forward":
          this.speed += 1.5;
          break;
        case "backward":
          this.speed -= 1;
          break;
        case "noKey":
          if (this.speed < 0 && this.moveFront) this.speed += 0.5;
          else if (this.speed > 0) this.speed -= 0.5;
          break;
        default:
          break;
      }
      translationDistance = this.speed * 0.006;
      car.translateZ(translationDistance);
    }
  }

  rotateCar(direction) {
    const car = this.app.scene.getObjectByName("Player");
    const rotationSpeed = 0.2 * this.speed * 0.006;

    if (car) {
      switch (direction) {
        case "left":
          car.rotation.y += rotationSpeed;
          break;
        case "right":
          car.rotation.y -= rotationSpeed;
          break;
      }
    }
  }

  innitLight(node) {
    const group = new THREE.Group();
    let light;

    if (node.type === "pointlight") {
      light = new THREE.PointLight(
        new THREE.Color(node.color.r, node.color.g, node.color.b),
        node.intensity,
        node.distance,
        node.decay
      );
    } else if (node.type === "spotlight") {
      light = new THREE.SpotLight(
        new THREE.Color(node.color.r, node.color.g, node.color.b),
        node.intensity,
        node.distance,
        node.angle,
        node.penumbra,
        node.decay
      );
      light.target.position.set(node.target[0], node.target[1], node.target[2]);
    } else if (node.type === "directionallight") {
      light = new THREE.DirectionalLight(
        new THREE.Color(node.color.r, node.color.g, node.color.b),
        node.intensity
      );
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

    this.lights[node.id] = light;
    group.add(light);

    return group;
  }

  loadObjFiles() {
    const loader = new OBJLoader();

    // Declare materials within the function
    const metal_red = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 1,
      roughness: 0.6,
    });

    const metal_gray = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 1,
      roughness: 0.6,
    });

    const metal_yellow = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      metalness: 1,
      roughness: 0.6,
    });

    const basic_yellow = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
    });

    const basic_green = new THREE.MeshStandardMaterial({
      color: 0x008631,
    });

    const basic_blue = new THREE.MeshStandardMaterial({
      color: 0x0000ff,
    });

    if (this.app.playerCar == "Teslo") {
      loader.load(
        "./scenes/models/Teslo.obj",
        (PlayerCar) => {
          this.onObjFileLoaded(
            PlayerCar,
            -2.1,
            -36,
            0,
            0.006,
            metal_yellow,
            "Player"
          );
        },
        (xhr) => {
          console.log(
            "Teslo object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
          );
        },
        (error) => {
          console.error("Error loading car.obj file:", error);
        }
      );
    } else {
      loader.load(
        "./scenes/models/Auda.obj",
        (PlayerCar) => {
          this.onObjFileLoaded(
            PlayerCar,
            2.1,
            -36.7,
            0,
            0.9,
            metal_yellow,
            "Player"
          );
        },
        (xhr) => {
          console.log(
            "Audo object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
          );
        },
        (error) => {
          console.error("Error loading mc.obj file:", error);
        }
      );
    }

    if (this.app.opponentCar == "Auda") {
      loader.load(
        "./scenes/models/Auda.obj",
        (OpponentCar) => {
          this.onObjFileLoaded(
            OpponentCar,
            2.1,
            -36.7,
            0,
            0.9,
            metal_red,
            "Opponent"
          );
        },
        (xhr) => {
          console.log(
            "Audo object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
          );
        },
        (error) => {
          console.error("Error loading mc.obj file:", error);
        }
      );
    } else {
      loader.load(
        "./scenes/models/Teslo.obj",
        (OpponentCar) => {
          this.onObjFileLoaded(
            OpponentCar,
            -2.1,
            -36,
            0,
            0.006,
            metal_red,
            "Opponent"
          );
        },
        (xhr) => {
          console.log(
            "Teslo object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
          );
        },
        (error) => {
          console.error("Error loading car.obj file:", error);
        }
      );
    }

    loader.load(
      "./scenes/models/Nitro.obj",
      (nitroObject) => {
        this.onObjFileLoaded(
          nitroObject,
          -2.1,
          -37.2,
          0,
          3,
          basic_blue,
          "Nitro"
        );
      },
      (xhr) => {
        console.log(
          "Rocket object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
        );
      },
      (error) => {
        console.error("Error loading rocket.obj file:", error);
      }
    );

    loader.load(
      "./scenes/models/Star.obj",
      (starObject) => {
        this.onObjFileLoaded(starObject, 25, -36, 0, 0.4, basic_yellow, "Star");
        starObject.rotation.set(0, Math.PI / 2, Math.PI / 2);
      },
      (xhr) => {
        console.log(
          "Star object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
        );
      },
      (error) => {
        console.error("Error loading rocket.obj file:", error);
      }
    );
    if (this.difficulty != "Easy") {
      loader.load(
        "./scenes/models/Cone.obj",
        (ConeObject) => {
          this.onObjFileLoaded(
            ConeObject,
            10,
            -37.3,
            -30,
            0.5,
            metal_red,
            "Cone"
          );
        },
        (xhr) => {
          console.log(
            "Cone object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
          );
        },
        (error) => {
          console.error("Error loading car.obj file:", error);
        }
      );
    }

    loader.load(
      "./scenes/models/Cone.obj",
      (ConeObject) => {
        this.onObjFileLoaded(
          ConeObject,
          -22.1,
          -37.3,
          5,
          0.5,
          metal_red,
          "Cone"
        );
      },
      (xhr) => {
        console.log(
          "Cone object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
        );
      },
      (error) => {
        console.error("Error loading car.obj file:", error);
      }
    );

    loader.load(
      "./scenes/models/Barrier.obj",
      (BarrierObject) => {
        this.onObjFileLoaded(
          BarrierObject,
          23,
          -37.3,
          -15,
          1,
          metal_red,
          "Barrier"
        );
      },
      (xhr) => {
        console.log(
          "Barrier object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
        );
      },
      (error) => {
        console.error("Error loading car.obj file:", error);
      }
    );

    loader.load(
      "./scenes/models/Cactus.obj",
      (cactusObject) => {
        this.onObjFileLoaded(
          cactusObject,
          15,
          -37.2,
          0,
          0.3,
          basic_green,
          "cactus"
        );
      },
      (xhr) => {
        console.log(
          "Cactus object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
        );
      },
      (error) => {
        console.error("Error loading cactus.obj file:", error);
      }
    );

    loader.load(
      "./scenes/models/Cactus.obj",
      (cactusObject) => {
        this.onObjFileLoaded(
          cactusObject,
          -35,
          -37.2,
          10,
          0.3,
          basic_green,
          "cactus"
        );
      },
      (xhr) => {
        console.log(
          "Cactus object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
        );
      },
      (error) => {
        console.error("Error loading cactus.obj file:", error);
      }
    );

    loader.load(
      "./scenes/models/Cactus.obj",
      (cactusObject) => {
        this.onObjFileLoaded(
          cactusObject,
          0,
          -37.2,
          -35,
          0.4,
          basic_green,
          "cactus"
        );
      },
      (xhr) => {
        console.log(
          "Cactus object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
        );
      },
      (error) => {
        console.error("Error loading cactus.obj file:", error);
      }
    );

    loader.load(
      "./scenes/models/Chair.obj",
      (chairObject) => {
        this.onObjFileLoaded(
          chairObject,
          25,
          -37.2,
          -37,
          0.025,
          metal_gray,
          "chair"
        );
      },
      (xhr) => {
        console.log(
          "Chair object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
        );
      },
      (error) => {
        console.error("Error loading chair.obj file:", error);
      }
    );

    loader.load(
      "./scenes/models/Chair.obj",
      (chairObject) => {
        this.onObjFileLoaded(
          chairObject,
          22.5,
          -37.2,
          -37,
          0.025,
          metal_gray,
          "chair"
        );
      },
      (xhr) => {
        console.log(
          "Chair object: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
        );
      },
      (error) => {
        console.error("Error loading chair.obj file:", error);
      }
    );
  }

  
  onObjFileLoaded(obj, x, y, z, scale, material, name = "") {
    const scaleFactor = scale;
    //console.clear();
    obj.scale.set(scaleFactor, scaleFactor, scaleFactor);

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.name === "Platform_Cylinder.001") {
          child.material.transparent = true;
          child.material.opacity = 0;
        } else {
          child.material = material;
        }
      }
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.app.scene.add(ambientLight);

    let objGroup = new THREE.Group();
    objGroup.add(obj)

    objGroup.position.set(x, y, z);
    let audaBindingBox = false;

    if (name != "") {
      objGroup.name = name;

      if (name == "Player") {
        const carCam = this.app.cameras["CarCam"];
        if(this.app.playerCar == "Auda"){
          carCam.position.set(0, 10, -10);
          this.playerYCorrection += 0.7;
          audaBindingBox = true;
        }
        objGroup.add(carCam);
        objGroup.position.set(22, 190 - this.playerYCorrection, 0)
        objGroup.rotation.y += Math.PI

        
        this.playerCheckPoints = [
          new THREE.Vector3(25, 190 - this.playerYCorrection, 6),
          new THREE.Vector3(0, 190 - this.playerYCorrection, -25),
          new THREE.Vector3(-25, 190 - this.playerYCorrection, 0),
          new THREE.Vector3(0, 190 - this.playerYCorrection, 25)
        ]
        this.playerCurrentCheckpoint = 1;
      }
      if(name == "Opponent"){
        if(this.app.opponentCar == "Auda"){
          this.enemyYCorrection += 0.7;
          audaBindingBox = true;
        }
        objGroup.position.set(25, 190 - this.enemyYCorrection, 0)
        objGroup.rotation.y += Math.PI
      }
    }
    let boundingBox = new THREE.Box3();

    // Calculate the bounding box for the irregular object
    boundingBox.setFromObject(obj);

    if(audaBindingBox){
      const boxSize = boundingBox.getSize(new THREE.Vector3());
      
      // Halve the width and length
      const newWidth = boxSize.x / 3.15;
      const newLength = boxSize.z / 1.34;
      //console.log(newWidth, newLength, boxSize.z)
      
      // Update the size of the bounding box
      const newBoundingBox = new THREE.Box3().setFromCenterAndSize(
        boundingBox.getCenter(new THREE.Vector3()),
        new THREE.Vector3(newWidth, boxSize.y, newLength)
      );
      boundingBox = newBoundingBox;
    }
    const boxMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00, transparent: true, opacity: 0 });
    const boxGeometry = new THREE.BoxGeometry();
    let boxHelper = new THREE.Mesh(boxGeometry, boxMaterial);

    // Scale and position based on the given Box3
    boxHelper.scale.copy(boundingBox.getSize(new THREE.Vector3()));
    boxHelper.position.copy(boundingBox.getCenter(new THREE.Vector3()));
    boxHelper.name = "boundingBox"
    objGroup.add(boxHelper)
    if(name == "Cone"){
      this.coneBaseObject.copy(objGroup);
      return;
    } else if(name == "Barrier"){
      this.barrierBaseObject.copy(objGroup);
      return;
    } 
    this.app.scene.add(objGroup);
  }

  loadRoad() {
    let y = 190;
    this.path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(25, y, 0),
      new THREE.Vector3(25, y, -25),
      new THREE.Vector3(15, y, -25),
      new THREE.Vector3(10, y, -25),
      new THREE.Vector3(5, y, -25),
      new THREE.Vector3(0, y, -25),
      new THREE.Vector3(-5, y, -25),
      new THREE.Vector3(-10, y, -25),
      new THREE.Vector3(-15, y, -25),
      new THREE.Vector3(-25, y, -25),
      new THREE.Vector3(-25, y, 0),
      new THREE.Vector3(0, y, 0),
      new THREE.Vector3(0, y, 25),
      new THREE.Vector3(25, y, 25),
      new THREE.Vector3(25, y, 15),
      new THREE.Vector3(25, y, 10),
      new THREE.Vector3(25, y, 5),
      new THREE.Vector3(25, y, 0.1)
    ]);

    this.path2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(25, y, 0),
      new THREE.Vector3(25, y, -25),
      new THREE.Vector3(15, y, -25),
      new THREE.Vector3(10, y, -25),
      new THREE.Vector3(5, y, -25),
      new THREE.Vector3(0, y, -25),
      new THREE.Vector3(-5, y, -25),
      new THREE.Vector3(-10, y, -25),
      new THREE.Vector3(-15, y, -25),
      new THREE.Vector3(-25, y, -25),
      new THREE.Vector3(-25, y, 0),
      new THREE.Vector3(-25, y, 25),
      new THREE.Vector3(0, y, 25),
      new THREE.Vector3(25, y, 25),
      new THREE.Vector3(25, y, 15),
      new THREE.Vector3(25, y, 10),
      new THREE.Vector3(25, y, 5),
      new THREE.Vector3(25, y, 0.1)
    ]);

    this.path2segment = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-25, y, 3),
      new THREE.Vector3(-25, y, 25),
      new THREE.Vector3(-5, y, 25)
    ]);

    if(this.app.opponentCar=="Teslo")
      this.enemyPath = this.path
    else
      this.enemyPath = this.path2
    
    this.road = new MyRoad(this.app.scene, this.path);
    this.road.buildRoad();
    this.road2segment = new MyRoad(this.app.scene, this.path2segment, true);
    this.road2segment.buildRoad();
  }

  update() {
    if (this.moveFront) this.moveCar("default");
    else this.moveCar("noKey");
    this.moveEnemy();
    this.detectCarCollisions();
    this.checkLaps();
  }

  checkLaps(){
    let opponent = this.app.scene.getObjectByName("Opponent");
    let player = this.app.scene.getObjectByName("Player");
    if(!opponent || !this.app.clock)
      return
    if(opponent.position.distanceTo(new THREE.Vector3(25, 190 - this.enemyYCorrection, 0.5)) < 0.6
        && this.app.clock.getElapsedTime() - this.eLapTimer > 3){
      this.eLapTimer = this.app.clock.getElapsedTime();
      this.app.enemyLap ++;
    }
    
    let nextCheckpoint = this.playerCheckPoints[this.playerCurrentCheckpoint]
    if(player.position.distanceTo(nextCheckpoint) < 7){
      if(this.playerCurrentCheckpoint == 0)
        this.app.currentLap ++;
      this.playerCurrentCheckpoint = (this.playerCurrentCheckpoint + 1) % this.playerCheckPoints.length;
    }
    //console.log(this.playerCurrentCheckpoint)
  }

  moveEnemy() {
    let car = this.app.scene.getObjectByName("Opponent");
    if (!car || !this.enemyPath) return;
    var speedModifier = 1 + (this.app.difficulty == "hard");
    var elapsedTime = speedModifier*this.app.clock.getElapsedTime() / 15;
    var position = this.enemyPath.getPointAt(elapsedTime % 1);
    var nextPoint = this.enemyPath.getPointAt((elapsedTime + 0.01) % 1);

    position.y -= this.enemyYCorrection;
    nextPoint.y -= this.enemyYCorrection;

    car.position.copy(position);
    car.lookAt(nextPoint);
  }

  detectCarCollisions() {
    let car = this.app.scene.getObjectByName("Player");

    // Get all objects in the scene
    let allObjects = this.app.scene.children;

    for (let obj of allObjects) {
        // Ignore the player object itself
        if (obj !== car && obj.name!="") {
            if (areBoxesOverlapping(car, obj)) {
                // Collision detected
                //console.log(`Collision with ${obj.name}`);
                if(obj.name == "Opponent" && !this.immune){
                  this.speed = - this.maxspeed/2
                  if(!this.moveFront)
                    this.speed = 3*this.maxspeed
                } else
                if(obj.name == "Cone" && !this.immune){
                  this.rotateCar("right")
                  this.rotateCar("right")
                  this.rotateCar("right")
                  this.rotateCar("right")
                } else
                if((obj.name == "Barrier" || obj.name == "pickingStand") && !this.immune){
                  this.speed = - this.speed
                } else
                if(obj.name == "Star"){
                  this.immune = true;
                  this.immuneTimer = this.app.clock.getElapsedTime();
                  this.app.scene.remove(obj);
                } else
                if(obj.name == "Nitro"){
                  this.speed = this.maxspeed*2;
                  this.maxspeed *= 4;
                  this.boosted = true;
                  this.boostTimer = this.app.clock.getElapsedTime();
                  this.app.scene.remove(obj);
                }
            }
        }
    }
    if(this.immune && this.app.clock.getElapsedTime() - this.immuneTimer > 5){
      this.immune = false
    }
    if(this.boosted && this.app.clock.getElapsedTime() - this.boostTimer > 5){
      this.boosted = false
      this.maxspeed /= 4
    }
  }
}
function printAttributes(obj, indent = 0) {
  const keys = Object.keys(obj);
  for (const key of keys) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      //console.log(`${" ".repeat(indent)}${key}: `);
      printAttributes(obj[key], indent + 4);
    } else {
      //console.log(`${" ".repeat(indent)}${key}: ${obj[key]}`);
    }
  }
}

function areBoxesOverlapping(car, obj) {
  let mesh1 = car.getObjectByName("boundingBox");
  let mesh2 = obj.getObjectByName("boundingBox");

  // Get the positions of the meshes
  let position1 = car.position.clone();
  let position2 = obj.position.clone();

  // Get the sizes of the boxes
  let size1 = mesh1.scale.clone();
  let size2 = mesh2.scale.clone();

  // Calculate the half sizes for easier comparison
  let halfSize1 = size1.clone().multiplyScalar(0.5);
  let halfSize2 = size2.clone().multiplyScalar(0.5);

  // Calculate the min and max extents for each box
  let min1 = position1.clone().sub(halfSize1);
  let max1 = position1.clone().add(halfSize1);
  let min2 = position2.clone().sub(halfSize2);
  let max2 = position2.clone().add(halfSize2);

  // Check for overlap along each axis
  let overlapX = max1.x > min2.x && min1.x < max2.x;
  let overlapY = max1.y > min2.y && min1.y < max2.y;
  let overlapZ = max1.z > min2.z && min1.z < max2.z;

  // Check if there is overlap along all three axes
  let isOverlapping = overlapX && overlapZ;

  return isOverlapping;
}

Set.prototype.hasAny = function (set) {
  for (const item of this) {
    if (set.has(item)) {
      return true;
    }
  }
  return false;
};

export { MyContents };
