import React from 'react';
import { generateCode128SvgBars, generateQrCodeSvgPath } from '../utils/barcodeUtils';

interface BarcodeDisplayProps {
  text: string;
  type?: 'code128' | 'qrcode';
  height?: number;
  showText?: boolean;
  className?: string;
}

export default function BarcodeDisplay({
  text,
  type = 'code128',
  height = 45,
  showText = true,
  className = '',
}: BarcodeDisplayProps) {
  const cleanText = (text || 'MARENTO').trim();

  if (type === 'qrcode') {
    const size = height * 2;
    const qrPath = generateQrCodeSvgPath(cleanText, size);
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="fill-current text-black"
        >
          <path d={qrPath} />
        </svg>
        {showText && (
          <span className="text-[9px] font-mono tracking-widest text-black mt-1 uppercase font-bold">
            {cleanText}
          </span>
        )}
      </div>
    );
  }

  // Code 128 SVG
  const { pathData, totalWidth } = generateCode128SvgBars(cleanText, height, 1.8);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        width={totalWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="fill-current text-black"
      >
        <path d={pathData} />
      </svg>
      {showText && (
        <span className="text-[10px] font-mono tracking-widest text-black mt-1 font-bold uppercase">
          {cleanText}
        </span>
      )}
    </div>
  );
}
