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
import { buildKDTree } from './scene/BVH';
import { WSAENETDOWN } from 'constants';

const maxTextureSize : number = 4096;

// Define an object with application parameters and button callbacks
const controls = {
  // Extra credit: Add interactivity
  PostProcessingType: 'Deferred',
};

let scene: Scene;

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

  let objString;
  let mesh;
  let textureSet;
  let texture;
  let material;
  let baseColor;

  let environment : Texture;

  environment = new Texture('resources/textures/church.jpg');
  scene.addEnvironmentTexture(environment);

  // load table mesh & textures
  objString = loadOBJText('resources/obj/demo_floor.obj');
  material = new Material(0.6, 0.4, 0.0, 0.0);
  baseColor = vec4.fromValues(1.0, 0.8, 0.8, 1.0);
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

  // load diamond mesh & textures
  objString = loadOBJText('resources/obj/diamond.obj');
  material = new Material(0.3, 0.0, 0.7, 0.0);  
  baseColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);    
  mesh = new Mesh(objString, material, baseColor);
  mesh.create();
  textureSet = null;
  scene.addSceneElement(mesh, textureSet);

  // // load diamond mesh & textures
  // objString = loadOBJText('resources/obj/demo_diamond1.obj');
  // material = new Material(0.3, 0.0, 0.7, 0.0);  
  // baseColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);    
  // mesh = new Mesh(objString, material, baseColor);
  // mesh.create();
  // textureSet = null;
  // scene.addSceneElement(mesh, textureSet);

  // // load diamond mesh & textures
  // objString = loadOBJText('resources/obj/demo_diamond2.obj');
  // material = new Material(0.3, 0.0, 0.7, 0.0);  
  // baseColor = vec4.fromValues(0.9, 1.0, 0.9, 1.0);    
  // mesh = new Mesh(objString, material, baseColor);
  // mesh.create();
  // textureSet = null;
  // scene.addSceneElement(mesh, textureSet);

  // // load diamond mesh & textures
  // objString = loadOBJText('resources/obj/demo_diamond3.obj');
  // material = new Material(0.3, 0.0, 0.7, 0.0);  
  // baseColor = vec4.fromValues(0.9, 1.0, 0.8, 1.0);    
  // mesh = new Mesh(objString, material, baseColor);
  // mesh.create();
  // textureSet = null;
  // scene.addSceneElement(mesh, textureSet);

  // // load diamond mesh & textures
  // objString = loadOBJText('resources/obj/demo_diamond4.obj');
  // material = new Material(0.3, 0.0, 0.7, 0.0);  
  // baseColor = vec4.fromValues(0.9, 0.9, 1.0, 1.0);    
  // mesh = new Mesh(objString, material, baseColor);
  // mesh.create();
  // textureSet = null;
  // scene.addSceneElement(mesh, textureSet);

  // // load diamond mesh & textures
  // objString = loadOBJText('resources/obj/demo_diamond5.obj');
  // material = new Material(0.3, 0.0, 0.7, 0.0);  
  // baseColor = vec4.fromValues(1.0, 1.0, 0.9, 1.0);    
  // mesh = new Mesh(objString, material, baseColor);
  // mesh.create();
  // textureSet = null;
  // scene.addSceneElement(mesh, textureSet);

  // // load diamond mesh & textures
  // objString = loadOBJText('resources/obj/demo_diamond6.obj');
  // material = new Material(0.3, 0.0, 0.7, 0.0);  
  // baseColor = vec4.fromValues(0.9, 1.0, 1.0, 1.0);    
  // mesh = new Mesh(objString, material, baseColor);
  // mesh.create();
  // textureSet = null;
  // scene.addSceneElement(mesh, textureSet);

  scene.buildSceneInfoTextures();

  // build KDTree
  // scene.kdTreeRoot = buildKDTree(scene.primitives, 0, 8);

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
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 5, 20), vec3.fromValues(0, 5, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  
  // -------------------------------------------------------------------
  // Add controls to the gui
  const gui = new DAT.GUI();

  var postProcessType = 0;
  function setPostProcessType(){
    switch(controls.PostProcessingType){
      case 'Null': 
        postProcessType = -1;
        break;
      case 'Deferred':
        postProcessType = 0;
        break;
      default:
        break;
    }
  }
  gui.add(controls, 'PostProcessingType', ['Null', 'Deferred']).onChange(setPostProcessType);
  setPostProcessType();


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

    renderer.reflectionStage(camera, scene.sceneInfoTextures, scene.triangleCount, scene.textureSets, scene.environment);
    renderer.refractionStage(camera, scene.sceneInfoTextures, scene.triangleCount, scene.textureSets, scene.environment);
    renderer.raytraceComposeStage();
    
    
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
