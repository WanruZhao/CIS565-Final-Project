import Texture from './Texture';
import {gl} from '../../globals';
import ShaderProgram, {Shader} from './ShaderProgram';
import Drawable from './Drawable';
import Square from '../../geometry/Square';
import {vec3, vec4, mat4} from 'gl-matrix';

class PostProcess extends ShaderProgram {
	static screenQuad: Square = undefined; // Quadrangle onto which we draw the frame texture of the last render pass
	unifFrame: WebGLUniformLocation; // The handle of a sampler2D in our shader which samples the texture drawn to the quad
	unifFrame1: WebGLUniformLocation;
	name: string;

	constructor(fragProg: Shader, vertexShaderPath: any = require('../../shaders/screenspace-vert.glsl'), tag: string = "default") {
		super([new Shader(gl.VERTEX_SHADER, vertexShaderPath),
			   fragProg]);

		this.unifFrame = gl.getUniformLocation(this.prog, "u_frame");
		this.unifFrame1 = gl.getUniformLocation(this.prog, "u_frame1");

		this.use();
		this.name = tag;

		// bind texture unit 0 to this location
		if (this.unifFrame !== -1) {
			gl.uniform1i(this.unifFrame, 0); // gl.TEXTURE0
		}
		if (this.unifFrame1 !== -1) {
			gl.uniform1i(this.unifFrame1, 1); // gl.TEXTURE1
		}

		if (PostProcess.screenQuad === undefined) {
			PostProcess.screenQuad = new Square(vec3.fromValues(0, 0, 0));
			PostProcess.screenQuad.create();
		}
	}

  	draw() {
  		super.draw(PostProcess.screenQuad);
  	}

  	getName() : string { return this.name; }

}

export default PostProcess;
