import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const adjustY = (list) => {
  if (list.length <= 1) return;
  const minGap = 16; // vertical spacing gap in pixels
  // Top to bottom
  for (let i = 1; i < list.length; i++) {
    if (list[i].y - list[i-1].y < minGap) {
      list[i].y = list[i-1].y + minGap;
    }
  }
  // Bottom to top
  for (let i = list.length - 2; i >= 0; i--) {
    if (list[i+1].y - list[i].y < minGap) {
      list[i].y = list[i+1].y - minGap;
    }
  }
};

const LIGHT_TEXT_COLORS = [
  '#e11d48', // Coral -> Darker Rose
  '#ea580c', // Orange -> Darker Orange
  '#b45309', // Yellow -> Amber/Gold
  '#15803d', // Lime -> Dark Green
  '#047857', // Teal -> Dark Emerald
  '#0369a1', // Cyan -> Dark Sky Blue
  '#1d4ed8', // Indigo -> Dark Blue
  '#7e22ce', // Purple -> Dark Purple
];

const CustomPieLabel = ({ cx, cy, index, categoryData, ACCENT_SHADES, isDark }) => {
  const total = categoryData.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;
  
  let currentAngle = 0;
  
  const items = categoryData.map((item, idx) => {
    const percentage = item.value / total;
    const angle = currentAngle + (percentage * 360) / 2;
    currentAngle += percentage * 360;
    
    // Recharts uses 0 at 3 o'clock, counter-clockwise
    const rad = angle * Math.PI / 180;
    
    // Position label outer point
    const rLabel = 70 + 26;
    const lx = cx + rLabel * Math.cos(rad);
    const ly = cy - rLabel * Math.sin(rad);
    
    const xEdge = cx + 70 * Math.cos(rad);
    const yEdge = cy - 70 * Math.sin(rad);
    
    return {
      index: idx,
      name: item.name,
      emoji: item.emoji || '🏷️',
      percent: percentage,
      x: lx,
      y: ly,
      xEdge,
      yEdge,
      isLeft: lx < cx
    };
  });
  
  // Stagger left side
  const leftItems = items.filter(item => item.isLeft).sort((a, b) => a.y - b.y);
  adjustY(leftItems);
  
  // Stagger right side
  const rightItems = items.filter(item => !item.isLeft).sort((a, b) => a.y - b.y);
  adjustY(rightItems);
  
  // Find current item's adjusted position
  const currentItem = [...leftItems, ...rightItems].find(item => item.index === index);
  if (!currentItem) return null;
  
  const textAnchor = currentItem.isLeft ? 'end' : 'start';
  
  // Curved path: starting from edge of slice to the label position.
  // Using quadratic Bezier curve to make it smooth, like in the screenshot
  const pathData = `M ${currentItem.xEdge} ${currentItem.yEdge} Q ${(currentItem.xEdge + currentItem.x) / 2} ${currentItem.y} ${currentItem.x} ${currentItem.y}`;
  
  // Determine eye-catching text color
  const textColor = isDark 
    ? ACCENT_SHADES[index % ACCENT_SHADES.length]
    : LIGHT_TEXT_COLORS[index % LIGHT_TEXT_COLORS.length];
  
  return (
    <g>
      <path
        d={pathData}
        fill="none"
        stroke={ACCENT_SHADES[index % ACCENT_SHADES.length]}
        strokeWidth="1"
        opacity="0.8"
      />
      <text
        x={currentItem.x + (currentItem.isLeft ? -4 : 4)}
        y={currentItem.y + 3.5}
        fill={textColor}
        textAnchor={textAnchor}
        fontSize="11"
        fontWeight="800"
        className="select-none"
      >
        {`${currentItem.emoji} ${currentItem.name} ${(currentItem.percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

const CategoryChart = React.memo(({
  categoryData,
  totalForActiveTab,
  baseCurrency,
  isDark,
  ACCENT_SHADES,
  handleCategoryClick
}) => {
  return (
    <div className={`backdrop-blur-xl border rounded-3xl p-5 shadow-xl flex flex-col items-center justify-center transition-all duration-300 ${
      isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
    }`}>
      <div className="w-full h-64 md:h-72">
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={70}
                dataKey="value"
                labelLine={false}
                label={(props) => (
                  <CustomPieLabel
                    {...props}
                    categoryData={categoryData}
                    ACCENT_SHADES={ACCENT_SHADES}
                    isDark={isDark}
                  />
                )}
                onClick={(data) => handleCategoryClick(data.name)}
                className="cursor-pointer"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={ACCENT_SHADES[index % ACCENT_SHADES.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `${baseCurrency} ${Number(value).toLocaleString()}`} 
                contentStyle={{ 
                  backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, 
                  borderRadius: '12px', 
                  fontSize: '11px', 
                  color: isDark ? '#ffffff' : '#1e293b' 
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-xs opacity-40">No transactions recorded for this period.</div>
        )}
      </div>
      
      {/* Legend Breakdown List */}
      <div className="w-full mt-6 space-y-2.5">
        {categoryData.map((item, idx) => {
          const percentage = totalForActiveTab > 0 ? ((item.value / totalForActiveTab) * 100).toFixed(0) : '0';
          return (
            <div 
              key={item.name} 
              onClick={() => handleCategoryClick(item.name)}
              className={`flex justify-between items-center p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
                isDark 
                  ? 'bg-[#1e293b]/40 border-white/5 hover:bg-[#1e293b]/70' 
                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span 
                  className="px-2 py-1 text-[10px] font-extrabold rounded-lg text-white font-mono text-center min-w-[36px]" 
                  style={{ backgroundColor: ACCENT_SHADES[idx % ACCENT_SHADES.length] }}
                >
                  {percentage}%
                </span>
                <span className="text-xl">
                  {item.emoji || '🏷️'}
                </span>
                <span className={`font-semibold text-sm ${isDark ? 'text-white/90' : 'text-slate-700'}`}>
                  {item.name}
                </span>
              </div>
              <span className={`font-mono text-sm font-bold ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                {baseCurrency} {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

CategoryChart.displayName = 'CategoryChart';

export default CategoryChart;
