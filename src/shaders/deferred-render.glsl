#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_gb0;
uniform sampler2D u_gb1;
uniform sampler2D u_gb2;

uniform float u_Height;
uniform float u_Width;
uniform mat4 u_View;
uniform mat4 u_Proj;

uniform vec4 u_LightPos;

void main() { 
	// read from GBuffers
	vec4 col_0 = texture(u_gb0, fs_UV);
	vec4 col_1 = texture(u_gb1, fs_UV);
	vec4 col_2 = texture(u_gb2, fs_UV);

	// out_Col = vec4(col_0.rgb, 1.0);
	// out_Col = vec4(col_1.rgb, 1.0);

	float lambert = clamp(dot(normalize(col_0.xyz), normalize(u_LightPos.xyz - col_1.xyz)), 0.4, 1.0);

	out_Col = vec4(col_2.rgb * lambert, 1.0);
	
}