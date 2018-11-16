#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform vec2 u_screenSpaceLightPos;

uniform float u_Density;
uniform float u_Weight;
uniform float u_Decay;
uniform float u_Exposure;
uniform int u_NumSamples;


void main() {

	vec3 color = vec3(0.0,0.0,0.0);

	vec2 deltaTextCoord = vec2(fs_UV - u_screenSpaceLightPos);

	vec2 textCoo = fs_UV;

	deltaTextCoord *= (1.0 /  float(u_NumSamples)) * u_Density;

	float illuminationDecay = 1.0;

	for(int i = 0; i < 100 ; i++){
        /*
        This makes sure that the loop only runs `numSamples` many times.
        We have to do it this way in WebGL, since you can't have a for loop
        that runs a variable number times in WebGL.
        This little hack gets around that.
        But the drawback of this is that we have to specify an upper bound to the
        number of iterations(but 100 is good enough for almost all cases.)
        */
	    if(u_NumSamples < i) {
            break;
	    }

		textCoo -= deltaTextCoord;
		vec3 samp = texture(u_frame, textCoo).xyz;
		samp *= illuminationDecay * u_Weight;
		color += samp;
		illuminationDecay *= u_Decay;
	}

	color *= u_Exposure;

	out_Col = vec4(color, 1.0);
}
