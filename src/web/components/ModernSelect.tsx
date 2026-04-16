import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  List,
  useDynamicRowHeight,
  type ListImperativeAPI,
  type RowComponentProps,
} from 'react-window';

const MODERN_SELECT_PANEL_VERTICAL_PADDING = 12;
const MODERN_SELECT_SEARCH_SECTION_HEIGHT = 54;
const MODERN_SELECT_AUTO_VIRTUALIZE_THRESHOLD = 18;
const MODERN_SELECT_DEFAULT_VIRTUAL_OVERSCAN = 6;
const MODERN_SELECT_DEFAULT_VIRTUAL_ITEM_HEIGHT = 56;
const MODERN_SELECT_DEFAULT_VIRTUAL_ITEM_HEIGHT_SM = 44;
const MODERN_SELECT_COMPACT_VIRTUAL_ITEM_HEIGHT = 40;
const MODERN_SELECT_COMPACT_VIRTUAL_ITEM_HEIGHT_SM = 36;

type ModernSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  iconNode?: ReactNode;
  iconUrl?: string;
  iconText?: string;
};

type ModernSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: ModernSelectOption[];
  'data-testid'?: string;
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
  menuMaxHeight?: number;
  className?: string;
  size?: 'md' | 'sm';
  searchable?: boolean;
  searchPlaceholder?: string;
  virtualized?: boolean | 'auto';
  virtualItemHeight?: number;
  virtualOverscan?: number;
  virtualizationThreshold?: number;
};

type ModernSelectOptionButtonProps = {
  item: ModernSelectOption;
  active: boolean;
  onSelect: (value: string) => void;
  renderOptionIcon: (item: ModernSelectOption) => ReactNode;
  buttonStyle?: CSSProperties;
  preserveDescription?: boolean;
};

type ModernSelectVirtualizedRowProps = {
  options: ModernSelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  renderOptionIcon: (item: ModernSelectOption) => ReactNode;
  preserveDescription: boolean;
};

