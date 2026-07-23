import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, CheckCircle, ArrowUpRight, ArrowDownLeft, FileText } from 'lucide-react';
import { Transaction, Product } from '../types';
import BarcodeDisplay from './BarcodeDisplay';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  product?: Product | null;
}

export default function PrintReceiptModal({
  isOpen,
  onClose,
  transaction,
  product,
}: PrintReceiptModalProps) {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const isSale = transaction.type === 'saida';
  const totalValue = transaction.price * transaction.quantity;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" id="print-receipt-overlay">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          id="print-receipt-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-lg bg-brand-secondary border border-brand-tertiary/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
          id="print-receipt-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-tertiary/60 px-5 py-4 bg-brand-bg/50" id="print-receipt-header">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-lg text-brand-neutral tracking-tight">
                  Comprovante de Movimentação
                </h2>
                <p className="text-xs text-gray-400 font-sans">
                  Recibo de {isSale ? 'Saída / Venda' : 'Entrada / Reposição'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-brand-tertiary/40 hover:bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
              id="print-receipt-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Thermal Receipt Visual Preview */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-none" id="print-receipt-body">
            
            <div className="bg-white text-black p-6 rounded-2xl shadow-2xl font-mono border border-gray-300 max-w-sm mx-auto space-y-4" id="receipt-visual-box">
              
              {/* Header */}
              <div className="text-center border-b border-dashed border-gray-400 pb-3 space-y-1">
                <h3 className="font-serif font-black text-base text-black tracking-widest uppercase">
                  MARRENTO STORE
                </h3>
                <p className="text-[10px] text-gray-700 font-sans font-bold uppercase">
                  Gestão de Estoque de Luxo
                </p>
                <div className="text-[9px] text-gray-600 pt-1">
                  Data: {transaction.date} &bull; Hora: {transaction.time}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-800">
                  {isSale ? '*** COMPROVANTE DE VENDA ***' : '*** COMPROVANTE DE ENTRADA ***'}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-bold border-b border-gray-300 pb-1 text-[10px]">
                  <span>PRODUTO / SKU</span>
                  <span>SUBTOTAL</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-xs">
                    <span className="truncate max-w-[180px]">{transaction.productName}</span>
                    <span>{formatCurrency(totalValue)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600 font-sans">
                    <span>SKU: {transaction.sku}</span>
                    <span>{transaction.quantity} un x {formatCurrency(transaction.price)}</span>
                  </div>
                  <div className="text-[9px] text-gray-500 italic">
                    Categoria: {transaction.category}
                  </div>
                </div>
              </div>

              {/* Total Row */}
              <div className="border-t-2 border-black pt-2 flex justify-between items-baseline font-bold">
                <span className="text-xs uppercase">VALOR TOTAL:</span>
                <span className="text-sm font-serif">{formatCurrency(totalValue)}</span>
              </div>

              {/* Barcode / Audit */}
              <div className="pt-2 border-t border-dashed border-gray-400 flex flex-col items-center justify-center space-y-1">
                <BarcodeDisplay
                  text={transaction.id}
                  type="code128"
                  height={32}
                  showText={true}
                />
                <span className="text-[8px] text-gray-500 text-center font-sans">
                  Obrigado por escolher Marento Luxury Store
                </span>
              </div>

            </div>

          </div>

          {/* Footer */}
          <div className="border-t border-brand-tertiary/60 px-5 py-3.5 bg-brand-bg/50 flex justify-between items-center" id="print-receipt-footer">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-brand-tertiary text-gray-400 hover:text-white text-xs transition cursor-pointer"
            >
              Fechar
            </button>

            <button
              onClick={handlePrint}
              className="px-6 py-2.5 rounded-xl bg-brand-primary text-black font-sans font-bold text-xs hover:bg-brand-primary/95 transition cursor-pointer shadow-md flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir Comprovante
            </button>
          </div>
        </motion.div>
      </div>

      {/* Hidden printable receipt only visible during window.print() */}
      <div id="printable-receipt-area" className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] print:p-4 text-black font-mono">
        <div className="max-w-xs mx-auto space-y-3 text-center">
          <div className="border-b border-black pb-2">
            <h2 className="font-serif font-black text-lg tracking-widest uppercase">MARENTO STORE</h2>
            <p className="text-[10px] uppercase font-bold">{isSale ? 'COMPROVANTE DE VENDA' : 'COMPROVANTE DE REPOSIÇÃO'}</p>
            <p className="text-[9px]">{transaction.date} - {transaction.time}</p>
          </div>

          <div className="text-left text-xs space-y-1 my-2">
            <p className="font-bold">{transaction.productName}</p>
            <p className="text-[10px]">SKU: {transaction.sku}</p>
            <p className="text-[10px]">{transaction.quantity} un x {formatCurrency(transaction.price)}</p>
            <p className="font-bold text-sm border-t border-black pt-1">TOTAL: {formatCurrency(totalValue)}</p>
          </div>

          <div className="pt-2 border-t border-black flex flex-col items-center">
            <BarcodeDisplay text={transaction.id} type="code128" height={30} showText={true} />
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
