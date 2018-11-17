import {gl} from '../../../globals';
import ShaderProgram, {Shader} from '../ShaderProgram';
import Drawable from '../Drawable';
import {vec3, vec4, mat4} from 'gl-matrix';
import Camera from '../../../Camera';
import Texture from '../Texture';

class GBufferPass extends ShaderProgram {

	constructor(vertShaderSource: string, fragShaderSource: string) {
		let vertShader: Shader = new Shader(gl.VERTEX_SHADER,  vertShaderSource);	
		let fragShader: Shader = new Shader(gl.FRAGMENT_SHADER, fragShaderSource);
		super([vertShader, fragShader]);
		this.use();
	}

  	drawElements(camera: Camera, drawables: Array<Drawable>, tex: Texture) {
	    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.enable(gl.DEPTH_TEST);
	
		let model = mat4.create();
		let viewProj = mat4.create();
		let view = camera.viewMatrix;
		let proj = camera.projectionMatrix;
		let color = vec4.fromValues(0.5, 0.5, 0.5, 1);
	
		mat4.identity(model);
		mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
		this.setModelMatrix(model);
		this.setViewProjMatrix(viewProj);
		this.setGeometryColor(color);
		this.setViewMatrix(view);
		this.setProjMatrix(proj);
		this.bindTexToUnit("tex_Color", tex, 0);
		
	
		for (let drawable of drawables) {
			super.draw(drawable);
		}
	
  	}

}

export default GBufferPass;
