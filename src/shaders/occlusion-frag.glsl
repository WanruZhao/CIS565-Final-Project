#version 300 es
precision highp float;

#define EPS 0.001

uniform vec4 u_Color; // The color with which to render this instance of geometry.


out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

void main()
{
    out_Col = u_Color;
}
