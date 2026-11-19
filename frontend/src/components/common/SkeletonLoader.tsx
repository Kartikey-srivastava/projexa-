import React from 'react';

export const CardSkeleton: React.FC<{ height?: string }> = ({ height = 'h-32' }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm animate-pulse ${height}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
    </div>
    <div className="h-7 bg-slate-200 rounded w-1/2 mb-3"></div>
    <div className="h-2 bg-slate-100 rounded w-full"></div>
  </div>
);

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-80' }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm animate-pulse ${height} flex flex-col justify-between`}>
    <div className="flex justify-between items-center mb-6">
      <div className="space-y-2">
        <div className="h-5 bg-slate-200 rounded w-44"></div>
        <div className="h-3 bg-slate-100 rounded w-64"></div>
      </div>
      <div className="h-8 bg-slate-100 rounded-lg w-28"></div>
    </div>
    <div className="flex-1 bg-slate-50/70 rounded-xl flex items-end p-4 gap-4">
      <div className="h-1/3 bg-slate-200 rounded flex-1"></div>
      <div className="h-1/2 bg-slate-200 rounded flex-1"></div>
      <div className="h-2/3 bg-slate-200 rounded flex-1"></div>
      <div className="h-3/4 bg-slate-200 rounded flex-1"></div>
      <div className="h-1/2 bg-slate-200 rounded flex-1"></div>
      <div className="h-4/5 bg-slate-200 rounded flex-1"></div>
    </div>
  </div>
);
