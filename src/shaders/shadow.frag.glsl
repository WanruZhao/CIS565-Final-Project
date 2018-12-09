#version 300 es
precision highp float;

uniform sampler2D u_Pos;
uniform sampler2D u_Nor;
uniform sampler2D u_Albedo;
uniform sampler2D u_SceneInfo; // extend to multiple textures
uniform int u_SceneTexWidth; // extend to multiple size
uniform int u_SceneTexHeight; // extend to multiple size
uniform int u_TriangleCount;
uniform float u_Width;
uniform float u_Height;

uniform sampler2D u_BVH; // extend to multiple textures
uniform int u_BVHTexWidth; // extend to multiple size
uniform int u_BVHTexHeight; // extend to multiple size
uniform int u_NodeCount;

// currently one light
uniform vec4 u_LightPos;
uniform float u_Time;

in vec2 fs_UV;
out vec4 out_Col;

const float lightscale = 0.5;
const float EPSILON = 0.0001;
const float FLT_MAX = 1000000.0;



const int STACK_SIZE = 100;


struct Ray{
    vec3 origin;
    vec3 direction;
    vec3 color;
    int remainingBounces;
    bool hitLight;
    float accuSpecular;
};

struct Intersection{
    vec3 position;
    vec3 normal;
};

struct TreeNode{
    int isLeaf;
    int leftIdx;
    int rightIdx;
    int id;
    vec3 AABB_min;
    vec3 AABB_max;
    int triangleIDs[8];
};

//=============================================================================================================

TreeNode getTreeNode(int nodeIdX) {
    int row = nodeIdX / u_BVHTexWidth;
    int col = nodeIdX - row * u_BVHTexWidth;

    row = row * 5;

    float u = (float(col) + 0.5) / float(u_BVHTexWidth);
    float v0 = (float(row) + 0.5) / float(u_BVHTexHeight);
    float v1 = (float(row) + 1.5) / float(u_BVHTexHeight);
    float v2 = (float(row) + 2.5) / float(u_BVHTexHeight);
    float v3 = (float(row) + 3.5) / float(u_BVHTexHeight);
    float v4 = (float(row) + 4.5) / float(u_BVHTexHeight);
    
    vec4 e0 = texture(u_BVH, vec2(u, v0));
    vec4 e1 = texture(u_BVH, vec2(u, v1));
    vec4 e2 = texture(u_BVH, vec2(u, v2));
    vec4 e3 = texture(u_BVH, vec2(u, v3));
    vec4 e4 = texture(u_BVH, vec2(u, v4));

    TreeNode node;
    node.isLeaf = int(e0[0]);
    node.leftIdx = int(e0[1]);
    node.rightIdx = int(e0[2]);
    node.id = int(e0[3]);

    node.AABB_min = e1.xyz;
    node.AABB_max = e2.xyz;

    node.triangleIDs[0] = int(e3[0]);
    node.triangleIDs[1] = int(e3[1]);
    node.triangleIDs[2] = int(e3[2]);
    node.triangleIDs[3] = int(e3[3]);
    node.triangleIDs[4] = int(e4[0]);
    node.triangleIDs[5] = int(e4[1]);
    node.triangleIDs[6] = int(e4[2]);
    node.triangleIDs[7] = int(e4[3]);

    return node;
}

void getTrianglePosition(in int index, out vec3 p0, out vec3 p1, out vec3 p2) {
    int row = index / u_SceneTexWidth;
    int col = index - row * u_SceneTexWidth;

    row = row * 11;

    float u = (float(col) + 0.5) / float(u_SceneTexWidth);
    float v0 = (float(row) + 0.5) / float(u_SceneTexHeight);
    float v1 = (float(row) + 1.5) / float(u_SceneTexHeight);
    float v2 = (float(row) + 2.5) / float(u_SceneTexHeight);

    p0 = texture(u_SceneInfo, vec2(u, v0)).xyz;
    p1 = texture(u_SceneInfo, vec2(u, v1)).xyz;
    p2 = texture(u_SceneInfo, vec2(u, v2)).xyz;
}

