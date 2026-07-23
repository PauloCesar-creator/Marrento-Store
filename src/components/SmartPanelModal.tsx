import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Edit,
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Upload,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { Product, ProductVariant } from '../types';

interface SmartPanelModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProduct: (updatedProduct: Product) => void;
}

export default function SmartPanelModal({
  product,
  isOpen,
  onClose,
  onUpdateProduct,
}: SmartPanelModalProps) {
  // Variations state
  const variants = product.variants || [];

  // Active variation or main product selected in carousel
  const [selectedVariantId, setSelectedVariantId] = useState<string | 'main'>(
    variants.length > 0 ? variants[0].id : 'main'
  );

  // Form state for adding a new variation
  const [newVarName, setNewVarName] = useState('');
  const [newVarQty, setNewVarQty] = useState<number>(10);
  const [newVarImage, setNewVarImage] = useState('');
  const [editingVarId, setEditingVarId] = useState<string | null>(null);
  const [editVarName, setEditVarName] = useState('');
  const [editVarQty, setEditVarQty] = useState<number>(0);
  const [editVarImage, setEditVarImage] = useState('');
  const [deletingVarId, setDeletingVarId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Carousel scroll ref
  const carouselRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Selected item details (variant or main product)
  const currentVariant = variants.find((v) => v.id === selectedVariantId);
  const displayImage = currentVariant?.imageUrl || product.imageUrl;
  const displayName = currentVariant?.name || 'Visão Geral (Produto Base)';
  const displayStock = currentVariant ? currentVariant.quantity : product.quantity;

  // Calculate total quantity from all variations (or default product qty if no variants)
  const totalQuantity =
    variants.length > 0
      ? variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
      : product.quantity;

  const totalProductValue = product.price * totalQuantity;

  // Handle local image file upload for new variation
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit = false
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (isEdit) {
            setEditVarImage(reader.result);
          } else {
            setNewVarImage(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add new variation
  const handleAddVariant = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = newVarName.trim();
    if (!trimmedName) {
      setErrorMsg('Por favor, informe o nome ou cor da variação.');
      return;
    }

    if (newVarQty < 0) {
      setErrorMsg('A quantidade não pode ser negativa.');
      return;
    }

    const newVariant: ProductVariant = {
      id: `var-${Date.now()}`,
      name: trimmedName,
      quantity: newVarQty,
      imageUrl:
        newVarImage.trim() ||
        product.imageUrl ||
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80',
      sku: `${product.sku}-${trimmedName.slice(0, 3).toUpperCase()}`,
    };

    const updatedVariants = [...variants, newVariant];
    const newTotalQuantity = updatedVariants.reduce((sum, v) => sum + v.quantity, 0);

    const updatedProduct: Product = {
      ...product,
      variants: updatedVariants,
      quantity: newTotalQuantity,
    };

    onUpdateProduct(updatedProduct);

    // Select the newly created variant
    setSelectedVariantId(newVariant.id);

    // Reset form
    setNewVarName('');
    setNewVarQty(10);
    setNewVarImage('');
  };

  // Quick edit variation
  const handleStartEdit = (v: ProductVariant) => {
    setEditingVarId(v.id);
    setEditVarName(v.name);
    setEditVarQty(v.quantity);
    setEditVarImage(v.imageUrl || '');
  };

  const handleSaveEdit = (variantId: string) => {
    if (!editVarName.trim()) return;

    const updatedVariants = variants.map((v) => {
      if (v.id === variantId) {
        return {
          ...v,
          name: editVarName.trim(),
          quantity: editVarQty,
          imageUrl: editVarImage.trim() || v.imageUrl,
        };
      }
      return v;
    });

    const newTotalQuantity = updatedVariants.reduce((sum, v) => sum + v.quantity, 0);

    onUpdateProduct({
      ...product,
      variants: updatedVariants,
      quantity: newTotalQuantity,
    });

    setEditingVarId(null);
  };

  // Delete variation
  const handleDeleteVariant = (variantId: string) => {
    const updatedVariants = variants.filter((v) => v.id !== variantId);
    const newTotalQuantity =
      updatedVariants.length > 0
        ? updatedVariants.reduce((sum, v) => sum + v.quantity, 0)
        : product.quantity;

    onUpdateProduct({
      ...product,
      variants: updatedVariants,
      quantity: newTotalQuantity,
    });

    if (selectedVariantId === variantId) {
      setSelectedVariantId(updatedVariants.length > 0 ? updatedVariants[0].id : 'main');
    }

    setDeletingVarId(null);
  };

  // Adjust variation quantity directly
  const handleQuickQtyChange = (variantId: string, delta: number) => {
    const updatedVariants = variants.map((v) => {
      if (v.id === variantId) {
        const nextQty = Math.max(0, v.quantity + delta);
        return { ...v, quantity: nextQty };
      }
      return v;
    });

    const newTotalQuantity = updatedVariants.reduce((sum, v) => sum + v.quantity, 0);

    onUpdateProduct({
      ...product,
      variants: updatedVariants,
      quantity: newTotalQuantity,
    });
  };

  // Carousel scroll helpers
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -180 : 180;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" id="smart-panel-overlay">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          id="smart-panel-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-4xl bg-brand-secondary border border-brand-tertiary/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
          id="smart-panel-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-tertiary/60 px-5 py-4 bg-brand-bg/50" id="smart-panel-header">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-lg text-brand-neutral tracking-tight">
                    Painel Inteligente - Variações
                  </h2>
                  <span className="bg-brand-primary/20 text-brand-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand-primary/30 uppercase tracking-wider">
                    {variants.length} {variants.length === 1 ? 'Variação' : 'Variações'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-sans">
                  {product.name} &bull; <span className="font-mono text-brand-primary font-medium">{product.sku}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-brand-tertiary/40 hover:bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
              id="smart-panel-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1 scrollbar-none" id="smart-panel-body">
            
            {/* Top Section: Shopee-Style Carousel + Product Preview */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start bg-brand-bg/60 p-4 rounded-2xl border border-brand-tertiary/40" id="smart-panel-preview-area">
              
              {/* Left Column: Big Main Image Preview & Thumbnail Carousel */}
              <div className="md:col-span-6 space-y-3">
                {/* Large Main Image Display */}
                <div className="relative h-64 sm:h-72 w-full rounded-xl overflow-hidden bg-black/60 border border-brand-tertiary/60 group shadow-inner flex items-center justify-center">
                  <img
                    src={displayImage}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    id="smart-panel-main-img"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Selected Variation Badge on image */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                    <span className="bg-black/80 backdrop-blur-md text-brand-neutral font-bold px-3 py-1.5 rounded-lg border border-brand-primary/40 flex items-center gap-1.5 shadow-md">
                      <Tag className="w-3.5 h-3.5 text-brand-primary" />
                      {displayName}
                    </span>
                    <span className="bg-brand-primary text-black font-bold font-mono px-2.5 py-1 rounded-lg text-xs shadow-md">
                      {displayStock} UN
                    </span>
                  </div>
                </div>

                {/* Shopee-style Horizontal Thumbnail Carousel */}
                <div className="relative flex items-center gap-1" id="shopee-carousel-wrapper">
                  <button
                    onClick={() => scrollCarousel('left')}
                    className="p-1 rounded-lg bg-brand-tertiary/80 hover:bg-brand-primary hover:text-black text-brand-neutral transition shadow cursor-pointer shrink-0"
                    title="Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div
                    ref={carouselRef}
                    className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none snap-x flex-1 scroll-smooth"
                    id="shopee-carousel-thumbnails"
                  >
                    {/* Main Base Image option */}
                    <button
                      onClick={() => setSelectedVariantId('main')}
                      className={`relative shrink-0 snap-start w-14 h-14 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                        selectedVariantId === 'main'
                          ? 'border-brand-primary ring-2 ring-brand-primary/50 scale-105'
                          : 'border-brand-tertiary opacity-70 hover:opacity-100'
                      }`}
                      title="Visão Geral do Produto Base"
                    >
                      <img
                        src={product.imageUrl}
                        alt="Base"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-center font-bold text-gray-300 py-0.5 truncate">
                        Base
                      </span>
                    </button>

                    {/* Variations list thumbnails */}
                    {variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`relative shrink-0 snap-start w-14 h-14 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                          selectedVariantId === v.id
                            ? 'border-brand-primary ring-2 ring-brand-primary/50 scale-105'
                            : 'border-brand-tertiary opacity-70 hover:opacity-100'
                        }`}
                        title={v.name}
                      >
                        <img
                          src={v.imageUrl || product.imageUrl}
                          alt={v.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-center font-bold text-brand-primary py-0.5 truncate px-0.5">
                          {v.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => scrollCarousel('right')}
                    className="p-1 rounded-lg bg-brand-tertiary/80 hover:bg-brand-primary hover:text-black text-brand-neutral transition shadow cursor-pointer shrink-0"
                    title="Próximo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right Column: Shopee-Style Color/Variation Pills + Stock Summary */}
              <div className="md:col-span-6 space-y-4 flex flex-col justify-between h-full">
                <div>
                  <h3 className="font-serif font-bold text-base text-brand-neutral">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-serif font-bold text-xl text-brand-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-brand-tertiary/50 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      Preço Unitário Fixo
                    </span>
                  </div>

                  {/* Shopee-Style Variation Pills Selector */}
                  <div className="mt-4 space-y-2">
                    <label className="block text-[10px] font-sans font-bold uppercase tracking-wider text-brand-primary">
                      Selecione a Variação (Cor / Modelo):
                    </label>
                    <div className="flex flex-wrap gap-2" id="shopee-variation-pills">
                      {variants.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">
                          Nenhuma variação criada ainda. Adicione uma abaixo!
                        </p>
                      ) : (
                        variants.map((v) => {
                          const isSelected = selectedVariantId === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVariantId(v.id)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition cursor-pointer ${
                                isSelected
                                  ? 'bg-brand-primary/20 border-brand-primary text-brand-neutral font-bold ring-1 ring-brand-primary'
                                  : 'bg-brand-secondary border-brand-tertiary text-gray-300 hover:border-brand-primary/50'
                              }`}
                            >
                              <div className="w-5 h-5 rounded-md overflow-hidden bg-black shrink-0 border border-brand-tertiary">
                                <img
                                  src={v.imageUrl || product.imageUrl}
                                  alt={v.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span>{v.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                ({v.quantity} un)
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock Stats Summary Box */}
                <div className="bg-brand-secondary/90 border border-brand-tertiary p-3.5 rounded-xl space-y-2 mt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-sans">Variação Selecionada:</span>
                    <span className="font-bold text-brand-neutral font-mono">{displayName} ({displayStock} un)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-brand-tertiary/40">
                    <span className="text-gray-400 font-sans">Estoque Total Somado:</span>
                    <span className="font-bold text-brand-primary font-mono text-sm">{totalQuantity} UNID.</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-brand-tertiary/40">
                    <span className="text-gray-400 font-sans">Valor Total em Estoque:</span>
                    <span className="font-serif font-bold text-brand-primary text-sm">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProductValue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Form to Add a New Variation */}
            <div className="bg-brand-bg/40 border border-brand-tertiary/60 p-4 rounded-2xl space-y-3" id="add-variant-section">
              <div className="flex items-center gap-2 border-b border-brand-tertiary/40 pb-2">
                <Plus className="w-4 h-4 text-brand-primary" />
                <h4 className="font-serif font-bold text-sm text-brand-neutral">
                  Adicionar Nova Variação / Cor
                </h4>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-brand-red/15 border border-brand-red/40 text-brand-red text-xs">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleAddVariant} className="grid grid-cols-1 sm:grid-cols-12 gap-3" id="add-variant-form">
                {/* Variant Name */}
                <div className="sm:col-span-5 space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-brand-primary">
                    Nome / Cor da Variação *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Botão de Ouro, Preto-Ultra9, Rosa..."
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary placeholder-gray-500"
                    required
                  />
                </div>

                {/* Variant Quantity */}
                <div className="sm:col-span-3 space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-brand-primary">
                    Quantidade em Estoque *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newVarQty}
                    onChange={(e) => setNewVarQty(Number(e.target.value))}
                    className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral font-mono font-bold focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                {/* Variant Image URL / File Upload */}
                <div className="sm:col-span-4 space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-brand-primary">
                    Foto da Variação
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="URL da Imagem..."
                      value={newVarImage}
                      onChange={(e) => setNewVarImage(e.target.value)}
                      className="flex-1 bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary placeholder-gray-500"
                    />
                    <label className="px-3 py-2 bg-brand-tertiary hover:bg-brand-primary hover:text-black text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <div className="sm:col-span-12 flex justify-end pt-1">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-primary text-black font-sans font-bold text-xs hover:bg-brand-primary/95 transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    Cadastrar Variação (Soma no Estoque)
                  </button>
                </div>
              </form>
            </div>

            {/* Section 3: Existing Variations List & Management */}
            <div className="space-y-3" id="variants-list-section">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-sm text-brand-neutral flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-primary" />
                  Variações Cadastradas ({variants.length})
                </h4>
                <span className="text-[10px] text-gray-500 font-sans">
                  A quantidade total do produto é calculada automaticamente
                </span>
              </div>

              {variants.length === 0 ? (
                <div className="text-center py-8 bg-brand-bg/20 rounded-2xl border border-dashed border-brand-tertiary text-gray-500 text-xs">
                  Nenhuma variação adicionada a este produto. Cadastre variações no formulário acima.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="variants-grid">
                  {variants.map((v) => {
                    const isEditing = editingVarId === v.id;
                    const isSelected = selectedVariantId === v.id;

                    return (
                      <div
                        key={v.id}
                        className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-brand-primary/10 border-brand-primary'
                            : 'bg-brand-bg/40 border-brand-tertiary/60 hover:border-brand-tertiary'
                        }`}
                      >
                        {isEditing ? (
                          /* Edit mode for variation */
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editVarName}
                              onChange={(e) => setEditVarName(e.target.value)}
                              placeholder="Nome da Variação"
                              className="w-full bg-brand-bg border border-brand-primary rounded-lg px-2.5 py-1.5 text-xs text-brand-neutral focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                value={editVarQty}
                                onChange={(e) => setEditVarQty(Number(e.target.value))}
                                placeholder="Qtd"
                                className="w-24 bg-brand-bg border border-brand-primary rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-brand-neutral focus:outline-none"
                              />
                              <input
                                type="text"
                                value={editVarImage}
                                onChange={(e) => setEditVarImage(e.target.value)}
                                placeholder="URL Imagem"
                                className="flex-1 bg-brand-bg border border-brand-primary rounded-lg px-2.5 py-1.5 text-xs text-brand-neutral focus:outline-none"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(v.id)}
                                className="px-3 py-1 bg-brand-primary text-black rounded-lg text-xs font-bold hover:bg-brand-primary/90 transition cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingVarId(null)}
                                className="px-3 py-1 bg-brand-tertiary text-gray-300 rounded-lg text-xs hover:text-white transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Normal View mode */
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-brand-tertiary">
                                <img
                                  src={v.imageUrl || product.imageUrl}
                                  alt={v.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <h5 className="font-bold text-xs text-brand-neutral flex items-center gap-1.5">
                                  {v.name}
                                  {isSelected && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
                                  )}
                                </h5>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  Estoque: <strong className="text-brand-primary">{v.quantity} un</strong>
                                </span>
                              </div>
                            </div>

                            {/* Actions & Qty Stepper */}
                            <div className="flex items-center gap-1.5">
                              {/* Quantity Stepper */}
                              <div className="flex items-center bg-brand-bg rounded-lg border border-brand-tertiary p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickQtyChange(v.id, -1)}
                                  className="p-1 hover:bg-brand-secondary text-brand-red rounded cursor-pointer"
                                  title="Diminuir quantidade"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-mono font-bold px-1.5 text-brand-neutral min-w-[18px] text-center">
                                  {v.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuickQtyChange(v.id, 1)}
                                  className="p-1 hover:bg-brand-secondary text-brand-green rounded cursor-pointer"
                                  title="Aumentar quantidade"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Edit & Delete Buttons */}
                              <button
                                type="button"
                                onClick={() => handleStartEdit(v)}
                                className="p-1.5 rounded-lg bg-brand-bg hover:bg-brand-tertiary text-gray-400 hover:text-brand-primary transition cursor-pointer"
                                title="Editar variação"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {deletingVarId === v.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVariant(v.id)}
                                    className="px-2 py-1 rounded bg-brand-red text-white text-[10px] font-bold hover:bg-brand-red/90 transition cursor-pointer"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingVarId(null)}
                                    className="px-2 py-1 rounded bg-brand-tertiary text-gray-300 text-[10px] transition cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingVarId(v.id)}
                                  className="p-1.5 rounded-lg bg-brand-bg hover:bg-brand-red/10 text-gray-400 hover:text-brand-red transition cursor-pointer"
                                  title="Excluir variação"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-brand-tertiary/60 px-5 py-3.5 bg-brand-bg/50 flex justify-between items-center" id="smart-panel-footer">
            <div className="text-xs text-gray-400">
              Quantidade Total: <strong className="text-brand-primary font-mono">{totalQuantity} un</strong>
            </div>
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
