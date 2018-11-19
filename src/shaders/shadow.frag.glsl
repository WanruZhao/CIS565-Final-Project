#version 300 es
precision highp float;

uniform sampler2D u_Pos;
uniform sampler2D u_Nor;
uniform sampler2D u_SceneInfo; // extend to multiple textures
uniform int u_SceneTexWidth; // extend to multiple size
uniform int u_SceneTexHeight; // extend to multiple size
uniform int u_TriangleCount;
uniform float u_Width;
uniform float u_Height;

// currently one light
uniform vec4 u_LightPos;

in vec2 fs_UV;
out vec4 out_Col;

/* optimization: BVH, backface culling */

bool isIntersectWithTriangle(in vec3 raydir, in vec3 rayorigin, in vec3 p0, in vec3 p1, in vec3 p2, out float t) {
    vec3 e1 = p1 - p0;
    vec3 e2 = p2 - p0;
    // vec3 q = cross(raydir, e2);
    // float a = dot(e1, q);
    // if(a > - 0.00001 && a < 0.00001) {
    //     t = 0.0;
    //     return false;
    // }
    // float f = 1.0 / a;
    // vec3 s = rayorigin - p0;
    // float u = f * dot(s, q);
    // if(u < 0.0) {
    //     t = 0.0;
    //     return false;
    // }
    // vec3 r = cross(s, e1);
    // float v = f * dot(raydir, r);
    // if(v < 0.0 || u + v > 1.0) {
    //     t = 0.0;
    //     return false;
    // }
    // t = f * dot(e2, r);
    // return true;

    vec3 n = cross(e1, e2);
    float a = - dot(n, raydir);
    if(a > -0.00001 && a < 0.00001) {
        t = 0.0;
        return false;
    }
    float f = 1.0 / a;
    vec3 s = rayorigin - p0;
    vec3 m = cross(s, raydir);
    float u = f * dot(m, e2);
    if(u < 0.0) {
        t = 0.0;
        return false;
    }
    float v = - f * dot(m, e1);
    if(v < 0.0 || u + v > 1.0) {
        t = 0.0;
        return false;
    }
    t = f * dot(n, s);
    return true;
}

void getTrianglePosition(in int index, out vec3 p0, out vec3 p1, out vec3 p2) {
    int row = index / u_SceneTexWidth;
    int col = index - row * u_SceneTexWidth;

    row = row * 6;

    float u = (float(col) + 0.5) / float(u_SceneTexWidth);
    float v0 = (float(row) + 0.5) / float(u_SceneTexHeight);
    float v1 = (float(row) + 1.5) / float(u_SceneTexHeight);
    float v2 = (float(row) + 2.5) / float(u_SceneTexHeight);

    p0 = texture(u_SceneInfo, vec2(u, v0)).xyz;
    p1 = texture(u_SceneInfo, vec2(u, v1)).xyz;
    p2 = texture(u_SceneInfo, vec2(u, v2)).xyz;
}

// calculate if ray hits one triangle
bool isHit(in vec3 raydir, in vec3 rayorigin, out float t) {

    //float t = 10.0;
    vec3 p0 = vec3(0.0);
    vec3 p1 = vec3(0.0);
    vec3 p2 = vec3(0.0);

    for(int i = 0; i < u_TriangleCount; i++) {
        getTrianglePosition(i, p0, p1, p2);
        if(isIntersectWithTriangle(raydir, rayorigin, p0, p1, p2, t)) {
            if(t > 0.0 && t <= 1.0) {
                return true;
            }
        }
    }

    return false;
}

void main()
{
    // calculate launched ray from first hit point to light
    vec2 pixel = fs_UV; 
    vec4 worldPos = texture(u_Pos, pixel);


    vec3 rayorigin = worldPos.xyz + texture(u_Nor, pixel).xyz * 0.0001;
    vec3 raydir = u_LightPos.xyz - rayorigin;

    vec3 hitpoint = vec3(0.0);
    vec3 hitnormal = vec3(0.0);

    float t = 10.0;

    if(isHit(raydir, rayorigin, t)) {
        out_Col = vec4(vec3(0.0), 1.0);
    } else {
        out_Col = vec4(abs(normalize(rayorigin)), 1.0);
    }

    //out_Col = vec4(abs(normalize(raydir)), 1.0);
    //out_Col = vec4(t, 0.0, 0.0, 1.0);

}