'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, GitBranch, PlusCircle } from 'lucide-react';
import { FiberNode, getStatusClass } from '@/lib/calculator';

interface TreeNodeProps {
  node: FiberNode;
  onNodeClick: (node: FiberNode) => void;
  onAddChild?: (parentId: string) => void;
}

export default function TreeNode({ node, onNodeClick, onAddChild }: TreeNodeProps) {
  const isOlt = node.type === 'olt';
  const statusClass = getStatusClass(node.currentPower);

  return (
    <div className="node-container" id={`node-${node.id}`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -5 }}
        className="node relative"
      >
        <div 
          onClick={() => onNodeClick(node)}
          className={`
            cursor-pointer transition-all duration-300 shadow-lg
            ${isOlt ? 'w-48 h-24 rounded-2xl border-2' : 'w-32 h-32 rounded-full border-4'}
            bg-white flex flex-col items-center justify-center p-4 text-center
            ${statusClass}
          `}
        >
          {isOlt ? (
            <Zap className="w-5 h-5 mb-1" />
          ) : (
            <GitBranch className="w-5 h-5 mb-1" />
          )}
          
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tight truncate w-full">
            {node.name}
          </span>
          
          <div className="flex flex-col items-center">
            <span className="text-lg font-black leading-none">
              {node.currentPower.toFixed(1)} <span className="text-[10px] font-bold">dBm</span>
            </span>
            {node.ratio !== 1 && (
              <span className="text-[9px] font-extrabold bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 mt-1 uppercase tracking-tighter">
                {node.ratio === 'unbalanced' ? `PLC ${node.percentage}:${100-(node.percentage||0)}` : `Ratio 1:${node.ratio}`}
              </span>
            )}
          </div>
        </div>

        {/* Manual Add Child Button */}
        {onAddChild && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            className="absolute -bottom-2 -right-2 bg-primary text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform z-20 border-2 border-white"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        )}
      </motion.div>

      {node.children && node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} onNodeClick={onNodeClick} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  );
}
