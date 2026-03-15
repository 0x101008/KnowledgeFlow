import { useRef, useEffect, useState, useMemo } from 'react';
import { KnowledgeNode, NodeStatus, GraphMode } from '../types';
import { Star, CheckCircle2, Play, ListOrdered, Maximize, Move, ZoomIn, MousePointer2, Layout } from 'lucide-react';

interface KnowledgeGraphProps {
  topic: string;
  nodes: KnowledgeNode[];
  onNodeClick: (node: KnowledgeNode) => void;
  mode: GraphMode;
}

interface Point {
  x: number;
  y: number;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ topic, nodes, onNodeClick, mode }) => {
  const isMindmap = mode === 'mindmap';
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Reset view when mode or topic changes
  useEffect(() => {
    resetView();
  }, [mode, topic]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // --- Layout Engine ---
  const nodePositions = useMemo(() => {
    const positions: Record<string, Point> = {};
    
    if (!isMindmap) {
      // Linear Layout: Vertical column
      nodes.forEach((node, index) => {
        positions[node.id] = { 
          x: 0, 
          y: index * 180 - (nodes.length * 90) + 100 
        };
      });
      return positions;
    }

    // Mindmap: Horizontal Logic Chart (Left to Right) - "Xmind Style"
    // This algorithm calculates subtree heights to prevent overlap
    
    const hierarchy: Record<string, string[]> = {};
    const roots: string[] = [];
    
    // Build adjacency list
    nodes.forEach(n => hierarchy[n.id] = []);
    nodes.forEach(n => {
      if (n.parentId && nodes.find(p => p.id === n.parentId)) {
        hierarchy[n.parentId].push(n.id);
      } else {
        roots.push(n.id);
      }
    });

    const subtreeHeights: Record<string, number> = {};
    const X_SPACING = 320; // Horizontal gap between levels
    const Y_SPACING = 140; // Minimum vertical gap between leaf nodes

    // 1. Calculate subtree heights (Post-order traversal)
    const calcHeight = (id: string): number => {
      const children = hierarchy[id] || [];
      if (children.length === 0) {
        subtreeHeights[id] = Y_SPACING;
        return Y_SPACING;
      }
      const h = children.reduce((acc, childId) => acc + calcHeight(childId), 0);
      subtreeHeights[id] = h;
      return h;
    };
    
    roots.forEach(r => calcHeight(r));

    // 2. Assign coordinates (Pre-order traversal)
    const assignCoords = (id: string, x: number, yStart: number) => {
      const children = hierarchy[id] || [];
      
      // Determine Y for current node
      let myY: number;
      
      if (children.length === 0) {
        // Leaf node: centered in its slot
        myY = yStart + Y_SPACING / 2;
        positions[id] = { x, y: myY };
        return;
      }

      // Non-leaf: Y is average of children's Ys (Logic Chart style)
      let currentChildY = yStart;
      const childYs: number[] = [];
      
      children.forEach(childId => {
        assignCoords(childId, x + X_SPACING, currentChildY);
        const childH = subtreeHeights[childId];
        // We can look up the position we just assigned
        if (positions[childId]) {
           childYs.push(positions[childId].y);
        }
        currentChildY += childH;
      });
      
      myY = (childYs[0] + childYs[childYs.length - 1]) / 2;
      positions[id] = { x, y: myY };
    };

    let totalHeightCursor = 0;
    roots.forEach(r => {
      const h = subtreeHeights[r];
      assignCoords(r, 0, totalHeightCursor);
      totalHeightCursor += h;
    });

    // 3. Center the graph vertically relative to (0,0)
    const totalGraphHeight = totalHeightCursor;
    Object.keys(positions).forEach(key => {
      positions[key].y -= totalGraphHeight / 2;
    });

    return positions;
  }, [nodes, isMindmap]);

  // --- Interaction Handlers ---
  const onWheel = (e: React.WheelEvent) => {
    if (isMindmap) {
      e.preventDefault();
      // Zoom logic
      if (e.ctrlKey || e.metaKey || true) { // Always zoom on wheel for mindmap mode
        const delta = -e.deltaY;
        const zoomFactor = 0.001 * delta;
        let newScale = scale + zoomFactor;
        newScale = Math.min(Math.max(0.2, newScale), 3);
        setScale(newScale);
      }
    } else {
      // Linear mode: Scroll vertically
      const delta = e.deltaY;
      setOffset(prev => ({ ...prev, y: prev.y - delta }));
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!isMindmap || e.button !== 0) return; 
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isMindmap) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const onMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setOffset({ x: 0, y: 0 });
    setScale(isMindmap ? 0.8 : 1); // Start slightly zoomed out for mindmap to see more context
  };

  // --- Render Helpers ---

  // Helper to determine node depth/level for styling
  const getNodeLevel = (id: string): number => {
    let level = 0;
    let curr = nodes.find(n => n.id === id);
    while (curr && curr.parentId) {
      level++;
      curr = nodes.find(n => n.id === curr?.parentId);
    }
    return level;
  };

  const renderNode = (node: KnowledgeNode) => {
    const isLocked = node.status === NodeStatus.LOCKED;
    const isCompleted = node.status === NodeStatus.COMPLETED;
    const isAvailable = node.status === NodeStatus.AVAILABLE;
    
    const pos = nodePositions[node.id];
    if (!pos) return null;

    const level = isMindmap ? getNodeLevel(node.id) : 1;
    
    // Xmind Style Styling
    let nodeSizeClasses = "";
    let fontSizeClasses = "";
    let boxClasses = "";

    if (isMindmap) {
      if (level === 0) {
        nodeSizeClasses = "min-w-[180px] max-w-[280px] py-4 px-6 rounded-2xl";
        fontSizeClasses = "text-lg";
        boxClasses = "bg-blue-600 text-white border-blue-700 shadow-blue-200 shadow-xl";
      } else if (level === 1) {
        nodeSizeClasses = "min-w-[160px] max-w-[240px] py-3 px-5 rounded-xl";
        fontSizeClasses = "text-sm";
        boxClasses = "bg-white border-l-4 border-l-blue-500 text-gray-800 shadow-sm";
      } else {
        nodeSizeClasses = "min-w-[140px] max-w-[200px] py-2 px-4 rounded-lg";
        fontSizeClasses = "text-xs";
        boxClasses = "bg-white border-gray-200 text-gray-700 hover:border-blue-300";
      }
    } else {
      // Linear Mode Default
      nodeSizeClasses = "min-w-[240px] px-6 py-4 rounded-[1.5rem]";
      fontSizeClasses = "text-sm";
      boxClasses = "bg-white border-gray-200 text-gray-800";
    }

    // Override colors based on Status
    if (isLocked) {
      boxClasses = "bg-gray-50 border-gray-100 text-gray-400 grayscale opacity-70";
    } else if (isCompleted) {
      if (level === 0 && isMindmap) {
        boxClasses = "bg-green-600 text-white border-green-700 shadow-green-200 shadow-xl";
      } else {
        boxClasses = "bg-green-50 border-green-200 text-green-900 border-l-4 border-l-green-500";
      }
    } else if (isAvailable && level !== 0) {
      boxClasses = "bg-white border-blue-500 border-2 text-gray-900 shadow-lg shadow-blue-100 ring-4 ring-blue-50/50";
    }

    return (
      <div 
        key={node.id}
        id={`node-${node.id}`}
        className="absolute transition-all duration-500 ease-out"
        style={{ 
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          left: dimensions.width / 2, // Center of screen as origin
          top: dimensions.height / 2,
          zIndex: isAvailable ? 20 : 10
        }}
      >
        {/* Use translate-x/y-1/2 to perfectly center the node on its coordinate */}
        <div className="relative group -translate-x-1/2 -translate-y-1/2">
          {/* Status Stars */}
          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex gap-0.5 transition-opacity duration-300 ${node.stars > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {[1, 2, 3].map((s) => (
              <Star key={s} size={12} className={node.stars >= s ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
            ))}
          </div>

          <button
            disabled={isLocked}
            onClick={() => onNodeClick(node)}
            className={`
              relative flex flex-col gap-1 items-start text-left border 
              transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              ${nodeSizeClasses}
              ${boxClasses}
              ${isAvailable && !isCompleted && !isLocked ? 'animate-pulse-subtle' : ''}
            `}
          >
             <div className="flex w-full items-center justify-between gap-3">
               <span className={`font-bold leading-tight line-clamp-2 ${fontSizeClasses}`}>
                 {node.label}
               </span>
               {!isLocked && (
                 <div className={`shrink-0 ${isCompleted ? 'text-green-500' : isAvailable ? 'text-blue-500' : 'text-gray-300'}`}>
                   {isCompleted ? <CheckCircle2 size={16} /> : isAvailable ? <Play size={14} fill="currentColor"/> : null}
                 </div>
               )}
             </div>
             
             {/* Description (Only for linear or Root/Level 1 in mindmap to save space) */}
             {(!isMindmap || level <= 1) && (
               <p className={`text-[10px] line-clamp-1 leading-relaxed opacity-70 w-full ${isCompleted || (isMindmap && level===0) ? 'text-white/80' : 'text-gray-500'}`}>
                 {node.description}
               </p>
             )}
          </button>
        </div>
      </div>
    );
  };

  const renderConnections = () => {
    if (dimensions.width === 0) return null;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    return (
      <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible" style={{ zIndex: 0 }}>
        <g transform={`translate(${centerX}, ${centerY})`}>
          {nodes.map((node, index) => {
            if (isMindmap) {
              const parent = nodes.find(n => n.id === node.parentId);
              if (!parent) return null;
              
              const startPos = nodePositions[parent.id];
              const endPos = nodePositions[node.id];
              
              if (!startPos || !endPos) return null;

              // Draw Center-to-Center
              // Since nodes are centered on their coordinates and have solid backgrounds,
              // drawing from center to center ensures the line "emerges" from the side correctly
              // without needing to know the exact width of the node.
              const x1 = startPos.x;
              const y1 = startPos.y;
              const x2 = endPos.x;
              const y2 = endPos.y;
              
              const dist = Math.abs(x2 - x1);
              
              // Force horizontal exit/entry with control points extended horizontally
              const cp1x = x1 + dist * 0.5;
              const cp1y = y1;
              const cp2x = x2 - dist * 0.5;
              const cp2y = y2;
              
              const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;

              const isCompleted = node.status === NodeStatus.COMPLETED;
              const isActive = node.status === NodeStatus.AVAILABLE;

              return (
                <g key={`conn-${node.id}`}>
                  <path 
                    d={d} 
                    fill="none" 
                    stroke={isCompleted ? '#22c55e' : isActive ? '#3b82f6' : '#E5E7EB'} 
                    strokeWidth={isActive || isCompleted ? 2.5 : 1.5}
                    className="transition-colors duration-500"
                  />
                </g>
              );
            } else {
              // Linear Connections
              if (index < nodes.length - 1) {
                const startPos = nodePositions[node.id];
                const endPos = nodePositions[nodes[index + 1].id];
                const active = node.status === NodeStatus.COMPLETED;
                return (
                  <line 
                    key={`lin-${node.id}`}
                    x1={startPos.x} y1={startPos.y} x2={endPos.x} y2={endPos.y}
                    stroke={active ? '#3b82f6' : '#E5E7EB'}
                    strokeWidth="4"
                    strokeDasharray={active ? "none" : "8 8"}
                    strokeLinecap="round"
                    className="transition-all duration-500 opacity-40"
                  />
                );
              }
            }
            return null;
          })}
        </g>
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Header Panel */}
      <div className="p-6 px-8 border-b flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm ${isMindmap ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {isMindmap ? <Layout size={24} /> : <ListOrdered size={24} />}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{topic || "未命名主题"}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">
                {isMindmap ? '思维导图模式' : '闯关路径模式'}
              </span>
              <div className="h-3 w-px bg-gray-200" />
              <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {isMindmap ? (
                  <>
                    <span className="flex items-center gap-1"><Move size={10} /> 拖拽画布</span>
                    <span className="flex items-center gap-1"><ZoomIn size={10} /> 滚轮缩放</span>
                  </>
                ) : (
                  <span className="flex items-center gap-1"><MousePointer2 size={10} /> 垂直滚动</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isMindmap && (
            <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 flex items-center gap-2 text-xs font-bold text-gray-400">
              <ZoomIn size={12} /> {Math.round(scale * 100)}%
            </div>
          )}
          <button 
            onClick={resetView}
            className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
            title="重置视图"
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        ref={containerRef}
        className={`flex-1 relative overflow-hidden select-none touch-none ${isDragging ? 'cursor-grabbing' : isMindmap ? 'cursor-grab' : 'cursor-default'} bg-[#F8F9FA]`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <div 
          className="absolute inset-0 transition-transform duration-100 ease-out will-change-transform"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          {/* Dot Grid Background */}
          <div className="absolute inset-[-4000px] opacity-[0.4] pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} 
          />

          {renderConnections()}

          <div className="absolute inset-0">
            {nodes.map((node) => renderNode(node))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;