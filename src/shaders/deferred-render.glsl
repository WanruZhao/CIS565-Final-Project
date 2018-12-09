#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_gb0;
uniform sampler2D u_gb1;
uniform sampler2D u_gb2;
uniform sampler2D u_gb3;
uniform sampler2D u_EnvMap;

uniform float u_Height;
uniform float u_Width;
uniform mat4 u_View;
uniform mat4 u_Proj;

uniform vec4 u_LightPos;

uniform float u_Time;

uniform float u_Far;
uniform mat4 u_ViewInv;
uniform mat4 u_ProjInv;
uniform vec3 u_Camera;

const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;


void calRayDir(in vec2 fragcoord, out vec3 dir) {
	vec2 ndc = vec2(fragcoord.x / u_Width, fragcoord.y / u_Height) * 2.0 - vec2(1.0);
	vec4 p = vec4(ndc, 1.0, 1.0);
	p = u_ViewInv * u_ProjInv * (p * u_Far);
	dir = normalize(p.xyz);
}

void calEnvUV(in vec3 dir, out vec2 uv)
{
	float phi = atan(dir.z, dir.x);
	if(phi < 0.0) {
		phi += TWO_PI;
	}
	float theta = acos(dir.y);
	uv = vec2(1.0 - phi / TWO_PI, theta / PI - 1.0);
}


void main() { 
	// read from GBuffers
	vec4 col_0 = texture(u_gb0, fs_UV);
	vec4 col_1 = texture(u_gb1, fs_UV);
	vec4 col_2 = texture(u_gb2, fs_UV);
	vec4 col_3 = texture(u_gb3, fs_UV);

	vec3 dynamiclightpos = u_LightPos.xyz;
	//dynamiclightpos.x *= sin(u_Time);

	float lambert = clamp(dot(normalize(col_0.xyz), normalize(dynamiclightpos- col_1.xyz)), 0.8, 1.0);
	if(col_3.w > 0.0) {
		lambert = 1.0;
	}
	
	bool isBackground = (col_0.w > 0.0);
	vec2 uv;
	vec3 dir;
	calRayDir(gl_FragCoord.xy, dir);
	calEnvUV(dir, uv);

	if(isBackground) {
		out_Col = texture(u_EnvMap, uv);
	} else {
		out_Col = vec4(col_2.rgb * lambert, 1.0);
	}
	
}