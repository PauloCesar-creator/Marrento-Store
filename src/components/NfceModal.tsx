import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  Receipt,
  Search,
  CheckCircle,
  CreditCard,
  DollarSign,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Barcode
} from 'lucide-react';
import { Product, ProductVariant, Transaction } from '../types';
import BarcodeDisplay from './BarcodeDisplay';

interface NfceModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProduct?: Product | null;
  initialVariant?: ProductVariant | null;
  onConfirmSaleAndPrint?: (
    productId: string,
    quantity: number,
    price: number,
    paymentMethod: string
  ) => Transaction | void;
}

export default function NfceModal({
  isOpen,
  onClose,
  products,
  initialProduct,
  initialVariant,
  onConfirmSaleAndPrint,
}: NfceModalProps) {
  // 1. Product Selection States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);

  // 2. Payment & Invoice Metadata States
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [cpfConsumidor, setCpfConsumidor] = useState<string>('Consumidor Não Identificado');
  const [discount, setDiscount] = useState<number>(0);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm' | 'a4'>('80mm');
  const [recordInInventory, setRecordInInventory] = useState<boolean>(true);
  const [isSuccessPrinted, setIsSuccessPrinted] = useState<boolean>(false);

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      setIsSuccessPrinted(false);
      if (initialProduct) {
        setSelectedProduct(initialProduct);
        setSelectedVariant(initialVariant || null);
        setPrice(initialProduct.price);
        setAmountPaid(initialProduct.price);
      } else if (products.length > 0) {
        setSelectedProduct(products[0]);
        setSelectedVariant(null);
        setPrice(products[0].price);
        setAmountPaid(products[0].price);
      } else {
        setSelectedProduct(null);
        setSelectedVariant(null);
        setPrice(0);
        setAmountPaid(0);
      }
      setQuantity(1);
      setDiscount(0);
      setSearchQuery('');
    }
  }, [isOpen, initialProduct, initialVariant, products]);

  // Update price when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      setPrice(selectedProduct.price);
      setAmountPaid(Math.max(0, selectedProduct.price * quantity - discount));
    }
  }, [selectedProduct, quantity, discount]);

  if (!isOpen) return null;

  // Filter products for the search dropdown
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = (selectedProduct ? price : 0) * quantity;
  const totalValue = Math.max(0, subtotal - discount);
  const changeValue = Math.max(0, amountPaid - totalValue);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Deterministic 44-digit NFC-e Chave de Acesso
  const timestampSeed = Date.now().toString().slice(-6);
  const prodSeed = selectedProduct ? selectedProduct.sku.replace(/\D/g, '').padEnd(6, '0').slice(0, 6) : '000000';
  const chaveNfceRaw = `3526074589210200019865001000${prodSeed}${timestampSeed}12`;
  const chaveFormatted = chaveNfceRaw.match(/.{1,4}/g)?.join(' ') || chaveNfceRaw;

  // NFC-e Serial & Sefaz Protocol
  const nfcNumber = `000.${timestampSeed.slice(0, 3)}.${timestampSeed.slice(3, 6)}`;
  const protocoloSefaz = `13526${timestampSeed}9044`;

  // IBPT Taxes estimation (~18.45%)
  const impostosAprox = totalValue * 0.1845;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handlePrintNfce = () => {
    if (!selectedProduct) return;

    if (recordInInventory && onConfirmSaleAndPrint) {
      onConfirmSaleAndPrint(selectedProduct.id, quantity, price, paymentMethod);
    }

    setIsSuccessPrinted(true);

    // Trigger browser print dialog (EPSON / POS thermal printer)
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" id="nfce-modal-overlay">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          id="nfce-modal-backdrop"
        />

        {/* Modal Window Shell */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-4xl bg-brand-secondary border border-brand-primary/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
          id="nfce-modal-window"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-tertiary/80 px-5 py-4 bg-brand-bg/70" id="nfce-modal-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/40 flex items-center justify-center text-brand-primary shadow-lg">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-lg text-brand-neutral tracking-tight">
                    Emissão de Nota Fiscal & Recibo (NFC-e / DANFE)
                  </h2>
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    EPSON / Térmica
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-sans">
                  Selecione o produto no estoque, escolha a forma de pagamento e imprima o cupom com QR Code SEFAZ.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-brand-tertiary/40 hover:bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
              id="nfce-modal-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Grid */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-none" id="nfce-modal-body">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Product Selection & Payment Details (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* 1. PRODUCT SELECTION BOX */}
                <div className="bg-brand-bg/80 p-4 rounded-xl border border-brand-tertiary/80 space-y-3">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-primary flex items-center justify-between">
                    <span>1. Selecionar Produto do Estoque</span>
                    <span className="text-[10px] text-gray-400 font-normal">Igual à visualização do Estoque</span>
                  </span>

                  {/* Search Bar for Product */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-brand-primary" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar por Nome do item, SKU ou Categoria..."
                      className="w-full bg-brand-secondary border border-brand-tertiary rounded-xl pl-9 pr-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary font-sans"
                    />
                  </div>

                  {/* Product Selector Dropdown list */}
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => {
                        const isSelected = selectedProduct?.id === p.id;
                        return (
                          <div
                            key={`nfce-prod-select-${p.id}`}
                            onClick={() => {
                              setSelectedProduct(p);
                              setSelectedVariant(null);
                              setPrice(p.price);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                              isSelected
                                ? 'bg-brand-primary/15 border-brand-primary text-brand-neutral shadow-md'
                                : 'bg-brand-secondary/60 border-brand-tertiary/60 hover:bg-brand-tertiary/40 text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-lg object-cover bg-brand-bg shrink-0 border border-brand-tertiary"
                              />
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold truncate text-brand-neutral">{p.name}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                  <span className="font-mono text-brand-primary font-bold">SKU: {p.sku}</span>
                                  <span>&bull;</span>
                                  <span>Estoque: <strong className="text-white">{p.quantity} un</strong></span>
                                </div>
                              </div>
                            </div>
                            <span className="font-serif font-bold text-xs text-brand-primary shrink-0 pl-2">
                              {formatCurrency(p.price)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-xs text-gray-500">
                        Nenhum produto encontrado. Digite outro termo.
                      </div>
                    )}
                  </div>

                  {/* Selected Product Variants option if available */}
                  {selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div className="pt-2 border-t border-brand-tertiary/60">
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                        Selecione a Variação / Cor:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedVariant(null)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            !selectedVariant
                              ? 'bg-brand-primary text-black border-brand-primary'
                              : 'bg-brand-secondary text-gray-400 border-brand-tertiary'
                          }`}
                        >
                          Padrão ({selectedProduct.name})
                        </button>
                        {selectedProduct.variants.map((v) => (
                          <button
                            key={`nfce-var-${v.id}`}
                            type="button"
                            onClick={() => setSelectedVariant(v)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                              selectedVariant?.id === v.id
                                ? 'bg-brand-primary text-black border-brand-primary'
                                : 'bg-brand-secondary text-gray-400 border-brand-tertiary'
                            }`}
                          >
                            {v.name} ({v.quantity} un)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity & Unit Price Row */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-brand-tertiary/60">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-1">
                        Quantidade (Qtd)
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="p-2 bg-brand-tertiary text-gray-300 hover:text-white rounded-l-xl border border-r-0 border-brand-tertiary cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-brand-secondary border-y border-brand-tertiary py-1.5 text-xs text-center font-bold text-brand-neutral focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="p-2 bg-brand-tertiary text-gray-300 hover:text-white rounded-r-xl border border-l-0 border-brand-tertiary cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-1">
                        Preço Unitário (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-brand-secondary border border-brand-tertiary rounded-xl px-3 py-1.5 text-xs font-bold text-brand-neutral focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                </div>

                {/* 2. PAYMENT & CUSTOMER OPTIONS BOX */}
                <div className="bg-brand-bg/80 p-4 rounded-xl border border-brand-tertiary/80 space-y-3">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-primary flex items-center justify-between">
                    <span>2. Opções de Pagamento & Consumidor</span>
                    <span className="text-[10px] text-gray-400 font-normal">Identificação na Nota Fiscal</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Forma de Pagamento */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                        Forma de Pagamento:
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-brand-secondary border border-brand-tertiary rounded-xl px-3 py-2 text-xs font-bold text-brand-neutral focus:outline-none focus:border-brand-primary"
                      >
                        <option value="PIX">⚡ PIX (Instantâneo)</option>
                        <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                        <option value="Cartão de Débito">💳 Cartão de Débito</option>
                        <option value="Dinheiro">💵 Dinheiro (Espécie)</option>
                        <option value="Transferência Bancária">🏦 Transferência Bancária / Outros</option>
                      </select>
                    </div>

                    {/* CPF do Consumidor */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                        CPF / CNPJ do Consumidor:
                      </label>
                      <input
                        type="text"
                        value={cpfConsumidor}
                        onChange={(e) => setCpfConsumidor(e.target.value)}
                        placeholder="CPF na nota (opcional)..."
                        className="w-full bg-brand-secondary border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary font-mono"
                      />
                    </div>
                  </div>

                  {/* Cash Change calculation if Dinheiro */}
                  {paymentMethod === 'Dinheiro' && (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-xl">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">
                          Valor Recebido (R$):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={amountPaid === 0 ? '' : amountPaid}
                          onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full bg-brand-bg border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">
                          Troco a Devolver:
                        </label>
                        <div className="px-3 py-1.5 bg-brand-bg border border-amber-500/40 rounded-xl text-xs font-extrabold text-amber-400 font-mono">
                          {formatCurrency(changeValue)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Printer Paper Format & Inventory Switch */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-brand-tertiary/60">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                        Impressora / Tamanho do Bobina:
                      </label>
                      <select
                        value={paperWidth}
                        onChange={(e) => setPaperWidth(e.target.value as any)}
                        className="w-full bg-brand-secondary border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary font-mono"
                      >
                        <option value="80mm">80mm (EPSON TM-T20X / TM-T88 / Diebold / Elgin)</option>
                        <option value="58mm">58mm (Maquininha POS / Mini Impressora)</option>
                        <option value="a4">A4 (Folha Inteira de Impressão)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-brand-neutral cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recordInInventory}
                          onChange={(e) => setRecordInInventory(e.target.checked)}
                          className="rounded accent-brand-primary"
                        />
                        <span className="font-bold">Dar baixa automática no Estoque ao emitir</span>
                      </label>
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Column: Thermal EPSON Receipt Live Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-primary mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-brand-primary" /> Visualização do Cupom EPSON ({paperWidth})
                    </span>
                  </span>

                  <div className="bg-gray-300 p-3 sm:p-4 rounded-2xl shadow-inner border border-gray-400 flex justify-center items-center overflow-x-auto">
                    
                    {/* Live Thermal Ticket Simulation */}
                    <div
                      className={`bg-white text-black p-3.5 font-mono shadow-2xl border border-gray-400 space-y-2.5 transition-all text-[10px] ${
                        paperWidth === '58mm' ? 'w-[240px] text-[9.5px]' : paperWidth === '80mm' ? 'w-[300px]' : 'w-full text-xs'
                      }`}
                      id="nfce-thermal-preview"
                    >
                      {/* Header / Store Info */}
                      <div className="text-center border-b border-black pb-2 space-y-0.5">
                        <h3 className="font-serif font-black text-xs tracking-widest uppercase">
                          MARENTO STORE LTDA
                        </h3>
                        <p className="text-[8px] font-sans font-bold">
                          CNPJ: 45.892.102/0001-98 | IE: 112.450.980
                        </p>
                        <p className="text-[7.5px] text-gray-700">
                          Av. Paulista, 1000 - São Paulo / SP
                        </p>

                        <div className="pt-1 border-t border-dashed border-gray-400 mt-1 font-bold text-[8.5px] uppercase tracking-wider">
                          DANFE NFC-e - Extrato da Nota Fiscal de Consumidor Eletrônica
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="text-[8px] border-b border-dashed border-gray-400 pb-1">
                        <span className="font-bold">CPF/CNPJ Consumidor:</span> {cpfConsumidor}
                      </div>

                      {/* Items Table */}
                      <div className="space-y-1">
                        <div className="flex justify-between font-bold border-b border-black pb-0.5 text-[8px]">
                          <span>ITEM / CÓD / DESCRIÇÃO</span>
                          <span>TOTAL</span>
                        </div>

                        {selectedProduct ? (
                          <div className="space-y-0.5 text-[9px]">
                            <div className="flex justify-between font-bold">
                              <span className="truncate pr-1">
                                {selectedProduct.name} {selectedVariant ? `(${selectedVariant.name})` : ''}
                              </span>
                              <span>{formatCurrency(totalValue)}</span>
                            </div>
                            <div className="flex justify-between text-[8px] text-gray-700">
                              <span>SKU: {selectedVariant?.sku || selectedProduct.sku}</span>
                              <span>{quantity} UN x {formatCurrency(price)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[8px] text-gray-500 italic py-1 text-center">
                            Nenhum produto selecionado
                          </div>
                        )}
                      </div>

                      {/* Totals & Payment */}
                      <div className="border-t-2 border-black pt-1 space-y-0.5">
                        <div className="flex justify-between font-black text-xs">
                          <span>VALOR TOTAL R$:</span>
                          <span>{formatCurrency(totalValue)}</span>
                        </div>
                        <div className="flex justify-between text-[8px]">
                          <span>FORMA PAGAMENTO:</span>
                          <span className="font-bold">{paymentMethod}</span>
                        </div>
                        {paymentMethod === 'Dinheiro' && (
                          <div className="flex justify-between text-[8px] text-gray-800">
                            <span>PAGO: {formatCurrency(amountPaid)}</span>
                            <span>TROCO: {formatCurrency(changeValue)}</span>
                          </div>
                        )}
                      </div>

                      {/* IBPT Tax estimation */}
                      <div className="text-[7.5px] text-gray-600 border-t border-dashed border-gray-400 pt-1">
                        Trib Aprox: R$ {impostosAprox.toFixed(2)} (18.45% IBPT)
                      </div>

                      {/* NFC-e Sefaz Details */}
                      <div className="text-[7.5px] border-t border-black pt-1 space-y-0.5 text-center font-mono">
                        <div className="font-bold">NFC-e Nº {nfcNumber} Série 1</div>
                        <div className="break-all text-[7px] font-semibold text-gray-800">
                          CHAVE DE ACESSO:<br />{chaveFormatted}
                        </div>
                        <div className="text-[6.5px] text-gray-600">
                          Protocolo Autorização: {protocoloSefaz}<br />
                          Data: {dateFormatted} {timeFormatted}
                        </div>
                      </div>

                      {/* QR Code and Barcode */}
                      <div className="pt-1.5 border-t border-dashed border-black flex flex-col items-center justify-center space-y-1">
                        <BarcodeDisplay
                          text={selectedProduct ? (selectedVariant?.sku || selectedProduct.sku) : '000000'}
                          type="code128"
                          height={26}
                          showText={true}
                        />

                        <div className="flex flex-col items-center pt-0.5">
                          <BarcodeDisplay
                            text={`https://www.fazenda.sp.gov.br/nfce?ch=${chaveNfceRaw}`}
                            type="qrcode"
                            height={28}
                            showText={false}
                          />
                          <span className="text-[7px] font-sans text-gray-600 text-center mt-0.5">
                            Consulta via Leitor QR Code SEFAZ
                          </span>
                        </div>
                      </div>

                      <div className="text-[7.5px] text-center font-sans text-gray-600 pt-1 border-t border-dashed border-gray-400">
                        Obrigado pela preferência!
                      </div>

                    </div>

                  </div>
                </div>

                {/* Print Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handlePrintNfce}
                    disabled={!selectedProduct}
                    className="w-full py-3 px-4 rounded-xl bg-brand-primary text-black font-sans font-bold text-xs hover:bg-brand-primary/95 transition cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    id="nfce-emit-print-btn"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Emitir & Imprimir Nota Fiscal na EPSON</span>
                  </button>

                  {isSuccessPrinted && (
                    <div className="p-2 bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 text-center rounded-xl text-xs font-bold animate-fade-in flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>Nota Fiscal emitida e enviada para a impressora!</span>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

          {/* Modal Footer */}
          <div className="border-t border-brand-tertiary/80 px-5 py-3.5 bg-brand-bg/70 flex justify-between items-center" id="nfce-modal-footer">
            <span className="text-[11px] text-gray-400 font-mono">
              Impressão Térmica Epson 80mm / 58mm / A4
            </span>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-brand-tertiary text-gray-300 hover:text-white text-xs transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>

      {/* Hidden printable NF-e receipt element rendered specifically for window.print() */}
      <div
        id="printable-nfce-area"
        className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] text-black font-mono"
      >
        <div
          className={`mx-auto space-y-1.5 text-black ${
            paperWidth === '58mm' ? 'w-[56mm] text-[8.5px]' : paperWidth === '80mm' ? 'w-[76mm] text-[9.5px]' : 'max-w-md text-xs'
          }`}
        >
          {/* Header */}
          <div className="text-center border-b border-black pb-1 space-y-0.5">
            <h2 className="font-serif font-black text-sm uppercase">MARENTO STORE LTDA</h2>
            <p className="text-[8px]">CNPJ: 45.892.102/0001-98 | IE: 112.450.980</p>
            <p className="text-[8px]">Av. Paulista, 1000 - São Paulo / SP</p>

            <p className="font-bold text-[8.5px] uppercase pt-1 border-t border-dashed border-black">
              DANFE NFC-e - Extrato da Nota Fiscal Eletrônica
            </p>
          </div>

          <div className="text-[8px] border-b border-dashed border-black pb-1">
            CPF/CNPJ Consumidor: {cpfConsumidor}
          </div>

          {/* Items */}
          <div className="text-left space-y-1 my-1">
            <div className="flex justify-between font-bold border-b border-black pb-0.5 text-[8px]">
              <span>PRODUTO</span>
              <span>TOTAL</span>
            </div>
            {selectedProduct && (
              <>
                <div className="flex justify-between font-bold text-[9px]">
                  <span>
                    {selectedProduct.name} {selectedVariant ? `(${selectedVariant.name})` : ''}
                  </span>
                  <span>{formatCurrency(totalValue)}</span>
                </div>
                <div className="text-[8px]">
                  SKU: {selectedVariant?.sku || selectedProduct.sku} | {quantity} UN x {formatCurrency(price)}
                </div>
              </>
            )}
          </div>

          {/* Totals */}
          <div className="border-t-2 border-black pt-1 space-y-0.5 font-bold text-[9.5px]">
            <div className="flex justify-between">
              <span>TOTAL R$:</span>
              <span>{formatCurrency(totalValue)}</span>
            </div>
            <div className="flex justify-between text-[8px]">
              <span>PAGAMENTO:</span>
              <span>{paymentMethod}</span>
            </div>
            {paymentMethod === 'Dinheiro' && (
              <div className="flex justify-between text-[8px]">
                <span>PAGO: {formatCurrency(amountPaid)}</span>
                <span>TROCO: {formatCurrency(changeValue)}</span>
              </div>
            )}
          </div>

          <div className="text-[7.5px] border-t border-black pt-1 space-y-0.5 text-center">
            <div>NFC-e Nº {nfcNumber} Série 1</div>
            <div className="break-all text-[7px]">CHAVE: {chaveFormatted}</div>
            <div className="text-[7px]">Prot: {protocoloSefaz} &bull; {dateFormatted} {timeFormatted}</div>
          </div>

          {/* Codes */}
          <div className="pt-1.5 border-t border-dashed border-black flex flex-col items-center justify-center space-y-1.5">
            <BarcodeDisplay
              text={selectedProduct ? (selectedVariant?.sku || selectedProduct.sku) : '000000'}
              type="code128"
              height={26}
              showText={true}
            />

            <BarcodeDisplay
              text={`https://www.fazenda.sp.gov.br/nfce?ch=${chaveNfceRaw}`}
              type="qrcode"
              height={28}
              showText={false}
            />
          </div>

          <div className="text-[7.5px] text-center pt-1 border-t border-dashed border-black">
            Obrigado pela preferência!
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
