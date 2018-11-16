#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;

uniform float u_Width;
uniform float u_Height;
uniform float u_EdgeThickness;


// mainly refer to the Implementation of Sobel Edge 
// Detection Filter by Patrick Hebron

void main(void) 
{
	vec4 n[9];

	float w = u_EdgeThickness / u_Width;
	float h = u_EdgeThickness / u_Height;

	n[0] = texture(u_frame, fs_UV + vec2( -w, -h));
	n[1] = texture(u_frame, fs_UV + vec2(0.0, -h));
	n[2] = texture(u_frame, fs_UV + vec2(  w, -h));
	n[3] = texture(u_frame, fs_UV + vec2( -w, 0.0));
	n[4] = texture(u_frame, fs_UV);
	n[5] = texture(u_frame, fs_UV + vec2(  w, 0.0));
	n[6] = texture(u_frame, fs_UV + vec2( -w, h));
	n[7] = texture(u_frame, fs_UV + vec2(0.0, h));
	n[8] = texture(u_frame, fs_UV + vec2(  w, h));

	vec4 sobel_edge_h = n[2] + (2.0*n[5]) + n[8] - (n[0] + (2.0*n[3]) + n[6]);
  	vec4 sobel_edge_v = n[0] + (2.0*n[1]) + n[2] - (n[6] + (2.0*n[7]) + n[8]);
	vec4 sobel = sqrt((sobel_edge_h * sobel_edge_h) + (sobel_edge_v * sobel_edge_v));

	float minGradChannel = min(sobel.r, min(sobel.g, sobel.b));

	// Use gamma correction curve to adjust color
	minGradChannel = pow(minGradChannel, 1.0 / 2.2);

	out_Col = vec4( 1.0 - vec3(minGradChannel), 1.0 );
}
