"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ------------------------------------------------------------------ */
/* Auto-saving text field                                              */
/* ------------------------------------------------------------------ */

interface AutoFieldProps {
  value: string;
  onSave: (value: string) => void | Promise<unknown>;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  ariaLabel?: string;
  bold?: boolean;
}

/** Debounced save-as-you-type, plus an immediate save on blur. */
export function AutoField({
  value,
  onSave,
  placeholder,
  multiline,
  rows = 3,
  className = "",
  ariaLabel,
  bold,
}: AutoFieldProps) {
  const [draft, setDraft] = useState(value);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);

  // Adopt server-side changes, but never clobber what is being typed.
  useEffect(() => {
    if (value !== latest.current) {
      latest.current = value;
      setDraft(value);
    }
  }, [value]);

  const commit = useCallback(
    (next: string) => {
      if (next === latest.current) return;
      latest.current = next;
      startTransition(() => {
        void onSave(next);
      });
    },
    [onSave],
  );

  const handleChange = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), 600);
  };

  const handleBlur = () => {
    if (timer.current) clearTimeout(timer.current);
    commit(draft);
  };

  const shared = {
    value: draft,
    placeholder,
    "aria-label": ariaLabel ?? placeholder,
    onBlur: handleBlur,
    className: `field ${bold ? "font-semibold" : ""} ${className}`,
  };

  return multiline ? (
    <textarea
      {...shared}
      rows={rows}
      onChange={(e) => handleChange(e.target.value)}
    />
  ) : (
    <input {...shared} onChange={(e) => handleChange(e.target.value)} />
  );
}

/* ------------------------------------------------------------------ */
/* Sortable list                                                       */
/* ------------------------------------------------------------------ */

export function SortableList({
  ids,
  onReorder,
  children,
}: {
  ids: number[];
  onReorder: (ids: number[]) => void;
  children: React.ReactNode;
}) {
  // dnd-kit derives its aria ids from an internal counter, which does not line
  // up between the server render and hydration. A stable useId fixes that.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    if (from === -1 || to === -1) return;
    onReorder(arrayMove(ids, from, to));
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function SortableRow({
  id,
  children,
  className = "",
}: {
  id: number;
  children: (handle: React.ReactNode) => React.ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const handle = (
    <button
      type="button"
      className="drag-handle"
      aria-label="Reorder"
      {...attributes}
      {...listeners}
    >
      <GripIcon />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={`${className} ${isDragging ? "relative shadow-lg" : ""}`}
    >
      {children(handle)}
    </div>
  );
}

export function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="6" cy="3" r="1.35" />
        <circle cx="10" cy="3" r="1.35" />
        <circle cx="6" cy="8" r="1.35" />
        <circle cx="10" cy="8" r="1.35" />
        <circle cx="6" cy="13" r="1.35" />
        <circle cx="10" cy="13" r="1.35" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

/** Two-step delete so a mis-click never destroys a record. */
export function ConfirmButton({
  onConfirm,
  label = "Delete",
  confirmLabel = "Really delete?",
  className = "btn btn-ghost btn-sm btn-danger",
}: {
  onConfirm: () => void | Promise<unknown>;
  label?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        startTransition(() => {
          void onConfirm();
        });
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate && !checked);
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="check"
      checked={checked}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}
