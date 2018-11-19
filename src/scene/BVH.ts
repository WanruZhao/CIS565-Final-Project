import { Primitive, AABB } from './scene';

const MAX_PRIMITIVES_IN_NODE = 8;
const MIN_AABB_LENGTH = 0.001;

export class KDTreeNode {
    id: number
    aabb: AABB
    left: KDTreeNode
    right: KDTreeNode
    primitives: Array<Primitive>
    axis: number

    constructor() {
        // assign defualt values
        this.aabb = null;
        this.left = null;
        this.right = null;
        this.primitives = null;
        this.axis = 0;

    }
}

export function buildKDTree(primitives: Array<Primitive>, depth: number, maxDepth: number): KDTreeNode {
    if (primitives == null) {
        return null;
    }
    if (primitives != null && primitives.length == 0) {
        return null;
    }

    let node = new KDTreeNode();
    node.primitives = primitives;

    // calculate AABB
    for (let i = 0; i < primitives.length; ++i) {
        let primitive = primitives[i];
        if (i == 0) {
            node.aabb = primitive.aabb;
            continue;
        }
        node.aabb = node.aabb.union(primitive.aabb);
    }

    // cases when stop spliting
    if (primitives.length <= MAX_PRIMITIVES_IN_NODE || depth > maxDepth) {
        return node;
    }
    let axis = node.aabb.getLongestAxis();
    if (node.aabb.max[axis] - node.aabb.min[axis] < MIN_AABB_LENGTH) {
        return node;
    }

    // construct left and right primitives
    primitives = primitives.sort((p1, p2) => {
        let center1 = p1.aabb.getMedianPoint();
        let center2 = p2.aabb.getMedianPoint();
        
        return center1[axis] - center2[axis];
    });

    let leftPrimitives = primitives.slice(0, primitives.length / 2 + 1);
    let rightPrimitives = primitives.slice(primitives.length / 2 + 1, primitives.length);

    node.left = buildKDTree(leftPrimitives, depth + 1, maxDepth);
    node.right = buildKDTree(rightPrimitives, depth + 1, maxDepth);
    
    node.axis = axis;
    
    return node;

}

// traverse kd tree to assign id to each node
function traverseKDTree(root: KDTreeNode) {
    let count = 0;
    let queue = Array<KDTreeNode>();
    queue.push(root);
    while (queue.length > 0) {
        let node = queue.pop();
        node.id = count++;
        node.left && queue.push(node.left);
        node.left && queue.push(node.right);
    }
}

export function flattenKDTree() {

}