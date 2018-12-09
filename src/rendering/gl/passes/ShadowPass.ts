import {gl} from '../../../globals';
import ShaderProgram, {Shader} from '../ShaderProgram';
import Drawable from '../Drawable';
import Square from '../../../geometry/Square';
import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Camera from '../../../Camera';

class ShadowPass extends ShaderProgram {
    screenQuad: Square; // Quadrangle onto which we draw the frame texture of the last render pass
    
    unifPos: WebGLUniformLocation;
    unifNor: WebGLUniformLocation;
    unifAlbedo: WebGLUniformLocation;
    unifSceneInfo: WebGLUniformLocation;
    unifTriangleCount: WebGLUniformLocation;
    unifLightPos: WebGLUniformLocation;
    unifSceneTexWidth: WebGLUniformLocation;
    unifSceneTexHeight: WebGLUniformLocation;

    unifNodeCount: WebGLUniformLocation;   
    unifBVHTexWidth: WebGLUniformLocation;
    unifBVHTexHeight: WebGLUniformLocation; 
    unifBVH: WebGLUniformLocation;


	constructor(vertShaderSource: string, fragShaderSource: string) {
		let vertShader: Shader = new Shader(gl.VERTEX_SHADER,  vertShaderSource);	
		let fragShader: Shader = new Shader(gl.FRAGMENT_SHADER, fragShaderSource);
		super([vertShader, fragShader]);
		this.use();

		if (this.screenQuad === undefined) {
			this.screenQuad = new Square(vec3.fromValues(0, 0, 0));
			this.screenQuad.create();
        }
        
        this.unifTriangleCount  = gl.getUniformLocation(this.prog, "u_TriangleCount");
        this.unifLightPos = gl.getUniformLocation(this.prog, "u_LightPos");
        this.unifSceneTexWidth = gl.getUniformLocation(this.prog, "u_SceneTexWidth");
        this.unifSceneTexHeight = gl.getUniformLocation(this.prog, "u_SceneTexHeight");

        this.unifNodeCount  = gl.getUniformLocation(this.prog, "u_NodeCount"); 
        this.unifBVHTexWidth = gl.getUniformLocation(this.prog, "u_BVHTexWidth");
        this.unifBVHTexHeight = gl.getUniformLocation(this.prog, "u_BVHTexHeight"); 
	}

    drawElement(camera: Camera, 
                targets: WebGLTexture[], 
                triangleCount: number, 
                nodeCount: number,  
                lightpos: vec4, 
                canvas: HTMLCanvasElement, 
                scenetexwidth: number, 
                scenetexheight: number,
                BVHTexWidth: number, 
                BVHTexHeight: number,
            ) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
        this.setTriangleCount(triangleCount);
        this.setNodeCount(nodeCount);        
        this.setLightPos(lightpos);
        this.setHeight(canvas.height);
        this.setWidth(canvas.width);
        this.setSceneTextureSize(scenetexwidth, scenetexheight);
        this.setBVHTextureSize(BVHTexWidth, BVHTexHeight);        


        for (let i = 0; i < targets.length; i ++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, targets[i]);
        }

  		super.draw(this.screenQuad);
      }
      

      setTriangleCount(count: number) {
          this.use();
          if(this.unifTriangleCount != -1) {
              gl.uniform1i(this.unifTriangleCount, count);
          }
      }

      setNodeCount(count: number) {
        this.use();
        if(this.unifNodeCount != -1) {
            gl.uniform1i(this.unifNodeCount, count);
        }
    }

      setLightPos(pos: vec4) {
        this.use();
        if(this.unifLightPos != -1) {
            gl.uniform4fv(this.unifLightPos, pos);
        }
      }

      setSceneTextureSize(width: number, height: number) {
          this.use();
          if(this.unifSceneTexWidth != -1) {
              gl.uniform1i(this.unifSceneTexWidth, width);
          }
          if(this.unifSceneTexHeight != -1) {
              gl.uniform1i(this.unifSceneTexHeight, height);
          }
      }

      setBVHTextureSize(width: number, height: number) {
        this.use();
        if(this.unifBVHTexWidth != -1) {
            gl.uniform1i(this.unifBVHTexWidth, width);
        }
        if(this.unifBVHTexHeight != -1) {
            gl.uniform1i(this.unifBVHTexHeight, height);
        }
    }

}

export default ShadowPass;