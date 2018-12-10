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
    unifFocal: WebGLUniformLocation;
    unifRadius: WebGLUniformLocation;

	constructor(vertShaderSource: string, fragShaderSource: string) {
		let vertShader: Shader = new Shader(gl.VERTEX_SHADER,  vertShaderSource);	
		let fragShader: Shader = new Shader(gl.FRAGMENT_SHADER, fragShaderSource);
		super([vertShader, fragShader]);
        this.use();
        
        this.unifFocal  = gl.getUniformLocation(this.prog, "u_focal");
        this.unifRadius = gl.getUniformLocation(this.prog, "u_radius");

		if (this.screenQuad === undefined) {
			this.screenQuad = new Square(vec3.fromValues(0, 0, 0));
			this.screenQuad.create();
        }
        
    }

    drawElement(canvas: HTMLCanvasElement, targets: WebGLTexture[], focal: number, radius: number) {

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    

        this.setHeight(canvas.height);
        this.setWidth(canvas.width);
        this.setFocal(focal);
        this.setRadius(radius);

        for(let i = 0; i < targets.length; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, targets[i]);
        }

  		super.draw(this.screenQuad);
      }
      
      setFocal(focal: number) {
          this.use();
          if(this.unifFocal != -1) {
              gl.uniform1f(this.unifFocal, focal);
          }
      }

      setRadius(radius: number) {
        this.use();
        if(this.unifRadius != -1) {
            gl.uniform1f(this.unifRadius, radius);
        }
    }


}

export default DOFPass;