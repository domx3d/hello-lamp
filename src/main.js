import * as THREE from 'three';
import { OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';


// variables
let lamp_case, bulb, glass, foil;
let loading;
let colorButton;
let pressed = false;
let mouseX_delta = 0;
let mouseY_delta = 0;
const navBrand = document.querySelector(".navbar-brand");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

// scene
const scene = new THREE.Scene();

// renderer
const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, });

// camera
const camera = new THREE.PerspectiveCamera(45, 
  sizes.width/sizes.height, 0.1, 1000);
camera.position.z = 10;
camera.position.y = 20;
camera.position.x = -20;
scene.add(camera);

// orbit controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = false;
controls.enablePan = false; 
controls.enableZoom = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 10;

controls.minDistance = 5;
controls.maxDistance = 35;
controls.minPolarAngle = Math.PI / 10; 
controls.maxPolarAngle = Math.PI / 2; 
controls.minAzimuthAngle = Math.PI + 0.05; 
controls.maxAzimuthAngle = Math.PI * 2 - 0.05; 

// point light
const light = new THREE.PointLight("#ffffff");
light.position.set(-3, 0, -0.5);
light.intensity = 2;
light.distance = 4.3;
light.decay = 1;
scene.add(light)

// spot light
const spotLight = new THREE.SpotLight(0xffffff, 2);
spotLight.angle = 0.5; // Set spotlight angle to 0.5 radians
spotLight.penumbra = 0.1; // Set spotlight penumbra
spotLight.castShadow = true;
const helper = new THREE.SpotLightHelper(spotLight);

// gltf loader
const loader = new GLTFLoader(setLoadManager());


// glass material
const glass_material = new THREE.MeshPhongMaterial({
  color:'#FFFFFF',
  opacity: 0.7,
  transparent: true,
  side: THREE.DoubleSide,
});

// foil material
const foil_material = new THREE.MeshStandardMaterial({
  color: '#848789',
  roughness: 0.2,
  metalness: 1,
  side: THREE.DoubleSide,
});

// load lamp
loader.load('./objects/lamp.gltf',
  (gltf) => {
    const root = gltf.scene;
    scene.add(root);
    
    //console.log(dumpObject(root).join('\n'));
    
    lamp_case = root.getObjectByName('case001');
    
    glass = root.getObjectByName('glass001');
    glass.material = glass_material;
    
    foil = root.getObjectByName('inner_foil001');
    foil.material = foil_material;

    bulb = root.getObjectByName('bulb001');
    bulb.material.emissive.set('#FFFF00');
    bulb.material.emissiveIntensity = 1;

    const newPosition = new THREE.Vector3(-3, 5, -3);
    spotLight.target.position.copy(newPosition);

    lamp_case.add(spotLight);
    lamp_case.add(spotLight.target);
  }
);

// load color panel
loader.load('./objects/color_panel.gltf',
  (gltf) => { 
    colorButton = gltf.scene;
    colorButton.position.set(0,-2,10)
    colorButton.name = 'colorButton'
    colorButton.castShadow = true;
    colorButton.receiveShadow = true;
    scene.add(colorButton);
    //console.log(dumpObject(colorButton).join('\n'));
  },
);

// load room
loader.load('./objects/room/test.gltf',
  (gltf) => {
    const room = gltf.scene;
    room.scale.set(5,5,5);
    room.position.y = -12.5;
    room.position.x = -24.75;
    room.receiveShadow = true;
    scene.add(room);
    //console.log(dumpObject(room).join('\n'));
  }
);


// color picker
const colorPicker = document.getElementById("colorpicker");
colorPicker.addEventListener("input", (event) => {
  const color = event.target.value;
  navBrand.style.color = color;
  bulb.material.emissive.set(color)
  spotLight.color.set(color);
});


// raycaster
const raycaster = new THREE.Raycaster();

function onMouseDown(event) {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(mouse, camera);

  // Find all intersecting objects
  const intersects = raycaster.intersectObjects(scene.children, true);

  if(intersects.length > 0) { 
    //console.log(intersects[0].object) 
    if (intersects[0].object.parent.name === 'case001') {
      pressed = true;
      controls.enabled = false;
    } else if(intersects[0].object.parent.name === 'control_panel') {
      //console.log("show picker")
      //colorPicker.click();      
      colorPicker.showPicker();
    }
  }
}

function onMouseup(event) {
  if(pressed){
    pressed = false;
    controls.enabled  = true;
    mouseX_delta = 0;
    mouseY_delta = 0;
  }
}

function onMouseMove(event) {
  if(pressed) {
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1 ;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    mouseX_delta -= mouseX;
    mouseY_delta -= mouseY;
    
    lamp_case.rotation.x = Math.max(Math.min(lamp_case.rotation.x + mouseY_delta * 5, Math.PI), -Math.PI);
    lamp_case.rotation.y = Math.max(Math.min(lamp_case.rotation.y + mouseX_delta * 5, Math.PI), -Math.PI);

    mouseX_delta = mouseX;
    mouseY_delta = mouseY;
  }
  
}

// mouse events
renderer.domElement.addEventListener('pointerdown', onMouseDown, false);
renderer.domElement.addEventListener('pointerup', onMouseup, false);
renderer.domElement.addEventListener('pointermove', onMouseMove);


// RENDER
const tempV = new THREE.Vector3();
function render(time) {
  time *= 0.001;
  
  if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
  }

  // colorpicker position set
  if(colorButton) {
    colorButton.updateWorldMatrix(true, false);
    colorButton.getWorldPosition(tempV);
    tempV.project(camera);
    const x = (tempV.x *  .5 + .5) * canvas.clientWidth;
    const y = (tempV.y * -.5 + .5) * canvas.clientHeight;
    // move the elem to that position
    colorPicker.style.translate = `${x-30}px ${y-40}px`;
  }

  renderer.render(scene, camera);  
  
  requestAnimationFrame(render);
}
  
requestAnimationFrame(render);
  

// resize window
function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}


// show loaded objects tree in console
function dumpObject(obj, lines = [], isLast = true, prefix = '') {
  const localPrefix = isLast ? '└─' : '├─';
  lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'} [${obj.type}]`);
  const newPrefix = prefix + (isLast ? '  ' : '│ ');
  const lastNdx = obj.children.length - 1;
  obj.children.forEach((child, ndx) => {
    const isLast = ndx === lastNdx;
    dumpObject(child, lines, isLast, newPrefix);
  });
  return lines;
}

// load manager
function setLoadManager() {
  const manager = new THREE.LoadingManager();

  manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
    //console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
    loading = true;
  };

  manager.onLoad = function ( ) {
    //console.log( 'Loading complete!');
    const loadingScreen = document.getElementById( 'loadScreen' );	
    loadingScreen.remove();
    loading = false;
  };

  manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
    //console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
  };

  manager.onError = function ( url ) {
    console.log( 'There was an error loading ' + url );
  };
  
  return manager;
}