function ModernSelectOptionButton({
  item,
  active,
  onSelect,
  renderOptionIcon,
  buttonStyle,
  preserveDescription = false,
}: ModernSelectOptionButtonProps) {
  const labelClampStyle = !preserveDescription
    ? {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
      }
    : undefined;
  const descriptionStyle = preserveDescription
    ? {
        wordBreak: 'break-all' as const,
        whiteSpace: 'normal' as const,
      }
    : labelClampStyle;

  return (
    <button
      type="button"
      title={item.description ? `${item.label}\n${item.description}` : item.label}
      className={`modern-select-option ${active ? 'is-active' : ''} ${item.disabled ? 'is-disabled' : ''}`.trim()}
      onClick={() => {
        if (item.disabled) return;
        onSelect(item.value);
      }}
      disabled={item.disabled}
      style={buttonStyle}
    >
      <div className="modern-select-option-main">
        {renderOptionIcon(item)}
        <div style={{ minWidth: 0, overflow: preserveDescription ? undefined : 'hidden' }}>
          <div className="modern-select-option-label" style={labelClampStyle}>
            {item.label}
          </div>
          {item.description && (
            <div className="modern-select-option-desc" style={descriptionStyle}>
              {item.description}
            </div>
          )}
        </div>
      </div>
      {active && (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function ModernSelectVirtualizedRow({
  index,
  style,
  options,
  selectedValue,
  onSelect,
  renderOptionIcon,
  preserveDescription,
}: RowComponentProps<ModernSelectVirtualizedRowProps>) {
  const item = options[index];
  return (
    <div style={{ ...style, minHeight: style.height }}>
      <ModernSelectOptionButton
        item={item}
        active={item.value === selectedValue}
        onSelect={onSelect}
        renderOptionIcon={renderOptionIcon}
        preserveDescription={preserveDescription}
        buttonStyle={{
          minHeight: '100%',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

export default function ModernSelect({
  value,
  onChange,
  options,
  'data-testid': dataTestId,
  placeholder = 'Select',
  disabled = false,
  emptyLabel = 'No options',
  menuMaxHeight = 280,
  className = '',
  size = 'md',
  searchable = false,
  searchPlaceholder = 'Search...',
  virtualized = 'auto',
  virtualItemHeight,
  virtualOverscan = MODERN_SELECT_DEFAULT_VIRTUAL_OVERSCAN,
  virtualizationThreshold = MODERN_SELECT_AUTO_VIRTUALIZE_THRESHOLD,
}: ModernSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<ListImperativeAPI | null>(null);

  const selected = useMemo(
    () => options.find((item) => item.value === value),
    [options, value],
  );

  const visibleOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!searchable || !query) return options;

    return options.filter((item) => {
      const haystack = [
        item.label,
        item.description,
        item.value,
      ]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [options, searchQuery, searchable]);

  useEffect(() => {
    if (!open) return;
    if (typeof document === 'undefined') return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open && searchQuery) {
      setSearchQuery('');
    }
  }, [open, searchQuery]);

  const renderOptionIcon = (item: ModernSelectOption) => {
    if (item.iconNode) {
      return item.iconNode;
    }
    if (item.iconUrl) {
      return <img className="modern-select-option-icon" src={item.iconUrl} alt="" loading="lazy" />;
    }
    if (item.iconText) {
      return <span className="modern-select-option-icon-text">{item.iconText}</span>;
    }
    return null;
  };

  const hasOptionDescriptions = useMemo(
    () => options.some((item) => typeof item.description === 'string' && item.description.trim().length > 0),
    [options],
  );
  const shouldPreserveVirtualizedDescription = hasOptionDescriptions && searchable;

  const resolvedVirtualItemHeight =
    virtualItemHeight
    ?? (size === 'sm'
      ? (hasOptionDescriptions
        ? (shouldPreserveVirtualizedDescription
          ? MODERN_SELECT_DEFAULT_VIRTUAL_ITEM_HEIGHT
          : MODERN_SELECT_DEFAULT_VIRTUAL_ITEM_HEIGHT_SM)
        : MODERN_SELECT_COMPACT_VIRTUAL_ITEM_HEIGHT_SM)
      : (hasOptionDescriptions
        ? MODERN_SELECT_DEFAULT_VIRTUAL_ITEM_HEIGHT
        : MODERN_SELECT_COMPACT_VIRTUAL_ITEM_HEIGHT));

  const shouldAutoVirtualize = visibleOptions.length >= virtualizationThreshold;
  const canUseVirtualizedOptions =
    visibleOptions.length > 0
    && (virtualized === true || (virtualized !== false && shouldAutoVirtualize));
  const dynamicRowHeightKey = useMemo(
    () => visibleOptions.map((item) => item.value).join('|'),
    [visibleOptions],
  );
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: resolvedVirtualItemHeight,
    key: `${size}-${searchable}-${shouldPreserveVirtualizedDescription}-${dynamicRowHeightKey}`,
  });

  const virtualizedListHeight = useMemo(() => {
    if (!canUseVirtualizedOptions) return 0;

    const reservedHeight =
      MODERN_SELECT_PANEL_VERTICAL_PADDING
      + (searchable ? MODERN_SELECT_SEARCH_SECTION_HEIGHT : 0);
    const maxListHeight = Math.max(
      resolvedVirtualItemHeight,
      menuMaxHeight - reservedHeight,
    );
    return Math.min(
      visibleOptions.length * resolvedVirtualItemHeight,
      maxListHeight,
    );
  }, [
    canUseVirtualizedOptions,
    menuMaxHeight,
    resolvedVirtualItemHeight,
    searchable,
    visibleOptions.length,
  ]);

  const selectedVisibleIndex = useMemo(
    () => visibleOptions.findIndex((item) => item.value === value),
    [value, visibleOptions],
  );

  useEffect(() => {
    if (!open || !canUseVirtualizedOptions || !listRef.current) return;
    listRef.current.scrollToRow({
      index: selectedVisibleIndex >= 0 ? selectedVisibleIndex : 0,
      align: 'smart',
    });
  }, [canUseVirtualizedOptions, open, selectedVisibleIndex, visibleOptions.length]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      data-testid={dataTestId}
      className={`modern-select ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${size === 'sm' ? 'is-sm' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        className="modern-select-trigger"
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`modern-select-value ${selected ? '' : 'is-placeholder'}`.trim()}>
          {selected ? (
            <span className="modern-select-value-content">
              {renderOptionIcon(selected)}
              <span>{selected.label}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>
        <svg
          className="modern-select-chevron"
          width="14"
          height="14"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className="modern-select-panel"
        style={{
          maxHeight: menuMaxHeight,
          overflow: canUseVirtualizedOptions ? 'hidden' : undefined,
        }}
      >
        {searchable && (
          <div className="modern-select-search-shell">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="modern-select-search-input"
            />
          </div>
        )}

        {visibleOptions.length === 0 ? (
          <div className="modern-select-empty">{emptyLabel}</div>
        ) : canUseVirtualizedOptions ? (
          <List
            listRef={listRef}
            rowComponent={ModernSelectVirtualizedRow}
            rowCount={visibleOptions.length}
            rowHeight={shouldPreserveVirtualizedDescription ? dynamicRowHeight : resolvedVirtualItemHeight}
            overscanCount={virtualOverscan}
            rowProps={{
              options: visibleOptions,
              selectedValue: value,
              onSelect: handleSelect,
              renderOptionIcon,
              preserveDescription: shouldPreserveVirtualizedDescription,
            }}
            style={{ height: virtualizedListHeight, width: '100%' }}
          >
            {null}
          </List>
        ) : (
          visibleOptions.map((item) => {
            const active = item.value === value;
            return (
              <ModernSelectOptionButton
                key={item.value}
                item={item}
                active={active}
                onSelect={handleSelect}
                renderOptionIcon={renderOptionIcon}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
