import React from 'react';

export default function Logo({ size = 32, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="Pico Bello Projekte"
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
