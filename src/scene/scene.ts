import { vec3, vec4 } from 'gl-matrix';
import Mesh from '../geometry/Mesh';
import { Texture, TextureBuffer, BVHTextureBuffer } from '../rendering/gl/Texture';
import { KDTreeNode, buildKDTree } from './BVH';
import ShaderProgram from '../rendering/gl/ShaderProgram';
import { performance } from 'perf_hooks';

const maxTextureSize : number = 4096;

export var ELEMENT_TYPE = 
{
    POSITION: 0,
    NORMAL: 1,
    UV: 2,
    BASECOLOR: 3,
    MATERIAL: 4,
    TEXTUREID: 5,
};

export class AABB {
    min: vec3
    max: vec3
    
    constructor(min: vec3, max: vec3) {
        this.min = min;
        this.max = max;
    }

    getLongestAxis(): number {
        let diff = vec3.fromValues(0.0, 0.0, 0.0);
        vec3.subtract(diff, this.max, this.min);
        if (diff[0] > diff[1] && diff[0] > diff[2]) {
            return 0;  // x axis
        } else if (diff[1] > diff[2]) {
            return 1;  // y axis
        } else {
            return 2;  // z axis
        }
    }

    getCenterPoint(): vec3 {
        let diff = vec3.fromValues(0.0, 0.0, 0.0);
        let center = vec3.fromValues(0.0, 0.0, 0.0);
        
        vec3.subtract(diff, this.max, this.min);
        vec3.scale(diff, diff, 0.5);
        vec3.add(center, this.min, diff);

        return center;
    }

    union(b: AABB): AABB {
        let min = vec3.fromValues(Math.min(this.min[0], b.min[0]),
                                    Math.min(this.min[1], b.min[1]),
                                    Math.min(this.min[2], b.min[2]));
        let max = vec3.fromValues(Math.max(this.max[0], b.max[0]),
                                    Math.max(this.max[1], b.max[1]),
                                    Math.max(this.max[2], b.max[2]));

        return new AABB(min, max); 
    }

}


export class Material {
    specular: number
    diffuse: number
    refraction: number
    emittance: number

    
    constructor(specular: number, 
                diffuse: number, 
                refraction: number,
                emittance: number) {
        this.specular = specular;
        this.diffuse = diffuse;
        this.refraction = refraction;
        this.emittance = emittance;
    }
}

export class Primitive {
    points: Array<vec4>
    id: number
    aabb: AABB

    constructor(p1: vec4, p2: vec4, p3:  vec4, id: number) {
        this.points = new Array<vec4>();
        this.points[0] = vec4.clone(p1);
        this.points[1] = vec4.clone(p2);
        this.points[2] = vec4.clone(p3);

        this.id = id;

        this.aabb = this.getAABB();
        
    }

    getAABB(): AABB {
        let min = vec3.fromValues(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = vec3.fromValues(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
        
        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 3; ++j) {
                if (this.points[i][j] > max[j]) {
                    max[j] = this.points[i][j];
                }
            }
        }

        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 3; ++j) {
                if (this.points[i][j] < min[j]) {
                    min[j] = this.points[i][j];
                }
            }
        }

        let epsilon = 0.01;
        max[0] = max[0] + epsilon;
        max[1] = max[1] + epsilon;
        max[2] = max[2] + epsilon;

        min[0] = min[0] - epsilon;
        min[1] = min[1] - epsilon;
        min[2] = min[2] - epsilon;
        
        return new AABB(min, max);
    }

}


export class Scene {
    primitives: Array<Primitive>
    meshes: Mesh[]
    textureSets: Array<Map<string, Texture>>
    sceneInfoTextures: TextureBuffer[]
    BVHTextures: BVHTextureBuffer[]    
    triangleCount: number
    environment: Texture
    kdTreeRoot: KDTreeNode
    kdTreeNodeList: KDTreeNode[]
    nodeCount: number
    


    constructor() {
        this.primitives = new Array<Primitive>();
        this.meshes = []
        this.textureSets = new Array<Map<string, Texture>>();
        this.sceneInfoTextures = [];
        this.BVHTextures = [];        
        this.triangleCount = 0;
        this.kdTreeRoot = null;
        this.kdTreeNodeList = null;
    }

    addSceneElement(mesh: Mesh, textureSet: Map<string, Texture>) {
        this.meshes.push(mesh);
        this.textureSets.push(textureSet);

        let count = this.primitives.length;
        mesh.primitives.forEach(primitive => {
            primitive.id = count++;
            this.primitives.push(primitive);
        });

        this.triangleCount += (mesh.count / 3);
    }

    addEnvironmentTexture(env: Texture) {
        this.environment = env;
    }

