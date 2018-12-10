#version 300 es
precision highp float;

uniform sampler2D u_EnvMap;
uniform sampler2D u_FloorTex;

uniform sampler2D u_Pos;
uniform sampler2D u_Nor;
uniform sampler2D u_Albedo;
uniform sampler2D u_Material;
uniform sampler2D u_SceneInfo; // extend to multiple textures
uniform sampler2D u_BVH; // extend to multiple textures

uniform int u_SceneTexWidth; // extend to multiple size
uniform int u_SceneTexHeight; // extend to multiple size
uniform int u_TriangleCount;

uniform int u_BVHTexWidth; // extend to multiple size
uniform int u_BVHTexHeight; // extend to multiple size
uniform int u_NodeCount;


// currently one light
uniform vec4 u_LightPos;
uniform float u_Time;

uniform vec3 u_Camera;
uniform float u_Width;
uniform float u_Height;
uniform mat4 u_ViewInv;
uniform mat4 u_ProjInv;
uniform float u_Far;

uniform int u_RayDepth;
uniform int u_UseBVH;
uniform int u_UseDispersion;



in vec2 fs_UV;
out vec4 out_Col;


const float EPSILON = 0.0001;
const float FLT_MAX = 1000000.0;
const float envEmittance = 1.0;
const float indexOfRefraction = 2.42;   
const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;
const int STACK_SIZE = 100;

const float ior_r = 2.408;
const float ior_g = 2.424;
const float ior_b = 2.432;

vec3 missColor = vec3(0.0, 0.0, 0.0);

#define USE_BVH 1

struct Ray{
    vec3 origin;
    vec3 direction;
    vec3 color;
    int remainingBounces;
    bool hitLight;
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
    int startIdx;
    int endIdx;
};