vec3 getTriangleNormal(in int index) {
    int row = index / u_SceneTexWidth;
    int col = index - row * u_SceneTexWidth;

    row = row * 11;

    float u = (float(col) + 0.5) / float(u_SceneTexWidth);
    float v0 = (float(row) + 3.5) / float(u_SceneTexHeight);
    float v1 = (float(row) + 4.5) / float(u_SceneTexHeight);
    float v2 = (float(row) + 5.5) / float(u_SceneTexHeight);

    vec3 n0 = normalize(texture(u_SceneInfo, vec2(u, v0)).xyz);
    vec3 n1 = normalize(texture(u_SceneInfo, vec2(u, v1)).xyz);
    vec3 n2 = normalize(texture(u_SceneInfo, vec2(u, v2)).xyz);

    return (n0 + n1 + n2) / 3.0;
}

// reference to 
// https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
bool rayIntersectsTriangle(in vec3 rayOrigin, 
                           in vec3 rayDir, 
                           in vec3 p0,
                           in vec3 p1,
                           in vec3 p2,
                           out vec3 intersection)
{
    const float EPSILON = 0.0000001;
    vec3 edge1, edge2, h, s, q;
    float a,f,u,v;
    edge1 = p1 - p0;
    edge2 = p2 - p0;
    h = cross(rayDir, edge2);
    a = dot(edge1, h);
    if (a > -EPSILON && a < EPSILON)
        return false;    // This ray is parallel to this triangle.
    f = 1.0/a;
    s = rayOrigin - p0;
    u = f * (dot(s, h));
    if (u < 0.0 || u > 1.0)
        return false;
    q = cross(s, edge1);
    v = f * dot(rayDir, q);
    if (v < 0.0 || u + v > 1.0)
        return false;
    // At this stage we can compute t to find out where the intersection point is on the line.
    float t = f * dot(edge2, q);
    if (t > EPSILON) // ray intersection
    {
        intersection = rayOrigin + rayDir * t;
        return true;
    }
    else // This means that there is a line intersection but not a ray intersection.
        return false;
}

bool intersectionCheckInNode(in Ray ray, in TreeNode node, out int triangleIdx, out vec3 p1, out vec3 p2, out vec3 p3, out Intersection intersection) {
    vec3 temp_p1 = vec3(0.0);
    vec3 temp_p2 = vec3(0.0);
    vec3 temp_p3 = vec3(0.0);

    float minDist = FLT_MAX;

    for(int i = 0; i < node.triangleIDs.length(); i++) {
        int currTriangleIdx = node.triangleIDs[i];
        if (currTriangleIdx < 0) {
            break;
        }
        getTrianglePosition(currTriangleIdx, temp_p1, temp_p2, temp_p3);
        vec3 intersectionPos = intersection.position;
        if(rayIntersectsTriangle(ray.origin, ray.direction, temp_p1, temp_p2, temp_p3, intersectionPos)) {
            float dist = length(intersectionPos - ray.origin);
            if (dist <= minDist) {
                minDist = dist;
                triangleIdx = currTriangleIdx;
                p1 = temp_p1;
                p2 = temp_p2;
                p3 = temp_p3;
                intersection.position = intersectionPos;
                intersection.normal = getTriangleNormal(currTriangleIdx);
            }
        }
    }

    if (minDist < FLT_MAX) {
        return true;
    } else {
        return false;
    }


}

// refer to https://www.reddit.com/r/opengl/comments/8ntzz5/fast_glsl_ray_box_intersection/
//https://www.scratchapixel.com/lessons/3d-basic-rendering/minimal-ray-tracer-rendering-simple-shapes/ray-box-intersection
bool rayIntersectsBox(const vec3 boxMin, const vec3 boxMax, const Ray ray) {
    vec3 invDir = 1.0 / ray.direction;
    vec3 tbot = invDir * (boxMin - ray.origin);
    vec3 ttop = invDir * (boxMax - ray.origin);
    vec3 tmin = min(ttop, tbot);
    vec3 tmax = max(ttop, tbot);
    vec2 t = max(tmin.xx, tmin.yz);
    float t0 = max(t.x, t.y);
    t = min(tmax.xx, tmax.yz);
    float t1 = min(t.x, t.y);
    return t1 > max(t0, 0.0);
}

