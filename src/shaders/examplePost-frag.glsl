#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform float u_Time;

// Interpolation between color and greyscale over time on left half of screen
void main() {
	vec3 color = texture(u_frame, fs_UV).xyz;
	vec3 color2 = vec3(dot(color, vec3(0.2126, 0.7152, 0.0722)));
	float t = sin(3.14 * u_Time) * 0.5 + 0.5;
	t *= 1.0 - step(0.5, fs_UV.x);
	color = mix(color, color2, smoothstep(0.0, 1.0, t));
	out_Col = vec4(color, 1.0);
}
