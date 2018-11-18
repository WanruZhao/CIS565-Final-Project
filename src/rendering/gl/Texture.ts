import {gl} from '../../globals';

export class Texture {
  texture: WebGLTexture;
  
  bindTex() {
  	  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }

  handle(): WebGLTexture {
  	return this.texture;
  }

  isPowerOf2(value: number) : boolean {
      return (value & (value - 1)) == 0;
  }

  constructor(imgSource: string) {
  	this.texture = gl.createTexture();
  	this.bindTex();

    // create a white pixel to serve as placeholder
  	const formatSrc = gl.RGBA;
  	const formatDst = gl.RGBA;
  	const lvl = 0;
  	const phWidth = 1; // placeholder
  	const phHeight = 1;
  	const phImg = new Uint8Array([255, 255, 255, 255]);
  	const formatBit = gl.UNSIGNED_BYTE; // TODO: HDR

  	gl.texImage2D(gl.TEXTURE_2D, lvl, formatDst, phWidth, phHeight, 0, formatSrc, formatBit, phImg);

  	// get a javascript image locally and load it. not instant but will auto-replace white pixel
  	const img = new Image();

  	img.onload = function() {
		this.bindTex()
		gl.texImage2D(gl.TEXTURE_2D, lvl, formatDst, img.width, img.height, 0, formatSrc, formatBit, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  	}.bind(this);

  	img.src = imgSource; // load the image
  }

};

export class TextureBuffer
{
	_texture: WebGLTexture;
	_buffer: Float32Array;
	_triangleCount: number;
	_elementCount: number;
	_width: number;
	_height: number;
	

	// infoSize: position, normal, currently each use one pixel
	constructor(triangleCount: number, elementCount: number, maxTextureSize: number) {
		// Initialize the texture. We use gl.NEAREST for texture filtering because we don't want to blend between values in the buffer. We want the exact value
		this._texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this._texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		this._triangleCount = triangleCount;
		this._elementCount = elementCount;

		this._width = Math.min(maxTextureSize, triangleCount);
		this._height = Math.ceil(triangleCount / maxTextureSize) * 3 * elementCount;

  		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this._width, this._height, 0, gl.RGBA, gl.FLOAT, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	
		// Create a buffer to use to upload to the texture
		this._buffer = new Float32Array(this._width * this._height * 4);
	  }
	
	  get texture() {
		return this._texture;
	  }
	
	  get buffer() {
		return this._buffer;
	  }

	  // get positions or normals for a triangle, triangleIndex is the local index in this texture
	  bufferIndex(triangleIndex: number, component: number, index: number, bit: number){
		  let row = Math.floor(triangleIndex / this._width);
		  let col = triangleIndex - row * this._width;
		  return row * 3 * this._elementCount * 4 * this._width + 3 * component * 4 * this._width + index * 4 * this._width + col * 4 + bit;
	  }

	
	  update() {
		gl.bindTexture(gl.TEXTURE_2D, this._texture);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this._width, this._height, gl.RGBA, gl.FLOAT, this._buffer);
		gl.bindTexture(gl.TEXTURE_2D, null);
	  }
};

export default Texture;