bool intersectionCheckByBVH(in Ray ray, out int triangleIdx, out vec3 p1, out vec3 p2, out vec3 p3, out Intersection intersection) {
    
    int stack[STACK_SIZE];
                                                                                     
    int pointer = -1;

    float minDist = FLT_MAX;

    stack[++pointer] = 0;  // push root node into stack
    
    while (pointer >= 0 && pointer < STACK_SIZE) {
        
        TreeNode node = getTreeNode(stack[pointer--]);

        if (!rayIntersectsBox(node.AABB_min, node.AABB_max, ray)) {  
            continue;                                                                  
        }

        if (node.isLeaf == 1) {
            int temp_intersectTriangleIdx = -1;
            vec3 temp_p1, temp_p2, temp_p3;
            Intersection temp_intersection; 

            if (intersectionCheckInNode(ray, node, temp_intersectTriangleIdx, temp_p1, temp_p2, temp_p3, temp_intersection)) {
                float dist = length(temp_intersection.position - ray.origin);
                if (dist <= minDist) {
                    minDist = dist;
                    triangleIdx = temp_intersectTriangleIdx;
                    p1 = temp_p1;
                    p2 = temp_p2;
                    p3 = temp_p3;
                    intersection = temp_intersection;
                }
            }
            
        } else {
            if (node.leftIdx > 0) {
                stack[++pointer] = node.leftIdx;
            }
            if (node.rightIdx > 0) {
                stack[++pointer] = node.rightIdx;
            }
        }


    }

    

    if (minDist < FLT_MAX) {
        return true;
    } else {
        return false;
    }

}

//=============================================================================================================


/* optimization: BVH, backface culling */

bool isIntersectWithTriangle(in vec3 raydir, in vec3 rayorigin, in vec3 p0, in vec3 p1, in vec3 p2, in vec3 normal, out float t) {

    vec3 e1 = p1 - p0;
    vec3 e2 = p2 - p0;
    vec3 q = cross(raydir, e2);
    float a = dot(e1, q);
    if(a > -0.00001 && a < 0.00001) {
        t = 0.0;
        return false;
    }
    float f = 1.0 / a;
    vec3 s = rayorigin - p0;
    float u = f * dot(s, q);
    if(u < 0.0) {
        t = 0.0;
        return false;
    }
    vec3 r = cross(s, e1);
    float v = f * dot(raydir, r);
    if(v < 0.0 || u + v > 1.0) {
        t = 0.0;
        return false;
    }
    t = f * dot(e2, r);
    return true;

}

// calculate if ray hits one triangle
bool isHit(in vec3 raydir, in vec3 rayorigin, out float t) {

    //float t = 10.0;
    vec3 p0 = vec3(0.0);
    vec3 p1 = vec3(0.0);
    vec3 p2 = vec3(0.0);

    for(int i = 0; i < u_TriangleCount; i++) {
        getTrianglePosition(i, p0, p1, p2);
        vec3 normal = getTriangleNormal(i);
        if(isIntersectWithTriangle(raydir, rayorigin, p0, p1, p2, normal, t)) {
            if(t < 1.0 && t > 0.0) {
                return true;
            }
        }
    }

    return false;
}

float shadowCoef(in vec3 origin, in vec3 lightcenter, in int samplehalfside) {
    float totalsample = pow(float(samplehalfside) + 1.0, 2.0);
    float accum = 0.0;
    float t;

    for(int i = -samplehalfside; i <= samplehalfside; i++) {
        for(int j = -samplehalfside; j <= samplehalfside; j++) {
            vec3 pos = lightcenter + vec3(float(i) * lightscale, 0.0, float(j) * lightscale);
            vec3 dir = pos - origin;
            t = 10.0;
            if(!isHit(dir, origin, t)) {
                accum += 1.0;
            }
        }
    }

    return accum / totalsample;
}

void main()
{
    // calculate launched ray from first hit point to light
    vec2 pixel = fs_UV; 
    vec4 worldPos = texture(u_Pos, pixel);

    vec3 dynamiclightpos = u_LightPos.xyz;
	//dynamiclightpos.x *= sin(u_Time);


    vec3 rayorigin = worldPos.xyz + normalize(texture(u_Nor, pixel).xyz) * 0.001;

    vec4 col = texture(u_Albedo, pixel);

    float coef = shadowCoef(rayorigin, dynamiclightpos, 3);
    out_Col = vec4(col.xyz * (coef * 0.1 + 0.9), 1.0);

    // out_Col = vec4(texture(u_BVH, fs_UV).xyz, 1.0);
    


}