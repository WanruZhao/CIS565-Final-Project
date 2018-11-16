#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform float u_Time;

// Render R, G, and B channels individually
void main() {
	out_Col = vec4(texture(u_frame, fs_UV + vec2(0.33, 0.0)).r,
								 texture(u_frame, fs_UV + vec2(0.0, -0.33)).g,
								 texture(u_frame, fs_UV + vec2(-0.33, 0.0)).b,
								 1.0);
 out_Col.rgb += texture(u_frame, fs_UV).xyz;
}
