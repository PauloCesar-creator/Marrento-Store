import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  Tag,
  Check,
  Plus,
  FolderOpen,
  Camera,
  X,
  Edit2,
  Trash2,
  Printer,
  Edit,
  Sparkles,
  Layers,
  AlertTriangle,
  ShoppingBag
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { generateUUID } from '../utils/uuid';
import { generateVariantCode, generateVariantBarcode } from '../utils/variantCode';
import { compressImageFile, LUXURY_IMAGE_FALLBACK } from '../lib/imageUtils';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProduct?: (product: Product) => void;
  onOpenEdit?: (product: Product) => void;
  onOpenPrintTag?: (product: Product, variant?: ProductVariant) => void;
  onDeleteProduct?: (id: string) => void;
  onAddToCart?: (product: Product, variant?: ProductVariant) => void;
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onUpdateProduct,
  onOpenEdit,
  onOpenPrintTag,
  onDeleteProduct,
  onAddToCart,
}: ProductDetailModalProps) {
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const variants = product?.variants || [];
  const [selectedVariantId, setSelectedVariantId] = useState<string | 'main'>(
    variants.length > 0 ? variants[0].id : 'main'
  );

  // Sync selected variant when a different product is opened
  useEffect(() => {
    if (product) {
      const vars = product.variants || [];
      setSelectedVariantId(vars.length > 0 ? vars[0].id : 'main');
      setIsEditingVariant(false);
      setIsAddingNewVar(false);
      setIsConfirmingDelete(false);
    }
  }, [product?.id]);

  // Edit variation inline state
  const [isEditingVariant, setIsEditingVariant] = useState(false);
  const [editVarName, setEditVarName] = useState('');
  const [editVarQty, setEditVarQty] = useState<number>(0);
  const [editVarImage, setEditVarImage] = useState('');

  // Add new variation inline state
  const [isAddingNewVar, setIsAddingNewVar] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarQty, setNewVarQty] = useState<number>(1);
  const [newVarImage, setNewVarImage] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  // Delete product confirmation state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!isOpen || !product) return null;

  const currentVariant = variants.find((v) => v.id === selectedVariantId);
  const isBaseItem = selectedVariantId === 'main';

  const rawHeroImage =
    (!isBaseItem ? currentVariant?.imageUrl : null) ||
    product.imageUrl ||
    '';
  const heroImage = rawHeroImage.trim() ? rawHeroImage : LUXURY_IMAGE_FALLBACK;

  const heroTag = !isBaseItem && currentVariant ? currentVariant.name : product.name;
  const heroStock = !isBaseItem && currentVariant ? currentVariant.quantity : product.quantity;

  const totalQuantity =
    variants.length > 0
      ? variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
      : product.quantity;

  // Handle clicking the hero image: opens edit panel for base item or variant
  const handleHeroImageClick = () => {
    if (isBaseItem) {
      if (onOpenEdit) {
        onClose();
        onOpenEdit(product);
      }
    } else if (currentVariant) {
      handleStartEdit(currentVariant);
    }
  };

  const handleStartEdit = (v: ProductVariant) => {
    setSelectedVariantId(v.id);
    setEditVarName(v.name);
    setEditVarQty(v.quantity);
    setEditVarImage(v.imageUrl || '');
    setIsEditingVariant(true);
    setIsAddingNewVar(false);
    setTimeout(() => {
      scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleSaveEdit = () => {
    if (!editVarName.trim() || !onUpdateProduct) return;

    const updatedVariants = variants.map((v) => {
      if (v.id === selectedVariantId) {
        return {
          ...v,
          name: editVarName.trim(),
          quantity: Math.max(0, editVarQty),
          imageUrl: editVarImage.trim() || v.imageUrl,
        };
      }
      return v;
    });

    const newTotal = updatedVariants.reduce((sum, v) => sum + v.quantity, 0);

    const updatedProduct: Product = {
      ...product,
      variants: updatedVariants,
      quantity: newTotal,
    };

    onUpdateProduct(updatedProduct);
    setIsEditingVariant(false);
  };

  const handleDeleteVariant = (variantId: string) => {
    if (!onUpdateProduct) return;
    const updatedVariants = variants.filter((v) => v.id !== variantId);
    const newTotal = updatedVariants.reduce((sum, v) => sum + v.quantity, 0);
    const updatedProduct: Product = {
      ...product,
      variants: updatedVariants,
      quantity: newTotal,
    };
    onUpdateProduct(updatedProduct);
    setIsEditingVariant(false);
    setSelectedVariantId(updatedVariants.length > 0 ? updatedVariants[0].id : 'main');
  };

  const handleAddNewVariant = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newVarName.trim();
    if (!trimmedName) return;

    const uniqueCode = generateVariantCode(product.sku, variants.length, trimmedName, variants);
    const uniqueBarcode = generateVariantBarcode(product.sku, variants.length, trimmedName);

    const newVar: ProductVariant = {
      id: generateUUID(),
      name: trimmedName,
      quantity: Math.max(0, newVarQty),
      imageUrl: newVarImage.trim() || undefined,
      sku: uniqueCode,
      code: uniqueCode,
      barcode: uniqueBarcode,
    };

    const updatedVariants = [...variants, newVar];
    const newTotal = updatedVariants.reduce((sum, v) => sum + v.quantity, 0);

    const updatedProduct: Product = {
      ...product,
      variants: updatedVariants,
      quantity: newTotal,
    };

    if (onUpdateProduct) {
      onUpdateProduct(updatedProduct);
    }
    setSelectedVariantId(newVar.id);
    setNewVarName('');
    setNewVarQty(1);
    setNewVarImage('');
    setIsAddingNewVar(false);
  };

  // Mobile camera / gallery file upload handler
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'newVar' | 'editVar' | 'mainProduct'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      setImageError('');
      const compressed = await compressImageFile(file, 640, 640, 0.78);

      if (target === 'newVar') {
        setNewVarImage(compressed);
      } else if (target === 'editVar') {
        setEditVarImage(compressed);
      } else if (target === 'mainProduct') {
        if (onUpdateProduct) {
          onUpdateProduct({
            ...product,
            imageUrl: compressed,
          });
        }
      }
    } catch (err: any) {
      console.error('Error compressing variant image:', err);
      setImageError(err.message || 'Falha ao processar imagem.');
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  const handleConfirmDeleteProduct = () => {
    if (onDeleteProduct) {
      onDeleteProduct(product.id);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        id="detalhes-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
          id="detalhes-backdrop"
        />

        {/* Modal Window: stops propagation so clicking inside does not close */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className="relative z-10 w-full max-w-lg bg-[#131315] border border-[#ffd56d]/30 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden my-auto"
          id="detalhes-modal-window"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar with Clear Header and High-Contrast Action Buttons */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#131315]/95 backdrop-blur-md sticky top-0 z-30 shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-white hover:text-[#ffd56d] transition cursor-pointer group"
              title="Voltar / Fechar"
            >
              <div className="p-1 rounded-lg group-hover:bg-white/10 transition">
                <ChevronLeft className="w-5 h-5 text-[#ffd56d]" />
              </div>
              <span className="font-serif font-bold text-base sm:text-lg text-white tracking-tight">
                Detalhes da Peça
              </span>
            </button>

            {/* Top Right Quick Actions: Editar + Imprimir + Fechar (X) */}
            <div className="flex items-center gap-2">
              {onOpenEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEdit(product);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ffd56d]/15 hover:bg-[#ffd56d] text-[#ffd56d] hover:text-black border border-[#ffd56d]/40 font-bold text-xs transition cursor-pointer shadow-sm active:scale-95"
                  title="Editar informações gerais do produto"
                  id="btn-detalhes-editar-topo"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Editar</span>
                </button>
              )}

              {onOpenPrintTag && (
                <button
                  type="button"
                  onClick={() => onOpenPrintTag(product, currentVariant)}
                  className="p-2 rounded-xl bg-[#1C1C1E] border border-white/10 text-[#ffd56d] hover:bg-[#ffd56d] hover:text-black transition cursor-pointer shadow-sm"
                  title="Imprimir Etiqueta"
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}

              {/* Explicit Close Button (X) */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white transition cursor-pointer"
                title="Fechar janela"
                aria-label="Fechar"
                id="btn-detalhes-fechar-topo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div ref={scrollBodyRef} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
            
            {/* TOP: EDITAR VARIAÇÃO SELECIONADA PANEL (Rápida edição no topo) */}
            {isEditingVariant && currentVariant && (
              <div className="bg-[#1C1C1E] border-2 border-[#E5B842] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm font-sans">
                    <div className="w-7 h-7 rounded-lg bg-[#E5B842]/20 border border-[#E5B842]/40 flex items-center justify-center text-[#ffd56d] shrink-0">
                      <Edit2 className="w-4 h-4" />
                    </div>
                    <span>Editar Variação: <strong className="text-[#ffd56d]">{currentVariant.name}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingVariant(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-white transition cursor-pointer"
                    title="Fechar edição"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017]">
                    NOME DO MODELO / COR *
                  </label>
                  <input
                    type="text"
                    value={editVarName}
                    onChange={(e) => setEditVarName(e.target.value)}
                    className="w-full bg-[#141416] border border-white/15 focus:border-[#E5B842] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017]">
                      QUANTIDADE *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editVarQty}
                      onChange={(e) => setEditVarQty(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#141416] border border-white/15 focus:border-[#E5B842] rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white focus:outline-none text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017]">
                      FOTO DA VARIAÇÃO
                    </label>
                    {editVarImage ? (
                      <div className="flex items-center gap-2 p-1.5 bg-[#141416] border border-[#ffd56d]/30 rounded-xl">
                        <img
                          src={editVarImage}
                          alt="Prévia da variação"
                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] text-[#ffd56d] font-bold hover:underline flex items-center gap-1 cursor-pointer truncate">
                            <FolderOpen className="w-3 h-3 shrink-0" />
                            <span className="truncate">Trocar Foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'editVar')}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditVarImage('')}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold px-1"
                          title="Remover foto"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="w-full py-2.5 px-3 bg-[#141416] border border-white/15 hover:border-[#ffd56d]/50 rounded-xl text-white text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
                        <Camera className="w-3.5 h-3.5 text-[#ffd56d] shrink-0" />
                        <span>{isProcessingImage ? 'Compactando...' : 'Carregar Foto da Galeria'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'editVar')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {imageError && (
                  <p className="text-red-400 text-[11px] font-medium">{imageError}</p>
                )}

                {/* Edit Actions: Excluir | Cancelar | Salvar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleDeleteVariant(selectedVariantId)}
                    className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-red-500/20"
                    title="Excluir esta variação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingVariant(false)}
                      className="px-4 py-2 rounded-xl bg-[#141416] text-[#8E8E93] hover:text-white text-xs font-bold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-6 py-2 rounded-xl bg-[#E5B842] hover:bg-[#ffd56d] text-[#121214] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Large Hero Image - CLICKING ANY PART OPENS EDIT PANEL (Base or Variant) */}
            <div className="space-y-3">
              <div
                onClick={handleHeroImageClick}
                className="relative w-full h-64 sm:h-76 rounded-2xl overflow-hidden bg-black/90 border border-white/10 shadow-xl group cursor-pointer"
                title={isBaseItem ? 'Toque na imagem para editar o produto base' : `Toque na imagem para editar a variação ${currentVariant?.name}`}
              >
                <img
                  src={heroImage}
                  alt={heroTag}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105 pointer-events-none"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = LUXURY_IMAGE_FALLBACK;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                {/* Edit hint banner on hover/tap - Apenas estético */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md border border-[#ffd56d]/40 text-[#ffd56d] px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow pointer-events-none">
                  <Edit2 className="w-3 h-3 text-[#ffd56d]" />
                  <span>{isBaseItem ? 'Toque para editar produto base' : 'Toque para editar variante'}</span>
                </div>

                {/* Floating Bottom-Left Pill: 🏷 TAG / VARIATION NAME */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-[#121214]/90 backdrop-blur-md border border-[#E5B842]/50 text-[#ffd56d] px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg max-w-[65%] pointer-events-none">
                  <Tag className="w-3.5 h-3.5 text-[#E5B842] shrink-0" />
                  <span className="truncate">{heroTag}</span>
                </div>

                {/* Floating Bottom-Right Pill: Quantity */}
                <div className="absolute bottom-3 right-3 bg-[#f6be39] text-[#261a00] px-3.5 py-1.5 rounded-full font-sans font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1 pointer-events-none">
                  <span>{heroStock}</span>
                  <span className="text-[10px] font-bold">UN</span>
                </div>

                {/* Floating Top-Right: Camera icon - APENAS ESTÉTICO (sem clique independente) */}
                <div className="absolute top-3 right-3 p-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-[#ffd56d] shadow-lg flex items-center gap-1.5 text-xs font-bold pointer-events-none">
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Foto</span>
                </div>
              </div>

              {/* Horizontal Thumbnail Strip */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none snap-x">
                {/* Main Product Thumbnail */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVariantId('main');
                    setIsEditingVariant(false);
                  }}
                  className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer bg-black/60 ${
                    selectedVariantId === 'main'
                      ? 'border-[#E5B842] ring-2 ring-[#E5B842]/50 scale-105 shadow-md'
                      : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                  title="Visão Geral (Base)"
                >
                  <img
                    src={product.imageUrl || LUXURY_IMAGE_FALLBACK}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = LUXURY_IMAGE_FALLBACK;
                    }}
                  />
                </button>

                {/* Variation Thumbnails */}
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      setIsEditingVariant(false);
                    }}
                    className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer bg-black/60 ${
                      selectedVariantId === v.id
                        ? 'border-[#E5B842] ring-2 ring-[#E5B842]/50 scale-105 shadow-md'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                    title={v.name}
                  >
                    <img
                      src={v.imageUrl || product.imageUrl || LUXURY_IMAGE_FALLBACK}
                      alt={v.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = LUXURY_IMAGE_FALLBACK;
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Brand & SKU & Title & Price Header */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#D4A017] font-sans flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5B842] inline-block" />
                  {product.category || 'ESTOQUE MARENTO'}
                </span>
                <span className="font-mono text-[11px] text-[#8E8E93] uppercase">
                  SKU: {product.sku}
                </span>
              </div>

              <h1 className="font-serif font-bold text-xl sm:text-2xl text-white tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Price & Supplier */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif font-bold text-2xl sm:text-3xl text-[#ffd56d] tracking-tight">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#1C1C1E] border border-white/10 text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
                    PREÇO UNITÁRIO FIXO
                  </span>
                </div>

                {product.supplier && (
                  <span className="text-xs text-gray-400">
                    Fornecedor: <strong className="text-gray-200">{product.supplier}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* 3. Variations Selector Chips Grid */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4A017] flex items-center gap-1.5">
                  <span>◆</span> SELECIONE A VARIAÇÃO (COR / MODELO)
                </span>
                <span className="text-[11px] text-[#8E8E93]">
                  {variants.length} {variants.length === 1 ? 'variação' : 'variações'}
                </span>
              </div>

              {/* Grid of Variation Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {variants.map((v) => {
                  const isSelected = selectedVariantId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        handleStartEdit(v);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#1C1C1E] border-1.5 border-[#E5B842] shadow-md ring-1 ring-[#E5B842]/40'
                          : 'bg-[#1C1C1E]/80 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                          <img
                            src={v.imageUrl || product.imageUrl || LUXURY_IMAGE_FALLBACK}
                            alt={v.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = LUXURY_IMAGE_FALLBACK;
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {v.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-mono text-amber-400 font-bold truncate">
                              {v.code || v.sku || 'VAR'}
                            </span>
                            <span className="text-[9px] text-[#8E8E93]">&bull;</span>
                            <span className={`text-[10px] font-mono ${isSelected ? 'text-[#ffd56d] font-bold' : 'text-[#8E8E93]'}`}>
                              {v.quantity} un
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full border-1.5 border-[#ffd56d] flex items-center justify-center text-[#ffd56d] shrink-0 ml-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Nova Variação Chip Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewVar(true);
                    setIsEditingVariant(false);
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-[#E5B842]/40 bg-[#141416] hover:bg-[#1C1C1E] text-[#ffd56d] transition cursor-pointer text-xs font-bold"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Nova Variação</span>
                </button>
              </div>
            </div>

            {/* 4. Stock Summary Strip */}
            <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8E8E93]">Variação Ativa:</span>
                <span className="font-bold text-white truncate max-w-[200px] bg-[#222227] px-2.5 py-1 rounded-md border border-[#2c2c36]">
                  {currentVariant ? `${currentVariant.name} (${currentVariant.quantity} un)` : 'Geral (Base)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-[#8E8E93]">Estoque Total Somado:</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif font-bold text-xl text-[#ffd56d]">
                    {totalQuantity}
                  </span>
                  <span className="text-[10px] font-bold text-[#8E8E93] uppercase">UNID.</span>
                </div>
              </div>
            </div>


            {/* 6. NOVA VARIAÇÃO FORM */}
            {isAddingNewVar && (
              <form onSubmit={handleAddNewVariant} className="bg-[#1C1C1E] border border-[#E5B842]/40 rounded-2xl p-4 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs font-sans">
                    <Plus className="w-4 h-4 text-[#ffd56d]" />
                    <span>Adicionar Nova Variação</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewVar(false)}
                    className="p-1 text-[#8E8E93] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017]">
                    NOME DA COR / MODELO *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Rose Gold, Couro Preto, Tamanho M..."
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    className="w-full bg-[#141416] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#E5B842]"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017]">
                      QUANTIDADE *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newVarQty}
                      onChange={(e) => setNewVarQty(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#141416] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#E5B842] text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017]">
                      FOTO DA VARIAÇÃO (OPCIONAL)
                    </label>
                    {newVarImage ? (
                      <div className="flex items-center gap-2 p-1.5 bg-[#141416] border border-[#ffd56d]/30 rounded-xl">
                        <img
                          src={newVarImage}
                          alt="Prévia da nova variação"
                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] text-[#ffd56d] font-bold hover:underline flex items-center gap-1 cursor-pointer truncate">
                            <FolderOpen className="w-3 h-3 shrink-0" />
                            <span className="truncate">Trocar Foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'newVar')}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewVarImage('')}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold px-1"
                          title="Remover foto"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="w-full py-2.5 px-3 bg-[#141416] border border-white/10 hover:border-[#ffd56d]/50 rounded-xl text-white text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
                        <Camera className="w-3.5 h-3.5 text-[#ffd56d] shrink-0" />
                        <span>{isProcessingImage ? 'Compactando...' : 'Foto da Câmera / Galeria'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'newVar')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewVar(false)}
                    className="px-4 py-2 rounded-xl bg-[#141416] text-[#8E8E93] hover:text-white text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-[#E5B842] hover:bg-[#ffd56d] text-[#121214] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    Adicionar
                  </button>
                </div>
              </form>
            )}

            {/* 7. DANGER ZONE: EXCLUIR PRODUTO DO ACERVO */}
            <div className="pt-2 border-t border-white/5">
              {isConfirmingDelete ? (
                <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 space-y-2.5">
                  <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Confirmar exclusão deste produto do estoque?</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    O produto será removido do acervo. O histórico de movimentações e vendas anteriores será preservado.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteProduct}
                      className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
                      id="btn-confirm-delete-product"
                    >
                      Sim, Excluir Produto
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
                  id="btn-trigger-delete-product"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Produto do Estoque</span>
                </button>
              )}
            </div>
          </div>

          {/* 8. Sticky Bottom Bar: Stock Summary + Both "Editar Produto" and "Fechar" buttons */}
          <div className="sticky bottom-0 z-30 bg-[#131315]/95 backdrop-blur-md border-t border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 gap-3">
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-[#8E8E93] tracking-wider">
                Qtd. Total:
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-serif font-black text-xl sm:text-2xl text-[#ffd56d]">
                  {totalQuantity}
                </span>
                <span className="text-xs font-bold text-[#8E8E93] uppercase">UN</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {onAddToCart && (
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product, currentVariant);
                    onClose();
                  }}
                  className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl bg-[#ffd56d]/15 hover:bg-[#ffd56d] text-[#ffd56d] hover:text-black font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-[#ffd56d]/30 transition cursor-pointer active:scale-98"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Vender</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 sm:py-3 px-5 sm:px-7 rounded-xl bg-[#E5B842] hover:bg-[#ffd56d] text-[#121214] font-sans font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xl transition cursor-pointer active:scale-98"
                id="btn-detalhes-concluido"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Concluído</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