    buildSceneInfoTextures() {
        let maxTriangleCountPerTexture = maxTextureSize * Math.floor(maxTextureSize / 11);
        let sceneTexCount = Math.ceil(this.triangleCount / maxTriangleCountPerTexture);

        for(let i = 0; i < sceneTexCount; i++) {
          if(i == sceneTexCount - 1) {
            this.sceneInfoTextures.push(new TextureBuffer(this.triangleCount - maxTriangleCountPerTexture * i, 5, maxTextureSize));
          }
          else {
            this.sceneInfoTextures.push(new TextureBuffer(maxTriangleCountPerTexture, 5, maxTextureSize));
          }
        }

        let currentCount = 0;
        for(let i = 0; i < this.meshes.length; i++) {
            for(let j = 0; j < this.meshes[i].count / 3; j++) {
                let vertexIdx = [this.meshes[i].indices[j * 3], this.meshes[i].indices[j * 3 + 1], this.meshes[i].indices[j * 3 + 2]];
                let textureIdx = Math.floor((currentCount + j) / maxTriangleCountPerTexture);
                let localTriangleIdx = currentCount + j - textureIdx * maxTriangleCountPerTexture;

                for(let k = 0; k < 3; k++) {
                    // position
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.POSITION, k, 0)] = this.meshes[i].positions[4 * vertexIdx[k]];
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.POSITION, k, 1)] = this.meshes[i].positions[4 * vertexIdx[k] + 1];
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.POSITION, k, 2)] = this.meshes[i].positions[4 * vertexIdx[k] + 2];
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.POSITION, k, 3)] = 1.0;

                    // normal
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.NORMAL, k, 0)] = this.meshes[i].normals[4 * vertexIdx[k]];
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.NORMAL, k, 1)] = this.meshes[i].normals[4 * vertexIdx[k] + 1];
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.NORMAL, k, 2)] = this.meshes[i].normals[4 * vertexIdx[k] + 2];
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.NORMAL, k, 3)] = 0.0;

                    // uv and texture id
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.UV, k, 0)] = this.meshes[i].uvs[2 * vertexIdx[k]];
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.UV, k, 1)] = this.meshes[i].uvs[2 * vertexIdx[k] + 1];
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.UV, k, 2)] = i * 1.0 + 1.0;   // textureID
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.UV, k, 3)] = 0.0;
                
                    let p = vec3.fromValues(this.meshes[i].positions[4 * vertexIdx[k]], this.meshes[i].positions[4 * vertexIdx[k] + 1], this.meshes[i].positions[4 * vertexIdx[k] + 2]);
                    // debugger
                
                }


                // base color
                for(let k = 0; k < 4; k++) {
                    this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.BASECOLOR,0, k)] = this.meshes[i].baseColor[k];
                }
                
                // material
                this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.MATERIAL,0, 0)] = this.meshes[i].material.specular;
                this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.MATERIAL,0, 1)] = this.meshes[i].material.diffuse;
                this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.MATERIAL,0, 2)] = this.meshes[i].material.refraction;
                this.sceneInfoTextures[textureIdx]._buffer[this.sceneInfoTextures[textureIdx].bufferIndex(localTriangleIdx, ELEMENT_TYPE.MATERIAL,0, 3)] = this.meshes[i].material.emittance;
                
            }
            currentCount = currentCount + this.meshes[i].count / 3;
        }

        for(let i = 0; i < this.sceneInfoTextures.length; i++) {
            this.sceneInfoTextures[i].update();
        }

    }

    buildBVHTextures() {
        this.nodeCount = this.kdTreeNodeList.length;
        let maxNodesPerTexture = maxTextureSize * Math.floor(maxTextureSize / BVHTextureBuffer._pixelPerNode);
        let BVHTexCount = Math.ceil(this.nodeCount / maxNodesPerTexture);
        for(let i = 0; i < BVHTexCount; i++) {
          if(i == BVHTexCount - 1) {
            this.BVHTextures.push(new BVHTextureBuffer(this.nodeCount - maxNodesPerTexture * i, maxTextureSize));
          }
          else {
            this.BVHTextures.push(new BVHTextureBuffer(maxNodesPerTexture, maxTextureSize));
          }
        }


        for (let i = 0; i < this.nodeCount; ++i) {
            let node = this.kdTreeNodeList[i];
            let isLeaf = 1;   // 0 for intermediate node, 1 for leaf
            let leftIdx = -1;   // -1 for null
            let rightIdx = -1;   // -1 for null
            let nodeId = node.id;
            
            if (node.left || node.right) {
                isLeaf = 0;
            }
            if (node.left) {
                leftIdx = node.left.id;
            }
            if (node.right) {
                rightIdx = node.right.id;
            }
            

            let textureIdx = Math.floor(i / maxNodesPerTexture);
            let localNodeIdx = i - textureIdx * maxNodesPerTexture;

            // 0th element
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 0, 0)] = isLeaf;
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 0, 1)] = leftIdx;
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 0, 2)] = rightIdx;
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 0, 3)] = nodeId;

            // debugger
            

            // 1st element: AABB min
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 1, 0)] = node.aabb.min[0];
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 1, 1)] = node.aabb.min[1];
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 1, 2)] = node.aabb.min[2];
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 1, 3)] = 1.0;
            
            
            // 2nd element: AABB max
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 2, 0)] = node.aabb.max[0];
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 2, 1)] = node.aabb.max[1];
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 2, 2)] = node.aabb.max[2];
            this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 2, 3)] = 1.0;
            
            
            // 3rd element: triangleIDs part1
            if (isLeaf) {
                this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 3, 0)] = node.primitives[0] ? node.primitives[0].id : -1;
                this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 3, 1)] = node.primitives[1] ? node.primitives[1].id : -1;
                this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 3, 2)] = node.primitives[2] ? node.primitives[2].id : -1;
                this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 3, 3)] = node.primitives[3] ? node.primitives[3].id : -1;
    
                // 4th element: triangleIDs part2
                this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 4, 0)] = node.primitives[4] ? node.primitives[4].id : -1;
                this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 4, 1)] = node.primitives[5] ? node.primitives[5].id : -1;
                this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 4, 2)] = node.primitives[6] ? node.primitives[6].id : -1;
                this.BVHTextures[textureIdx]._buffer[this.BVHTextures[textureIdx].bufferIndex(localNodeIdx, 4, 3)] = node.primitives[7] ? node.primitives[7].id : -1;
            }

        }

        for(let i = 0; i < this.BVHTextures.length; i++) {
            this.BVHTextures[i].update();
        }

        console.log(this.BVHTextures[0]._buffer);
        
    }

    destroy() {
        for (let mesh of this.meshes.values()) {
            mesh.destroy();
        }
        this.meshes = null;
    }

}





