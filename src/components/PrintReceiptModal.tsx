import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, FileText, CheckCircle, Receipt, QrCode, Barcode, ShieldCheck } from 'lucide-react';
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
  const [docType, setDocType] = useState<'nfce' | 'comprovante'>('nfce');
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm' | 'a4'>('58mm');
  const [cpfConsumidor, setCpfConsumidor] = useState<string>('Consumidor Não Identificado');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cartão de Crédito');
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const isSale = transaction.type === 'saida';
  const totalValue = transaction.price * transaction.quantity;
  const unitPrice = transaction.price;

  // Generate deterministic 44-digit NFC-e Chave de Acesso
  const cleanIdNum = transaction.id.replace(/\D/g, '').padEnd(8, '0').slice(0, 8);
  const chaveNfceRaw = `3526074589210200019865001000${cleanIdNum}1098234512`;
  const chaveFormatted = chaveNfceRaw.match(/.{1,4}/g)?.join(' ') || chaveNfceRaw;

  // Protocol & Serial Numbers
  const nfcNumber = `000.${cleanIdNum.slice(0, 3)}.${cleanIdNum.slice(3, 6)}`;
  const protocoloSefaz = `13526${cleanIdNum}9012`;

  // IBPT Taxes estimation (approx 18.45%)
  const impostosAprox = totalValue * 0.1845;

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
          className="relative z-10 w-full max-w-2xl bg-brand-secondary border border-brand-tertiary/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
          id="print-receipt-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-tertiary/60 px-5 py-4 bg-brand-bg/50" id="print-receipt-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-lg text-brand-neutral tracking-tight">
                  Impressão Termica - Nota Fiscal & Recibo
                </h2>
                <p className="text-xs text-gray-400 font-sans">
                  Configurado para Impressoras Térmicas (EPSON, Maquininhas de Cartão, POS)
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

          {/* Configuration Options Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-none" id="print-receipt-body">
            
            {/* Control Panel Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-bg/60 p-4 rounded-xl border border-brand-tertiary/40 text-xs">
              
              {/* Left Column: Tipo de Documento & Papel */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-primary mb-1">
                    Tipo de Documento:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDocType('nfce')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        docType === 'nfce'
                          ? 'bg-brand-primary text-black border-brand-primary'
                          : 'bg-brand-bg text-gray-400 border-brand-tertiary'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Nota Fiscal (NFC-e)
                    </button>

                    <button
                      type="button"
                      onClick={() => setDocType('comprovante')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        docType === 'comprovante'
                          ? 'bg-brand-primary text-black border-brand-primary'
                          : 'bg-brand-bg text-gray-400 border-brand-tertiary'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Cupom Simples
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-primary mb-1">
                    Largura da Bobina de Papel:
                  </label>
                  <select
                    value={paperWidth}
                    onChange={(e) => setPaperWidth(e.target.value as any)}
                    className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary font-mono"
                  >
                    <option value="58mm">58mm (Maquininha de Cartão / POS Compacta)</option>
                    <option value="80mm">80mm (Impressora EPSON TM-T20 / POS Padrão)</option>
                    <option value="a4">A4 (Folha Inteira de Impressão)</option>
                  </select>
                </div>
              </div>

              {/* Right Column: CPF, Pagamento & Código de Barras */}
              <div className="space-y-3">
                {docType === 'nfce' && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-primary mb-1">
                      CPF / CNPJ do Consumidor:
                    </label>
                    <input
                      type="text"
                      value={cpfConsumidor}
                      onChange={(e) => setCpfConsumidor(e.target.value)}
                      placeholder="CPF na nota (opcional)..."
                      className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-primary mb-1">
                    Forma de Pagamento:
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary"
                  >
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência Bancária">Transferência / Outros</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-brand-neutral cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBarcode}
                      onChange={(e) => setShowBarcode(e.target.checked)}
                      className="rounded accent-brand-primary"
                    />
                    <span>Código de Barras</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-neutral cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showQrCode}
                      onChange={(e) => setShowQrCode(e.target.checked)}
                      className="rounded accent-brand-primary"
                    />
                    <span>QR Code SEFAZ</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Live Thermal Receipt Visual Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Pré-visualização para Bobina Termica ({paperWidth})
                </span>
              </div>

              <div className="bg-gray-200 p-4 sm:p-6 rounded-2xl shadow-inner flex justify-center items-center border border-gray-400 overflow-x-auto">
                
                {/* Thermal Ticket simulation */}
                <div
                  className={`bg-white text-black p-4 font-mono shadow-xl border border-gray-400 space-y-3 transition-all ${
                    paperWidth === '58mm' ? 'w-[260px] text-[10px]' : paperWidth === '80mm' ? 'w-[320px] text-[11px]' : 'w-full max-w-md text-xs'
                  }`}
                  id="receipt-visual-box"
                >
                  
                  {/* Header / Store Info */}
                  <div className="text-center border-b border-black pb-2 space-y-0.5">
                    <h3 className="font-serif font-black text-sm tracking-widest uppercase">
                      MARENTO STORE LTDA
                    </h3>
                    <p className="text-[9px] font-sans font-bold">
                      CNPJ: 45.892.102/0001-98 | IE: 112.450.980
                    </p>
                    <p className="text-[8px] text-gray-700">
                      Av. Paulista, 1000 - São Paulo / SP
                    </p>

                    {docType === 'nfce' ? (
                      <div className="pt-1.5 border-t border-dashed border-gray-400 mt-1 font-bold text-[9px] uppercase tracking-wider">
                        DANFE NFC-e - Extrato da Nota Fiscal de Consumidor Eletrônica
                      </div>
                    ) : (
                      <div className="pt-1.5 border-t border-dashed border-gray-400 mt-1 font-bold text-[9px] uppercase tracking-wider">
                        {isSale ? '*** COMPROVANTE DE VENDA ***' : '*** COMPROVANTE DE ENTRADA ***'}
                      </div>
                    )}
                  </div>

                  {/* Customer Info for NFC-e */}
                  {docType === 'nfce' && (
                    <div className="text-[9px] border-b border-dashed border-gray-400 pb-1.5">
                      <span className="font-bold">CPF/CNPJ Consumidor:</span> {cpfConsumidor}
                    </div>
                  )}

                  {/* Items Header */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold border-b border-black pb-1 text-[9px]">
                      <span>ITEM / DESCRIÇÃO</span>
                      <span>TOTAL</span>
                    </div>

                    {/* Single Item Line */}
                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between font-bold">
                        <span className="truncate pr-1">{transaction.productName}</span>
                        <span>{formatCurrency(totalValue)}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-700">
                        <span>SKU: {transaction.sku}</span>
                        <span>{transaction.quantity} UN x {formatCurrency(unitPrice)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total & Payment */}
                  <div className="border-t-2 border-black pt-1.5 space-y-1">
                    <div className="flex justify-between font-extrabold text-xs">
                      <span>VALOR TOTAL R$:</span>
                      <span>{formatCurrency(totalValue)}</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span>FORMA DE PAGAMENTO:</span>
                      <span className="font-bold">{paymentMethod}</span>
                    </div>
                  </div>

                  {/* Tax estimation for NFC-e */}
                  {docType === 'nfce' && (
                    <div className="text-[8px] text-gray-600 border-t border-dashed border-gray-400 pt-1">
                      Trib Aprox: R$ {impostosAprox.toFixed(2)} (18.45% IBPT)
                    </div>
                  )}

                  {/* NFC-e Access Key & Sefaz Metadata */}
                  {docType === 'nfce' && (
                    <div className="text-[8px] border-t border-black pt-1.5 space-y-1 text-center font-mono">
                      <div className="font-bold">NFC-e Nº {nfcNumber} Série 1</div>
                      <div className="break-all text-[7.5px] font-semibold text-gray-800">
                        CHAVE DE ACESSO:<br />{chaveFormatted}
                      </div>
                      <div className="text-[7px] text-gray-600">
                        Protocolo de Autorização: {protocoloSefaz}<br />
                        Consulte via QR Code ou no site www.fazenda.sp.gov.br
                      </div>
                    </div>
                  )}

                  {/* Barcode / QR Code Display Section */}
                  <div className="pt-2 border-t border-dashed border-black flex flex-col items-center justify-center space-y-2">
                    {showBarcode && (
                      <BarcodeDisplay
                        text={transaction.sku || transaction.id}
                        type="code128"
                        height={34}
                        showText={true}
                      />
                    )}

                    {showQrCode && (
                      <div className="flex flex-col items-center pt-1">
                        <BarcodeDisplay
                          text={docType === 'nfce' ? `https://www.fazenda.sp.gov.br/nfce?ch=${chaveNfceRaw}` : transaction.id}
                          type="qrcode"
                          height={32}
                          showText={false}
                        />
                        <span className="text-[7.5px] font-sans text-gray-600 text-center mt-0.5">
                          {docType === 'nfce' ? 'Consulta via Leitor QR Code SEFAZ' : 'Código de Autenticação Marento'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-[8px] text-center font-sans text-gray-600 pt-1 border-t border-dashed border-gray-400">
                    Data: {transaction.date} &bull; Hora: {transaction.time}<br />
                    Obrigado pela preferência!
                  </div>

                </div>

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
              Imprimir na Impressora Térmica
            </button>
          </div>
        </motion.div>
      </div>

      {/* Hidden printable receipt only visible during window.print() */}
      <div
        id="printable-receipt-area"
        className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] text-black font-mono"
      >
        <div
          className={`mx-auto space-y-2 text-black ${
            paperWidth === '58mm' ? 'w-[56mm] text-[9px]' : paperWidth === '80mm' ? 'w-[76mm] text-[10px]' : 'max-w-md text-xs'
          }`}
        >
          {/* Print Header */}
          <div className="text-center border-b border-black pb-1 space-y-0.5">
            <h2 className="font-serif font-black text-sm uppercase">MARENTO STORE LTDA</h2>
            <p className="text-[8px]">CNPJ: 45.892.102/0001-98 | IE: 112.450.980</p>
            <p className="text-[8px]">Av. Paulista, 1000 - SP</p>

            {docType === 'nfce' ? (
              <p className="font-bold text-[9px] uppercase pt-1 border-t border-dashed border-black">
                DANFE NFC-e - Extrato da Nota Fiscal
              </p>
            ) : (
              <p className="font-bold text-[9px] uppercase pt-1 border-t border-dashed border-black">
                {isSale ? 'COMPROVANTE DE VENDA' : 'COMPROVANTE DE REPOSIÇÃO'}
              </p>
            )}
          </div>

          {docType === 'nfce' && (
            <div className="text-[8px] border-b border-dashed border-black pb-1">
              CPF Consumidor: {cpfConsumidor}
            </div>
          )}

          {/* Item */}
          <div className="text-left space-y-1 my-1">
            <div className="flex justify-between font-bold border-b border-black pb-0.5 text-[8px]">
              <span>PRODUTO</span>
              <span>TOTAL</span>
            </div>
            <div className="flex justify-between font-bold text-[9px]">
              <span>{transaction.productName}</span>
              <span>{formatCurrency(totalValue)}</span>
            </div>
            <div className="text-[8px]">
              SKU: {transaction.sku} | {transaction.quantity} UN x {formatCurrency(unitPrice)}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t-2 border-black pt-1 space-y-0.5 font-bold text-[10px]">
            <div className="flex justify-between">
              <span>TOTAL R$:</span>
              <span>{formatCurrency(totalValue)}</span>
            </div>
            <div className="flex justify-between text-[8px]">
              <span>PAGAMENTO:</span>
              <span>{paymentMethod}</span>
            </div>
          </div>

          {docType === 'nfce' && (
            <div className="text-[8px] border-t border-black pt-1 space-y-0.5 text-center">
              <div>NFC-e Nº {nfcNumber} Série 1</div>
              <div className="break-all text-[7px]">CHAVE: {chaveFormatted}</div>
              <div className="text-[7px]">Prot: {protocoloSefaz}</div>
            </div>
          )}

          {/* Codes */}
          <div className="pt-2 border-t border-dashed border-black flex flex-col items-center justify-center space-y-2">
            {showBarcode && (
              <BarcodeDisplay
                text={transaction.sku || transaction.id}
                type="code128"
                height={28}
                showText={true}
              />
            )}

            {showQrCode && (
              <BarcodeDisplay
                text={docType === 'nfce' ? `https://www.fazenda.sp.gov.br/nfce?ch=${chaveNfceRaw}` : transaction.id}
                type="qrcode"
                height={30}
                showText={false}
              />
            )}
          </div>

          <div className="text-[8px] text-center pt-1 border-t border-dashed border-black">
            {transaction.date} - {transaction.time}
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
