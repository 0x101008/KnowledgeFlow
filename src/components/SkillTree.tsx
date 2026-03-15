import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { SkillNode } from '../services/gemini';
import { cn } from '../lib/utils';
import { Check, Lock, Play } from 'lucide-react';

interface SkillTreeProps {
  nodes: SkillNode[];
  completedNodeIds: Set<string>;
  onNodeClick: (node: SkillNode) => void;
}

export function SkillTree({ nodes, completedNodeIds, onNodeClick }: SkillTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const observeTarget = containerRef.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      });
    });

    resizeObserver.observe(observeTarget);
    return () => resizeObserver.unobserve(observeTarget);
  }, []);

  if (!dimensions.width || !dimensions.height || nodes.length === 0) {
    return <div ref={containerRef} className="w-full h-full" />;
  }

  // Prepare D3 Hierarchy
  let root;
  try {
    root = d3
      .stratify<SkillNode>()
      .id((d) => d.id)
      .parentId((d) => (d.parentId === '' ? undefined : d.parentId))(nodes);
  } catch (e) {
    console.error('Error stratifying data:', e);
    return <div ref={containerRef} className="w-full h-full flex items-center justify-center text-red-500">数据结构错误，无法渲染技能树。</div>;
  }

  const margin = { top: 60, right: 60, bottom: 60, left: 60 };
  const innerWidth = dimensions.width - margin.left - margin.right;
  const innerHeight = dimensions.height - margin.top - margin.bottom;

  const treeLayout = d3.tree<SkillNode>().size([innerWidth, innerHeight]);
  const treeData = treeLayout(root);

  const links = treeData.links();
  const descendants = treeData.descendants();

  const isNodeUnlocked = (nodeId: string, parentId?: string) => {
    if (!parentId) return true; // Root is always unlocked
    return completedNodeIds.has(parentId);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl">
      <svg width={dimensions.width} height={dimensions.height} className="absolute inset-0">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Render Links */}
          {links.map((link, i) => {
            const isCompleted = completedNodeIds.has(link.source.id) && completedNodeIds.has(link.target.id);
            const isUnlocked = completedNodeIds.has(link.source.id);
            
            return (
              <motion.path
                key={`link-${i}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: i * 0.1 }}
                d={
                  d3
                    .linkVertical<any, any>()
                    .x((d) => d.x)
                    .y((d) => d.y)(link) as string
                }
                fill="none"
                stroke={isCompleted ? '#10b981' : isUnlocked ? '#3b82f6' : '#334155'}
                strokeWidth={isCompleted ? 4 : 2}
                strokeDasharray={isUnlocked && !isCompleted ? '5,5' : 'none'}
                className={cn('transition-colors duration-500', {
                  'opacity-30': !isUnlocked,
                })}
              />
            );
          })}

          {/* Render Nodes */}
          {descendants.map((node, i) => {
            const isCompleted = completedNodeIds.has(node.id);
            const isUnlocked = isNodeUnlocked(node.id, node.data.parentId);
            const isLocked = !isUnlocked && !isCompleted;

            return (
              <g
                key={`node-${node.id}`}
                transform={`translate(${node.x},${node.y})`}
                className={cn('transition-all duration-300', {
                  'cursor-pointer': isUnlocked && !isCompleted,
                  'cursor-not-allowed opacity-50': isLocked,
                  'cursor-default': isCompleted,
                })}
                onClick={() => {
                  if (isUnlocked && !isCompleted) {
                    onNodeClick(node.data);
                  }
                }}
              >
                <motion.circle
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: i * 0.1 }}
                  r={24}
                  className={cn('transition-colors duration-300', {
                    'fill-slate-800 stroke-slate-600': isLocked,
                    'fill-blue-900 stroke-blue-500': isUnlocked && !isCompleted,
                    'fill-emerald-900 stroke-emerald-500': isCompleted,
                  })}
                  strokeWidth={3}
                />
                
                {/* Node Icon */}
                <foreignObject x="-12" y="-12" width="24" height="24">
                  <div className="w-full h-full flex items-center justify-center text-white">
                    {isCompleted ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : isLocked ? (
                      <Lock size={14} className="text-slate-400" />
                    ) : (
                      <Play size={14} className="text-blue-400 ml-0.5" />
                    )}
                  </div>
                </foreignObject>

                {/* Node Title */}
                <text
                  dy={40}
                  textAnchor="middle"
                  className={cn('text-sm font-medium select-none', {
                    'fill-slate-500': isLocked,
                    'fill-blue-200': isUnlocked && !isCompleted,
                    'fill-emerald-200': isCompleted,
                  })}
                >
                  {node.data.title}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
