#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_gb0;
uniform sampler2D u_gb1;
uniform sampler2D u_gb2;
uniform sampler2D u_gb3;


uniform float u_Height;
uniform float u_Width;
uniform mat4 u_View;
uniform mat4 u_Proj;

uniform vec4 u_LightPos;

uniform float u_Time;

void main() { 
	// read from GBuffers
	vec4 col_0 = texture(u_gb0, fs_UV);
	vec4 col_1 = texture(u_gb1, fs_UV);
	vec4 col_2 = texture(u_gb2, fs_UV);
	vec4 col_3 = texture(u_gb3, fs_UV);
	

	vec3 dynamiclightpos = u_LightPos.xyz;
	dynamiclightpos.x *= sin(u_Time);

	float lambert = clamp(dot(normalize(col_0.xyz), normalize(dynamiclightpos- col_1.xyz)), 0.4, 1.0);
	// lambert = 1.0;
	
	out_Col = vec4(col_2.rgb * lambert * 1.5, 1.0);
	
}