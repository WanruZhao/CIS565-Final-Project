import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Drawable from './Drawable';
import Texture from './Texture';
import {gl} from '../../globals';

var activeProgram: WebGLProgram = null;

export class Shader {
  shader: WebGLShader;

  constructor(type: number, source: string) {
    this.shader = gl.createShader(type);
    gl.shaderSource(this.shader, source);
    gl.compileShader(this.shader);

    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(this.shader);
    }
  }
};

class ShaderProgram {
  prog: WebGLProgram;

  attrPos: number;
  attrNor: number;
  attrCol: number;
  attrUV: number;

  unifModel: WebGLUniformLocation;
  unifModelInvTr: WebGLUniformLocation;
  unifViewProj: WebGLUniformLocation;
  unifView: WebGLUniformLocation;
  unifProj: WebGLUniformLocation;
  unifColor: WebGLUniformLocation;
  unifTime: WebGLUniformLocation;

  unifWidth: WebGLUniformLocation;
  unifHeight: WebGLUniformLocation;

  unifShadingType: WebGLUniformLocation;
  unifBgType: WebGLUniformLocation;

  unifOriWeight: WebGLUniformLocation;
  unifHighLightWeight: WebGLUniformLocation;

  unifGodrayScreenSpaceLightPos: WebGLUniformLocation;
  unifGodrayDensity: WebGLUniformLocation;
  unifGodrayWeight: WebGLUniformLocation;
  unifGodrayDecay: WebGLUniformLocation;
  unifGodrayExposure: WebGLUniformLocation;
  unifGodrayNumSamples: WebGLUniformLocation;

  unifCartoonEdgeThickness: WebGLUniformLocation;
  unifCartoonKuwaharaRadius: WebGLUniformLocation;

  unifDigitalRainSpeed: WebGLUniformLocation;

  unifTexUnits: Map<string, WebGLUniformLocation>;

