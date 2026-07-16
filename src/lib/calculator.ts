export type NodeType = 'olt' | 'splitter';

export interface FiberNode {
  id: string;
  name: string;
  type: NodeType;
  power?: number; // Only for OLT (TX Power)
  inputPower: number; // Received power before split
  currentPower: number; // Output power after split
  distance: number;
  ratio: number | 'unbalanced';
  percentage?: number; // Only for unbalanced
  children: FiberNode[];
}

export const LOSS_PER_KM = 0.35;
export const RATIO_LOSS: Record<number, number> = {
  1: 0,
  2: 3.5,
  4: 7.2,
  8: 10.5,
  16: 13.8,
  32: 17.1,
};

export function calculateAllLosses(node: FiberNode, parentPower: number = 8): void {
  const cableLoss = node.distance * LOSS_PER_KM;
  
  // Power arriving at this node's input
  const powerAtInput = node.type === 'olt' ? (node.power ?? 8) : (parentPower - cableLoss);
  node.inputPower = powerAtInput;

  // Calculate Output Power
  if (node.type === 'splitter' && node.ratio !== 'unbalanced' && typeof node.ratio === 'number' && node.ratio > 1) {
    const splitLoss = RATIO_LOSS[node.ratio] || 0;
    node.currentPower = powerAtInput - splitLoss;
  } else {
    // For ratio 1 or OLT or PLC (PLC handles loss in children), output = input
    node.currentPower = powerAtInput;
  }

  if (node.children && node.children.length > 0) {
    if (node.ratio === 'unbalanced') {
      const p = node.percentage || 0;
      if (p === 0) {
        if (node.children[0]) calculateAllLosses(node.children[0], node.currentPower);
        if (node.children[1]) calculateAllLosses(node.children[1], -99);
      } else {
        const loss1 = -10 * Math.log10(p / 100) + 0.5;
        const loss2 = -10 * Math.log10((100 - p) / 100) + 0.5;
        if (node.children[0]) calculateAllLosses(node.children[0], node.currentPower - loss1);
        if (node.children[1]) calculateAllLosses(node.children[1], node.currentPower - loss2);
      }
    } else {
      // Children receive the output power of this node
      node.children.forEach((child) => {
        calculateAllLosses(child, node.currentPower);
      });
    }
  }
}

export function getStatusClass(dbm: number): string {
  if (dbm > -20) return 'status-safe';
  if (dbm > -27) return 'status-warning';
  return 'status-danger';
}

export function syncChildren(node: FiberNode): FiberNode {
  let targetCount = 1; // Default to 1 child (point-to-point / daisy-chain)
  if (node.ratio === 'unbalanced') targetCount = 2;
  else if (typeof node.ratio === 'number' && node.ratio > 1) targetCount = node.ratio;

  let newChildren = [...node.children];

  if (newChildren.length < targetCount) {
    for (let i = newChildren.length; i < targetCount; i++) {
      let childName = '';
      let childDistance = 1;
      
      if (node.ratio === 'unbalanced') {
        childName = i === 0 ? 'Drop' : 'Through';
        childDistance = i === 0 ? 0 : 0.1;
      } else {
        childName = `SPL-${node.name.split('-')[1] || ''}.${i + 1}`;
        childDistance = 1;
      }

      newChildren.push({
        id: Math.random().toString(36).substr(2, 9),
        name: childName,
        type: 'splitter',
        ratio: 1,
        inputPower: 0,
        currentPower: 0,
        distance: childDistance,
        children: []
      });
    }
  } else if (newChildren.length > targetCount) {
    newChildren = newChildren.slice(0, targetCount);
  }

  return {
    ...node,
    children: newChildren
  };
}
