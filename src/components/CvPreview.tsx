"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CvDocument } from "./CvDocument";
import { PAGE, cvPreviewChrome, cvStyles } from "@/lib/cvStyles";
import type { RenderDoc } from "@/lib/types";

const PT_TO_PX = 96 / 72;
const PAGE_WIDTH_PX = PAGE.widthPt * PT_TO_PX;
const PAGE_HEIGHT_PX = PAGE.heightPt * PT_TO_PX;

/**
 * Live preview of the document at true A4 proportions, scaled to fit whatever
 * width it is given, plus a page-count read-out so overflow onto a second page
 * is obvious before exporting.
 */
export function CvPreview({
  doc,
  onPageCount,
}: {
  doc: RenderDoc;
  onPageCount?: (pages: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.75);
  const [contentHeight, setContentHeight] = useState(0);

  // Fit the fixed-width page into the available column.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setScale(Math.min(1, width / PAGE_WIDTH_PX));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Measure how tall the content actually is, so we can count pages.
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const measure = () => setContentHeight(page.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    return () => observer.disconnect();
  });

  // 1px of slack: sub-pixel layout rounding must not read as an extra page.
  const pages =
    contentHeight > 0
      ? Math.max(1, Math.ceil((contentHeight - 1) / PAGE_HEIGHT_PX))
      : 1;
  useEffect(() => onPageCount?.(pages), [pages, onPageCount]);

  const renderedHeight = Math.max(contentHeight, PAGE_HEIGHT_PX);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cvStyles + cvPreviewChrome }} />
      <div ref={frameRef} className="w-full">
        <div
          style={{
            height: renderedHeight * scale,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: PAGE_WIDTH_PX,
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <div style={{ position: "relative", minHeight: PAGE_HEIGHT_PX }}>
              <div ref={pageRef}>
                <CvDocument doc={doc} />
              </div>
              {/* Page-break guides, drawn over the document. */}
              {Array.from({ length: pages - 1 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: PAGE_HEIGHT_PX * (i + 1),
                    borderTop: "1px dashed #d9534f",
                    pointerEvents: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      right: 6,
                      top: 4,
                      font: "500 11px ui-sans-serif, system-ui, sans-serif",
                      color: "#d9534f",
                    }}
                  >
                    page {i + 2}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
