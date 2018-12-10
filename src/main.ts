import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Mesh from './geometry/Mesh';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import {readTextFile} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Texture, {TextureBuffer} from './rendering/gl/Texture';
import { GUI } from 'dat-gui';
import Icosphere from './geometry/Icosphere';
import { Scene, Material } from './scene/scene';
import { buildKDTree, traverseKDTree, restNodeCount } from './scene/BVH';
import { WSAENETDOWN } from 'constants';

const THREE = require('three');
var listener = new THREE.AudioListener();

// create a global audio source
var sound = new THREE.Audio( listener );

// load a sound and set it as the Audio object's buffer
var audioLoader = new THREE.AudioLoader();
audioLoader.load( './resources/sound/BGM.mp3', function( buffer: any ) {
	sound.setBuffer( buffer );
	sound.setLoop( true );
	sound.setVolume( 0.3 );
  sound.play();
});


const maxTextureSize : number = 4096;

// Define an object with application parameters and button callbacks
const controls = {
  music: true,
  model: 'diamond',
  background: 'church',
  rendering: {
    shadow: {
      on: false,
    },
    reflection: {
      on: true,
      rayDepth: 3
    },
    refraction: {
      on: true,
      dispersion: false,
      rayDepth: 10
    },
    ssaa: {
      on: false,
    },
    glow: {
      on: false,
      threshold: 0.95,
      range: 75,
      blur: 7.0,
      brightness: 0.5,
    },
    DOF: {
      on: false,
      focal: 20.0,
      radius: 5.0,
    },
    useBVH: true,  
    
  }
  
  
};

let scene: Scene;
let renderer: OpenGLRenderer;

let meshes: Mesh[];
let sceneInfo: TextureBuffer[];
let triangleCount: number;


var timer = {
  deltaTime: 0.0,
  startTime: 0.0,
  currentTime: 0.0,
  updateTime: function() {
    var t = Date.now();
    t = (t - timer.startTime) * 0.001;
    timer.deltaTime = t - timer.currentTime;
    timer.currentTime = t;
  },
}


function loadOBJText(path: string): string {
  return readTextFile(path);
  
}


