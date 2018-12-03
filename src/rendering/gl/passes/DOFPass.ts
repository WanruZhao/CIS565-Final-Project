import {gl} from '../../../globals';
import ShaderProgram, {Shader} from '../ShaderProgram';
import Drawable from '../Drawable';
import Square from '../../../geometry/Square';
import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Camera from '../../../Camera';

class DOFPass extends ShaderProgram {
    screenQuad: Square; // Quadrangle onto which we draw the frame texture of the last render pass
    
    unifNor: WebGLUniformLocation;
    unifFrame: WebGLUniformLocation;


	constructor(vertShaderSource: string, fragShaderSource: string) {
		let vertShader: Shader = new Shader(gl.VERTEX_SHADER,  vertShaderSource);	
		let fragShader: Shader = new Shader(gl.FRAGMENT_SHADER, fragShaderSource);
		super([vertShader, fragShader]);
		this.use();

		if (this.screenQuad === undefined) {
			this.screenQuad = new Square(vec3.fromValues(0, 0, 0));
			this.screenQuad.create();
        }
        
    }

    drawElement(canvas: HTMLCanvasElement, targets: WebGLTexture[]) {

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    

        this.setHeight(canvas.height);
        this.setWidth(canvas.width);

        for(let i = 0; i < targets.length; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
          gl.bindTexture(gl.TEXTURE_2D, targets[i]);
        }
        

  		super.draw(this.screenQuad);
      }
      


}

export default DOFPass;