  constructor(shaders: Array<Shader>) {
    this.prog = gl.createProgram();

    for (let shader of shaders) {
      gl.attachShader(this.prog, shader.shader);
    }
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.prog);
    }

    this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
    this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
    this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
    this.attrUV = gl.getAttribLocation(this.prog, "vs_UV")
    this.unifModel = gl.getUniformLocation(this.prog, "u_Model");
    this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
    this.unifViewProj = gl.getUniformLocation(this.prog, "u_ViewProj");
    this.unifView = gl.getUniformLocation(this.prog, "u_View");
    this.unifProj = gl.getUniformLocation(this.prog, "u_Proj");
    this.unifColor = gl.getUniformLocation(this.prog, "u_Color");
    this.unifTime = gl.getUniformLocation(this.prog, "u_Time")
    this.unifHeight = gl.getUniformLocation(this.prog, "u_Height");
    this.unifWidth  = gl.getUniformLocation(this.prog, "u_Width");

    this.unifShadingType = gl.getUniformLocation(this.prog, "u_ShadingType");
    this.unifBgType = gl.getUniformLocation(this.prog, "u_BgType");

    this.unifOriWeight = gl.getUniformLocation(this.prog, "u_OriginalSceneWeight");
    this.unifHighLightWeight = gl.getUniformLocation(this.prog, "u_HighLightWeight");

    this.unifGodrayScreenSpaceLightPos = gl.getUniformLocation(this.prog, "u_screenSpaceLightPos");
    this.unifGodrayDensity = gl.getUniformLocation(this.prog, "u_Density");
    this.unifGodrayWeight = gl.getUniformLocation(this.prog, "u_Weight");
    this.unifGodrayDecay = gl.getUniformLocation(this.prog, "u_Decay");
    this.unifGodrayExposure = gl.getUniformLocation(this.prog, "u_Exposure");
    this.unifGodrayNumSamples = gl.getUniformLocation(this.prog, "u_NumSamples");

    this.unifCartoonEdgeThickness = gl.getUniformLocation(this.prog, "u_EdgeThickness");
    this.unifCartoonKuwaharaRadius = gl.getUniformLocation(this.prog, "u_Radius");

    this.unifDigitalRainSpeed = gl.getUniformLocation(this.prog, "u_FallSpeed");

    this.unifTexUnits = new Map<string, WebGLUniformLocation>();
  }

  setupTexUnits(handleNames: Array<string>) {
    for (let handle of handleNames) {
      var location = gl.getUniformLocation(this.prog, handle);
      if (location !== -1) {
        this.unifTexUnits.set(handle, location);
      } else {
        console.log("Could not find handle for texture named: \'" + handle + "\'!");
      }
    }
  }

  // Bind the given Texture to the given texture unit
  bindTexToUnit(handleName: string, tex: Texture, unit: number) {
    this.use();
    var location = this.unifTexUnits.get(handleName);
    if (location !== undefined) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      tex.bindTex();
      gl.uniform1i(location, unit);
    } else {
      console.log("Texture with handle name: \'" + handleName + "\' was not found");
    }
  }

  use() {
    if (activeProgram !== this.prog) {
      gl.useProgram(this.prog);
      activeProgram = this.prog;
    }
  }

  setModelMatrix(model: mat4) {
    this.use();
    if (this.unifModel !== -1) {
      gl.uniformMatrix4fv(this.unifModel, false, model);
    }

    if (this.unifModelInvTr !== -1) {
      let modelinvtr: mat4 = mat4.create();
      mat4.transpose(modelinvtr, model);
      mat4.invert(modelinvtr, modelinvtr);
      gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
    }
  }

  setViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifViewProj, false, vp);
    }
  }

  setViewMatrix(vp: mat4) {
    this.use();
    if (this.unifView !== -1) {
      gl.uniformMatrix4fv(this.unifView, false, vp);
    }
  }

  setProjMatrix(vp: mat4) {
    this.use();
    if (this.unifProj !== -1) {
      gl.uniformMatrix4fv(this.unifProj, false, vp);
    }
  }

  setGeometryColor(color: vec4) {
    this.use();
    if (this.unifColor !== -1) {
      gl.uniform4fv(this.unifColor, color);
    }
  }

  setTime(t: number) {
    this.use();
    if (this.unifTime !== -1) {
      gl.uniform1f(this.unifTime, t);
    }
  }

  setWidth(w: number){
    this.use();
    if(this.unifWidth !== -1){
      gl.uniform1f(this.unifWidth, w);
    }
  }

  setHeight(h: number){
    this.use();
    if(this.unifHeight !== -1){
      gl.uniform1f(this.unifHeight, h);
    }
  }

  setShadingType(type: number){
    this.use();
    if(this.unifShadingType !== -1){
      gl.uniform1i(this.unifShadingType, type);
    }
  }

  setBackGroundType(type: number){
    this.use();
    if(this.unifBgType !== -1){
      gl.uniform1i(this.unifBgType, type);
    }
  }

  setOriginalSceneWeight(w: number){
    this.use();
    if(this.unifOriWeight !== -1){
      gl.uniform1f(this.unifOriWeight, w);
    }
  }

  setHighLightWeight(w: number){
    this.use();
    if(this.unifHighLightWeight !== -1){
      gl.uniform1f(this.unifHighLightWeight, w);
    }
  }

  setGodRayScreenSpaceLightPos(pos: vec2){
    this.use();
    if(this.unifGodrayScreenSpaceLightPos !== -1){
      gl.uniform2fv(this.unifGodrayScreenSpaceLightPos, pos);
    }
  }

  setGodRayDensity(density: number){
    this.use();
    if(this.unifGodrayDensity !== -1){
      gl.uniform1f(this.unifGodrayDensity, density);
    }
  }

  setGodRayWeight(weight: number){
    this.use();
    if(this.unifGodrayWeight !== -1){
      gl.uniform1f(this.unifGodrayWeight, weight);
    }
  }

  setGodRayDecay(decay: number){
    this.use();
    if(this.unifGodrayDecay !== -1){
      gl.uniform1f(this.unifGodrayDecay, decay);
    }
  }

  setGodRayExposure(exposure: number){
    this.use();
    if(this.unifGodrayExposure !== -1){
      gl.uniform1f(this.unifGodrayExposure, exposure);
    }
  }

  setGodRaySamples(samples: number){
    this.use();
    if(this.unifGodrayNumSamples !== -1){
      gl.uniform1i(this.unifGodrayNumSamples, samples);
    }
  }

  setCartoonEdgeThickness(t: number){
    this.use();
    if(this.unifCartoonEdgeThickness !== -1){
      gl.uniform1f(this.unifCartoonEdgeThickness, t);
    }
  }

  setCartoonKuwaharaRadius(r: number){
    this.use();
    if(this.unifCartoonKuwaharaRadius !== -1){
      gl.uniform1f(this.unifCartoonKuwaharaRadius, r);
    }
  }

  setDigitalRainFallSpeed(s: number){
    this.use();
    if(this.unifDigitalRainSpeed !== -1){
      gl.uniform1f(this.unifDigitalRainSpeed, s);
    }
  }

  draw(d: Drawable) {
    this.use();

    if (this.attrPos != -1 && d.bindPos()) {
      gl.enableVertexAttribArray(this.attrPos);
      gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrNor != -1 && d.bindNor()) {
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrCol != -1 && d.bindCol()) {
      gl.enableVertexAttribArray(this.attrCol);
      gl.vertexAttribPointer(this.attrCol, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrUV != -1 && d.bindUV()) {
      gl.enableVertexAttribArray(this.attrUV);
      gl.vertexAttribPointer(this.attrUV, 2, gl.FLOAT, false, 0, 0);
    }

    d.bindIdx();
    gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);

    if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
    if (this.attrCol != -1) gl.disableVertexAttribArray(this.attrCol);
    if (this.attrUV != -1) gl.disableVertexAttribArray(this.attrUV);
  }
};

export default ShaderProgram;
