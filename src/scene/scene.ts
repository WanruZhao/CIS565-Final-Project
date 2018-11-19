import { vec3, vec4 } from 'gl-matrix';
import Mesh from '../geometry/Mesh';
import { Texture } from '../rendering/gl/Texture';

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
            return 0;
        } else if (diff[1] > diff[2]) {
            return 1;
        } else {
            return 2;
        }
    }

    getMedianPoint(): vec3 {
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
    meshes: Map<string, Mesh>
    textureSets: Map<string, Map<string, Texture>>

    constructor() {
        this.primitives = new Array<Primitive>();
        this.meshes = new Map<string, Mesh>();
        this.textureSets = new Map<string, Map<string, Texture>>();
        
    }

    addMesh(name: string, mesh: Mesh) {
        this.meshes.set(name, mesh);
    }

    addTextureSet(name: string, textureSet: Map<string, Texture>) {
        this.textureSets.set(name, textureSet);
    }

    getMesh(name: string): Mesh {
        return this.meshes.get(name);
    }

    getTextureSet(name: string): Map<string, Texture> {
        return this.textureSets.get(name);
    }

    destroy() {
        for (let mesh of this.meshes.values()) {
            mesh.destroy();
        }
        this.meshes.clear();
    }

}





