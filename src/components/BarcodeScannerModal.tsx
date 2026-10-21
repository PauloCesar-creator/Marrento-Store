import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  QrCode,
  Barcode as BarcodeIcon,
  Search,
  CheckCircle2,
  AlertCircle,
  Camera,
  CameraOff,
  Printer,
  Sparkles,
  ShoppingBag,
  Volume2,
  RefreshCw,
  Flashlight
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product, ProductVariant } from '../types';
import { playScanBeep } from '../utils/barcodeUtils';
import { LUXURY_IMAGE_FALLBACK } from '../lib/imageUtils';
import { useModalHistory } from '../utils/useModalHistory';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onOpenSalesPanel?: (productId: string, variantId?: string) => void;
  onOpenSmartPanel?: (product: Product) => void;
  onOpenPrintTag?: (product: Product, variant?: ProductVariant) => void;
  onOpenNfce?: (product: Product, variant?: ProductVariant) => void;
  onAddToCart?: (product: Product, variant?: ProductVariant) => void;
  onSelectProductDetails?: (product: Product) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  products,
  onOpenSalesPanel,
  onOpenSmartPanel,
  onOpenPrintTag,
  onOpenNfce,
  onAddToCart,
  onSelectProductDetails,
}: BarcodeScannerModalProps) {
  // Native back button integration
  useModalHistory(isOpen, onClose, 'qr_scanner');

  const [scanInput, setScanInput] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [matchedVariant, setMatchedVariant] = useState<ProductVariant | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Process barcode or QR code string
  const handleProcessCode = (scannedText: string) => {
    const clean = scannedText.trim();
    if (!clean) return;

    playScanBeep(1200, 0.15);
    setLastScannedCode(clean);

    // Search product or variant by SKU, ID, barcode or name
    let foundProd: Product | null = null;
    let foundVar: ProductVariant | null = null;

    for (const prod of products) {
      if (
        prod.sku.toLowerCase() === clean.toLowerCase() ||
        prod.id.toLowerCase() === clean.toLowerCase() ||
        prod.name.toLowerCase() === clean.toLowerCase()
      ) {
        foundProd = prod;
        break;
      }

      if (prod.variants) {
        const v = prod.variants.find(
          (variant) =>
            variant.sku?.toLowerCase() === clean.toLowerCase() ||
            variant.code?.toLowerCase() === clean.toLowerCase() ||
            variant.barcode?.toLowerCase() === clean.toLowerCase() ||
            variant.id.toLowerCase() === clean.toLowerCase()
        );
        if (v) {
          foundProd = prod;
          foundVar = v;
          break;
        }
      }
    }

    setMatchedProduct(foundProd);
    setMatchedVariant(foundVar);
  };

  // Start mobile camera scanner on modal open
  useEffect(() => {
    let isMounted = true;

    if (isOpen && isCameraActive) {
      const elementId = 'qr-camera-stream';

      // Give DOM time to render the video container element
      const timer = setTimeout(async () => {
        if (!isMounted) return;
        const container = document.getElementById(elementId);
        if (!container) return;

        try {
          if (html5QrCodeRef.current) {
            try {
              await html5QrCodeRef.current.stop();
              await html5QrCodeRef.current.clear();
            } catch {
              // ignore
            }
          }

          const qrScanner = new Html5Qrcode(elementId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_39,
            ],
            verbose: false,
          });

          html5QrCodeRef.current = qrScanner;
          setIsScanning(true);
          setCameraError('');

          await qrScanner.start(
            { facingMode: 'environment' },
            {
              fps: 15,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              if (isMounted) {
                handleProcessCode(decodedText);
              }
            },
            () => {
              // frame parse misses are normal, ignore
            }
          );
        } catch (err: any) {
          console.warn('[Camera Scanner Warning]:', err);
          if (isMounted) {
            setCameraError(
              'Câmera não permitida ou indisponível. Você também pode digitar o código ou usar leitor USB/Bluetooth.'
            );
            setIsCameraActive(false);
          }
        }
      }, 250);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (html5QrCodeRef.current) {
          html5QrCodeRef.current
            .stop()
            .then(() => html5QrCodeRef.current?.clear())
            .catch(() => {})
            .finally(() => {
              html5QrCodeRef.current = null;
            });
        }
      };
    }
  }, [isOpen, isCameraActive]);

  // Clean up scanner when closing
  const handleModalClose = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current
        .stop()
        .then(() => html5QrCodeRef.current?.clear())
        .catch(() => {})
        .finally(() => {
          html5QrCodeRef.current = null;
          onClose();
        });
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        id="scanner-modal-overlay"
        onClick={handleModalClose}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          id="scanner-modal-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-md bg-[#131315] border border-[#ffd56d]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
          id="scanner-modal-window"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#131315]/95">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#ffd56d]/15 border border-[#ffd56d]/30 flex items-center justify-center text-[#ffd56d]">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-white leading-tight">
                  Escanear QR Code & Barras
                </h3>
                <p className="text-[10px] text-gray-400 font-mono">
                  Câmera ao vivo & Leitor de Código
                </p>
              </div>
            </div>

            <button
              onClick={handleModalClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
            {/* 1. Camera Viewfinder or Fallback */}
            {isCameraActive ? (
              <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner flex flex-col items-center justify-center min-h-[260px]">
                <div id="qr-camera-stream" className="w-full overflow-hidden" />
                
                {/* Target overlay reticle */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-[#ffd56d] rounded-2xl relative shadow-[0_0_15px_rgba(255,213,109,0.3)]">
                    <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-[#ffd56d]" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-[#ffd56d]" />
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-[#ffd56d]" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-[#ffd56d]" />
                    <div className="w-full h-0.5 bg-[#ffd56d]/60 absolute top-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                </div>

                <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                  <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-[#ffd56d] font-mono font-bold border border-white/10 shadow">
                    Aponte para o QR Code ou Código de Barras
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 text-center space-y-3">
                <CameraOff className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-300">
                  {cameraError || 'Câmera desativada.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsCameraActive(true)}
                  className="px-4 py-2 rounded-xl bg-[#ffd56d] text-black font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Tentar Ativar Câmera
                </button>
              </div>
            )}

            {/* 2. Manual / USB Scanner Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessCode(scanInput);
              }}
              className="space-y-1.5"
            >
              <label className="block text-[10px] uppercase font-bold text-[#D4A017] tracking-wider">
                Digitar Código Manualmente / Leitor USB
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ex: SK-391-CA..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="w-full bg-[#141416] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#ffd56d]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#ffd56d] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md hover:bg-[#ffd56d]/90 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </button>
              </div>
            </form>

            {/* 3. Scanned Result Card */}
            {lastScannedCode && (
              <div className="p-3.5 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">
                    Último código lido:
                  </span>
                  <span className="font-mono text-[#ffd56d] font-bold text-xs bg-black/50 px-2 py-0.5 rounded-md border border-white/10">
                    {lastScannedCode}
                  </span>
                </div>

                {matchedProduct ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                        <img
                          src={
                            matchedVariant?.imageUrl ||
                            matchedProduct.imageUrl ||
                            LUXURY_IMAGE_FALLBACK
                          }
                          alt={matchedProduct.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = LUXURY_IMAGE_FALLBACK;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-[#4ADE80] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Produto Identificado
                        </span>
                        <h4 className="font-bold text-sm text-white truncate">
                          {matchedProduct.name}
                        </h4>
                        {matchedVariant && (
                          <p className="text-xs text-[#ffd56d] truncate">
                            Variante: {matchedVariant.name}
                          </p>
                        )}
                        <p className="font-serif font-bold text-sm text-[#ffd56d] mt-0.5">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(matchedProduct.price)}
                        </p>
                      </div>
                    </div>

                    {/* Quick actions for scanned product */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                      {onAddToCart && (
                        <button
                          type="button"
                          onClick={() => {
                            onAddToCart(matchedProduct, matchedVariant || undefined);
                            handleModalClose();
                          }}
                          className="py-2.5 px-3 rounded-xl bg-[#ffd56d] text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Adicionar Venda</span>
                        </button>
                      )}

                      {onSelectProductDetails && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProductDetails(matchedProduct);
                            handleModalClose();
                          }}
                          className="py-2.5 px-3 rounded-xl bg-[#141416] hover:bg-white/10 text-white font-bold text-xs border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Ver Detalhes</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Nenhum produto cadastrado com este código no acervo.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-white/10 bg-[#131315]/95 flex justify-end">
            <button
              type="button"
              onClick={handleModalClose}
              className="w-full py-2.5 rounded-xl bg-[#1C1C1E] hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs transition cursor-pointer"
            >
              Fechar Leitor
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
