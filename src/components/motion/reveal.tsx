"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * One-shot scroll reveal.
 *
 * Deliberately not scroll-linked: the element crosses a threshold once and
 * plays a 620ms transition. Nothing is tied to scroll position, so the page
 * never fights the wheel. Under reduced motion the CSS keeps the content
 * visible and the transition collapses to nothing.
 */
export function Reveal({
  as: Tag = "div",
  children,
  className,
  delay = 0,
}: {
  as?: "div" | "section" | "article" | "li" | "header" | "footer";
  children: React.ReactNode;
  className?: string;
  /** ms, for staggering siblings. Keep the whole stagger under ~400ms. */
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  // The revealed state lives on the DOM node, not in React state: it happens
  // once, it never travels back up, and keeping it out of state avoids a render
  // for every element that scrolls past.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const show = () => node.classList.add("is-in");
    if (!("IntersectionObserver" in window)) {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        show();
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      className={cn("ani-reveal", className)}
      ref={ref as React.Ref<never>}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * Wires the pointer position into `--mx` / `--my` for `.ani-spotlight`.
 * Attach with `{...useSpotlight()}` on any element that carries the class.
 */
export function useSpotlight() {
  return {
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty(
        "--mx",
        `${((event.clientX - rect.left) / rect.width) * 100}%`,
      );
      event.currentTarget.style.setProperty(
        "--my",
        `${((event.clientY - rect.top) / rect.height) * 100}%`,
      );
    },
  };
}
