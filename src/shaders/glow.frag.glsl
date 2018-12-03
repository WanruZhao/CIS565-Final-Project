#version 300 es
precision highp float;

uniform sampler2D u_frame;
uniform sampler2D u_Glow;

uniform float u_Width;
uniform float u_Height;

in vec2 fs_UV;
out vec4 out_Col;

float gaussian(in float x, in float sigma)
{
	return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
}

void main()
{
    const int range = 100;
    const int halfrange = (range - 1) / 2;
    float kernel[range];

    float sigma = 70.0;
    float powersum = 0.0;
    for (int i = 0; i <= halfrange; ++i)
    {
        kernel[halfrange + i] = kernel[halfrange - i] = gaussian(float(i), sigma);
    }
    
    for (int i = 0; i < range; ++i)
    {
        powersum += kernel[i];
    }


    vec3 colorx = vec3(0.0);

    for (int i = -halfrange; i <= halfrange; ++i)
    {
        colorx += kernel[halfrange + i] * texture(u_Glow, (fs_UV * vec2(u_Width, u_Height) + vec2(float(i), 0.0)) / vec2(u_Width, u_Height)).rgb;
    }

    vec3 colory = vec3(0.0);
    for (int i = -halfrange; i <= halfrange; ++i)
    {
        colory += kernel[halfrange + i] * texture(u_Glow, (fs_UV * vec2(u_Width, u_Height) + vec2(0.0, float(i))) / vec2(u_Width, u_Height)).rgb;
    }

    vec3 colorxy = vec3(0.0);
    for (int i = -halfrange; i <= halfrange; ++i)
    {
        colorxy += kernel[halfrange + i] * texture(u_Glow, (fs_UV * vec2(u_Width, u_Height) + vec2(float(i), -float(i))) / vec2(u_Width, u_Height)).rgb;
    }
    
    vec3 coloryx = vec3(0.0);
    for (int i = -halfrange; i <= halfrange; ++i)
    {
        coloryx += kernel[halfrange + i] * texture(u_Glow, (fs_UV * vec2(u_Width, u_Height) + vec2(float(i), float(i))) / vec2(u_Width, u_Height)).rgb;
    }


    colorx /= (powersum * 2.5);
    colory /= (powersum * 2.5);
    colorxy /= (powersum * 2.5);
    coloryx /= (powersum * 2.5);
    
    vec3 originColor = texture(u_frame, fs_UV).rgb;
    out_Col = vec4(colorx + colory + colorxy + coloryx + originColor, 1.0);

}