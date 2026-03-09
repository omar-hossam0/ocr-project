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

    let animationFrameId: number;
    let stars: Star[] = [];

    const updateCanvasSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      stars = generateStars(canvas.width, canvas.height);
    };

    const renderFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        // Move star
        star.x += star.vx;
        star.y += star.vy;
        // Wrap around edges
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = starColor;
        ctx.globalAlpha =
          star.twinkleSpeed > 0
            ? 0.5 +
              Math.abs(
                Math.sin((Date.now() * 0.001 * star.twinkleSpeed) % Math.PI),
              ) *
                0.5
            : star.opacity;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(renderFrame);
    };

    updateCanvasSize();
    renderFrame();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(animationFrameId);
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
