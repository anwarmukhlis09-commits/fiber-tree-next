'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  PlusCircle,
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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<FiberNode | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    power: 8,
    ratio: '1' as any,
    percentage: 50,
    distance: 1
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);

  useEffect(() => {
    const newData = { ...treeData };
    calculateAllLosses(newData, newData.power);
  }, [treeData]);

  const handleReset = () => {
    if (confirm('Reset semua data?')) {
      setTreeData(initialData);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
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

  const addChild = (parentId: string) => {
    const updateTree = (root: FiberNode): FiberNode => {
      if (root.id === parentId) {
        const newChild: FiberNode = {
          id: Math.random().toString(36).substr(2, 9),
          name: `SPL-${root.name.split('-')[1] || ''}.${root.children.length + 1}`,
          type: 'splitter',
          ratio: 1,
          currentPower: 0,
          distance: 1,
          children: []
        };
        return { ...root, children: [...root.children, newChild] };
      }
      return { ...root, children: root.children.map(updateTree) };
    };
    const newTree = updateTree(treeData);
    calculateAllLosses(newTree, newTree.power);
    setTreeData(newTree);
  };

  const saveNode = () => {
    if (!editingNode) return;
    const updateTree = (root: FiberNode): FiberNode => {
      if (root.id === editingNode.id) {
        const newNode = { ...root };
        newNode.name = formData.name;
        newNode.distance = formData.distance;
        if (newNode.type === 'olt') newNode.power = formData.power;
        const newRatio = formData.ratio === 'unbalanced' ? 'unbalanced' : parseInt(formData.ratio);
        if (newRatio === 'unbalanced' && newNode.ratio !== 'unbalanced') {
          newNode.ratio = 'unbalanced';
          newNode.children = [
            { id: Math.random().toString(36).substr(2, 9), name: 'Drop', type: 'splitter', ratio: 1, currentPower: 0, distance: 0, children: [] },
            { id: Math.random().toString(36).substr(2, 9), name: 'Through', type: 'splitter', ratio: 1, currentPower: 0, distance: 0.1, children: [] }
          ];
        } else {
          newNode.ratio = newRatio;
        }
        if (newNode.ratio === 'unbalanced') newNode.percentage = formData.percentage;
        return newNode;
      }
      return { ...root, children: root.children.map(updateTree) };
    };
    const newTree = updateTree(treeData);
    calculateAllLosses(newTree, newTree.power);
    setTreeData(newTree);
    setIsModalOpen(false);
  };

  const deleteNode = () => {
    if (!editingNode || editingNode.type === 'olt') return;
    if (!confirm('Hapus node ini?')) return;
    const removeFromTree = (root: FiberNode): FiberNode => {
      return { ...root, children: root.children.filter(child => child.id !== editingNode.id).map(removeFromTree) };
    };
    const newTree = removeFromTree(treeData);
    calculateAllLosses(newTree, newTree.power);
    setTreeData(newTree);
    setIsModalOpen(false);
  };

  const drawConnections = useCallback(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    svg.innerHTML = '';
    const svgRect = svg.getBoundingClientRect();

    const drawLink = (node: FiberNode) => {
      const parentEl = document.getElementById(`node-${node.id}`);
      if (!parentEl || !node.children) return;

      const parentNodeVisual = parentEl.querySelector(':scope > .node');
      if (!parentNodeVisual) return;

      const pRect = parentNodeVisual.getBoundingClientRect();
      const pX = (pRect.left + pRect.width / 2 - svgRect.left) / zoom;
      const pY = (pRect.bottom - svgRect.top) / zoom;

      node.children.forEach(child => {
        const childEl = document.getElementById(`node-${child.id}`);
        if (!childEl) return;
        const childNodeVisual = childEl.querySelector(':scope > .node');
        if (!childNodeVisual) return;

        const cRect = childNodeVisual.getBoundingClientRect();
        const cX = (cRect.left + cRect.width / 2 - svgRect.left) / zoom;
        const cY = (cRect.top - svgRect.top) / zoom;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = `M ${pX} ${pY} C ${pX} ${(pY + cY) / 2}, ${cX} ${(pY + cY) / 2}, ${cX} ${cY}`;
        path.setAttribute("d", d);
        path.setAttribute("stroke", "#94a3b8");
        path.setAttribute("stroke-width", "2.5");
        path.setAttribute("fill", "none");
        svg.appendChild(path);
        drawLink(child);
      });
    };
    drawLink(treeData);
  }, [treeData, zoom]);

  useEffect(() => {
    const timer = setTimeout(drawConnections, 150);
    window.addEventListener('resize', drawConnections);
    return () => { clearTimeout(timer); window.removeEventListener('resize', drawConnections); };
  }, [drawConnections]);

  // Pinch-to-Zoom Helper
  const getTouchDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastTouchDist.current = getTouchDist(e.touches);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dist = getTouchDist(e.touches);
      const delta = dist / lastTouchDist.current;
      setZoom(prev => Math.min(3, Math.max(0.1, prev * delta)));
      lastTouchDist.current = dist;
      setTimeout(drawConnections, 50);
    }
  };

  const handleTouchEnd = () => {
    lastTouchDist.current = null;
  };

  // Pointer Events (Mouse/Single Finger Pan)
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.node') || (e.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(3, Math.max(0.1, prev + delta)));
    setTimeout(drawConnections, 100);
  };

  const summaryData = (() => {
    let totalDist = 0; let totalSplitters = 0; let worstPower = treeData.power || 8;
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans touch-none">
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center z-50 shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-success/10 p-1.5 md:p-2 rounded-lg text-success"><Network className="w-5 h-5 md:w-6 md:h-6" /></div>
          <div>
            <h1 className="text-base md:text-xl font-bold text-slate-800 leading-none">Fiber Optic Calculator</h1>
            <p className="text-[10px] md:text-sm text-slate-500 mt-0.5 md:mt-1">Tree Topology Designer</p>
          </div>
        </div>
        <button onClick={handleReset} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm text-sm">
          <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reset</span>
        </button>
      </header>

      <main 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown} 
        onPointerMove={onPointerMove} 
        onPointerUp={() => isDragging.current = false}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          ref={canvasRef}
          className="absolute inset-0 flex items-start justify-center pt-20 transition-transform duration-75 ease-out origin-center"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
        >
          <svg 
            ref={svgRef} 
            className="absolute pointer-events-none z-0" 
            style={{ width: '10000px', height: '10000px', left: '50%', top: '0', transform: 'translateX(-50%)' }}
          />
          <div className="relative z-10">
            <TreeNode node={treeData} onNodeClick={handleNodeClick} onAddChild={addChild} />
          </div>
        </div>

        <div className="absolute right-4 md:right-8 top-4 md:top-8 flex flex-col gap-2 md:gap-4 z-40">
          <button onClick={() => handleZoom(0.2)} className="w-10 h-10 md:w-14 md:h-14 bg-white/90 backdrop-blur border border-slate-200 rounded-xl flex items-center justify-center shadow-xl active:scale-90"><Plus className="w-5 h-5" /></button>
          <button onClick={() => handleZoom(-0.2)} className="w-10 h-10 md:w-14 md:h-14 bg-white/90 backdrop-blur border border-slate-200 rounded-xl flex items-center justify-center shadow-xl active:scale-90"><Minus className="w-5 h-5" /></button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); setTimeout(drawConnections, 100); }} className="w-10 h-10 md:w-14 md:h-14 bg-white/90 backdrop-blur border border-slate-200 rounded-xl flex items-center justify-center shadow-xl active:scale-90"><Maximize className="w-5 h-5" /></button>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 p-3 md:p-6 pb-8 md:pb-10 z-50 shadow-[0_-8px_10px_-4px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex flex-col gap-3 md:gap-6">
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
            <div className="h-1.5 md:h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-700 ease-out ${summaryData.worstPower > -20 ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' : summaryData.worstPower > -27 ? 'bg-warning shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} style={{ width: `${Math.min(100, Math.max(0, ((summaryData.worstPower + 35) / 45) * 100))}%` }} />
            </div>
          </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editingNode?.type === 'olt' ? 'Transmitter Config' : 'Splitter Config'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Node Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary" />
              </div>
              {editingNode?.type === 'olt' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Power Output (dBm)</label>
                  <input type="number" value={formData.power} onChange={e => setFormData({...formData, power: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Splitter Ratio</label>
                <select value={formData.ratio} onChange={e => setFormData({...formData, ratio: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
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
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Unbalanced Ratio (%)</label>
                  <select value={formData.percentage} onChange={e => setFormData({...formData, percentage: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {[1,2,3,4,5,6,7,8,9,10,15,20,25,30,35,40,45,50].map(p => (<option key={p} value={p}>{p < 10 ? `0${p}` : p}:{100-p}</option>))}
                  </select>
                </div>
              )}
              {editingNode?.type !== 'olt' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Distance (km)</label>
                  <input type="number" value={formData.distance} onChange={e => setFormData({...formData, distance: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancel</button>
              {editingNode?.type !== 'olt' && (<button onClick={deleteNode} className="px-6 py-3 bg-danger/10 text-danger font-bold rounded-xl"><X className="w-5 h-5"/></button>)}
              <button onClick={saveNode} className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ Icon, title, value, unit, color }: { Icon: LucideIcon, title: string, value: string, unit: string, color: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 md:p-4 flex items-center gap-3 shadow-sm">
      <div className={`p-2.5 md:p-3 bg-white rounded-xl shadow-sm ${color}`}><Icon className="w-4 h-4 md:w-6 md:h-6" /></div>
      <div className="flex flex-col">
        <span className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</span>
        <div className="flex items-baseline gap-0.5"><span className="text-sm md:text-xl font-black text-slate-800">{value}</span><span className="text-[8px] md:text-xs font-bold text-slate-500">{unit}</span></div>
      </div>
    </div>
  );
}
