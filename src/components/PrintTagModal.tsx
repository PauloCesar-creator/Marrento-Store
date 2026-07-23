import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Check, Tag as TagIcon, Sparkles, Sliders } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import BarcodeDisplay from './BarcodeDisplay';

interface PrintTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  selectedVariant?: ProductVariant | null;
}

export default function PrintTagModal({
  isOpen,
  onClose,
  product,
  selectedVariant,
}: PrintTagModalProps) {
  const [tagQuantity, setTagQuantity] = useState<number>(1);
  const [barcodeType, setBarcodeType] = useState<'code128' | 'qrcode'>('code128');
  const [labelSize, setLabelSize] = useState<'50x30' | '40x25' | 'a4'>('50x30');
  const [showStoreName, setShowStoreName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  if (!isOpen || !product) return null;

  const skuToPrint = selectedVariant?.sku || product.sku;
  const nameToPrint = product.name;
  const variantNameToPrint = selectedVariant?.name;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" id="print-tag-overlay">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          id="print-tag-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-2xl bg-brand-secondary border border-brand-tertiary/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
          id="print-tag-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-tertiary/60 px-5 py-4 bg-brand-bg/50" id="print-tag-header">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-lg text-brand-neutral tracking-tight">
                  Impressora de Etiquetas de Código de Barras
                </h2>
                <p className="text-xs text-gray-400 font-sans">
                  Configurar layout para impressoras térmicas (Zebra, Elgin, Xprinter) ou A4
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-brand-tertiary/40 hover:bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
              id="print-tag-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1 scrollbar-none" id="print-tag-body">
            
            {/* Options Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-bg/60 p-4 rounded-xl border border-brand-tertiary/40">
              
              {/* Size & Quantity */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-primary mb-1">
                    Formato de Impressão:
                  </label>
                  <select
                    value={labelSize}
                    onChange={(e) => setLabelSize(e.target.value as any)}
                    className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary"
                  >
                    <option value="50x30">Térmica 50x30 mm (Padrão Gondola/Geral)</option>
                    <option value="40x25">Térmica 40x25 mm (Compacta / Joias)</option>
                    <option value="a4">Folha A4 (Grade de Etiquetas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-primary mb-1">
                    Quantidade de Etiquetas:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={tagQuantity}
                      onChange={(e) => setTagQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs font-mono font-bold text-brand-neutral focus:outline-none focus:border-brand-primary text-center"
                    />
                    <button
                      type="button"
                      onClick={() => setTagQuantity(product.quantity || 1)}
                      className="px-3 py-2 bg-brand-tertiary/60 hover:bg-brand-tertiary text-gray-300 rounded-xl text-[10px] font-bold transition cursor-pointer"
                    >
                      Copiar Qtd Estoque ({product.quantity})
                    </button>
                  </div>
                </div>
              </div>

              {/* Barcode Type & Elements */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-primary mb-1">
                    Tipo do Código:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBarcodeType('code128')}
                      className={`flex-1 py-1.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        barcodeType === 'code128'
                          ? 'bg-brand-primary text-black border-brand-primary'
                          : 'bg-brand-bg text-gray-400 border-brand-tertiary'
                      }`}
                    >
                      Código de Barras (128)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcodeType('qrcode')}
                      className={`flex-1 py-1.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        barcodeType === 'qrcode'
                          ? 'bg-brand-primary text-black border-brand-primary'
                          : 'bg-brand-bg text-gray-400 border-brand-tertiary'
                      }`}
                    >
                      QR Code
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-brand-neutral cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showStoreName}
                      onChange={(e) => setShowStoreName(e.target.checked)}
                      className="rounded accent-brand-primary"
                    />
                    <span>Nome da Loja</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-neutral cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="rounded accent-brand-primary"
                    />
                    <span>Preço (R$)</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Tag Visual Live Preview Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> pré-visualização da etiqueta impressa
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  {tagQuantity} {tagQuantity === 1 ? 'cópia' : 'cópias'}
                </span>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-inner flex flex-wrap justify-center items-center gap-4 border border-gray-300 min-h-[160px]">
                {/* Single preview tag box matching thermal sticker format */}
                <div className="bg-white text-black p-3 border-2 border-black rounded-lg w-[220px] flex flex-col items-center justify-between space-y-1 shadow-md">
                  {showStoreName && (
                    <div className="text-[9px] font-serif font-black tracking-widest text-center uppercase border-b border-black pb-0.5 w-full">
                      MARRENTO LUXURY
                    </div>
                  )}

                  <div className="text-center w-full my-1">
                    <h4 className="text-[11px] font-bold truncate leading-tight">
                      {nameToPrint}
                    </h4>
                    {variantNameToPrint && (
                      <span className="inline-block bg-black text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5">
                        Var: {variantNameToPrint}
                      </span>
                    )}
                  </div>

                  <BarcodeDisplay
                    text={skuToPrint}
                    type={barcodeType}
                    height={38}
                    showText={true}
                  />

                  {showPrice && (
                    <div className="text-[12px] font-serif font-extrabold text-black mt-1">
                      {formatCurrency(product.price)}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="border-t border-brand-tertiary/60 px-5 py-3.5 bg-brand-bg/50 flex justify-between items-center" id="print-tag-footer">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-brand-tertiary text-gray-400 hover:text-white text-xs transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={handlePrint}
              className="px-6 py-2.5 rounded-xl bg-brand-primary text-black font-sans font-bold text-xs hover:bg-brand-primary/95 transition cursor-pointer shadow-md flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir {tagQuantity} {tagQuantity === 1 ? 'Etiqueta' : 'Etiquetas'}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Hidden printable layout that only shows when window.print() is triggered */}
      <div id="printable-tag-area" className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] print:p-2">
        <div className="flex flex-wrap gap-2 items-start justify-start">
          {Array.from({ length: tagQuantity }).map((_, idx) => (
            <div
              key={`print-tag-sheet-${idx}`}
              className="bg-white text-black p-2 border border-black rounded flex flex-col items-center justify-between w-[200px] h-[120px] text-center page-break-inside-avoid my-1"
            >
              {showStoreName && (
                <div className="text-[8px] font-serif font-black tracking-widest uppercase border-b border-black pb-0.5 w-full">
                  MARENTO STORE
                </div>
              )}

              <div className="text-[10px] font-bold truncate w-full">
                {nameToPrint}
              </div>

              {variantNameToPrint && (
                <div className="text-[8px] font-bold uppercase">
                  {variantNameToPrint}
                </div>
              )}

              <BarcodeDisplay
                text={skuToPrint}
                type={barcodeType}
                height={30}
                showText={true}
              />

              {showPrice && (
                <div className="text-[11px] font-bold text-black font-serif">
                  {formatCurrency(product.price)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AnimatePresence>
  );
}
