#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;

uniform sampler2D tex_Paper;

uniform float u_Width;
uniform float u_Height;
uniform float u_Radius;


void main(void) 
{   

	vec4 color = vec4(vec3(0.0), 1.0);

    int loopTimes = int(u_Radius);

	 vec2 src_size = vec2 (1.0 / u_Width, 1.0 / u_Height);
     float n = (u_Radius + 1.0) * (u_Radius + 1.0);

     int i; 
	 int j;

     vec3 m0 = vec3(0.0); vec3 m1 = vec3(0.0); vec3 m2 = vec3(0.0); vec3 m3 = vec3(0.0);
     vec3 s0 = vec3(0.0); vec3 s1 = vec3(0.0); vec3 s2 = vec3(0.0); vec3 s3 = vec3(0.0);
     vec3 c;

     for (int j = -loopTimes; j <= 0; ++j)  {
         for (int i = -loopTimes; i <= 0; ++i)  {
             c = texture(u_frame, fs_UV + vec2(i,j) * src_size).rgb;
             m0 += c;
             s0 += c * c;
         }
     }

     for (int j = -loopTimes; j <= 0; ++j)  {
         for (int i = 0; i <= loopTimes; ++i)  {
             c = texture(u_frame, fs_UV + vec2(i,j) * src_size).rgb;
             m1 += c;
             s1 += c * c;
         }
     }

     for (int j = 0; j <= loopTimes; ++j)  {
         for (int i = 0; i <= loopTimes; ++i)  {
             c = texture(u_frame, fs_UV + vec2(i,j) * src_size).rgb;
             m2 += c;
             s2 += c * c;
         }
     }

     for (int j = 0; j <= loopTimes; ++j)  {
         for (int i = -loopTimes; i <= 0; ++i)  {
             c = texture(u_frame, fs_UV + vec2(i,j) * src_size).rgb;
             m3 += c;
             s3 += c * c;
         }
     }


     float min_sigma2 = 100.0;
     m0 /= n;
     s0 = abs(s0 / n - m0 * m0);

     float sigma2 = s0.r + s0.g + s0.b;
     if (sigma2 < min_sigma2) {
         min_sigma2 = sigma2;
         color = vec4(m0, 1.0);
     }

     m1 /= n;
     s1 = abs(s1 / n - m1 * m1);

     sigma2 = s1.r + s1.g + s1.b;
     if (sigma2 < min_sigma2) {
         min_sigma2 = sigma2;
         color = vec4(m1, 1.0);
     }

     m2 /= n;
     s2 = abs(s2 / n - m2 * m2);

     sigma2 = s2.r + s2.g + s2.b;
     if (sigma2 < min_sigma2) {
         min_sigma2 = sigma2;
         color = vec4(m2, 1.0);
     }

	// add paper effect
	vec3 paperCol = texture(tex_Paper, fs_UV).rgb;
	// make dark details more apparent
	paperCol = pow(paperCol, vec3(2.2));
	color.rgb *= paperCol;
	
	out_Col = color;
}