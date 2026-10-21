import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  User,
  Tag,
  Sparkles,
  Check,
  Plus,
  Upload,
  FolderOpen,
  X,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  Printer,
  Edit
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { generateUUID } from '../utils/uuid';
import { generateVariantCode, generateVariantBarcode } from '../utils/variantCode';
import { compressImageFile } from '../lib/imageUtils';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProduct?: (product: Product) => void;
  onOpenEdit?: (product: Product) => void;
  onOpenPrintTag?: (product: Product, variant?: ProductVariant) => void;
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onUpdateProduct,
  onOpenEdit,
  onOpenPrintTag,
}: ProductDetailModalProps) {
  const variants = product?.variants || [];
  const [selectedVariantId, setSelectedVariantId] = useState<string | 'main'>(
    variants.length > 0 ? variants[0].id : 'main'
  );

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

  if (!isOpen || !product) return null;

  const currentVariant = variants.find((v) => v.id === selectedVariantId);
  const heroImage =
    currentVariant?.imageUrl ||
    product.imageUrl ||
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80';

  const heroTag = currentVariant?.name || product.name;
  const heroStock = currentVariant ? currentVariant.quantity : product.quantity;

  const totalQuantity =
    variants.length > 0
      ? variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
      : product.quantity;

  const handleStartEdit = (v: ProductVariant) => {
    setSelectedVariantId(v.id);
    setEditVarName(v.name);
    setEditVarQty(v.quantity);
    setEditVarImage(v.imageUrl || '');
    setIsEditingVariant(true);
    setIsAddingNewVar(false);
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
    const uniqueCode = generateVariantCode(product.sku, variants.length, trimmedName, variants);
    const uniqueBarcode = generateVariantBarcode(product.sku, variants.length, trimmedName);

    const newVar: ProductVariant = {
      id: generateUUID(),
      name: trimmedName,
      quantity: Math.max(0, newVarQty),
      imageUrl:
        newVarImage.trim() ||
        product.imageUrl ||
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80',
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

    onUpdateProduct(updatedProduct);
    setSelectedVariantId(newVar.id);
    setNewVarName('');
    setNewVarQty(1);
    setNewVarImage('');
    setIsAddingNewVar(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew = false) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessingImage(true);
        const compressed = await compressImageFile(file, 800, 800, 0.82);
        if (isNew) {
          setNewVarImage(compressed);
        } else {
          setEditVarImage(compressed);
        }
      } catch (err: any) {
        console.error('Error compressing variant image:', err);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 overflow-y-auto"
        id="detalhes-overlay"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          id="detalhes-backdrop"
        />

        {/* Full Modal Window matching 'detalhes.png' */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className="relative z-10 w-full max-w-md bg-[#131315] border border-[#ffd56d]/20 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0 sm:max-h-[95vh]"
          id="detalhes-modal-window"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar with < Detalhes Da Peça and Quick Actions */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#131315]/80 backdrop-blur-sm sticky top-0 z-20">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-white hover:text-[#ffd56d] transition cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              <span className="font-serif font-bold text-lg text-white tracking-tight">
                Detalhes Da Peça
              </span>
            </button>

            <div className="flex items-center gap-2">
              {onOpenPrintTag && (
                <button
                  type="button"
                  onClick={() => onOpenPrintTag(product, currentVariant)}
                  className="p-2 rounded-full bg-[#1C1C1E] border border-white/10 text-[#ffd56d] hover:bg-[#ffd56d] hover:text-black transition cursor-pointer"
                  title="Imprimir Etiqueta"
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}
              {onOpenEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEdit(product);
                  }}
                  className="p-2 rounded-full bg-[#1C1C1E] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Editar dados gerais do produto"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              <div className="w-9 h-9 rounded-full bg-[#ffdf97] flex items-center justify-center text-[#251a00] shadow-md">
                <User className="w-5 h-5 fill-current" />
              </div>
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-none">
            {/* 1. Large Hero Image with floating pills */}
            <div className="space-y-3">
              <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden bg-black/80 border border-white/10 shadow-xl group">
                <img
                  src={heroImage}
                  alt={heroTag}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                {/* Floating Bottom-Left Pill: 🏷 TAG / VARIATION NAME */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-[#121214]/90 backdrop-blur-md border border-[#E5B842]/40 text-[#ffd56d] px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                  <Tag className="w-3.5 h-3.5 text-[#E5B842]" />
                  <span className="truncate max-w-[170px]">{heroTag}</span>
                </div>

                {/* Floating Bottom-Right Pill: 10 UN */}
                <div className="absolute bottom-3 right-3 bg-[#f6be39] text-[#261a00] px-3.5 py-1.5 rounded-full font-sans font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1">
                  <span>{heroStock}</span>
                  <span className="text-[10px] font-bold">UN</span>
                </div>
              </div>

              {/* Horizontal Thumbnail Strip */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none snap-x">
                {/* Main Product Thumbnail */}
                <button
                  type="button"
                  onClick={() => setSelectedVariantId('main')}
                  className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                    selectedVariantId === 'main'
                      ? 'border-[#E5B842] ring-2 ring-[#E5B842]/50 scale-105 shadow-md'
                      : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </button>

                {/* Variation Thumbnails */}
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                      selectedVariantId === v.id
                        ? 'border-[#E5B842] ring-2 ring-[#E5B842]/50 scale-105 shadow-md'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={v.imageUrl || product.imageUrl}
                      alt={v.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 2. CATÁLOGO ATELIER & Title & Price Header */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#D4A017] font-sans">
                  CATÁLOGO ATELIER
                </span>
                <span className="font-mono text-[11px] text-[#8E8E93] uppercase">
                  SKU: {product.sku}
                </span>
              </div>

              <h1 className="font-serif font-bold text-2xl text-white tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Price Row: R$ 50,00 + PREÇO UNITÁRIO FIXO pill */}
              <div className="flex items-center gap-3 pt-1">
                <span className="font-serif font-bold text-3xl text-[#ffd56d] tracking-tight">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#1C1C1E] border border-white/10 text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
                  PREÇO UNITÁRIO FIXO
                </span>
              </div>
            </div>

            {/* 3. Variations Selector Chips Grid */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4A017] flex items-center gap-1.5">
                  <span className="text-sm">❖</span> SELECIONE A VARIAÇÃO (COR / MODELO)
                </span>
                <span className="text-[11px] text-[#8E8E93]">
                  {variants.length} variantes
                </span>
              </div>

              {/* Grid of Variation Chips */}
              <div className="grid grid-cols-2 gap-2.5">
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
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                          <img
                            src={v.imageUrl || product.imageUrl}
                            alt={v.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate max-w-[85px]">
                            {v.name}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono text-amber-400 font-bold truncate max-w-[70px]">
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
                  className="flex items-center justify-center gap-2 p-2.5 rounded-2xl border border-dashed border-[#E5B842]/40 bg-[#141416] hover:bg-[#1C1C1E] text-[#ffd56d] transition cursor-pointer text-xs font-bold"
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
                <span className="font-bold text-white">
                  {currentVariant ? `${currentVariant.name} (${currentVariant.quantity} un)` : 'Geral (Base)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-[#8E8E93]">Estoque Total Somado:</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif font-bold text-xl text-[#ffd56d]">
                    {totalQuantity}
                  </span>
                  <span className="text-[10px] font-bold text-[#8E8E93] uppercase">UNID.</span>
                </div>
              </div>
            </div>

            {/* 5. EDITAR VARIAÇÃO SELECIONADA BOX (Matching 'detalhes.png') */}
            {isEditingVariant && currentVariant && (
              <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 space-y-3 animate-fade-in shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs font-sans">
                    <Edit2 className="w-4 h-4 text-[#ffd56d]" />
                    <span>Editar Variação Selecionada</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingVariant(false)}
                    className="text-[#8E8E93] hover:text-white"
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
                    className="w-full bg-[#141416] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017]">
                      QTD *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editVarQty}
                      onChange={(e) => setEditVarQty(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#141416] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#E5B842] text-center"
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
                              onChange={(e) => handleFileUpload(e, false)}
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
                      <label className="w-full py-2.5 px-2 bg-[#141416] border border-white/10 hover:border-[#ffd56d]/50 rounded-xl text-white text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer truncate">
                        <FolderOpen className="w-3.5 h-3.5 text-[#ffd56d] shrink-0" />
                        <span className="truncate">{isProcessingImage ? 'Carregando...' : 'Selecionar da Galeria'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, false)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Edit Actions: Excluir | Cancelar | Salvar */}
                <div className="flex items-center justify-between gap-2 pt-2">
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
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. NOVA VARIAÇÃO FORM (When user clicks ⊕ Nova Variação) */}
            {isAddingNewVar && (
              <form onSubmit={handleAddNewVariant} className="bg-[#1C1C1E] border border-[#E5B842]/40 rounded-2xl p-4 space-y-3 animate-fade-in shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs font-sans">
                    <Plus className="w-4 h-4 text-[#ffd56d]" />
                    <span>Adicionar Nova Variação</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewVar(false)}
                    className="text-[#8E8E93] hover:text-white"
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
                    placeholder="Ex: Rose Gold, Couro Preto..."
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    className="w-full bg-[#141416] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#E5B842]"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
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
                      FOTO DA VARIAÇÃO
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
                              onChange={(e) => handleFileUpload(e, true)}
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
                      <label className="w-full py-2.5 px-2 bg-[#141416] border border-white/10 hover:border-[#ffd56d]/50 rounded-xl text-white text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer truncate">
                        <FolderOpen className="w-3.5 h-3.5 text-[#ffd56d] shrink-0" />
                        <span className="truncate">{isProcessingImage ? 'Carregando...' : 'Selecionar da Galeria'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, true)}
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
          </div>

          {/* 7. Sticky Bottom Bar: Qtd. Total: 35 UN + Concluído Button */}
          <div className="sticky bottom-0 z-20 bg-[#131315]/95 backdrop-blur-md border-t border-white/10 px-5 py-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-[#8E8E93] tracking-wider">
                Qtd. Total:
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-serif font-black text-2xl text-[#ffd56d]">
                  {totalQuantity}
                </span>
                <span className="text-xs font-bold text-[#8E8E93] uppercase">UN</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-8 rounded-2xl bg-[#E5B842] hover:bg-[#ffd56d] text-[#121214] font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl transition cursor-pointer active:scale-98"
              id="btn-detalhes-concluido"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Concluído
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
