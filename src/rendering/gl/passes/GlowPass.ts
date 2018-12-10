import {gl} from '../../../globals';
import ShaderProgram, {Shader} from '../ShaderProgram';
import Drawable from '../Drawable';
import Square from '../../../geometry/Square';
import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Camera from '../../../Camera';

class GlowPass extends ShaderProgram {
    screenQuad: Square; // Quadrangle onto which we draw the frame texture of the last render pass
    

    unifFrame: WebGLUniformLocation;
    unifGlow: WebGLUniformLocation;
    unifThreshold: WebGLUniformLocation;
    unifRange: WebGLUniformLocation;
    unifBlur: WebGLUniformLocation;
    unifBrightness: WebGLUniformLocation;

    


    constructor(vertShaderSource: string, 
                fragShaderSource: string) {
		let vertShader: Shader = new Shader(gl.VERTEX_SHADER,  vertShaderSource);	
		let fragShader: Shader = new Shader(gl.FRAGMENT_SHADER, fragShaderSource);
		super([vertShader, fragShader]);
        this.use();
        
        this.unifThreshold  = gl.getUniformLocation(this.prog, "u_Threshold");
        this.unifRange = gl.getUniformLocation(this.prog, "u_Range");
        this.unifBlur = gl.getUniformLocation(this.prog, "u_Blur");
        this.unifBrightness = gl.getUniformLocation(this.prog, "u_Brightness");

		if (this.screenQuad === undefined) {
			this.screenQuad = new Square(vec3.fromValues(0, 0, 0));
			this.screenQuad.create();
        }
        
    }

    drawElement(canvas: HTMLCanvasElement,
                targets: WebGLTexture[],
                threshold: number,
                range: number,
                blur: number,
                brightness: number) {

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    

        this.setHeight(canvas.height);
        this.setWidth(canvas.width);
        this.setThreshold(threshold);
        this.setRange(range);
        this.setBlur(blur);
        this.setBrightness(brightness);

        for(let i = 0; i < targets.length; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, targets[i]);
        }
        

  		super.draw(this.screenQuad);
    }

    setThreshold(th: number) {
        this.use();
        if(this.unifThreshold != -1) {
            gl.uniform1f(this.unifThreshold, th);
        }
    }

    setRange(rg: number) {
        this.use();
        if(this.unifRange != -1) {
            gl.uniform1i(this.unifRange, rg);
        }
    }

    setBlur(bl: number) {
        this.use();
        if(this.unifBlur != -1) {
            gl.uniform1f(this.unifBlur, bl);
        }
    }

    setBrightness(br: number) {
        this.use();
        if(this.unifBrightness != -1) {
            gl.uniform1f(this.unifBrightness, br);
        }
    }
      


}

export default GlowPass;