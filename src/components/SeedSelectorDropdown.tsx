import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Sparkles, GripVertical } from 'lucide-react';
import { SEED_OPTIONS, SeedType } from '../types/garden';
import { SeedIconIllustration } from './FlowerIllustration';

interface SeedSelectorDropdownProps {
  selectedSeed: SeedType;
  onSelectSeed: (seed: SeedType) => void;
  onOpenWriteModal: () => void;
}

export const SeedSelectorDropdown: React.FC<SeedSelectorDropdownProps> = ({
  selectedSeed,
  onSelectSeed,
  onOpenWriteModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({
    offsetX: 0,
    offsetY: 0,
  });
  const hasMovedRef = useRef(false);

  const activeOption =
    SEED_OPTIONS.find((s) => s.id === selectedSeed) || SEED_OPTIONS[0];

  // Keep inside viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const elWidth = containerRef.current?.offsetWidth || 180;
        const elHeight = containerRef.current?.offsetHeight || 40;
        return {
          x: Math.max(8, Math.min(window.innerWidth - elWidth - 8, prev.x)),
          y: Math.max(52, Math.min(window.innerHeight - elHeight - 8, prev.y)),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    hasMovedRef.current = true;
    const elWidth = containerRef.current.offsetWidth || 180;
    const elHeight = containerRef.current.offsetHeight || 40;
    const nextX = Math.max(
      8,
      Math.min(
        window.innerWidth - elWidth - 8,
        e.clientX - dragOffsetRef.current.offsetX
      )
    );
    const nextY = Math.max(
      48,
      Math.min(
        window.innerHeight - elHeight - 8,
        e.clientY - dragOffsetRef.current.offsetY
      )
    );
    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release errors
    }
  };

  return (
    <aside
      ref={containerRef}
      aria-label="Choose your seed"
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px` }
          : undefined
      }
      className={`fixed z-40 select-none ${
        position ? '' : 'right-3 sm:right-5 top-14 sm:top-16'
      }`}
    >
      {/* Ultra-compact floating pill bar */}
      <div className="inline-flex items-center gap-1 rounded-full bg-white/82 hover:bg-white/92 backdrop-blur-md shadow-md border border-white/75 p-1 transition-all">
        {/* Subtle drag handle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Drag to reposition"
          className="pl-1 pr-0.5 py-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-3 h-3" />
        </div>

        {/* Seed Dropdown Trigger */}
        <button
          type="button"
          onClick={() => {
            if (!hasMovedRef.current) {
              setIsOpen((prev) => !prev);
            }
          }}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-left cursor-pointer focus:outline-none"
        >
          <SeedIconIllustration seedType={selectedSeed} size={20} />
          <span className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">
            Choose your seed 🌱
          </span>
          <ChevronDown
            className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Mini Plant CTA */}
        <button
          type="button"
          onClick={onOpenWriteModal}
          className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Sparkles className="w-2.5 h-2.5 text-amber-200" />
          <span>Plant</span>
        </button>
      </div>

      {/* Compact Popover Menu when expanded */}
      {isOpen && (
        <div className="mt-1.5 w-[212px] ml-auto rounded-2xl bg-white/90 backdrop-blur-xl shadow-xl border border-white/85 p-2 space-y-1">
          <div className="px-1.5 py-0.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400">
              Selected: {activeOption.name}
            </span>
          </div>

          {SEED_OPTIONS.map((seed) => {
            const isSelected = seed.id === selectedSeed;
            return (
              <button
                key={seed.id}
                type="button"
                onClick={() => {
                  onSelectSeed(seed.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 p-1.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50/95 border border-sky-200/90'
                    : 'hover:bg-white/80 border border-transparent'
                }`}
              >
                <SeedIconIllustration seedType={seed.id} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-slate-800 truncate">
                      {seed.numberLabel} — {seed.name}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-600 text-white shrink-0">
                        <Check className="w-2 h-2" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">
                    {seed.tagline}
                  </p>
                </div>
              </button>
            );
          })}

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenWriteModal();
              }}
              className="w-full py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3 text-amber-200" />
              <span>Plant your story</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
