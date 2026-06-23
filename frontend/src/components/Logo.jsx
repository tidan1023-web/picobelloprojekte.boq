import React from 'react';

export default function Logo({ size = 32, className = '' }) {
  const fontSize = Math.round(size * 0.38);
  return (
    <div
      style={{ width: size, height: size, fontSize }}
      className={`rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shrink-0 select-none ${className}`}
    >
      PB
    </div>
  );
}
