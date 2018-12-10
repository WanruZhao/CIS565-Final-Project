import { Primitive, AABB } from './scene';

const MAX_PRIMITIVES_IN_NODE = 8;
const MIN_AABB_LENGTH = 0.001;


let nodeCount = 0;

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
    node.id = nodeCount++;

    // calculate node AABB
    for (let i = 0; i < primitives.length; ++i) {
        let primitive = primitives[i];
        if (i == 0) {
            node.aabb = primitive.aabb;
            continue;
        }
        node.aabb = node.aabb.union(primitive.aabb);
    }

    // cases when stop spliting only when reach maximum triangles of node
    if (primitives.length <= MAX_PRIMITIVES_IN_NODE) {
        return node;
    }

    // calculate axis
    let axis = node.aabb.getLongestAxis();
    node.axis = axis;    
    if (node.aabb.max[axis] - node.aabb.min[axis] < MIN_AABB_LENGTH) {
        return node;
    }

    // sorting and construct left and right primitives
    primitives = primitives.sort((p1, p2) => {
        let center1 = p1.aabb.getCenterPoint();
        let center2 = p2.aabb.getCenterPoint();
        
        return center1[axis] - center2[axis];
    });

    let leftPrimitives = primitives.slice(0, primitives.length / 2);
    let rightPrimitives = primitives.slice(primitives.length / 2, primitives.length);

    node.left = buildKDTree(leftPrimitives, depth + 1, maxDepth);
    node.right = buildKDTree(rightPrimitives, depth + 1, maxDepth);
    
    return node;

}

// level-order traverse kd tree 
export function traverseKDTree(root: KDTreeNode): KDTreeNode[] {
    let queue = [];
    let nodeList = [];
    queue.push(root);
    while (queue.length > 0) {
        let node = queue.shift();
        nodeList.push(node);
        node.left && queue.push(node.left);
        node.right && queue.push(node.right);
    }

    nodeList = nodeList.sort((node1, node2) => {
        return node1.id - node2.id;
    });

    console.log('nodeList', nodeList);

    return nodeList;
}

