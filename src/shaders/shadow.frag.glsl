#version 300 es
precision highp float;

uniform sampler2D u_Ray;
uniform sampler2D u_SceneInfo;
uniform int u_TriangleCount;

// currently one light
uniform vec4 u_LightPos;

// calculate if ray hits one triangle
bool isHit(in vec3 raydir, in vec3 rayorigin, out vec3 hitPoint, out vec3 hitNormal) {

    // for every triangle, calculate if ray will hit it
}

void main()
{
    
}