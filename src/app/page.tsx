'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  RotateCcw, 
  Plus, 
  Minus, 
  Maximize, 
  Zap, 
  MapPin, 
  GitBranch, 
  Activity,
  X,
  LucideIcon
} from 'lucide-react';
import { FiberNode, calculateAllLosses, LOSS_PER_KM } from '@/lib/calculator';
import TreeNode from '@/components/TreeNode';

const initialData: FiberNode = {
  id: 'root',
  name: 'Transmitter',
  type: 'olt',
  power: 8,
  currentPower: 8,
  distance: 0,
  ratio: 1,
  children: []
};

export default function Home() {
  const [treeData, setTreeData] = useState<FiberNode>(initialData);
  const [zoom, setZoom] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<FiberNode | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    power: 8,
    ratio: '1' as any,
    percentage: 50,
    distance: 1
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Recalculate losses whenever tree data changes
  useEffect(() => {
    const newData = { ...treeData };
    calculateAllLosses(newData, newData.power);
  }, [treeData]);

  const handleReset = () => {
    if (confirm('Reset semua data?')) {
      setTreeData(initialData);
      setZoom(1);
    }
  };

  const handleNodeClick = (node: FiberNode) => {
    setEditingNode(node);
    setFormData({
      name: node.name,
      power: node.power || 8,
      ratio: node.ratio.toString(),
      percentage: node.percentage || 50,
      distance: node.distance
    });
    setIsModalOpen(true);
  };

  const saveNode = () => {
    if (!editingNode) return;

    const updateTree = (root: FiberNode): FiberNode => {
      if (root.id === editingNode.id) {
        const newNode = { ...root };
        newNode.name = formData.name;
        newNode.distance = formData.distance;
        if (newNode.type === 'olt') {
          newNode.power = formData.power;
        }

        const newRatio = formData.ratio === 'unbalanced' ? 'unbalanced' : parseInt(formData.ratio);
        if (newRatio !== newNode.ratio) {
          newNode.ratio = newRatio;
          let targetCount = 0;
          if (newRatio === 'unbalanced') targetCount = 2;
          else if (typeof newRatio === 'number' && newRatio > 1) targetCount = newRatio;

          if (newNode.children.length < targetCount) {
            const newChildren = [...newNode.children];
            for (let i = newNode.children.length; i < targetCount; i++) {
              newChildren.push({
                id: Math.random().toString(36).substr(2, 9),
                name: `SPL-${newNode.name.split('-')[1] || ''}.${i + 1}`,
                type: 'splitter',
                ratio: 1,
                currentPower: 0,
                distance: 1,
                children: []
              });
            }
            newNode.children = newChildren;
          } else if (newNode.children.length > targetCount) {
            newNode.children = newNode.children.slice(0, targetCount);
          }
        }

        if (newNode.ratio === 'unbalanced') {
          newNode.percentage = formData.percentage;
        }

        return newNode;
      }

      return {
        ...root,
        children: root.children.map(updateTree)
      };
    };

    const newTree = updateTree(treeData);
    calculateAllLosses(newTree, newTree.power);
    setTreeData(newTree);
    setIsModalOpen(false);
  };

  const deleteNode = () => {
    if (!editingNode || editingNode.type === 'olt') return;
    if (!confirm('Hapus node ini dan semua turunannya?')) return;

    const removeFromTree = (root: FiberNode): FiberNode => {
      return {
        ...root,
        children: root.children
          .filter(child => child.id !== editingNode.id)
          .map(removeFromTree)
      };
    };

    const newTree = removeFromTree(treeData);
    calculateAllLosses(newTree, newTree.power);
    setTreeData(newTree);
    setIsModalOpen(false);
  };

  useEffect(() => {
    const draw = () => {
      if (!svgRef.current || !canvasRef.current) return;
      const svg = svgRef.current;
      svg.innerHTML = '';
      
      const canvasRect = canvasRef.current.getBoundingClientRect();

      const drawLink = (node: FiberNode) => {
        const parentEl = document.getElementById(`node-${node.id}`);
        if (!parentEl || !node.children) return;

        const parentNodeVisual = parentEl.querySelector(':scope > div');
        if (!parentNodeVisual) return;

        const pRect = parentNodeVisual.getBoundingClientRect();
        const pX = (pRect.left + pRect.right) / 2 - canvasRect.left;
        const pY = pRect.bottom - canvasRect.top;

        node.children.forEach(child => {
          const childEl = document.getElementById(`node-${child.id}`);
          if (!childEl) return;

          const childNodeVisual = childEl.querySelector(':scope > div');
          if (!childNodeVisual) return;

          const cRect = childNodeVisual.getBoundingClientRect();
          const cX = (cRect.left + cRect.right) / 2 - canvasRect.left;
          const cY = cRect.top - canvasRect.top;

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const zPX = pX / zoom;
          const zPY = pY / zoom;
          const zCX = cX / zoom;
          const zCY = cY / zoom;

          const d = `M ${zPX} ${zPY} C ${zPX} ${(zPY + zCY) / 2}, ${zCX} ${(zPY + zCY) / 2}, ${zCX} ${zCY}`;
          path.setAttribute("d", d);
          path.setAttribute("stroke", "#e2e8f0");
          path.setAttribute("stroke-width", "2");
          path.setAttribute("fill", "none");
          svg.appendChild(path);

          drawLink(child);
        });
      };

      drawLink(treeData);
    };

    const timer = setTimeout(draw, 100);
    window.addEventListener('resize', draw);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', draw);
    };
  }, [treeData, zoom]);

  const summaryData = (() => {
    let totalDist = 0;
    let totalSplitters = 0;
    let worstPower = treeData.power || 8;

    const traverse = (node: FiberNode, currentDist: number) => {
      const d = currentDist + node.distance;
      totalDist = Math.max(totalDist, d);
      if (node.ratio !== 1) totalSplitters++;
      if (node.currentPower < worstPower) worstPower = node.currentPower;
      node.children.forEach(c => traverse(c, d));
    };

    traverse(treeData, 0);
    return { totalDist, totalSplitters, worstPower };
  })();

  const powerPercent = Math.min(100, Math.max(0, ((summaryData.worstPower + 35) / 45) * 100));

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-success/10 p-1.5 md:p-2 rounded-lg text-success">
            <Network className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-base md:text-xl font-bold text-slate-800 leading-none">Fiber Optic Calculator</h1>
            <p className="text-[10px] md:text-sm text-slate-500 mt-0.5 md:mt-1">Tree Topology Designer</p>
          </div>
        </div>
        <button 
          onClick={handleReset}
          className="flex items-center gap-1.5 md:gap-2 bg-white border border-slate-200 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm text-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </header>

      {/* Main Canvas */}
      <main className="flex-1 relative overflow-auto p-4 md:p-12 flex justify-center scroll-smooth bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
        <div 
          ref={canvasRef}
          className="relative min-w-full min-h-full origin-top transition-transform duration-100 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <svg 
            ref={svgRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
          />
          <div className="relative z-10 flex flex-col items-center">
            <TreeNode node={treeData} onNodeClick={handleNodeClick} />
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="fixed right-3 md:right-6 top-20 md:top-24 flex flex-col gap-2 md:gap-3 z-20">
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg hover:text-primary transition-all">
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg hover:text-primary transition-all">
            <Minus className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button onClick={() => setZoom(1)} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg hover:text-primary transition-all">
            <Maximize className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </main>

      {/* Summary Panel */}
      <footer className="bg-white border-t border-slate-200 p-4 md:p-6 pb-8 md:pb-10 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex flex-col gap-4 md:gap-6">
          <div className="grid grid-cols-2 lg:flex lg:justify-around items-stretch gap-2.5 md:gap-4">
            <SummaryCard Icon={Zap} title="TX Power" value={`${treeData.power}`} unit="dBm" color="text-amber-500" />
            <SummaryCard Icon={MapPin} title="Max Distance" value={`${summaryData.totalDist.toFixed(1)}`} unit="km" color="text-blue-500" />
            <SummaryCard Icon={GitBranch} title="Splitters" value={`${summaryData.totalSplitters}`} unit="pcs" color="text-indigo-500" />
            <SummaryCard Icon={Activity} title="Worst Loss" value={`${summaryData.worstPower.toFixed(1)}`} unit="dBm" color={summaryData.worstPower > -20 ? 'text-success' : summaryData.worstPower > -27 ? 'text-warning' : 'text-danger'} />
          </div>
          
          <div className="px-1 md:px-2 mt-1">
            <div className="flex justify-between items-center mb-1.5 text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>Low Signal (-35)</span>
              <span className="text-slate-800 font-extrabold bg-slate-100 px-2 py-0.5 rounded-full">Worst: {summaryData.worstPower.toFixed(1)} dBm</span>
              <span>High Signal (10)</span>
            </div>
            <div className="h-2 md:h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out ${
                  summaryData.worstPower > -20 ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' : summaryData.worstPower > -27 ? 'bg-warning shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                }`}
                style={{ width: `${powerPercent}%` }}
              />
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                {editingNode?.type === 'olt' ? 'Transmitter Config' : 'Splitter Config'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5 md:mb-2">Node Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl outline-none focus:border-primary transition-colors"
                />
              </div>

              {editingNode?.type === 'olt' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5 md:mb-2">Power Output (dBm)</label>
                  <input 
                    type="number" 
                    value={formData.power}
                    onChange={e => setFormData({...formData, power: parseFloat(e.target.value)})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl outline-none focus:border-primary"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5 md:mb-2">Splitter Ratio</label>
                <select 
                  value={formData.ratio}
                  onChange={e => setFormData({...formData, ratio: e.target.value})}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl outline-none focus:border-primary"
                >
                  <option value="1">No Splitter (1:1)</option>
                  <option value="2">1:2 (-3.5 dB)</option>
                  <option value="4">1:4 (-7.2 dB)</option>
                  <option value="8">1:8 (-10.5 dB)</option>
                  <option value="16">1:16 (-13.8 dB)</option>
                  <option value="32">1:32 (-17.1 dB)</option>
                  <option value="unbalanced">PLC Unbalanced (2 Output)</option>
                </select>
              </div>

              {formData.ratio === 'unbalanced' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5 md:mb-2">Unbalanced Ratio (%)</label>
                  <select 
                    value={formData.percentage}
                    onChange={e => setFormData({...formData, percentage: parseInt(e.target.value)})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl outline-none focus:border-primary"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,15,20,25,30,35,40,45,50].map(p => (
                      <option key={p} value={p}>{p < 10 ? `0${p}` : p}:{100-p}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingNode?.type !== 'olt' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5 md:mb-2">Distance from Parent (km)</label>
                  <input 
                    type="number" 
                    value={formData.distance}
                    onChange={e => setFormData({...formData, distance: parseFloat(e.target.value)})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl outline-none focus:border-primary"
                  />
                  <p className="text-[10px] md:text-xs text-slate-400 mt-1">Cable Loss: -{(formData.distance * LOSS_PER_KM).toFixed(2)} dB</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 md:gap-4 mt-6 md:mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              {editingNode?.type !== 'olt' && (
                <button 
                  onClick={deleteNode}
                  className="px-4 md:px-6 py-2.5 md:py-3 bg-danger/10 text-danger font-bold rounded-xl hover:bg-danger/20 transition-colors text-sm md:text-base"
                >
                  <span className="md:hidden"><X className="w-5 h-5"/></span>
                  <span className="hidden md:inline">Delete</span>
                </button>
              )}
              <button 
                onClick={saveNode}
                className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 text-sm md:text-base"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ Icon, title, value, unit, color }: { Icon: LucideIcon, title: string, value: string, unit: string, color: string }) {
  return (
    <div className="bg-slate-50/80 border border-slate-100 rounded-xl md:rounded-2xl p-2.5 md:p-4 flex items-center gap-3 md:gap-4 shadow-sm">
      <div className={`p-2.5 md:p-3 bg-white rounded-lg md:rounded-xl shadow-sm ${color}`}>
        <Icon className="w-4 h-4 md:w-6 md:h-6" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
          {title}
        </span>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm md:text-xl font-black text-slate-800 truncate">
            {value}
          </span>
          <span className="text-[8px] md:text-xs font-bold text-slate-500">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}
