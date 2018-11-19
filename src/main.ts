import {vec3, vec4, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Mesh from './geometry/Mesh';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import {readTextFile} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Texture from './rendering/gl/Texture';
import { GUI } from 'dat-gui';
import Icosphere from './geometry/Icosphere';
import { Scene } from './scene/scene';
import { buildKDTree } from './scene/BVH';


// Define an object with application parameters and button callbacks
const controls = {
  // Extra credit: Add interactivity
  PostProcessingType: 'Deferred',
};

let objString: string;
let tex: Texture;
let wahooTextures: Map<string, Texture>;
let tableTextures: Map<string, Texture>;
let cubeTextures: Map<string, Texture>;
let sphereTextures: Map<string, Texture>;
let envTextures: Map<string, Texture>;


let cubeMesh: Mesh;
let wahooMesh: Mesh;
let sphereMesh: Mesh;

let scene: Scene;


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
  scene && scene.destroy();
  scene = new Scene();

  let objString;
  let mesh;
  let textureSet;
  let texture;

  // load cube mesh 
  objString = loadOBJText('resources/obj/newCube.obj');
  mesh = new Mesh(objString, vec3.fromValues(0, 0, 0));
  mesh.create();
  scene.addMesh('cube', mesh);

  // load table mesh 
  objString = loadOBJText('resources/obj/newTable.obj');
  mesh = new Mesh(objString, vec3.fromValues(0, 0, 0));
  mesh.create();
  scene.addMesh('table', mesh);

  // load table texture
  textureSet = new Map<string, Texture>();
  texture = new Texture('resources/textures/marble.jpg');
  textureSet.set('tex_Albedo', texture);
  scene.addTextureSet('table', textureSet);

  // load sphere texture
  textureSet = new Map<string, Texture>();
  texture = new Texture('resources/textures/ice.jpg');
  textureSet.set('tex_Albedo', texture);
  scene.addTextureSet('ice', textureSet);

  // load sphere texture
  textureSet = new Map<string, Texture>();
  texture = new Texture('resources/textures/environment.jpg');
  textureSet.set('tex_Albedo', texture);
  scene.addTextureSet('environment', textureSet);

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

  const camera = new Camera(vec3.fromValues(0, 2, 10), vec3.fromValues(0, 2, 0));

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
    renderer.updateTime(timer.deltaTime, timer.currentTime);

    renderer.clear();
    renderer.clearGB();

    // ==============forward render mesh info into gbuffers================
    let modelMatrix = mat4.create();
    mat4.identity(modelMatrix);
  
     // render table
     renderer.renderToGBuffer(camera, [scene.getMesh('table')], scene.getTextureSet('table'));  
 
     // render cube
     renderer.renderToGBuffer(camera, [scene.getMesh('cube')], scene.getTextureSet('ice'));


    // ==============render from gbuffers into 32-bit color buffer=============
    renderer.renderFromGBuffer(camera);
    // apply 32-bit post and tonemap from 32-bit color to 8-bit color
  
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
