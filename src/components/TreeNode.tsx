'use client';

import React from 'react';
import { Zap, Share2 } from 'lucide-react';
import { FiberNode, getStatusClass } from '@/lib/calculator';
import { motion } from 'framer-motion';

interface TreeNodeProps {
  node: FiberNode;
  onNodeClick: (node: FiberNode) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, onNodeClick }) => {
  const isOLT = node.type === 'olt';
  const statusClass = getStatusClass(node.currentPower);

  let ratioText = '';
  if (node.ratio === 'unbalanced') {
    if (node.percentage === 0) {
      ratioText = 'Tanpa Ratio';
    } else {
      const p = node.percentage || 50;
      const p1 = p < 10 ? `0${p}` : p;
      ratioText = `${p1}:${100 - p}`;
    }
  } else if ((node.ratio as number) > 1) {
    ratioText = `1:${node.ratio}`;
  }

  return (
    <div className="node-container" id={`node-${node.id}`}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => onNodeClick(node)}
        className={`
          flex flex-col items-center justify-center cursor-pointer bg-white shadow-md transition-all border-2 z-10
          ${isOLT ? 'w-40 h-20 rounded-xl' : 'w-24 h-24 rounded-full'}
          ${statusClass === 'status-safe' ? 'border-success text-success' : ''}
          ${statusClass === 'status-warning' ? 'border-warning text-warning' : ''}
          ${statusClass === 'status-danger' ? 'border-danger text-danger' : ''}
          ${!statusClass ? 'border-primary' : ''}
        `}
      >
        {isOLT ? <Zap className="w-4 h-4 mb-1" /> : <Share2 className="w-4 h-4 mb-1" />}
        <span className="text-[10px] font-bold uppercase text-zinc-500">{node.name}</span>
        <span className="text-sm font-bold">{node.currentPower.toFixed(1)} dBm</span>
        {ratioText && <span className="text-[10px] font-bold text-primary">{ratioText}</span>}
      </motion.div>

      {node.children && node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} onNodeClick={onNodeClick} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
