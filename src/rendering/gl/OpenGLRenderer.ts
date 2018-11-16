import {mat4, vec4, vec3, vec2} from 'gl-matrix';
import Drawable from './Drawable';
import Camera from '../../Camera';
import {gl} from '../../globals';
import ShaderProgram, {Shader} from './ShaderProgram';
import PostProcess from './PostProcess'
import Square from '../../geometry/Square';
import Icosphere from '../../geometry/Icosphere';
import Texture from '../../rendering/gl/Texture';

class OpenGLRenderer {
  gBuffer: WebGLFramebuffer; // framebuffer for deferred rendering

  gbTargets: WebGLTexture[]; // references to different 4-channel outputs of the gbuffer
                             // Note that the constructor of OpenGLRenderer initializes
                             // gbTargets[0] to store 32-bit values, while the rest
                             // of the array stores 8-bit values. You can modify
                             // this if you want more 32-bit storage.

  depthTexture: WebGLTexture; // You don't need to interact with this, it's just
                              // so the OpenGL pipeline can do depth sorting

  // --------------------------------                          
  // post-processing buffers pre-tonemapping (32-bit color)
  post32Buffers: WebGLFramebuffer[];
  post32Targets: WebGLTexture[];
  
  // another buffer for a parallel post processing pipeline
  post32BuffersTwo: WebGLFramebuffer[];
  post32TargetsTwo: WebGLTexture[];

  // original buffer render from g-buffer
  originalBufferFromGBuffer: WebGLFramebuffer;
  originalTargetFromGBuffer: WebGLTexture;

  // post-processing buffers post-tonemapping (8-bit color)
  post8Buffers: WebGLFramebuffer[];
  post8Targets: WebGLTexture[];

  // post processing shader lists, try to limit the number for performance reasons
  post8Passes: PostProcess[];
  post32Passes: PostProcess[];

  // TODO : add extra post 32 passes shaders
  post32PassesBloom: PostProcess[];

  post32PassesGodRay: PostProcess[];

  post32PassesCartoon: PostProcess[];
  cartoon_paper_texture: Texture;
  cartoon_frame_texture: Texture;

  post32PassesDigitalRain: PostProcess[];
  digital_rain_font_texture: Texture;

  currentTime: number; // timer number to apply to all drawing shaders

  // the shader that renders from the gbuffers into the postbuffers
  deferredShader :  PostProcess = new PostProcess(
    new Shader(gl.FRAGMENT_SHADER, require('../../shaders/deferred-render.glsl'))
    );

  // shader that maps 32-bit color to 8-bit color
  tonemapPass : PostProcess = new PostProcess(
    new Shader(gl.FRAGMENT_SHADER, require('../../shaders/tonemap-frag.glsl'))
    );
  