function loadScene() {

  meshes = [];
  triangleCount = 0;

  scene && scene.destroy();
  scene = new Scene();
  restNodeCount();

  let objString;
  let mesh;
  let textureSet;
  let texture;
  let material;
  let baseColor;

  let environment : Texture;

  switch(controls.background) {
    case 'church':
      environment = new Texture('resources/textures/church.jpg');
      scene.addEnvironmentTexture(environment);
    break;
    case 'Panorama':
      environment = new Texture('resources/textures/Panorama.jpg');
      scene.addEnvironmentTexture(environment);
    break;
    case 'harbor':
      environment = new Texture('resources/textures/harbor.jpg');
      scene.addEnvironmentTexture(environment);
    break;
    default:
      environment = new Texture('resources/textures/church.jpg');
      scene.addEnvironmentTexture(environment);

  }

  // load table mesh & textures
  objString = loadOBJText('resources/obj/demo_floor.obj');
  material = new Material(0.5, 0.5, 0.0, 0.0);
  baseColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
  mesh = new Mesh(objString, material, baseColor);
  mesh.create();
  textureSet = new Map<string, Texture>();
  texture = new Texture('resources/textures/marble6.jpg');
  textureSet.set('tex_Albedo', texture);
  scene.addSceneElement(mesh, textureSet);

    // load light mesh && textures
  objString = loadOBJText('resources/obj/demo_light.obj');
  material = new Material(0.0, 1.0, 0.0, 2.0);  
  baseColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);  
  mesh = new Mesh(objString, material, baseColor);
  mesh.create();
  textureSet = null;
  scene.addSceneElement(mesh, textureSet);

  switch(controls.model) {
    case 'diamond':
        // load diamond mesh & textures
      objString = loadOBJText('resources/obj/diamond.obj');
      material = new Material(0.3, 0.0, 0.7, 0.0);  
      baseColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);
    break;
    case 'diamonds':
        // load diamond mesh & textures
      objString = loadOBJText('resources/obj/diamond.obj');
      material = new Material(0.2, 0.0, 0.8, 0.0);  
      baseColor = vec4.fromValues(1.0, 0.9, 0.9, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      // load diamond mesh & textures
      objString = loadOBJText('resources/obj/demo_diamond1.obj');
      material = new Material(0.2, 0.0, 0.8, 0.0);  
      baseColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      // // load diamond mesh & textures
      objString = loadOBJText('resources/obj/demo_diamond2.obj');
      material = new Material(0.2, 0.0, 0.8, 0.0);  
      baseColor = vec4.fromValues(0.9, 1.0, 0.9, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      // // load diamond mesh & textures
      objString = loadOBJText('resources/obj/demo_diamond3.obj');
      material = new Material(0.2, 0.0, 0.8, 0.0);  
      baseColor = vec4.fromValues(0.7, 1.0, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      // // load diamond mesh & textures
      objString = loadOBJText('resources/obj/demo_diamond4.obj');
      material = new Material(0.2, 0.0, 0.8, 0.0);  
      baseColor = vec4.fromValues(0.9, 0.9, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      // // load diamond mesh & textures
      objString = loadOBJText('resources/obj/demo_diamond5.obj');
      material = new Material(0.2, 0.0, 0.8, 0.0);  
      baseColor = vec4.fromValues(1.0, 1.0, 0.9, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      // // load diamond mesh & textures
      objString = loadOBJText('resources/obj/demo_diamond6.obj');
      material = new Material(0.2, 0.0, 0.8, 0.0);  
      baseColor = vec4.fromValues(0.9, 1.0, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

    break;

    case 'emeralds':

      objString = loadOBJText('resources/obj/emerald1.obj');
      material = new Material(0.2, 0.5, 0.3, 0.0);  
      baseColor = vec4.fromValues(0.9, 1.0, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      objString = loadOBJText('resources/obj/emerald2.obj');
      material = new Material(0.2, 0.5, 0.3, 0.0);  
      baseColor = vec4.fromValues(1.0, 0.9, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      objString = loadOBJText('resources/obj/emerald3.obj');
      material = new Material(0.2, 0.5, 0.3, 0.0);  
      baseColor = vec4.fromValues(1.0, 1.0, 0.9, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      objString = loadOBJText('resources/obj/emerald4.obj');
      material = new Material(0.2, 0.5, 0.3, 0.0);  
      baseColor = vec4.fromValues(0.9, 0.8, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      objString = loadOBJText('resources/obj/emerald5.obj');
      material = new Material(0.2, 0.5, 0.3, 0.0);  
      baseColor = vec4.fromValues(0.9, 1.0, 0.8, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);
    break;

    case 'cubes':
      objString = loadOBJText('resources/obj/cubes.obj');
      material = new Material(0.2, 0.0, 0.8, 0.0);  
      baseColor = vec4.fromValues(0.9, 1.0, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);
    break;

    case 'dragon':
      objString = loadOBJText('resources/obj/dragon.obj');
      material = new Material(0.0, 0.2, 0.8, 0.0);  
      baseColor = vec4.fromValues(0.9, 1.0, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);
    break;

    case 'rings':
      objString = loadOBJText('resources/obj/rings.obj');
      material = new Material(0.5, 0.5, 0.0, 0.0);  
      baseColor = vec4.fromValues(0.9, 0.9, 0.7, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      objString = loadOBJText('resources/obj/stone1.obj');
      material = new Material(0.2, 0.2, 0.6, 0.0);  
      baseColor = vec4.fromValues(1.0, 0.9, 0.9, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      objString = loadOBJText('resources/obj/stone2.obj');
      material = new Material(0.2, 0.2, 0.6, 0.0);  
      baseColor = vec4.fromValues(0.9, 1.0, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);

      objString = loadOBJText('resources/obj/stone3.obj');
      material = new Material(0.2, 0.2, 0.6, 0.0);  
      baseColor = vec4.fromValues(0.9, 1.0, 0.9, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);
    break;

    case 'test':
          // // load diamond mesh & textures
      objString = loadOBJText('resources/obj/cube.obj');
      material = new Material(0.2, 0.0, 0.8, 0.0);  
      baseColor = vec4.fromValues(0.9, 1.0, 1.0, 1.0);    
      mesh = new Mesh(objString, material, baseColor);
      mesh.create();
      textureSet = null;
      scene.addSceneElement(mesh, textureSet);
    break;

    default:
  }


  // build KDTree texture
  scene.kdTreeRoot = buildKDTree(scene.primitives, 0, 8);

  scene.kdTreeNodeList = traverseKDTree(scene.kdTreeRoot);
  scene.getCorrectOder();
  scene.buildBVHTextures();
  scene.buildSceneInfoTextures();
  console.log(scene.kdTreeNodeList);




}

function setupGUI() {
    const gui = new DAT.GUI();

    // music
    function toggleMusic() {
      if (controls.music) {
        if (!sound.isPlaying) {
          // debugger
          sound.play();
        }
      } else {
        if (sound.isPlaying) {
          sound.pause();
        }
      }
    }
    gui.add(controls, 'music').onChange(toggleMusic);
    
    // models
    gui.add(controls, 'model', ['diamond', 'diamonds', 'cubes', 'dragon', 'emeralds', 'rings']).onChange(loadScene);

    // background
    function setBackground() {
      switch(controls.background) {
        case 'church':
          scene.addEnvironmentTexture(new Texture('resources/textures/church.jpg'));
        break;
        case 'Panorama':
          scene.addEnvironmentTexture(new Texture('resources/textures/Panorama.jpg'));
        break;
        case 'harbor':
          scene.addEnvironmentTexture(new Texture('resources/textures/harbor.jpg'));
        break;
        default:
      }

    }
    gui.add(controls, 'background', ['church', 'Panorama', 'harbor']).onChange(setBackground);


    

    // rendering
    function setRenderingState() {
      renderer.setRenderState(controls.rendering);
    }
    let renderingFolder = gui.addFolder('rendering');  
    renderingFolder.open();    

    // shadow
    let shadowFolder = renderingFolder.addFolder('shadow');
    shadowFolder.add(controls.rendering.shadow, 'on').onChange(setRenderingState);
    shadowFolder.close();

    // reflection
    let reflectionFolder = renderingFolder.addFolder('reflection');  
    reflectionFolder.add(controls.rendering.reflection, 'on').onChange(setRenderingState);
    reflectionFolder.add(controls.rendering.reflection, 'rayDepth', 2, 5).step(1).onChange(setRenderingState);
    reflectionFolder.close();

    // refraction
    let refractionFolder = renderingFolder.addFolder('refraction');  
    refractionFolder.add(controls.rendering.refraction, 'on').onChange(setRenderingState);
    refractionFolder.add(controls.rendering.refraction, 'dispersion').onChange(setRenderingState);
    refractionFolder.add(controls.rendering.refraction, 'rayDepth', 2, 20).step(5).onChange(setRenderingState);
    refractionFolder.close();

    // ssaa
    let ssaaFolder = renderingFolder.addFolder('fxaa');  
    ssaaFolder.add(controls.rendering.ssaa, `on`).onChange(setRenderingState);
    ssaaFolder.close();

    // glow
    let glowFolder = renderingFolder.addFolder('glow');  
    glowFolder.add(controls.rendering.glow, `on`).onChange(setRenderingState);
    glowFolder.add(controls.rendering.glow, 'threshold', 0.90, 0.99).onChange(setRenderingState);
    // glowFolder.add(controls.rendering.glow, 'range', 75, 100).onChange(setRenderingState);
    glowFolder.add(controls.rendering.glow, 'blur', 1, 50).onChange(setRenderingState);
    glowFolder.add(controls.rendering.glow, 'brightness', 0.4, 1.0).onChange(setRenderingState);
    glowFolder.close();

    // DOF
    let DOFFolder = renderingFolder.addFolder('DOF');  
    DOFFolder.add(controls.rendering.DOF, `on`).onChange(setRenderingState);
    DOFFolder.add(controls.rendering.DOF, `focal`, 10.0, 50.0).onChange(setRenderingState);
    DOFFolder.add(controls.rendering.DOF, `radius`, 2.0, 10.0).onChange(setRenderingState);
    DOFFolder.close();

    // BVH
    renderingFolder.add(controls.rendering, 'useBVH').onChange(setRenderingState);
    

    setRenderingState();
}


function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2', {antialias:true});
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);



  const camera = new Camera(vec3.fromValues(0, 5, 20), vec3.fromValues(0, 5, 0));

  renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  
 
  setupGUI();

  // Initial call to load scene
  loadScene();

  // -------------------------------------------------------------------
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    timer.updateTime();
    // renderer.updateTime(timer.deltaTime, timer.currentTime);

    renderer.clear();
    renderer.clearGB();

    // ==============forward render mesh info into gbuffers================
    // render demo scene
    renderer.renderToGBuffer(camera, scene.meshes, scene.textureSets);  
    renderer.renderFromGBuffer(camera, scene.environment);
    renderer.shadowStage(camera, scene.sceneInfoTextures, scene.triangleCount, scene.BVHTextures, scene.nodeCount);
    renderer.reflectionStage(camera, scene.sceneInfoTextures, scene.triangleCount, scene.BVHTextures, scene.nodeCount, scene.textureSets, scene.environment);
    renderer.refractionStage(camera, scene.sceneInfoTextures, scene.triangleCount, scene.BVHTextures, scene.nodeCount, scene.textureSets, scene.environment);
    renderer.raytraceComposeStage();
    renderer.ssaa();
    renderer.glow();
    renderer.dof();
    
    
  //  renderer.shadowStage(camera, scene.sceneInfoTextures, scene.triangleCount);


  
    stats.end();
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}


function setup() {
  timer.startTime = Date.now();
  main();
}

setup();
