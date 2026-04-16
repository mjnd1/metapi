import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MobileBatchBar from './MobileBatchBar.js';

type ResponsiveBatchActionBarProps = {
  isMobile: boolean;
  info: React.ReactNode;
  children: React.ReactNode;
  desktopStyle?: React.CSSProperties;
  infoStyle?: React.CSSProperties;
  desktopFloating?: boolean;
};

const DEFAULT_DESKTOP_STYLE: React.CSSProperties = {
  padding: 12,
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const DEFAULT_INFO_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
};

const DEFAULT_DESKTOP_FLOATING_SPACER_HEIGHT = 96;

function shouldAvoidDesktopBatchBarPortal() {
  return typeof navigator !== 'undefined'
    && typeof navigator.userAgent === 'string'
    && /jsdom/i.test(navigator.userAgent);
}

type DesktopBatchActionBarProps = Omit<ResponsiveBatchActionBarProps, 'isMobile'>;

function DesktopResponsiveBatchActionBar({
  info,
  children,
  desktopStyle,
  infoStyle,
  desktopFloating = true,
}: DesktopBatchActionBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [floatingSpacerHeight, setFloatingSpacerHeight] = useState(
    DEFAULT_DESKTOP_FLOATING_SPACER_HEIGHT,
  );
  const canUsePortal = desktopFloating
    && !shouldAvoidDesktopBatchBarPortal()
    && typeof document !== 'undefined'
    && !!document.body
    && typeof document.body.appendChild === 'function'
    && typeof document.body.removeChild === 'function';
  const shouldFloatInViewport = desktopFloating && canUsePortal;

  useEffect(() => {
    if (!shouldFloatInViewport) return;
    const barElement = barRef.current;
    if (!barElement) return;

    const updateSpacerHeight = () => {
      const nextHeight = Math.ceil(barElement.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setFloatingSpacerHeight(nextHeight);
      }
    };

    updateSpacerHeight();

    const cleanupTasks: Array<() => void> = [];

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateSpacerHeight();
      });
      observer.observe(barElement);
      cleanupTasks.push(() => observer.disconnect());
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateSpacerHeight);
      cleanupTasks.push(() => window.removeEventListener('resize', updateSpacerHeight));
    }

    return () => {
      cleanupTasks.forEach((cleanup) => cleanup());
    };
  }, [children, info, shouldFloatInViewport]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const rootStyle = document.documentElement.style;

    if (!shouldFloatInViewport) {
      rootStyle.removeProperty('--desktop-batch-bar-safe-space');
      return;
    }

    rootStyle.setProperty(
      '--desktop-batch-bar-safe-space',
      `${floatingSpacerHeight}px`,
    );

    return () => {
      rootStyle.removeProperty('--desktop-batch-bar-safe-space');
    };
  }, [floatingSpacerHeight, shouldFloatInViewport]);

  const desktopBar = (
    <div
      ref={barRef}
      className={`card desktop-batch-bar ${shouldFloatInViewport ? 'is-floating' : ''}`.trim()}
      style={{ ...DEFAULT_DESKTOP_STYLE, ...desktopStyle }}
    >
      <span style={{ ...DEFAULT_INFO_STYLE, ...infoStyle }}>{info}</span>
      {children}
    </div>
  );

  return shouldFloatInViewport ? createPortal(desktopBar, document.body) : desktopBar;
}

export default function ResponsiveBatchActionBar({
  isMobile,
  info,
  children,
  desktopStyle,
  infoStyle,
  desktopFloating = true,
}: ResponsiveBatchActionBarProps) {
  if (isMobile) {
    return <MobileBatchBar info={info}>{children}</MobileBatchBar>;
  }

  return (
    <DesktopResponsiveBatchActionBar
      info={info}
      children={children}
      desktopStyle={desktopStyle}
      infoStyle={infoStyle}
      desktopFloating={desktopFloating}
    />
  );
}