vec2 interpolateUV(in vec3 p1, in vec3 p2, in vec3 p3, 
                    in vec2 uv1, in vec2 uv2, in vec2 uv3,
                    vec3 p) {
    float s = length(cross(p1 - p2, p3 - p2)) / 2.0;
    float s1 = length(cross(p - p2, p3 - p2)) / 2.0;
    float s2 = length(cross(p - p3, p1 - p3)) / 2.0;
    float s3 = length(cross(p - p1, p2 - p1)) / 2.0;

    vec2 p_uv = uv1 * s1 / s + uv2 * s2 / s + uv3 * s3 / s;
    return p_uv;
    

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

void getTriangleUVAndTexID(in int index, out vec2 UV0, out vec2 UV1, out vec2 UV2, out float texID) {
    int row = index / u_SceneTexWidth;
    int col = index - row * u_SceneTexWidth;

    row = row * 11;

    float u = (float(col) + 0.5) / float(u_SceneTexWidth);
    float v0 = (float(row) + 6.5) / float(u_SceneTexHeight);
    float v1 = (float(row) + 7.5) / float(u_SceneTexHeight);
    float v2 = (float(row) + 8.5) / float(u_SceneTexHeight);

    UV0 = texture(u_SceneInfo, vec2(u, v0)).xy;
    UV1 = texture(u_SceneInfo, vec2(u, v1)).xy;
    UV2 = texture(u_SceneInfo, vec2(u, v2)).xy;

    texID = texture(u_SceneInfo, vec2(u, v0)).z;
}

vec4 getTriangleBaseColor(in int index) {
    int row = index / u_SceneTexWidth;
    int col = index - row * u_SceneTexWidth;

    row = row * 11;

    float u = (float(col) + 0.5) / float(u_SceneTexWidth);
    float v0 = (float(row) + 9.5) / float(u_SceneTexHeight);

    return  texture(u_SceneInfo, vec2(u, v0));
}

vec4 getTriangleMaterial(in int index) {
    int row = index / u_SceneTexWidth;
    int col = index - row * u_SceneTexWidth;

    row = row * 11;

    float u = (float(col) + 0.5) / float(u_SceneTexWidth);
    float v0 = (float(row) + 10.5) / float(u_SceneTexHeight);
    
    return texture(u_SceneInfo, vec2(u, v0));
}

TreeNode getTreeNode(int nodeIdX) {
    int row = nodeIdX / u_BVHTexWidth;
    int col = nodeIdX - row * u_BVHTexWidth;

    row = row * 5;

    float u = (float(col) + 0.5) / float(u_BVHTexWidth);
    float v0 = (float(row) + 0.5) / float(u_BVHTexHeight);
    float v1 = (float(row) + 1.5) / float(u_BVHTexHeight);
    float v2 = (float(row) + 2.5) / float(u_BVHTexHeight);
    float v3 = (float(row) + 3.5) / float(u_BVHTexHeight);
    
    vec4 e0 = texture(u_BVH, vec2(u, v0));
    vec4 e1 = texture(u_BVH, vec2(u, v1));
    vec4 e2 = texture(u_BVH, vec2(u, v2));
    vec4 e3 = texture(u_BVH, vec2(u, v3));

    TreeNode node;
    node.isLeaf = int(e0[0]);
    node.leftIdx = int(e0[1]);
    node.rightIdx = int(e0[2]);
    node.id = int(e0[3]);

    node.AABB_min = e1.xyz;
    node.AABB_max = e2.xyz;

    node.startIdx = int(e3[0]);
    node.endIdx = int(e3[1]);

    return node;
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

// calculate environment mapping parameters
void calEnvUV(in vec3 pos, in vec3 nor, out vec2 uv) {
    // vec3 eye = normalize(pos - u_Camera);
    vec3 r = nor; //normalize(reflect(eye, normalize(nor)));
    float a = r.x * r.x + r.y * r.y + r.z * r.z;
    float b = 2.0 * (r.x * pos.x + r.y * pos.y + r.z * pos.z);
    float c = (pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) - u_Far * u_Far;
    float delta = sqrt(pow(b, 2.0) - 4.0 * a * c);
    float t = (- b + delta) / (2.0 * a);
    vec3 dir = normalize(pos + t * r);
    calEnvUV(dir, uv);
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

    for(int i = node.startIdx; i <= node.endIdx; i++) {
        int currTriangleIdx = i;
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

bool intersectionCheck(in Ray ray, out int triangleIdx, out vec3 p1, out vec3 p2, out vec3 p3, out Intersection intersection) {
    vec3 temp_p1 = vec3(0.0);
    vec3 temp_p2 = vec3(0.0);
    vec3 temp_p3 = vec3(0.0);

    float minDist = FLT_MAX;

    for(int i = 0; i < u_TriangleCount; i++) {
        getTrianglePosition(i, temp_p1, temp_p2, temp_p3);
        vec3 intersectionPos = intersection.position;
        if(rayIntersectsTriangle(ray.origin, ray.direction, temp_p1, temp_p2, temp_p3, intersectionPos)) {
            float dist = length(intersectionPos - ray.origin);
            if (dist <= minDist) {
                minDist = dist;
                triangleIdx = i;
                p1 = temp_p1;
                p2 = temp_p2;
                p3 = temp_p3;
                intersection.position = intersectionPos;
                intersection.normal = getTriangleNormal(i);
            }
        }
    }

    if (minDist < FLT_MAX) {
        return true;
    } else {
        return false;
    }


}

void refractRay(in vec3 intersetionNormal, in vec3 intersectionP, in vec3 rayDir, in float ior, out Ray ray) {
    float criticalAngle = 0.0; 
    float theta_in;
    vec3 normal;

    float NI = dot(intersetionNormal, rayDir);
    float ratio = ior;
   
    if (NI < 0.0) {     // enter surface
        ratio = 1.0 / ior;
        theta_in = acos(dot(normalize(-1.0 * rayDir), normalize(intersetionNormal)));
        normal = intersetionNormal;
    } else {            // leave surface
        ratio = ior;
        theta_in = acos(dot(normalize(rayDir), normalize(intersetionNormal)));        
        normal = -1.0 * intersetionNormal;
    }

    if (ratio > 1.0) {
        criticalAngle = asin(1.0 / ratio);
    } else {
        criticalAngle = 100000.0;        
    }

    if (theta_in > criticalAngle) {  // do reflection
        ray.direction = reflect(rayDir, normal);
        ray.origin = intersectionP + normal * EPSILON;

    } else {                          // do refraction
        ray.direction = refract(rayDir, normal, ratio);
        if (NI < 0.0) {
            ray.origin = intersectionP - intersetionNormal * EPSILON;
        } else {
            ray.origin = intersectionP + intersetionNormal * EPSILON;
        }
    }


}

Ray castRay(in float ior, out Intersection intersection) {
    Ray ray;

    vec4 NDC = vec4(0.0, 0.0, 1.0, 1.0);
    // lower left corner is (0, 0) for Frag_Coord
    NDC.x = (gl_FragCoord.x / u_Width) * 2.0 - 1.0;
    NDC.y = (gl_FragCoord.y / u_Height) * 2.0 - 1.0;

    vec4 pixelWorldPos = u_ViewInv * u_ProjInv * (NDC * u_Far);
    vec3 rayDir = normalize(pixelWorldPos.xyz - u_Camera); 

    vec3 worldPos = texture(u_Pos, fs_UV).xyz;
    vec3 worldNor = texture(u_Nor, fs_UV).xyz;
    vec3 albedo = texture(u_Albedo, fs_UV).xyz;
    vec4 material = texture(u_Material, fs_UV);

    ray.hitLight = false;
    ray.remainingBounces = u_RayDepth;    

    // for screen pixels where no geometry and non-reflective
    if (length(worldNor) <= 0.0) {
        ray.remainingBounces = -1;
    }


    // shoot initial ray if refraction prop > 0
    if (material[2] > 0.0) {
        refractRay(worldNor, worldPos, rayDir, ior, ray);
        ray.color = albedo;  
        intersection.position = worldPos;
        intersection.normal = worldNor;
    } else {
        ray.remainingBounces = -1;
    }
    
    
    // for screen pixels on light mesh: do not shoot ray
    if (material[3] > 0.0) {
        ray.remainingBounces = -1;

    }

    return ray;
}

void shadeRay(in int triangleIdx, in vec3 p1, in vec3 p2, in vec3 p3, in Intersection intersection, in float ior, out Ray ray) {    
    // vec3 normal = getTriangleNormal(triangleIdx);
    vec4 material = getTriangleMaterial(triangleIdx);
    vec4 baseColor = getTriangleBaseColor(triangleIdx);

    float refractProp = material[2];  
    float emittance = material[3];    

    // hit light
    if (emittance > 0.0) {
            ray.remainingBounces = 0;   
            ray.hitLight = true; 
            ray.color *= (baseColor.xyz * emittance);   
            return;
    }


    if (refractProp > 0.0) {
        refractRay(intersection.normal, intersection.position, ray.direction, ior, ray);        
        ray.remainingBounces--;   
    } else {
        ray.remainingBounces = 0;
    }

    vec2 uv1, uv2, uv3;
    float texID = -1.0;
    getTriangleUVAndTexID(triangleIdx, uv1, uv2, uv3, texID);
    if (texID > 0.9 && texID < 1.1) {   // hit triangle with floor texture
        vec2 interpUV = interpolateUV(p1, p2, p3, uv1, uv2, uv3, intersection.position);
        interpUV.y *= -1.0;
        vec3 texColor = texture(u_FloorTex, interpUV).rgb;
        ray.color *= (texColor.xyz * 1.5);
        
    } else {
        ray.color *= baseColor.xyz;
    }
    
}

void raytrace(in float ior, inout Ray ray, inout Intersection intersection) {
    int triangleIdx = -1;
    vec3 p1, p2, p3;


    if (u_UseBVH == 1) {
        //=============== use BVH ====================================
        if (intersectionCheckByBVH(ray, triangleIdx, p1, p2, p3, intersection)) {     
            shadeRay(triangleIdx, p1, p2, p3, intersection, ior, ray);  
    
        } else {
            vec2 envUV;
            calEnvUV(ray.origin, ray.direction, envUV);
            ray.color *= texture(u_EnvMap, envUV).rgb * envEmittance;
            ray.remainingBounces = 0;   
            ray.hitLight = true;                           
        }
        //============================================================
    } else {
        //===============brute force loop============================
        if (intersectionCheck(ray, triangleIdx, p1, p2, p3, intersection)) {                
            shadeRay(triangleIdx, p1, p2, p3, intersection, ior, ray);
        } else {
            // ray.color = missColor;
            vec2 envUV;
            calEnvUV(ray.origin, ray.direction, envUV);
            ray.color *= texture(u_EnvMap, envUV).rgb * envEmittance;
            ray.remainingBounces = 0;
            ray.hitLight = true;
        }
        //============================================================
    }
}




void main() {   

    if(u_UseDispersion == 1) {

        Intersection intersectionR, intersectionG, intersectionB;
        Ray rayR = castRay(ior_r, intersectionR), rayG = castRay(ior_g, intersectionG), rayB = castRay(ior_b, intersectionB);

        vec4 colorR, colorG, colorB;

        if (rayR.remainingBounces == -1) {
            colorR = vec4(missColor, 1.0);
        } else {
            while (rayR.remainingBounces > 0) {       
                raytrace(ior_r, rayR, intersectionR);
            }
            if (!rayR.hitLight) {
                //------------------------------------------------------------
                vec2 envUV;
                calEnvUV(rayR.origin, rayR.direction, envUV);
                rayR.color *= texture(u_EnvMap, envUV).rgb * envEmittance;
                //------------------------------------------------------------
                rayR.color *= 0.8;  // decrese color intensity for rays > maxDepth
            }
            colorR = vec4(rayR.color, 1.0);   
        }

        if (rayG.remainingBounces == -1) {
            colorG = vec4(missColor, 1.0);
        } else {
            while (rayG.remainingBounces > 0) {       
                raytrace(ior_g, rayG, intersectionG);
            }
            if (!rayG.hitLight) {
                //------------------------------------------------------------
                vec2 envUV;
                calEnvUV(rayG.origin, rayG.direction, envUV);
                rayG.color *= texture(u_EnvMap, envUV).rgb * envEmittance;
                //------------------------------------------------------------
                rayG.color *= 0.8;  // decrese color intensity for rays > maxDepth
            }
            colorG = vec4(rayG.color, 1.0);   
        }

        if (rayB.remainingBounces == -1) {
            colorB = vec4(missColor, 1.0);
        } else {
            while (rayB.remainingBounces > 0) {       
                raytrace(ior_b, rayB, intersectionB);
            }
            if (!rayB.hitLight) {
                //------------------------------------------------------------
                vec2 envUV;
                calEnvUV(rayB.origin, rayB.direction, envUV);
                rayB.color *= texture(u_EnvMap, envUV).rgb * envEmittance;
                //------------------------------------------------------------
                rayB.color *= 0.8;  // decrese color intensity for rays > maxDepth
            }
            colorB = vec4(rayB.color, 1.0);   
        }

        out_Col = vec4(colorR.r, colorG.g, colorB.b, 1.0);

    } else {
        Intersection intersection;
        Ray ray = castRay(indexOfRefraction, intersection); 

        if (ray.remainingBounces == -1) {
            // out_Col = vec4(missColor, 1.0);
            out_Col = vec4(texture(u_Albedo, fs_UV).xyz, 1.0);
            return;
        }

        while (ray.remainingBounces > 0) {       
            raytrace(indexOfRefraction, ray, intersection);
        }

        if (!ray.hitLight) {
            //------------------------------------------------------------
            vec2 envUV;
            calEnvUV(ray.origin, ray.direction, envUV);
            ray.color *= texture(u_EnvMap, envUV).rgb * envEmittance;
            //------------------------------------------------------------
            ray.color *= 0.8;  // decrese color intensity for rays > maxDepth
        }
            
        out_Col = vec4(ray.color, 1.0);   
    }

}