import React, { useEffect, useState } from 'react';

interface Node {
  x: number;
  y: number;
  size: number;
  pulseOffset: number;
}

interface Connection {
  from: number;
  to: number;
  strength: number;
  animationOffset: number;
}

const AIPoweredBrand: React.FC = () => {
  const [nodes] = useState<Node[]>(() => {
    // Slightly taller neural network visualization
    return [
      { x: 8, y: 15, size: 3, pulseOffset: 0 },
      { x: 24, y: 10, size: 2.5, pulseOffset: 0.3 },
      { x: 24, y: 20, size: 2.5, pulseOffset: 0.6 },
      { x: 40, y: 15, size: 3, pulseOffset: 0.9 },
    ];
  });

  const [connections] = useState<Connection[]>(() => {
    return [
      { from: 0, to: 1, strength: 0.8, animationOffset: 0 },
      { from: 0, to: 2, strength: 0.6, animationOffset: 0.2 },
      { from: 1, to: 3, strength: 0.9, animationOffset: 0.4 },
      { from: 2, to: 3, strength: 0.7, animationOffset: 0.6 },
    ];
  });

  const [codeSnippets] = useState([
    'const ai = true;',
    'apiCall(data)',
    'analyze()',
    '{ insights }',
  ]);

  const [currentSnippet, setCurrentSnippet] = useState(0);
  const [animationTime, setAnimationTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.1);
    }, 100);

    const snippetInterval = setInterval(() => {
      setCurrentSnippet(prev => (prev + 1) % codeSnippets.length);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(snippetInterval);
    };
  }, [codeSnippets.length]);

  const getPulseScale = (offset: number) => {
    return 1 + 0.3 * Math.sin(animationTime + offset);
  };

  const getConnectionOpacity = (offset: number) => {
    return 0.3 + 0.4 * Math.sin(animationTime * 2 + offset);
  };

  return (
    <div className="flex items-center space-x-3 group">
      {/* Neural Network Visualization */}
      <div className="relative w-12 h-10">
        <svg
          width="48"
          height="40"
          viewBox="0 0 48 30"
          className="absolute inset-0"
        >
          {/* Connections */}
          {connections.map((conn, idx) => {
            const fromNode = nodes[conn.from];
            const toNode = nodes[conn.to];
            return (
              <line
                key={idx}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                opacity={getConnectionOpacity(conn.animationOffset)}
                className="transition-opacity duration-300"
              />
            );
          })}
          
          {/* Nodes */}
          {nodes.map((node, idx) => (
            <circle
              key={idx}
              cx={node.x}
              cy={node.y}
              r={node.size * getPulseScale(node.pulseOffset)}
              fill="hsl(var(--primary))"
              opacity={0.8}
              className="transition-all duration-300"
            />
          ))}
          
          {/* Animated data flow particles */}
          {connections.map((conn, idx) => {
            const fromNode = nodes[conn.from];
            const toNode = nodes[conn.to];
            const progress = (Math.sin(animationTime * 3 + conn.animationOffset) + 1) / 2;
            const x = fromNode.x + (toNode.x - fromNode.x) * progress;
            const y = fromNode.y + (toNode.y - fromNode.y) * progress;
            
            return (
              <circle
                key={`particle-${idx}`}
                cx={x}
                cy={y}
                r="1"
                fill="hsl(var(--primary))"
                opacity={conn.strength}
                className="transition-all duration-150"
              />
            );
          })}
        </svg>
      </div>

      {/* Brand Text with Code Animation */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-primary">SpendViz</h1>
        </div>
        
        {/* Animated Code Snippet */}
        <div className="overflow-hidden h-4">
          <div 
            className="text-[10px] font-mono text-muted-foreground/60 transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateY(-${currentSnippet * 16}px)`,
            }}
          >
            {codeSnippets.map((snippet, idx) => (
              <div 
                key={idx} 
                className="h-4 flex items-center opacity-80"
              >
                <span className="text-primary/60 mr-1">›</span>
                {snippet}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating AI Indicators */}
      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex space-x-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1 h-1 bg-primary rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.5s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIPoweredBrand;
