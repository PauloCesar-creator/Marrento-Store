import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Barcode as BarcodeIcon,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Printer,
  Sparkles,
  Volume2,
  RefreshCw,
  ShoppingBag,
  Receipt
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { playScanBeep } from '../utils/barcodeUtils';
import BarcodeDisplay from './BarcodeDisplay';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onOpenQuickOp: (productId: string, type: 'entrada' | 'saida') => void;
  onOpenSmartPanel?: (product: Product) => void;
  onOpenPrintTag?: (product: Product, variant?: ProductVariant) => void;
  onOpenNfce?: (product: Product, variant?: ProductVariant) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  products,
  onOpenQuickOp,
  onOpenSmartPanel,
  onOpenPrintTag,
  onOpenNfce,
}: BarcodeScannerModalProps) {
  const [scanInput, setScanInput] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [matchedVariant, setMatchedVariant] = useState<ProductVariant | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanStatusMsg, setScanStatusMsg] = useState<string>('Aguardando leitura do leitor de código de barras USB/Bluetooth...');
  const [isSuccessBeep, setIsSuccessBeep] = useState(false);
  const [autoOpMode, setAutoOpMode] = useState<'none' | 'saida' | 'entrada'>('none');

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setScanInput('');
      setMatchedProduct(null);
      setMatchedVariant(null);
      setLastScannedCode('');
      setScanStatusMsg('Aguardando leitura do leitor de código de barras USB/Bluetooth...');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Process barcode input (fired on Enter key from USB/Bluetooth scanner or manual search)
  const handleProcessScan = (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim();
    if (!cleanCode) return;

    playScanBeep(1200, 0.15);
    setLastScannedCode(cleanCode);

    // Search matching product by SKU, ID or Name or Variant SKU
    let foundProduct: Product | null = null;
    let foundVariant: ProductVariant | null = null;

    for (const prod of products) {
      if (
        prod.sku.toLowerCase() === cleanCode.toLowerCase() ||
        prod.id.toLowerCase() === cleanCode.toLowerCase() ||
        prod.name.toLowerCase().includes(cleanCode.toLowerCase())
      ) {
        foundProduct = prod;
        break;
      }

      // Check variations
      if (prod.variants) {
        const vMatch = prod.variants.find(
          (v) =>
            v.sku?.toLowerCase() === cleanCode.toLowerCase() ||
            v.id.toLowerCase() === cleanCode.toLowerCase()
        );
        if (vMatch) {
          foundProduct = prod;
          foundVariant = vMatch;
          break;
        }
      }
    }

    if (foundProduct) {
      setMatchedProduct(foundProduct);
      setMatchedVariant(foundVariant);
      setIsSuccessBeep(true);
      setScanStatusMsg(`PRODUTO ENCONTRADO: ${foundProduct.name}${foundVariant ? ` (${foundVariant.name})` : ''}`);

      // Auto operation if autoOpMode is set
      if (autoOpMode !== 'none') {
        onOpenQuickOp(foundProduct.id, autoOpMode);
      }
    } else {
      setMatchedProduct(null);
      setMatchedVariant(null);
      setIsSuccessBeep(false);
      setScanStatusMsg(`Nenhum produto encontrado para o código: "${cleanCode}"`);
    }

    setScanInput('');
    // Re-focus input for next scan
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessScan(scanInput);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" id="barcode-modal-overlay">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          id="barcode-modal-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          className="relative z-10 w-full max-w-2xl bg-brand-secondary border border-brand-primary/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
          id="barcode-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-tertiary/60 px-5 py-4 bg-brand-bg/60" id="barcode-modal-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/40 flex items-center justify-center text-brand-primary shadow-lg">
                <BarcodeIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-lg text-brand-neutral tracking-tight">
                    Leitor de Código de Barras (Plug & Play)
                  </h2>
                  <span className="bg-brand-green/20 text-brand-green border border-brand-green/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-ping" />
                    Scanner Ativo
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-sans">
                  Aponte o leitor USB ou Bluetooth para a etiqueta. A busca é instantânea.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-brand-tertiary/40 hover:bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
              id="barcode-modal-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1 scrollbar-none" id="barcode-modal-body">
            
            {/* Animated Laser Scanner Box & Main Input */}
            <div className="relative bg-brand-bg p-5 rounded-2xl border-2 border-brand-primary/30 space-y-4 overflow-hidden shadow-inner">
              
              {/* Animated laser line */}
              <motion.div
                animate={{ y: [0, 80, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className="absolute inset-x-0 top-3 h-0.5 bg-brand-primary shadow-[0_0_12px_#D4AF37] pointer-events-none opacity-80"
              />

              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4" /> Campo com Foco Automático
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  Sinal sonoro ativado (BEEP)
                </span>
              </div>

              {/* Input field */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-brand-primary" />
                <input
                  ref={inputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escaneie o código de barras ou digite o SKU e pressione Enter..."
                  className="w-full bg-brand-secondary border-2 border-brand-primary/60 rounded-xl pl-11 pr-24 py-3 text-sm text-brand-neutral font-mono font-bold placeholder-gray-500 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/40 shadow-lg"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleProcessScan(scanInput)}
                  className="absolute right-2 top-2 bottom-2 px-3 bg-brand-primary text-black font-bold text-xs rounded-lg hover:bg-brand-primary/90 transition cursor-pointer flex items-center gap-1"
                >
                  Bipar / Buscar
                </button>
              </div>

              {/* Status Message */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className={`font-medium ${matchedProduct ? 'text-brand-green font-bold' : lastScannedCode ? 'text-brand-red font-bold' : 'text-gray-400'}`}>
                  {scanStatusMsg}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    inputRef.current?.focus();
                  }}
                  className="text-[10px] text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Re-focar Campo
                </button>
              </div>
            </div>

            {/* Continuous Scan Mode Selector */}
            <div className="flex items-center justify-between bg-brand-bg/40 p-3 rounded-xl border border-brand-tertiary/60 text-xs">
              <span className="font-bold text-gray-300">Ação Automática ao Escanear:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAutoOpMode('none')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    autoOpMode === 'none'
                      ? 'bg-brand-primary text-black border-brand-primary'
                      : 'bg-brand-secondary text-gray-400 border-brand-tertiary'
                  }`}
                >
                  Apenas Mostrar
                </button>
                <button
                  type="button"
                  onClick={() => setAutoOpMode('saida')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    autoOpMode === 'saida'
                      ? 'bg-brand-red text-white border-brand-red'
                      : 'bg-brand-secondary text-gray-400 border-brand-tertiary'
                  }`}
                >
                  ⚡ Auto Venda (-1)
                </button>
                <button
                  type="button"
                  onClick={() => setAutoOpMode('entrada')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    autoOpMode === 'entrada'
                      ? 'bg-brand-green text-black border-brand-green'
                      : 'bg-brand-secondary text-gray-400 border-brand-tertiary'
                  }`}
                >
                  ⚡ Auto Reposição (+1)
                </button>
              </div>
            </div>

            {/* Scanned Result Card */}
            {matchedProduct ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-brand-secondary border-2 border-brand-green/60 p-5 rounded-2xl shadow-xl space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-brand-bg border border-brand-tertiary shrink-0">
                      <img
                        src={matchedVariant?.imageUrl || matchedProduct.imageUrl}
                        alt={matchedProduct.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-brand-tertiary text-brand-primary px-2 py-0.5 rounded uppercase">
                          SKU: {matchedVariant?.sku || matchedProduct.sku}
                        </span>
                        <span className="text-[10px] font-sans bg-brand-bg text-gray-400 px-2 py-0.5 rounded">
                          {matchedProduct.category}
                        </span>
                      </div>
                      <h3 className="font-serif font-bold text-lg text-brand-neutral mt-1">
                        {matchedProduct.name}
                      </h3>
                      {matchedVariant && (
                        <span className="inline-block bg-brand-primary/20 text-brand-primary text-xs font-bold px-2 py-0.5 rounded border border-brand-primary/30 mt-0.5">
                          Variação: {matchedVariant.name}
                        </span>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="font-serif font-bold text-base text-brand-primary">
                          {formatCurrency(matchedProduct.price)}
                        </span>
                        <span className="text-xs font-mono text-gray-300">
                          Estoque: <strong className="text-brand-neutral">{matchedVariant ? matchedVariant.quantity : matchedProduct.quantity} un</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <BarcodeDisplay
                    text={matchedVariant?.sku || matchedProduct.sku}
                    type="code128"
                    height={35}
                    showText={false}
                  />
                </div>

                {/* Quick Action buttons for matched product */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-brand-tertiary/60">
                  {onOpenNfce && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenNfce(matchedProduct, matchedVariant || undefined);
                      }}
                      className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                    >
                      <Receipt className="w-4 h-4 text-amber-400" /> Nota Fiscal
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onOpenQuickOp(matchedProduct.id, 'saida');
                      onClose();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-brand-red/15 hover:bg-brand-red/30 border border-brand-red/40 text-brand-red font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Minus className="w-4 h-4" /> Vender (Saída)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenQuickOp(matchedProduct.id, 'entrada');
                      onClose();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-brand-green/15 hover:bg-brand-green/30 border border-brand-green/40 text-brand-green font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Repor (Entrada)
                  </button>

                  {onOpenPrintTag && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenPrintTag(matchedProduct, matchedVariant || undefined);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/25 border border-brand-primary/30 text-brand-primary font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" /> Etiqueta
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-8 bg-brand-bg/30 rounded-2xl border border-dashed border-brand-tertiary text-gray-500 space-y-2">
                <ShoppingBag className="w-10 h-10 text-brand-tertiary mx-auto" />
                <p className="text-xs font-semibold text-gray-400">
                  Nenhum produto selecionado. Escaneie um código acima.
                </p>
                <p className="text-[10px] text-gray-500 max-w-md mx-auto">
                  Dica: Você pode testar digitando qualquer SKU existente (ex: <code className="text-brand-primary font-mono">SK-888-RLX</code>) e pressionando Enter.
                </p>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="border-t border-brand-tertiary/60 px-5 py-3.5 bg-brand-bg/60 flex justify-between items-center" id="barcode-modal-footer">
            <span className="text-xs text-gray-400">
              {products.length} produtos cadastrados no leitor
            </span>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-brand-primary text-black font-sans font-bold text-xs hover:bg-brand-primary/95 transition cursor-pointer shadow-md"
            >
              Concluído
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
