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

  	drawElements(camera: Camera, drawables: Array<Drawable>) {	
		for (let drawable of drawables) {
			super.draw(drawable);
		}
	
  	}

}

export default GBufferPass;
