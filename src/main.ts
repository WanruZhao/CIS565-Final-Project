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
let wallTextures: Map<string, Texture>;


let cubeMesh: Mesh;
let wahooMesh: Mesh;
let sphereMesh: Mesh;


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
  wahooMesh && wahooMesh.destroy();
  cubeMesh && cubeMesh.destroy();
  sphereMesh && sphereMesh.destroy();

  // load wahoo mesh
  objString = loadOBJText('resources/obj/wahoo.obj');
  wahooMesh = new Mesh(objString, vec3.fromValues(0, 0, 0));
  wahooMesh.create();

  // load cube mesh
  objString = loadOBJText('resources/obj/cube.obj');
  cubeMesh = new Mesh(objString, vec3.fromValues(0, 0, 0));
  cubeMesh.create();

  // loade sphere mesh
  objString = loadOBJText('resources/obj/sphere.obj');
  sphereMesh = new Mesh(objString, vec3.fromValues(0, 0, 0));
  sphereMesh.create();


  // load wahoo textures
  wahooTextures = new Map<string, Texture>();
  let wahooAlbedoTex = new Texture('resources/textures/wahoo.bmp');
  wahooTextures.set('tex_Albedo', wahooAlbedoTex);

  // load table textures
  tableTextures = new Map<string, Texture>();
  let tableAlbedoTex = new Texture('resources/textures/marble.jpg');
  tableTextures.set('tex_Albedo', tableAlbedoTex);

  // load cube textures
  cubeTextures = new Map<string, Texture>();
  let cubeAlbedoTex = new Texture('resources/textures/ice.jpg');
  cubeTextures.set('tex_Albedo', cubeAlbedoTex);

  // load sphere textures
  sphereTextures = new Map<string, Texture>();
  let sphereAlbedoTex = new Texture('resources/textures/wahoo.bmp');
  sphereTextures.set('tex_Albedo', sphereAlbedoTex);

  // load cube textures
  wallTextures = new Map<string, Texture>();
  let wallAlbedoTex = new Texture('resources/textures/wall.jpg');
  wallTextures.set('tex_Albedo', wallAlbedoTex);
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

  const camera = new Camera(vec3.fromValues(0, 9, 25), vec3.fromValues(0, 9, 0));

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
    // render table
    mat4.fromScaling(modelMatrix, vec3.fromValues(20, 3, 20));
    mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0.0, 2.0, 0.0));
    renderer.renderToGBuffer(camera, [cubeMesh], tableTextures, modelMatrix);  

    // render cube
    mat4.fromScaling(modelMatrix, vec3.fromValues(3, 3, 3));
    mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0.0, 3.0, 0.0));
    renderer.renderToGBuffer(camera, [cubeMesh], cubeTextures, modelMatrix);
    
    mat4.fromScaling(modelMatrix, vec3.fromValues(4, 6, 4));
    mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(1.5, 1.7, 1.5));
    renderer.renderToGBuffer(camera, [cubeMesh], cubeTextures, modelMatrix);     

    // render wall
    mat4.fromScaling(modelMatrix, vec3.fromValues(50, 20, 50));
    mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0, 0.7, 0));
    renderer.renderToGBuffer(camera, [cubeMesh], wallTextures, modelMatrix);     

    // render sphere
    mat4.fromScaling(modelMatrix, vec3.fromValues(4, 4, 4));
    mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0.0, 3.0, 0.0));
    renderer.renderToGBuffer(camera, [sphereMesh], cubeTextures, modelMatrix);

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
