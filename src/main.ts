import {vec3, vec4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import Mesh from './geometry/Mesh';
import Icosphere from './geometry/Icosphere';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import {readTextFile} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Texture from './rendering/gl/Texture';
import { GUI } from 'dat-gui';


// Define an object with application parameters and button callbacks
const controls = {
  // Extra credit: Add interactivity
  ShadingType: 'Lambert',
  BackgroundType: 'Background1',
  PostProcessingType: 'Cartoon',

  // Bloom
  BloomOriWeight: 0.8,
  BloomHighLightWeight: 2.5,

  // God ray
  Density: 1.05,
  Weight: 0.01,
  Decay: 0.97,
  Exposure: 2.05,
  NumSamples: 100,
  GodRayOriWeight: 0.8,
  GodRayHighLightWeight: 1.7,

  // Cartoon
  EdgeThickness: 1.3,
  KuwaharaRadius: 5.0,

  // Digital Rain
  FallSpeed: 1.0,
};

let square: Square;
let sphere: Icosphere;


// TODO: replace with your scene's stuff

let obj0: string;
let mesh0: Mesh;

let tex0: Texture;

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
  square && square.destroy();
  mesh0 && mesh0.destroy();
  sphere && sphere.destroy();

  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();

  mesh0 = new Mesh(obj0, vec3.fromValues(0, 0, 0));
  mesh0.create();

  sphere = new Icosphere(vec3.fromValues(0.0, 18.0, 0.0), 1.0, 6.0);
  sphere.create();

  tex0 = new Texture('resources/textures/wahoo.bmp');
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
  const standardDeferred = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/standard-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/standard-frag.glsl')),
    ]);

  standardDeferred.setupTexUnits(["tex_Color"]);
  


  // -------------------------------------------------------------------
  // Add controls to the gui
  const gui = new DAT.GUI();

  function setDeferShadingType(){
    switch(controls.ShadingType){
      case 'Lambert':
        renderer.setDeferShadingType(0);
        break;
      case 'Ramp':
        renderer.setDeferShadingType(1);
        break;
      default:
        break;
    }
  }
  gui.add(controls, 'ShadingType', ['Lambert', 'Ramp']).onChange(setDeferShadingType);
  setDeferShadingType();

  function setBackgroundType(){
    switch(controls.BackgroundType){
      case 'Null':
        renderer.setDeferBgType(0);
        break;
      case 'Background1':
        renderer.setDeferBgType(1);
        break;
      case 'Background2':
        renderer.setDeferBgType(2);
        break;
      default:
        break;
    }
  }
  gui.add(controls, 'BackgroundType', ['Null', 'Background1', 'Background2']).onChange(setBackgroundType);
  setBackgroundType();


  var postProcessType = 0;
  function setPostProcessType(){
    switch(controls.PostProcessingType){
      case 'Null': 
        postProcessType = -1;
        break;
      case 'Default':
        postProcessType = 0;
        break;
      case 'Bloom':
        postProcessType = 1;
        break;
      case 'GodRay':
        postProcessType = 2;
        break;
      case 'Cartoon':
        postProcessType = 3;
        break;
      case 'DigitalRain':
        postProcessType = 4;
        break;
      default:
        break;
    }
  }
  gui.add(controls, 'PostProcessingType', ['Null', 'Default', 'Bloom', 'GodRay', 'Cartoon', 'DigitalRain']).onChange(setPostProcessType);
  setPostProcessType();


  // Bloom paras folder
  function setBloomCombineParas(){
    renderer.setBloomCombineParas(controls.BloomOriWeight, controls.BloomHighLightWeight);
  }
  setBloomCombineParas();
  
  var f1 = gui.addFolder('Bloom Paras');
  f1.add(controls, 'BloomOriWeight', 0.0, 1.0).step(0.1).onChange(setBloomCombineParas);
  f1.add(controls, 'BloomHighLightWeight', 0.0, 5.0).step(0.1).onChange(setBloomCombineParas);  
  f1.close();  


  // God ray paras folder
  function setGodRayDensity(){
    renderer.setGodRayDensity(controls.Density);
  }
  setGodRayDensity();

  function setGodRayWeight(){
    renderer.setGodRayWeight(controls.Weight);
  }
  setGodRayWeight();

  function setGodRayDecay(){
    renderer.setGodRayDecay(controls.Decay);
  }
  setGodRayDecay();

  function setGodRayExposure(){
    renderer.setGodRayExposure(controls.Exposure);
  }
  setGodRayExposure();

  function setGodRaySamples(){
    renderer.setGodRayNumSamples(controls.NumSamples);
  }
  setGodRaySamples();

  function setGodRayCombineParas(){
    renderer.setGodRayCombineParas(controls.GodRayOriWeight, controls.GodRayHighLightWeight);
  }
  setGodRayCombineParas();

  var f2 = gui.addFolder('God Ray Paras');
  f2.add(controls, 'Density', 0.0, 2.0).step(0.01).onChange(setGodRayDensity);
  f2.add(controls, 'Weight', 0.0, 0.1).step(0.01).onChange(setGodRayWeight);  
  f2.add(controls, 'Decay', 0.95, 1.05).step(0.01).onChange(setGodRayDecay);  
  f2.add(controls, 'Exposure', 0.0, 3.0).step(0.01).onChange(setGodRayExposure);  
  f2.add(controls, 'NumSamples', 1, 100).step(1).onChange(setGodRaySamples);    
  f2.add(controls, 'GodRayOriWeight', 0.0, 1.0).step(0.1).onChange(setGodRayCombineParas);
  f2.add(controls, 'GodRayHighLightWeight', 0.0, 5.0).step(0.1).onChange(setGodRayCombineParas);  
  f2.close();  


  // Cartoon paras folder
  function setCartoonEdgeThickness(){
    renderer.setCartoonEdgeThickness(controls.EdgeThickness);
  }
  setCartoonEdgeThickness();

  function setCartoonKuwahara(){
    renderer.setCartoonKuwaharaRadius(controls.KuwaharaRadius);
  }
  setCartoonKuwahara();

  var f3 = gui.addFolder('Cartoon Paras');
  f3.add(controls, 'EdgeThickness', 0.1, 5.0).step(0.1).onChange(setCartoonEdgeThickness);
  f3.add(controls, 'KuwaharaRadius', 2.0, 7.0).step(1.0).onChange(setCartoonKuwahara);
  f3.close();


  // Digital Rain paras folder
  function setDigitalRainFallSpeed(){
    renderer.setDigitalRainFallSpeed(controls.FallSpeed);
  }
  setDigitalRainFallSpeed();
  var f4 = gui.addFolder('Digital Rain Paras');
  f4.add(controls, 'FallSpeed', 0.1, 3.0).step(0.1).onChange(setDigitalRainFallSpeed);  
  f4.close();

  // -------------------------------------------------------------------
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    timer.updateTime();
    renderer.updateTime(timer.deltaTime, timer.currentTime);

    standardDeferred.bindTexToUnit("tex_Color", tex0, 0);

    renderer.clear();
    renderer.clearGB();

    // TODO: pass any arguments you may need for shader passes

    // If it's God ray post process, we need to add an extra occlusion pass
    if(postProcessType == 2){
      // renderer.renderOcculusion(camera, sphere, []);
      renderer.renderOcculusion(camera, sphere, [mesh0]);      
    }

    // forward render mesh info into gbuffers
    renderer.renderToGBuffer(camera, standardDeferred, [mesh0]);      
    // render from gbuffers into 32-bit color buffer
    renderer.renderFromGBuffer(camera);
    // apply 32-bit post and tonemap from 32-bit color to 8-bit color
    renderer.renderPostProcessHDR(postProcessType);
    // apply 8-bit post and draw
    renderer.renderPostProcessLDR(postProcessType);

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
