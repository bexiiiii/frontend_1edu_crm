'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, tabs, activeTab, onTabChange, ...props }, ref) => {
    const getIndexById = (tabId?: string) => {
      if (!tabId) return 0;
      const idx = tabs.findIndex((tab) => tab.id === tabId);
      return idx >= 0 ? idx : 0;
    };

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const isControlled = activeTab !== undefined;
    const [internalActiveIndex, setInternalActiveIndex] = useState(() => getIndexById(activeTab));
    const activeIndex = isControlled ? getIndexById(activeTab) : internalActiveIndex;
    const [hoverStyle, setHoverStyle] = useState<{ left?: string; width?: string }>({});
    const [activeStyle, setActiveStyle] = useState<{ left: string; width: string }>({
      left: '0px',
      width: '0px',
    });
    const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
      if (hoveredIndex === null) return;
      const hoveredElement = tabRefs.current[hoveredIndex];
      if (!hoveredElement) return;
      const { offsetLeft, offsetWidth } = hoveredElement;
      setHoverStyle({
        left: `${offsetLeft}px`,
        width: `${offsetWidth}px`,
      });
    }, [hoveredIndex]);

    useEffect(() => {
      const activeElement = tabRefs.current[activeIndex];
      if (!activeElement) return;
      const { offsetLeft, offsetWidth } = activeElement;
      setActiveStyle({
        left: `${offsetLeft}px`,
        width: `${offsetWidth}px`,
      });
    }, [activeIndex, tabs]);

    useEffect(() => {
      const updateActiveStyle = () => {
        const activeElement = tabRefs.current[activeIndex] ?? tabRefs.current[0];
        if (!activeElement) return;
        const { offsetLeft, offsetWidth } = activeElement;
        setActiveStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      };

      const raf = requestAnimationFrame(updateActiveStyle);
      window.addEventListener('resize', updateActiveStyle);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', updateActiveStyle);
      };
    }, [activeIndex, tabs]);

    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        <div className="relative">
          <div
            className="absolute flex h-[34px] items-center rounded-[8px] bg-[#dfe7ef] transition-all duration-300 ease-out"
            style={{
              ...hoverStyle,
              opacity: hoveredIndex !== null ? 1 : 0,
            }}
          />

          <div
            className="absolute bottom-[-6px] h-[2px] bg-[#16a79d] transition-all duration-300 ease-out"
            style={activeStyle}
          />

          <div className="relative flex items-center space-x-[6px]">
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                className={cn(
                  'relative z-10 h-[34px] cursor-pointer rounded-[8px] px-3 py-2 transition-colors duration-300',
                  index === activeIndex
                    ? 'bg-[#ecfdf9] !text-[#0f172a]'
                    : '!text-[#475569] hover:bg-[#e9eff6] hover:!text-[#1f2937]',
                )}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                  if (!isControlled) {
                    setInternalActiveIndex(index);
                  }
                  onTabChange?.(tab.id);
                }}
              >
                <div className="flex h-full items-center justify-center whitespace-nowrap text-sm font-semibold leading-5">
                  {tab.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
);
Tabs.displayName = 'Tabs';

export { Tabs };
