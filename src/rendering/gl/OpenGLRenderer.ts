import {mat4, vec4, vec3, vec2} from 'gl-matrix';
import Drawable from './Drawable';
import Camera from '../../Camera';
import {gl} from '../../globals';
import ShaderProgram, {Shader} from './ShaderProgram';
import Square from '../../geometry/Square';
import Icosphere from '../../geometry/Icosphere';
import Texture, {TextureBuffer, BVHTextureBuffer} from '../../rendering/gl/Texture';
import GBufferPass from './passes/GBufferPass';
import DeferredPass from './passes/DeferredPass';
import RaycastPass from './passes/RaycastPass';
import ShadowPass from './passes/ShadowPass';
import ReflectionPass from './passes/ReflectionPass';
import RefractionPass from './passes/RefractionPass';
import RaytraceComposePass from './passes/RaytraceComposePass';

import { debug } from 'util';
import { reverse } from 'dns';
import { Material } from '../../scene/scene';
import Mesh from '../../geometry/Mesh';
import DOFPass from './passes/DOFPass';
import GlowPass from './passes/GlowPass';
import SSAAPass from './passes/SSAAPass';

class OpenGLRenderer {

  lightPos: vec4 = vec4.fromValues(0.0, 10.0, 0.0, 1.0); // currently one light

  depthTexture: WebGLTexture; 

  // --------------------------------                          
  //original buffer render from g-buffer
  originalBufferFromGBuffer: WebGLFramebuffer;
  originalTargetFromGBuffer: WebGLTexture;

  currentTime: number; // timer number to apply to all drawing shaders

  // the shader that renders from the gbuffers into the postbuffers
  gBufferPass: GBufferPass;
  gBuffer: WebGLFramebuffer;
  gbTargets: WebGLTexture[]; 

  deferredPass: DeferredPass;

  // raytrace passes
  raycastPass: RaycastPass;
  raycastBuffer: WebGLFramebuffer;
  raycastTarget: WebGLTexture;

  // shadow pass
  shadowPass: ShadowPass;
  shadowBuffer: WebGLFramebuffer;
  shadowTarget: WebGLTexture;

  // reflection pass
  reflectionPass: ReflectionPass;
  reflectionBuffer: WebGLFramebuffer;
  reflectionTarget: WebGLTexture;

  // refraction pass
  refractionPass: RefractionPass;
  refractionBuffer: WebGLFramebuffer;
  refractionTarget: WebGLTexture;

  // raytrace-compose pass
  raytraceComposePass: RaytraceComposePass;
  raytraceComposeBuffer: WebGLFramebuffer;
  raytraceComposeTarget: WebGLTexture;

  // ---------------post process passes------------------------

  // ssaa
  ssaaPass: SSAAPass;
  ssaaBuffer: WebGLFramebuffer;
  ssaaTarget: WebGLTexture;

  // depth of field
  dofPass: DOFPass;
  dofBuffer: WebGLFramebuffer;
  dofTarget: WebGLTexture;

  // glow
  glowSourcePass: GlowPass;
  glowSourceBuffer: WebGLFramebuffer;
  glowSourceTarget: WebGLTexture;
  glowPass : GlowPass;
  glowBuffer: WebGLFramebuffer;
  glowTarget: WebGLTexture;


