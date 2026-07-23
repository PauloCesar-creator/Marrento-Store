import { useEffect, useRef } from 'react';
import { playScanBeep } from './barcodeUtils';

interface UseBarcodeScannerOptions {
  onScan: (scannedText: string) => void;
  enabled?: boolean;
  minChars?: number;
  maxKeyIntervalMs?: number; // Time threshold to identify barcode scanner typing vs human typing
}

/**
 * Hook to listen for USB/Bluetooth Plug & Play Barcode Scanner keystrokes.
 * Barcode scanners emulate keyboard input, typing characters extremely fast (<40ms per key)
 * followed by an Enter key.
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minChars = 3,
  maxKeyIntervalMs = 50,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true');

      // Handle Enter key (Scanner termination key)
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minChars) {
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = '';

          // Play scan audio confirmation
          playScanBeep();

          // Trigger onScan callback
          onScan(scannedCode);

          // Prevent form submission if triggered by scanner Enter key
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        bufferRef.current = '';
        return;
      }

      // If user is typing manually in a form input, reset buffer unless keystrokes are super fast
      if (isInputFocused && timeSinceLastKey > maxKeyIntervalMs && bufferRef.current.length < 2) {
        bufferRef.current = '';
        return;
      }

      // If key interval is too slow (human typing), reset buffer
      if (timeSinceLastKey > maxKeyIntervalMs * 3 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      // Append printable single character
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, minChars, maxKeyIntervalMs, onScan]);
}
