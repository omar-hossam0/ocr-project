"use client";

import { useEffect, useRef, useCallback } from "react";

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  vx: number;
  vy: number;
}

interface StarsBackgroundProps {
  starDensity?: number;
  allStarsTwinkle?: boolean;
  twinkleProbability?: number;
  minTwinkleSpeed?: number;
  maxTwinkleSpeed?: number;
  className?: string;
  starColor?: string;
}

export function StarsBackground({
  starDensity = 0.00015,
  allStarsTwinkle = true,
  twinkleProbability = 0.7,
  minTwinkleSpeed = 0.5,
  maxTwinkleSpeed = 1,
  className,
  starColor = "#FFF",
}: StarsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateStars = useCallback(
    (width: number, height: number): Star[] => {
      const numStars = Math.floor(width * height * starDensity);
      return Array.from({ length: numStars }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 0.05 + 0.5,
        opacity: Math.random(),
        twinkleSpeed:
          allStarsTwinkle || Math.random() < twinkleProbability
            ? minTwinkleSpeed +
              Math.random() * (maxTwinkleSpeed - minTwinkleSpeed)
            : 0,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      }));
    },
    [
      starDensity,
      allStarsTwinkle,
      twinkleProbability,
      minTwinkleSpeed,
      maxTwinkleSpeed,
    ],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animationFrameId: number;
    let stars: Star[] = [];
    let isHidden = false;
    let tick = 0;

    const updateCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = generateStars(width, height);
    };

    const renderFrame = () => {
      if (isHidden) {
        animationFrameId = requestAnimationFrame(renderFrame);
        return;
      }

      // Throttle background animation on low-power preference.
      tick += 1;
      if (reduceMotion && tick % 4 !== 0) {
        animationFrameId = requestAnimationFrame(renderFrame);
        return;
      }

      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      const now = Date.now();

      stars.forEach((star) => {
        // Move star
        if (!reduceMotion) {
          star.x += star.vx;
          star.y += star.vy;
        }

        // Wrap around edges
        if (star.x < 0) star.x = canvas.offsetWidth;
        if (star.x > canvas.offsetWidth) star.x = 0;
        if (star.y < 0) star.y = canvas.offsetHeight;
        if (star.y > canvas.offsetHeight) star.y = 0;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = starColor;
        ctx.globalAlpha =
          star.twinkleSpeed > 0
            ? 0.5 +
              Math.abs(Math.sin((now * 0.001 * star.twinkleSpeed) % Math.PI)) *
                0.5
            : star.opacity;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(renderFrame);
    };

    updateCanvasSize();
    renderFrame();

    const onVisibilityChange = () => {
      isHidden = document.hidden;
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();
    };
  }, [starColor, generateStars]);

  return (
    <canvas
      ref={canvasRef}
      className={["h-full w-full", className].filter(Boolean).join(" ")}
    />
  );
}