  constructor(public canvas: HTMLCanvasElement) {
    this.currentTime = 0.0;
    this.gbTargets = [undefined, undefined, undefined, undefined];  // 4 gbuffer texture for now

    // set up gBufferPass    
    this.gBufferPass = new GBufferPass(require('../../shaders/standard-vert.glsl'), 
                                      require('../../shaders/standard-frag.glsl'));

    // set up deferredPass
    this.deferredPass = new DeferredPass(require('../../shaders/screenspace-vert.glsl'), 
                                        require('../../shaders/deferred-render.glsl'));

    var gb0loc = gl.getUniformLocation(this.deferredPass.prog, "u_gb0");
    var gb1loc = gl.getUniformLocation(this.deferredPass.prog, "u_gb1");
    var gb2loc = gl.getUniformLocation(this.deferredPass.prog, "u_gb2");
    var gb3loc = gl.getUniformLocation(this.deferredPass.prog, "u_gb3");
    var envloc = gl.getUniformLocation(this.deferredPass.prog, "u_EnvMap");
    

    this.deferredPass.use();
    gl.uniform1i(gb0loc, 0);
    gl.uniform1i(gb1loc, 1);
    gl.uniform1i(gb2loc, 2);
    gl.uniform1i(gb3loc, 3);
    gl.uniform1i(envloc, 4);
    

    // set up raycast pass
    this.raycastPass = new RaycastPass(require('../../shaders/screenspace-vert.glsl'),
    require('../../shaders/raycast.frag.glsl'));

    // set up shadow pass
    this.shadowPass = new ShadowPass(require('../../shaders/screenspace-vert.glsl'),
    require('../../shaders/shadow.frag.glsl'));

    this.shadowPass.unifPos = gl.getUniformLocation(this.shadowPass.prog, "u_Pos");
    this.shadowPass.unifNor = gl.getUniformLocation(this.shadowPass.prog, "u_Nor");
    this.shadowPass.unifSceneInfo = gl.getUniformLocation(this.shadowPass.prog, "u_SceneInfo");
    this.shadowPass.unifAlbedo = gl.getUniformLocation(this.shadowPass.prog, "u_Albedo");
    this.shadowPass.unifBVH = gl.getUniformLocation(this.shadowPass.prog, "u_BVH");

    this.shadowPass.use();
    gl.uniform1i(this.shadowPass.unifPos, 0);
    gl.uniform1i(this.shadowPass.unifNor, 1);
    gl.uniform1i(this.shadowPass.unifAlbedo, 2);
    gl.uniform1i(this.shadowPass.unifSceneInfo, 3);
    gl.uniform1i(this.shadowPass.unifBVH, 4);
    

    // set up reflection pass
    this.reflectionPass = new ReflectionPass(require('../../shaders/screenspace-vert.glsl'),
                                              require('../../shaders/reflection-frag.glsl'));
                                         
    this.reflectionPass.unifPos = gl.getUniformLocation(this.reflectionPass.prog, "u_Pos");
    this.reflectionPass.unifNor = gl.getUniformLocation(this.reflectionPass.prog, "u_Nor");
    this.reflectionPass.unifAlbedo = gl.getUniformLocation(this.reflectionPass.prog, "u_Albedo");  
    this.reflectionPass.unifMaterial = gl.getUniformLocation(this.reflectionPass.prog, "u_Material");          
    this.reflectionPass.unifSceneInfo = gl.getUniformLocation(this.reflectionPass.prog, "u_SceneInfo");
    this.reflectionPass.unifBVH = gl.getUniformLocation(this.reflectionPass.prog, "u_BVH");
    
    

    this.reflectionPass.use();  
    // 0 for u_EnvMap, 1 for u_FloorTex
    gl.uniform1i(this.reflectionPass.unifPos, 2);
    gl.uniform1i(this.reflectionPass.unifNor, 3);
    gl.uniform1i(this.reflectionPass.unifAlbedo, 4);
    gl.uniform1i(this.reflectionPass.unifMaterial, 5);    
    gl.uniform1i(this.reflectionPass.unifSceneInfo, 6);
    gl.uniform1i(this.reflectionPass.unifBVH, 7);
    

    // set up refraction pass
    this.refractionPass = new RefractionPass(require('../../shaders/screenspace-vert.glsl'),
                                              require('../../shaders/refraction-frag.glsl'));
   
    this.refractionPass.unifPos = gl.getUniformLocation(this.refractionPass.prog, "u_Pos");
    this.refractionPass.unifNor = gl.getUniformLocation(this.refractionPass.prog, "u_Nor");
    this.refractionPass.unifAlbedo = gl.getUniformLocation(this.refractionPass.prog, "u_Albedo");  
    this.refractionPass.unifMaterial = gl.getUniformLocation(this.refractionPass.prog, "u_Material");          
    this.refractionPass.unifSceneInfo = gl.getUniformLocation(this.refractionPass.prog, "u_SceneInfo");
    this.refractionPass.unifBVH = gl.getUniformLocation(this.refractionPass.prog, "u_BVH");

    this.refractionPass.use();  
    // 0 for u_EnvMap, 1 for u_FloorTex
    gl.uniform1i(this.refractionPass.unifPos, 2);
    gl.uniform1i(this.refractionPass.unifNor, 3);
    gl.uniform1i(this.refractionPass.unifAlbedo, 4);
    gl.uniform1i(this.refractionPass.unifMaterial, 5);    
    gl.uniform1i(this.refractionPass.unifSceneInfo, 6);
    gl.uniform1i(this.refractionPass.unifBVH, 7);


     // set up raytrace compose pass
    this.raytraceComposePass = new RaytraceComposePass(require('../../shaders/screenspace-vert.glsl'),
                                                        require('../../shaders/raytrace-compose-frag.glsl'));

    this.raytraceComposePass.unifMaterial = gl.getUniformLocation(this.raytraceComposePass.prog, "u_Material");
    this.raytraceComposePass.unifAlbedo = gl.getUniformLocation(this.raytraceComposePass.prog, "u_Albedo");
    this.raytraceComposePass.unifReflection = gl.getUniformLocation(this.raytraceComposePass.prog, "u_Reflection");
    this.raytraceComposePass.unifRefraction = gl.getUniformLocation(this.raytraceComposePass.prog, "u_Refraction");
    
    this.raytraceComposePass.use();  
    gl.uniform1i(this.raytraceComposePass.unifMaterial, 0);
    gl.uniform1i(this.raytraceComposePass.unifAlbedo, 1);
    gl.uniform1i(this.raytraceComposePass.unifReflection, 2);
    gl.uniform1i(this.raytraceComposePass.unifRefraction, 3);

    // set up ssaa pass
    this.ssaaPass = new SSAAPass(require('../../shaders/screenspace-vert.glsl'),
    require('../../shaders/SSAA.frag.glsl'));

    this.ssaaPass.unifFrame = gl.getUniformLocation(this.ssaaPass.prog, "u_frame");

    this.ssaaPass.use();  
    gl.uniform1i(this.ssaaPass.unifFrame, 0);

    // set up dof pass
    this.dofPass = new DOFPass(require('../../shaders/screenspace-vert.glsl'),
    require('../../shaders/dof.frag.glsl'));

    this.dofPass.unifFrame = gl.getUniformLocation(this.dofPass.prog, "u_frame");
    this.dofPass.unifNor = gl.getUniformLocation(this.dofPass.prog, "u_Nor");

    this.dofPass.use();  
    gl.uniform1i(this.dofPass.unifFrame, 0);
    gl.uniform1i(this.dofPass.unifNor, 1);

    // set up glow pass
    this.glowSourcePass = new GlowPass(require('../../shaders/screenspace-vert.glsl'),
    require('../../shaders/glowsource.frag.glsl'));

    this.glowSourcePass.unifFrame = gl.getUniformLocation(this.glowSourcePass.prog, "u_frame");

    this.glowSourcePass.use();  
    gl.uniform1i(this.glowSourcePass.unifFrame, 0);

    this.glowPass = new GlowPass(require('../../shaders/screenspace-vert.glsl'),
    require('../../shaders/glow.frag.glsl'));

    this.glowPass.unifFrame = gl.getUniformLocation(this.glowPass.prog, "u_frame");
    this.glowPass.unifGlow = gl.getUniformLocation(this.glowPass.prog, "u_Glow");

    this.glowPass.use();  
    gl.uniform1i(this.glowPass.unifFrame, 0);
    gl.uniform1i(this.glowPass.unifGlow, 1);
    
    if (!gl.getExtension("OES_texture_float_linear")) {
      console.error("OES_texture_float_linear not available");
    }

    if (!gl.getExtension("EXT_color_buffer_float")) {
      console.error("FLOAT color buffer not available");
    }
  }


