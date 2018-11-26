import {gl} from '../../../globals';
import ShaderProgram, {Shader} from '../ShaderProgram';
import Drawable from '../Drawable';
import {vec3, vec4, mat4} from 'gl-matrix';
import Camera from '../../../Camera';
import Texture from '../Texture';

class GBufferPass extends ShaderProgram {

	unifUseTexture: WebGLUniformLocation;

	constructor(vertShaderSource: string, fragShaderSource: string) {
		let vertShader: Shader = new Shader(gl.VERTEX_SHADER,  vertShaderSource);	
		let fragShader: Shader = new Shader(gl.FRAGMENT_SHADER, fragShaderSource);
		super([vertShader, fragShader]);
		this.use();

		this.unifUseTexture = gl.getUniformLocation(this.prog, "u_UseTexture");

	}

  	drawElements(camera: Camera, drawables: Array<Drawable>) {	
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.enable(gl.DEPTH_TEST);
  
		// setup matrices
		let model = mat4.create();
		mat4.identity(model);    
			let viewProj = mat4.create();
			let view = camera.viewMatrix;
			let proj = camera.projectionMatrix;
		
		mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
		this.setModelMatrix(model);
		this.setViewProjMatrix(viewProj);
		this.setViewMatrix(view);
		this.setProjMatrix(proj);

		
		for (let drawable of drawables) {
			super.draw(drawable);
		}
	
	  }
	  
	  setUseTexture(ifUseTexture: number) {
		this.use();
		if(this.unifUseTexture != -1) {
			gl.uniform1i(this.unifUseTexture, ifUseTexture);
		}
	}

}

export default GBufferPass;
