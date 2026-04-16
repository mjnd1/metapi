import React from 'react';
import { describe, expect, it } from 'vitest';
import { create } from 'react-test-renderer';
import ResponsiveBatchActionBar from './ResponsiveBatchActionBar.js';

describe('ResponsiveBatchActionBar', () => {
  it('renders the shared mobile batch bar on mobile', () => {
    const root = create(
      <ResponsiveBatchActionBar isMobile info="已选 2 项">
        <button type="button">批量启用</button>
      </ResponsiveBatchActionBar>,
    );

    const bar = root.root.find((node) => node.props.className === 'mobile-actions-bar mobile-batch-bar');
    expect(bar).toBeTruthy();
    expect(root.root.findByType('button').children).toContain('批量启用');
  });

  it('renders the desktop floating wrapper on desktop', () => {
    const originalDocument = globalThis.document;
    const body = {
      appendChild() {},
      removeChild() {},
    };
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { body },
    });

    const root = create(
      <ResponsiveBatchActionBar isMobile={false} info="已选 3 项">
        <button type="button">批量删除</button>
      </ResponsiveBatchActionBar>,
    );

    try {
      const floatingShell = root.root.find((node) => node.props.className === 'desktop-batch-bar-shell is-floating');
      const floatingBar = root.root.find((node) => node.props.className === 'card desktop-batch-bar is-floating');
      expect(floatingShell).toBeTruthy();
      expect(floatingBar).toBeTruthy();
      expect(root.root.findAllByType('span').some((node) => node.children.includes('已选 3 项'))).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
    }
  });
});