  // occlusion shader used in God ray effect
  occlusionShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('../../shaders/occlusion-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('../../shaders/occlusion-frag.glsl')),
    ]);

  add8BitPass(passesList: PostProcess[], pass: PostProcess) {
    // this.post8Passes.push(pass);
    passesList.push(pass);
  }


  add32BitPass(passesList: PostProcess[], pass: PostProcess) {
    // this.post32Passes.push(pass);
    passesList.push(pass);
  }


  constructor(public canvas: HTMLCanvasElement) {
    this.currentTime = 0.0;
    this.gbTargets = [undefined, undefined, undefined];
    this.post8Buffers = [undefined, undefined];
    this.post8Targets = [undefined, undefined];
    this.post8Passes = [];

    // The first buffer / target gonna be the original one from gbuffer
    // The second & thrid buffer gonna ping-pong buffer
    this.post32Buffers = [undefined, undefined];
    this.post32Targets = [undefined, undefined];

    this.post32BuffersTwo = [undefined, undefined];
    this.post32TargetsTwo = [undefined, undefined];

    this.post32Passes = [];

    this.post32PassesBloom = [];

    this.post32PassesGodRay = [];

    this.post32PassesCartoon = [];

    this.post32PassesDigitalRain = [];


    // TODO: these are placeholder post shaders, replace them with something good
    // --------------------------------
    // Default passes
    this.add8BitPass(this.post8Passes, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/examplePost-frag.glsl'))));
    this.add8BitPass(this.post8Passes, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/examplePost2-frag.glsl'))));

    this.add32BitPass(this.post32Passes, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/examplePost3-frag.glsl'))));

    // --------------------------------
    // Bloom passes
    // brightness filter
    this.add32BitPass(this.post32PassesBloom, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/brightnessFilterRTT-frag.glsl'))));
    // horizontal gaussian blur
    this.add32BitPass(this.post32PassesBloom, 
                      new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/blurRTT-frag.glsl')),
                                      require('../../shaders/horizontalBlurRTT-vert.glsl'), 
                                      'Bloom'));
    // vertical gaussian blur
    this.add32BitPass(this.post32PassesBloom, 
                      new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/blurRTT-frag.glsl')),
                                      require('../../shaders/verticalBlurRTT-vert.glsl'), 
                                      'Bloom'));
    // combine
    this.add32BitPass(this.post32PassesBloom, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/combineFragment-frag.glsl'))));
    

    // --------------------------------
    // Godray passes
    // sample in screen space light direction
    this.add32BitPass(this.post32PassesGodRay, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/godray-frag.glsl'))));
    // combine
    this.add32BitPass(this.post32PassesGodRay, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/combineFragment-frag.glsl'))));
     
    // ---------------------------------
    // Cartoon passes
    // sobel edge detection
    this.add32BitPass(this.post32PassesCartoon, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/sobeledgedetection-frag.glsl'))));
    // Kuwahara effects
    this.add32BitPass(this.post32PassesCartoon, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/kuwahara-frag.glsl'))));
    this.cartoon_paper_texture = new Texture('resources/textures/paper.jpg');
    this.post32PassesCartoon[1].setupTexUnits(["tex_Paper"]);
    // combine and add a frame
    this.add32BitPass(this.post32PassesCartoon, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/combineMultiAddFrameFragment-frag.glsl'))));
    this.cartoon_frame_texture = new Texture('resources/textures/frame.png');        
    this.post32PassesCartoon[2].setupTexUnits(["tex_Frame"]);
    
    // ---------------------------------
    // Digital Rian passes
    this.add32BitPass(this.post32PassesDigitalRain, new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/digitalrain-frag.glsl'))));
    this.digital_rain_font_texture = new Texture('resources/textures/fonts.jpg');
    this.post32PassesDigitalRain[0].setupTexUnits(["tex_digitalRainFont"]);
    

    if (!gl.getExtension("OES_texture_float_linear")) {
      console.error("OES_texture_float_linear not available");
    }

    if (!gl.getExtension("EXT_color_buffer_float")) {
      console.error("FLOAT color buffer not available");
    }

    var gb0loc = gl.getUniformLocation(this.deferredShader.prog, "u_gb0");
    var gb1loc = gl.getUniformLocation(this.deferredShader.prog, "u_gb1");
    var gb2loc = gl.getUniformLocation(this.deferredShader.prog, "u_gb2");

    this.deferredShader.use();
    gl.uniform1i(gb0loc, 0);
    gl.uniform1i(gb1loc, 1);
    gl.uniform1i(gb2loc, 2);
  }

  setDeferShadingType(type: number){
    this.deferredShader.setShadingType(type);
  }

  setDeferBgType(type: number){
    this.deferredShader.setBackGroundType(type);
  }

  // --------------------------------                          
  setBloomCombineParas(w1: number, w2: number){
    this.post32PassesBloom[3].setOriginalSceneWeight(w1);
    this.post32PassesBloom[3].setHighLightWeight(w2);
  }

  setGodRayDensity(d: number){
    this.post32PassesGodRay[0].setGodRayDensity(d);
  }

  setGodRayWeight(w: number){
    this.post32PassesGodRay[0].setGodRayWeight(w);
  }

  setGodRayDecay(d: number){
    this.post32PassesGodRay[0].setGodRayDecay(d);
  }

  setGodRayExposure(e: number){
    this.post32PassesGodRay[0].setGodRayExposure(e);
  }

  setGodRayNumSamples(n: number){
    this.post32PassesGodRay[0].setGodRaySamples(n);
  }

  setGodRayCombineParas(w1: number, w2: number){
    this.post32PassesGodRay[1].setOriginalSceneWeight(w1);
    this.post32PassesGodRay[1].setHighLightWeight(w2);
  }

  setCartoonEdgeThickness(t: number){
    this.post32PassesCartoon[0].setCartoonEdgeThickness(t);
  }

  setCartoonKuwaharaRadius(r: number){
    this.post32PassesCartoon[1].setCartoonKuwaharaRadius(r);
  }

  setDigitalRainFallSpeed(s: number){
    this.post32PassesDigitalRain[0].setDigitalRainFallSpeed(s);
  }

  setClearColor(r: number, g: number, b: number, a: number) {
    gl.clearColor(r, g, b, a);
  }


  setSize(width: number, height: number) {
    console.log(width, height);
    this.canvas.width = width;
    this.canvas.height = height;

    this.deferredShader.setWidth(width);
    this.deferredShader.setHeight(height);

    // set Bloom passes size
    this.post32PassesBloom[1].setWidth(width); //horizontal blur pass
    this.post32PassesBloom[2].setHeight(height); //vertical blur pass
    
    // set Cartoon passes size
    this.post32PassesCartoon[0].setWidth(width); // sobel edge detection
    this.post32PassesCartoon[0].setHeight(height); // sobel edge detection

    this.post32PassesCartoon[1].setWidth(width); // kuwahara
    this.post32PassesCartoon[1].setHeight(height); // kuwahara

    // set Digital rain size
    this.post32PassesDigitalRain[0].setWidth(width); // digital rain
    this.post32PassesDigitalRain[0].setHeight(height); // digital rain


    // --- GBUFFER CREATION START ---
    // refresh the gbuffers
    this.gBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);

    for (let i = 0; i < this.gbTargets.length; i ++) {
      this.gbTargets[i] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.gbTargets[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // Attention! 
      // we only make the gbTargets[0] a RGBA 32bits buffer!
      if (i == 0) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
      }
      // the rest gbTargets are RGBA 8 bits!
      else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, this.gbTargets[i], 0);
    }

    // depth attachment
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);

    var FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
        console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use FBO[0]\n");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // create the framebuffers for post processing

    // --------------------------------                          
    // origin buffer and texture from g-buffer
    this.originalBufferFromGBuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.originalBufferFromGBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.originalTargetFromGBuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.originalTargetFromGBuffer);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.originalTargetFromGBuffer, 0);

    FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
      console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
    }

    for (let i = 0; i < this.post8Buffers.length; i++) {
      // --------------------------------                          
      // 8 bit buffers have unsigned byte textures of type gl.RGBA8
      this.post8Buffers[i] = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.post8Buffers[i]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

      this.post8Targets[i] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.post8Targets[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.post8Targets[i], 0);

      FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
        console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
      }

      // --------------------------------                                
      // Post Process Pipeline 1
      // 32 bit buffers have float textures of type gl.RGBA32F
      this.post32Buffers[i] = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[i]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

      this.post32Targets[i] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.post32Targets[i], 0);

      FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
        console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
      }

      // --------------------------------                                
      // Post Process Pipeline 2
      // 32 bit buffers have float textures of type gl.RGBA32F
      this.post32BuffersTwo[i] = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32BuffersTwo[i]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

      this.post32TargetsTwo[i] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.post32TargetsTwo[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.post32TargetsTwo[i], 0);

      FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
        console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }


  updateTime(deltaTime: number, currentTime: number) {
    this.deferredShader.setTime(currentTime);
    for (let pass of this.post8Passes) pass.setTime(currentTime);
    for (let pass of this.post32Passes) pass.setTime(currentTime);
    
    // set time to drive digital rain post-process
    for(let pass of this.post32PassesDigitalRain) pass.setTime(currentTime);

    this.currentTime = currentTime;
  }


  clear() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }


  clearGB() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }


  renderToGBuffer(camera: Camera, gbProg: ShaderProgram, drawables: Array<Drawable>) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.enable(gl.DEPTH_TEST);

    let model = mat4.create();
    let viewProj = mat4.create();
    let view = camera.viewMatrix;
    let proj = camera.projectionMatrix;
    let color = vec4.fromValues(0.5, 0.5, 0.5, 1);

    mat4.identity(model);
    mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
    gbProg.setModelMatrix(model);
    gbProg.setViewProjMatrix(viewProj);
    gbProg.setGeometryColor(color);
    gbProg.setViewMatrix(view);
    gbProg.setProjMatrix(proj);

    gbProg.setTime(this.currentTime);

    for (let drawable of drawables) {
      gbProg.draw(drawable);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  renderFromGBuffer(camera: Camera) {
    // gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[0]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.originalBufferFromGBuffer);
    
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let view = camera.viewMatrix;
    let proj = camera.projectionMatrix;
    this.deferredShader.setViewMatrix(view);
    this.deferredShader.setProjMatrix(proj);

    for (let i = 0; i < this.gbTargets.length; i ++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.gbTargets[i]);
    }

    this.deferredShader.draw();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }


  // TODO: pass any info you need as args
  renderPostProcessHDR(postProcessType: number) {
    // TODO: replace this with your post 32-bit pipeline
    // the loop shows how to swap between frame buffers and textures given a list of processes,
    // but specific shaders (e.g. bloom) need specific info as textures
    
    // select which post32Passes group to use
    let thisPost32Passes: PostProcess[] = [];
    let thisPost8Passes: PostProcess[] = [];

    switch(postProcessType){
      // Default post process
      case 0:
        thisPost32Passes = this.post32Passes;
        thisPost8Passes  = this.post8Passes;
        break;
      // Bloom post process
      case 1:
        thisPost32Passes = this.post32PassesBloom;
        break;
      // God ray post process
      case 2:
        thisPost32Passes = this.post32PassesGodRay;
        break;
      // Cartoon style post process
      case 3:
        thisPost32Passes = this.post32PassesCartoon;
        break;
      // Digital rain post process
      case 4:
        thisPost32Passes = this.post32PassesDigitalRain;
        break;
      default:
        break;
    }
    let i = 0;

    // --------------------------------                              
    // Two parallel post process pipeline 
    if(postProcessType == 3){
      // Edge detection pass
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[0]);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.originalTargetFromGBuffer);  
      thisPost32Passes[0].draw();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // Kuwahara
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32BuffersTwo[0]);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.originalTargetFromGBuffer);  
      this.post32PassesCartoon[1].bindTexToUnit("tex_Paper", this.cartoon_paper_texture, 2);
      thisPost32Passes[1].draw();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // Combine
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[1]);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[0]); 
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.post32TargetsTwo[0]); 
      this.post32PassesCartoon[2].bindTexToUnit("tex_Frame", this.cartoon_frame_texture, 3);
      thisPost32Passes[2].draw();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      i = 3;
    }

    // --------------------------------                          
    // Single post process pipeline 
    // for Default, Bloom, God ray post porcesses
    else{
      for (i = 0; i < thisPost32Passes.length; i++){
        // Pingpong framebuffers for each pass.
        // In other words, repeatedly flip between storing the output of the
        // current post-process pass in post32Buffers[1] and post32Buffers[0].
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[(i + 1) % 2]);

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Recall that each frame buffer is associated with a texture that stores
        // the output of a render pass. post32Targets is the array that stores
        // these textures, so we alternate reading from the 0th and 1th textures
        // each frame (the texture we wrote to in our previous render pass).
        gl.activeTexture(gl.TEXTURE0);
        // default / bloom / digital rain post process passes need to start from 
        // the orignal G-buffer render
        if(i == 0 && (postProcessType == 0 || postProcessType == 1 || postProcessType == 4)){
          gl.bindTexture(gl.TEXTURE_2D, this.originalTargetFromGBuffer);        
        }
        else{
          gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[(i) % 2]);
        }

        // final pass of Bloom post-process
        // we need to bind another texture, which is the orginal render
        if(i == thisPost32Passes.length - 1 && postProcessType == 1){
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, this.originalTargetFromGBuffer);                
        }

        // final pass of God ray post-process
        // we need to bind another texture, which is the orginal render
        if(i == thisPost32Passes.length - 1 && postProcessType == 2){
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, this.originalTargetFromGBuffer);                
        }

        // first pass of digital ray
        // bind digital rain fonts texture
        if(i == 0 && postProcessType == 4){
          this.post32PassesDigitalRain[0].bindTexToUnit("tex_digitalRainFont", this.digital_rain_font_texture, 1);          
        }


        thisPost32Passes[i].draw();

        // bind default frame buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    }


    // --------------------------------                          
    // apply tonemapping
    // TODO: if you significantly change your framework, ensure this doesn't cause bugs!
    // render to the first 8 bit buffer if there is more post, else default buffer
    if (thisPost8Passes.length > 0) {
       gl.bindFramebuffer(gl.FRAMEBUFFER, this.post8Buffers[0]);
    }
    else {
       gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    // bound texture is the last one processed before
    if(i == 0){
      gl.bindTexture(gl.TEXTURE_2D, this.originalTargetFromGBuffer);      
    }
    else{
      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[Math.max(0, i) % 2]);      
    }

    this.tonemapPass.draw();
  }


  // TODO: pass any info you need as args
  renderPostProcessLDR(postProcessType: number) {

    // select which post32Passes group to use
    let thisPost8Passes: PostProcess[] = [];
    switch(postProcessType){
      // default post process
      case 0:
        thisPost8Passes  = this.post8Passes;
        break;
      default:
        break;
    }

    // TODO: replace this with your post 8-bit pipeline
    // the loop shows how to swap between frame buffers and textures given a list of processes,
    // but specific shaders (e.g. motion blur) need specific info as textures
    for (let i = 0; i < thisPost8Passes.length; i++){
      // pingpong framebuffers for each pass
      // if this is the last pass, default is bound
      if (i < thisPost8Passes.length - 1) gl.bindFramebuffer(gl.FRAMEBUFFER, this.post8Buffers[(i + 1) % 2]);
      else gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.post8Targets[(i) % 2]);

      thisPost8Passes[i].draw();

      // bind default
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  
  // render an occlusion texture for God ray post processing
  renderOcculusion(camera: Camera, lightSphere: Icosphere, drawables: Array<Drawable>) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[0]);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let model = mat4.create();
    let viewProj = mat4.create();

    mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
    this.occlusionShader.setViewProjMatrix(viewProj);

    // MOVE GOD RAY LIGHT SPHERE HERE!
    // update light sphere model matrix
    let rotCenterOfLight = vec3.fromValues(0.0, -9.0, -5.0);
    let rotRadiusOfLight = 7.0;
    let newPos = vec3.fromValues(rotCenterOfLight[0] + rotRadiusOfLight * Math.cos(0.5 * this.currentTime),
                                 rotCenterOfLight[1] + rotRadiusOfLight * Math.sin(0.5 * this.currentTime),
                                 rotCenterOfLight[2]);
    mat4.translate(model, model, newPos);

    // to draw an occlusion texture, 
    // this color is important
    // set light color as white
    this.occlusionShader.setGeometryColor(vec4.fromValues(1.0, 1.0, 1.0, 1.0));
    
    this.occlusionShader.setModelMatrix(model); 

    this.occlusionShader.draw(lightSphere);    

    // update later post-process screen space light position
    let lightPos = vec4.fromValues(lightSphere.center[0] + newPos[0],
                                   lightSphere.center[1] + newPos[1],
                                   lightSphere.center[2] + newPos[2],
                                   1.0);
    vec4.transformMat4(lightPos, lightPos, viewProj);
    vec4.scale(lightPos, lightPos, 1.0 / lightPos[3]);
    vec4.add(lightPos, lightPos, vec4.fromValues(1.0, 1.0, 0.0, 0.0));
    vec4.scale(lightPos, lightPos, 0.5);
    this.post32PassesGodRay[0].setGodRayScreenSpaceLightPos(vec2.fromValues(lightPos[0], lightPos[1]));

    // set model matrix back to identity matrix to draw noraml scene
    mat4.identity(model); 
    // this is occuluded geometry color
    // we directly draw it black
    this.occlusionShader.setGeometryColor(vec4.fromValues(0.0, 0.0, 0.0, 1.0));    
    
    for (let drawable of drawables) {
      this.occlusionShader.setModelMatrix(model);      
      this.occlusionShader.draw(drawable);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

};

export default OpenGLRenderer;
