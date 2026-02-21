'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    trend?: {
        value: string;
        isUp: boolean;
    };
}

export default function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
    return (
        <div className="glass-card p-6 flex flex-col gap-4 group hover:border-primary/30 transition-all duration-500 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}>
                    <Icon size={24} className={color.replace('bg-', 'text-')} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-black uppercase tracking-widest ${trend.isUp ? 'text-primary' : 'text-red-400'}`}>
                        {trend.isUp ? '↑' : '↓'} {trend.value}
                    </div>
                )}
            </div>

            <div className="flex flex-col">
                <span className="text-3xl font-black text-white tracking-tighter group-hover:text-primary transition-colors">{value}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">{label}</span>
            </div>
        </div>
    );
}
