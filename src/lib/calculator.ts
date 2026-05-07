export type NodeType = 'olt' | 'splitter';

export interface FiberNode {
  id: string;
  name: string;
  type: NodeType;
  power?: number; // Only for OLT
  currentPower: number;
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
  
  // Power arriving at this node after cable loss
  const powerAtInput = node.type === 'olt' ? (node.power ?? 8) : (parentPower - cableLoss);

  if (node.type === 'splitter' && node.ratio !== 'unbalanced' && typeof node.ratio === 'number') {
    // For balanced splitter, display the OUTPUT power
    const splitLoss = RATIO_LOSS[node.ratio] || 0;
    node.currentPower = powerAtInput - splitLoss;
  } else {
    // For OLT or PLC Splitter (PLC handles loss in children), display the INPUT power
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
      // Children of balanced splitter receive the already-calculated output power
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
