import React from 'react';
import { Clock, Zap, CheckCircle2, Layers, Filter } from 'lucide-react';
import { LocalizedTree, type AppLanguage } from '../localization';

export type OrderStatusFilterValue = 'all' | 'pending' | 'active' | 'completed';

export interface OrderStatusFilterProps {
  language?: AppLanguage;
  currentFilter: OrderStatusFilterValue;
  onFilterChange: (filter: OrderStatusFilterValue) => void;
  counts: {
    all: number;
    pending: number;
    active: number;
    completed: number;
  };
}

export const OrderStatusFilter: React.FC<OrderStatusFilterProps> = ({
  language = 'EN',
  currentFilter,
  onFilterChange,
  counts
}) => {
  const filterOptions: {
    id: OrderStatusFilterValue;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    activeClass: string;
    badgeClass: string;
    description: string;
  }[] = [
    {
      id: 'all',
      label: 'All Orders',
      count: counts.all,
      icon: Layers,
      activeClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30 scale-[1.02]',
      badgeClass: 'bg-blue-400/20 text-blue-200 border-blue-400/30',
      description: 'Showing all orders'
    },
    {
      id: 'pending',
      label: 'Pending',
      count: counts.pending,
      icon: Clock,
      activeClass: 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-md shadow-amber-900/30 scale-[1.02]',
      badgeClass: 'bg-amber-400/20 text-amber-200 border-amber-400/30',
      description: 'Awaiting operator acceptance'
    },
    {
      id: 'active',
      label: 'Active',
      count: counts.active,
      icon: Zap,
      activeClass: 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-900/30 scale-[1.02]',
      badgeClass: 'bg-sky-400/20 text-sky-200 border-sky-400/30',
      description: 'In progress, proof ready or escrow locked'
    },
    {
      id: 'completed',
      label: 'Completed',
      count: counts.completed,
      icon: CheckCircle2,
      activeClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/30 scale-[1.02]',
      badgeClass: 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30',
      description: 'Finished & credentials delivered'
    }
  ];

  return (
    <LocalizedTree language={language}>
    <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
      {/* Filter Segmented Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        <span className="text-[11px] font-bold text-slate-400 px-1.5 uppercase tracking-wider hidden md:flex items-center gap-1 flex-shrink-0">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span>Status Filter:</span>
        </span>

        {filterOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = currentFilter === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                isSelected
                  ? opt.activeClass
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
              <span
                className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold border ${
                  isSelected ? 'bg-white/20 text-white border-white/30' : opt.badgeClass
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Status Subtitle / Indicator */}
      <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-400 px-1">
        <span className="text-[11px]">
          Filter: <b className="text-white capitalize">{currentFilter}</b> (
          {filterOptions.find((f) => f.id === currentFilter)?.count || 0})
        </span>
        {currentFilter !== 'all' && (
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>
    </div>
    </LocalizedTree>
  );
};
