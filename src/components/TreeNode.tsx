'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, GitBranch, PlusCircle, ArrowDown } from 'lucide-react';
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
            ${isOlt ? 'w-48 h-28 rounded-2xl border-2' : 'w-36 h-36 rounded-full border-4'}
            bg-white flex flex-col items-center justify-center p-4 text-center
            ${statusClass}
          `}
        >
          {isOlt ? (
            <>
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{node.name}</span>
              </div>
              <span className="text-2xl font-black text-slate-800 leading-none">
                {node.power?.toFixed(1)} <span className="text-xs">dBm</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Source Power</span>
            </>
          ) : (
            <div className="flex flex-col items-center w-full">
              {/* Input Power (Small) */}
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <span className="text-[9px] font-black uppercase tracking-tighter">IN:</span>
                <span className="text-[11px] font-bold">{node.inputPower.toFixed(2)}</span>
              </div>
              
              <ArrowDown className="w-3 h-3 text-slate-300 mb-1" />

              {/* Output Power (Large) */}
              <span className="text-xl font-black leading-none">
                {node.currentPower.toFixed(2)} <span className="text-[10px]">dBm</span>
              </span>

              {/* Label & Ratio */}
              <span className="text-[8px] font-bold uppercase text-slate-400 tracking-tight truncate w-full mt-1">
                {node.name}
              </span>
              {node.ratio !== 1 && (
                <span className="text-[8px] font-extrabold bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 mt-1 uppercase tracking-tighter">
                  {node.ratio === 'unbalanced' ? `PLC ${node.percentage}:${100-(node.percentage||0)}` : `Ratio 1:${node.ratio}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Manual Add Child Button */}
        {onAddChild && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            className="absolute -bottom-2 -right-2 bg-primary text-white rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform z-20 border-2 border-white"
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
