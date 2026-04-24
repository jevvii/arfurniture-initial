
import React, { useState } from 'react';
import { Check, Pipette } from 'lucide-react';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    label?: string;
}

const PRESET_COLORS = [
    '#0F172A', // Slate 900
    '#4F46E5', // Indigo 600
    '#059669', // Emerald 600
    '#DC2626', // Red 600
    '#D97706', // Amber 600
    '#2563EB', // Blue 600
    '#7C3AED', // Violet 600
    '#DB2777', // Pink 600
    '#FFFFFF', // White
    '#94A3B8', // Slate 400
    '#78350F', // Warm Wood
    '#A16207', // Gold/Brass
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="space-y-1 sm:space-y-1.5 flex-1 w-full">
            {label && <label className="block text-sm font-semibold text-slate-700">{label}</label>}

            <div className="relative">
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-slate-200 hover:border-indigo-500 transition-all shadow-sm h-[42px]">
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-6 h-6 rounded-md border border-slate-100 shadow-sm flex-shrink-0 transition-transform active:scale-95 hover:scale-110"
                        style={{ backgroundColor: value }}
                        title="Open Palette"
                    />
                    <div className="flex-1">
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-transparent border-none text-sm font-mono text-slate-800 focus:ring-0 p-0 uppercase font-semibold"
                            placeholder="#000000"
                        />
                    </div>
                </div>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                        <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[70] w-56 animate-in fade-in zoom-in duration-150 origin-top-left">
                            <div className="grid grid-cols-4 gap-2.5">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => {
                                            onChange(color);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full aspect-square rounded-xl border-2 transition-all hover:scale-105 relative ${value.toLowerCase() === color.toLowerCase()
                                                ? 'border-indigo-600'
                                                : 'border-slate-50'
                                            }`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {value.toLowerCase() === color.toLowerCase() && (
                                            <Check className={`w-4 h-4 absolute inset-0 m-auto ${color === '#FFFFFF' ? 'text-slate-900' : 'text-white'}`} />
                                        )}
                                    </button>
                                ))}

                                <label className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-500 hover:text-indigo-500 transition-colors bg-slate-50">
                                    <Pipette className="w-5 h-5" />
                                    <input
                                        type="color"
                                        value={value}
                                        onChange={(e) => onChange(e.target.value)}
                                        className="opacity-0 absolute w-0 h-0"
                                    />
                                </label>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-center">
                                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Quick Select</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