  setClearColor(r: number, g: number, b: number, a: number) {
    gl.clearColor(r, g, b, a);
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;

    this.deferredPass.setWidth(width);
    this.deferredPass.setHeight(height);
    this.deferredPass.setLightPos(this.lightPos);

    // --- GBUFFER CREATION START ---
    this.gBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);

    for (let i = 0; i < this.gbTargets.length; i ++) {
      this.gbTargets[i] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.gbTargets[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // currently changed to 32-bit float
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, this.gbTargets[i], 0);
    }

    // depth attachment
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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
    //origin buffer and texture from g-buffer
    this.originalBufferFromGBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.originalBufferFromGBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.originalTargetFromGBuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.originalTargetFromGBuffer);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.originalTargetFromGBuffer, 0);

    FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
      console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    //------------------------------------------------------------bind ray trace passes------------------------------------------------------------------
    // ray cast pass
    this.raycastBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.raycastBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.raycastTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.raycastTarget);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.raycastTarget, 0);

    FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
      console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // direct shadow
    this.shadowBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.shadowTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTarget);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowTarget, 0);

    // reflection
    this.reflectionBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.reflectionBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.reflectionTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.reflectionTarget);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.reflectionTarget, 0);

    // refraction
    this.refractionBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.refractionBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.refractionTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.refractionTarget);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.refractionTarget, 0);

    // raytrace compose
    this.raytraceComposeBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.raytraceComposeBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.raytraceComposeTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.raytraceComposeTarget);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.raytraceComposeTarget, 0);

    // ssaa
    this.ssaaBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.ssaaBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.ssaaTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.ssaaTarget);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.ssaaTarget, 0);

    // dof
    this.dofBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.dofBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.dofTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.dofTarget);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.dofTarget, 0);

    // glow
    this.glowSourceBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glowSourceBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.glowSourceTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.glowSourceTarget);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.glowSourceTarget, 0);

    this.glowBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glowBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    this.glowTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.glowTarget);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.glowTarget, 0);



    FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
      console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }


  updateTime(deltaTime: number, currentTime: number) {
    this.currentTime = currentTime;
    this.shadowPass.setTime(this.currentTime);
    this.deferredPass.setTime(this.currentTime);
  }


  clear() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }


  clearGB() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }


  renderToGBuffer(camera: Camera, meshes: Array<Mesh>, textureSets: Array<Map<string, Texture>>) {    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);   

    for (let i = 0; i < meshes.length; ++i) {
      // setup textures 
      let textureSet = textureSets[i];
      if (textureSet) {
        let j = 0;
        for (let [name, tex] of textureSet) {
          this.gBufferPass.setupTexUnits([name]);
          this.gBufferPass.bindTexToUnit(name, tex, j);
          j++;
        }
        this.gBufferPass.setUseTexture(1);
      
      } else {
        this.gBufferPass.setGeometryColor(meshes[i].baseColor);
        this.gBufferPass.setUseTexture(0);
      }

      this.gBufferPass.setMaterial(meshes[i].material.specular, 
                                  meshes[i].material.diffuse, 
                                  meshes[i].material.refraction, 
                                  meshes[i].material.emittance);

      this.gBufferPass.setHeight(this.canvas.height);
      this.gBufferPass.setWidth(this.canvas.width);
      this.gBufferPass.drawElements(camera, [meshes[i]]);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  renderFromGBuffer(camera: Camera, env: Texture) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.originalBufferFromGBuffer);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null); // output to screen

    this.reflectionPass.setupTexUnits(['u_EnvMap']);
    this.reflectionPass.bindTexToUnit('u_EnvMap', env, 4);

    this.deferredPass.drawElement(camera, this.gbTargets);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  rayCast(camera: Camera) {
    //gl.bindFramebuffer(gl.FRAMEBUFFER, this.raycastTarget);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.raycastPass.drawElement(camera, this.canvas);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  shadowStage(camera: Camera, 
              sceneInfo: TextureBuffer[], 
              triangleCount: number,
              BVHTextures: BVHTextureBuffer[], 
              nodeCount: number,     
            ){
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowBuffer);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let textures: WebGLTexture[] = [];
    textures.push(this.gbTargets[1]);
    textures.push(this.gbTargets[0]);
    textures.push(this.originalTargetFromGBuffer);
    // textures.push(this.raytraceComposeTarget);
    for(let i = 0; i < sceneInfo.length; i++) {
      textures.push(sceneInfo[i].texture);
    }

    for(let i = 0; i < BVHTextures.length; i++) {
      textures.push(BVHTextures[i].texture);
    }

    this.shadowPass.setViewMatrix(camera.viewMatrix);

    this.shadowPass.drawElement(camera, textures, triangleCount, nodeCount, this.lightPos, this.canvas, sceneInfo[0]._width, sceneInfo[0]._height, BVHTextures[0]._width, BVHTextures[0]._height);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  }

  reflectionStage(camera: Camera, 
                  sceneInfo: TextureBuffer[], 
                  triangleCount: number, 
                  BVHTextures: BVHTextureBuffer[], 
                  nodeCount: number,                  
                  textureSet: Array<Map<string, Texture>>, 
                  env: Texture) {
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.reflectionBuffer);
    
    // bind envMap to TEXTURE0
    let tex = env;
    this.reflectionPass.setupTexUnits(['u_EnvMap']);
    this.reflectionPass.bindTexToUnit('u_EnvMap', tex, 0);

    // bind floor texture to TEXTURE1
    if (textureSet[0]) {
      tex = textureSet[0].get('tex_Albedo');
      this.reflectionPass.setupTexUnits(['u_FloorTex']);
      this.reflectionPass.bindTexToUnit('u_FloorTex', tex, 1);
    }

    let textures: WebGLTexture[] = [];
    textures.push(this.gbTargets[1]);
    textures.push(this.gbTargets[0]);
    // textures.push(this.originalTargetFromGBuffer);
    textures.push(this.shadowTarget);
    textures.push(this.gbTargets[3]);
    
    for(let i = 0; i < sceneInfo.length; i++) {
      textures.push(sceneInfo[i].texture);
    }

    for(let i = 0; i < BVHTextures.length; i++) {
      textures.push(BVHTextures[i].texture);
    }

    this.reflectionPass.setViewMatrix(camera.viewMatrix);

    this.reflectionPass.drawElement(camera, textures, 2, triangleCount, nodeCount, this.lightPos, this.canvas, sceneInfo[0]._width, sceneInfo[0]._height, BVHTextures[0]._width, BVHTextures[0]._height);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  }

  refractionStage(camera: Camera, 
                  sceneInfo: TextureBuffer[], 
                  triangleCount: number, 
                  BVHTextures: BVHTextureBuffer[], 
                  nodeCount: number,                  
                  textureSet: Array<Map<string, Texture>>, 
                  env: Texture) {
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.refractionBuffer);
    
    // bind envMap to TEXTURE0
    let tex = env;
    this.refractionPass.setupTexUnits(['u_EnvMap']);
    this.refractionPass.bindTexToUnit('u_EnvMap', tex, 0);

    // bind floor texture to TEXTURE1
    if (textureSet[0]) {
      tex = textureSet[0].get('tex_Albedo');
      this.refractionPass.setupTexUnits(['u_FloorTex']);
      this.refractionPass.bindTexToUnit('u_FloorTex', tex, 1);
    }

    let textures: WebGLTexture[] = [];
    textures.push(this.gbTargets[1]);
    textures.push(this.gbTargets[0]);
    // textures.push(this.originalTargetFromGBuffer);
    textures.push(this.shadowTarget);
    textures.push(this.gbTargets[3]);
    
    for(let i = 0; i < sceneInfo.length; i++) {
      textures.push(sceneInfo[i].texture);
    }

    for(let i = 0; i < BVHTextures.length; i++) {
      textures.push(BVHTextures[i].texture);
    }

    this.refractionPass.setViewMatrix(camera.viewMatrix);

    this.refractionPass.drawElement(camera, textures, 2, triangleCount, nodeCount, this.lightPos, this.canvas, sceneInfo[0]._width, sceneInfo[0]._height,  BVHTextures[0]._width, BVHTextures[0]._height);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  }

  raytraceComposeStage() {
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.raytraceComposeBuffer);

    let textures: WebGLTexture[] = [];
    textures.push(this.gbTargets[3]);
    textures.push(this.shadowTarget); 
    // textures.push(this.originalTargetFromGBuffer);
    textures.push(this.reflectionTarget);
    textures.push(this.refractionTarget);

    this.raytraceComposePass.drawElement(textures, this.canvas);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  }

  ssaa()
  {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, this.ssaaBuffer);

    let textures: WebGLTexture[] = [];
    textures.push(this.raytraceComposeTarget);

    this.ssaaPass.drawElement(this.canvas, textures);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  glow()
  {
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glowSourceBuffer);

    let textures : WebGLTexture[];
    textures = [];
    textures.push(this.raytraceComposeTarget);
    this.glowSourcePass.drawElement(this.canvas, textures);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glowBuffer);

    textures = [];
    textures.push(this.raytraceComposeTarget);
    textures.push(this.glowSourceTarget);
    this.glowPass.drawElement(this.canvas, textures);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  }

  dof() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, this.dofBuffer);

    let textures : WebGLTexture[];
    textures = [];
    textures.push(this.glowTarget);
    // textures.push(this.raytraceComposeTarget);
    textures.push(this.gbTargets[0]);
    this.dofPass.drawElement(this.canvas, textures);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

};

export default OpenGLRenderer;
