import {vec3, vec4} from 'gl-matrix';
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

const maxTextureSize : number = 4096;

// Define an object with application parameters and button callbacks
const controls = {
  // Extra credit: Add interactivity
  PostProcessingType: 'Deferred',
};

let obj0: string;
let mesh0: Mesh;
let tex0: Texture;

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


function loadOBJText() {
  obj0 = readTextFile('resources/obj/wahoo.obj');
}


function loadScene() {
  meshes = [];
  triangleCount = 0;

  mesh0 && mesh0.destroy();

  mesh0 = new Mesh(obj0, vec3.fromValues(0, 0, 0));
  mesh0.create();

  tex0 = new Texture('resources/textures/wahoo.bmp');

  meshes.push(mesh0);
  triangleCount = triangleCount + mesh0.count / 3;

  console.log("triangle count = " + triangleCount);

  // create texture for scene information
  sceneInfo = [];
  let maxTriangleCountPerTexture = maxTextureSize * Math.floor(maxTextureSize / 6);
  let sceneTexCount = Math.ceil(triangleCount / maxTriangleCountPerTexture);
  for(let i = 0; i < sceneTexCount; i++) {
    if(i == sceneTexCount - 1) {
      sceneInfo.push(new TextureBuffer(triangleCount - maxTriangleCountPerTexture * i, 2, maxTextureSize));
    }
    else {
      sceneInfo.push(new TextureBuffer(maxTriangleCountPerTexture, 2, maxTextureSize));
    }
  }

  // store position and normal info into texture
  let currentCount = 0;
  for(let i = 0; i < meshes.length; i++) {
    for(let j = 0; j < meshes[i].count / 3; j++) {
      let vertexIdx = [meshes[i].indices[j * 3], meshes[i].indices[j * 3 + 1], meshes[i].indices[j * 3 + 2]];
      let textureIdx = Math.floor((currentCount + j) / maxTriangleCountPerTexture);
      let localTriangleIdx = currentCount + j - textureIdx * maxTriangleCountPerTexture;

      for(let k = 0; k < 3; k++) {
        // position
        sceneInfo[textureIdx]._buffer[sceneInfo[textureIdx].bufferIndex(localTriangleIdx, 0, k, 0)] = meshes[i].positions[3 * vertexIdx[k]];
        sceneInfo[textureIdx]._buffer[sceneInfo[textureIdx].bufferIndex(localTriangleIdx, 0, k, 1)] = meshes[i].positions[3 * vertexIdx[k] + 1];
        sceneInfo[textureIdx]._buffer[sceneInfo[textureIdx].bufferIndex(localTriangleIdx, 0, k, 2)] = meshes[i].positions[3 * vertexIdx[k] + 2];
        sceneInfo[textureIdx]._buffer[sceneInfo[textureIdx].bufferIndex(localTriangleIdx, 0, k, 3)] = 1.0;

        // normal
        sceneInfo[textureIdx]._buffer[sceneInfo[textureIdx].bufferIndex(localTriangleIdx, 1, k, 0)] = meshes[i].normals[3 * vertexIdx[k]];
        sceneInfo[textureIdx]._buffer[sceneInfo[textureIdx].bufferIndex(localTriangleIdx, 1, k, 1)] = meshes[i].normals[3 * vertexIdx[k] + 1];
        sceneInfo[textureIdx]._buffer[sceneInfo[textureIdx].bufferIndex(localTriangleIdx, 1, k, 2)] = meshes[i].normals[3 * vertexIdx[k] + 2];
        sceneInfo[textureIdx]._buffer[sceneInfo[textureIdx].bufferIndex(localTriangleIdx, 1, k, 3)] = 0.0;
      }

    }
    currentCount = currentCount + meshes[i].count / 3;
  }

  for(let i = 0; i < sceneInfo.length; i++) {
    sceneInfo[i].update();
  }
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

    //renderer.renderToGBuffer(camera, [mesh0], tex0);      
    //renderer.renderFromGBuffer(camera);
    renderer.rayCast(camera);

  
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
  loadOBJText();
  main();
}

setup();
