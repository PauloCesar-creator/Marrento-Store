import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  RefreshCw,
  FolderOpen,
  Link as LinkIcon,
  Watch,
  Plus,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Product, CategoryName } from '../types';

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Omit<Product, 'id' | 'salesCount' | 'createdAt'>) => void;
  categories: string[];
  suppliers: string[];
  onAddCategory: (name: string) => void;
  onAddSupplier?: (name: string) => void;
  editingProduct?: Product | null;
  onEditProduct?: (product: Product) => void;
}

export default function NewItemModal({
  isOpen,
  onClose,
  onAddProduct,
  categories,
  suppliers,
  onAddCategory,
  onAddSupplier,
  editingProduct,
  onEditProduct,
}: NewItemModalProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<CategoryName>('');
  const [supplier, setSupplier] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [minStock, setMinStock] = useState<number>(5);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Inline Category Creator
  const [isTypingNewCat, setIsTypingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Helper to generate SKU
  const generateSku = (catName?: string) => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const catCode = (catName || category || 'RE').slice(0, 2).toUpperCase();
    return `SK-${randomNum}-${catCode}`;
  };

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setSku(editingProduct.sku);
      setCategory(editingProduct.category);
      setSupplier(editingProduct.supplier);
      setCostPrice(editingProduct.costPrice || 0);
      setPrice(editingProduct.price || 0);
      setQuantity(editingProduct.quantity || 0);
      setMinStock(editingProduct.minStock || 5);
      setImageUrl(editingProduct.imageUrl || '');
      setDescription(editingProduct.description || '');
      setError('');
    } else {
      setName('');
      const defaultCat = categories[0] || 'Relógios';
      setCategory(defaultCat);
      setSupplier(suppliers[0] || 'Paris Fragrances Group');
      setSku(generateSku(defaultCat));
      setCostPrice(0);
      setPrice(0);
      setQuantity(1);
      setMinStock(5);
      setImageUrl('');
      setDescription('');
      setError('');
    }
  }, [editingProduct, isOpen, categories, suppliers]);

  if (!isOpen) return null;

  // Calculate profit margin percentage
  const calculateMargin = () => {
    if (costPrice > 0 && price > 0) {
      const margin = ((price - costPrice) / costPrice) * 100;
      return `${margin >= 0 ? '+' : ''}${margin.toFixed(2)}%`;
    }
    return '+0.00%';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCategory = () => {
    const clean = newCatName.trim();
    if (clean) {
      onAddCategory(clean);
      setCategory(clean);
      setNewCatName('');
      setIsTypingNewCat(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Informe o nome do item.');
      return;
    }

    if (!sku.trim()) {
      setError('Informe o código SKU.');
      return;
    }

    if (price <= 0 && costPrice <= 0) {
      setError('Informe o preço de venda ou valor gasto do item.');
      return;
    }

    const finalPrice = price > 0 ? price : costPrice;
    const finalCost = costPrice > 0 ? costPrice : price;
    const finalImg =
      imageUrl.trim() ||
      'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80';

    if (editingProduct && onEditProduct) {
      onEditProduct({
        ...editingProduct,
        name: name.trim(),
        sku: sku.trim(),
        category,
        supplier: supplier || 'Direto com Fabricante',
        price: finalPrice,
        costPrice: finalCost,
        quantity,
        minStock,
        imageUrl: finalImg,
        description: description.trim(),
      });
    } else {
      onAddProduct({
        name: name.trim(),
        sku: sku.trim(),
        category: category || 'Geral',
        supplier: supplier || 'Direto com Fabricante',
        price: finalPrice,
        costPrice: finalCost,
        quantity,
        minStock,
        imageUrl: finalImg,
        description: description.trim(),
      });
    }

    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        id="new-item-overlay"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          id="new-item-backdrop"
        />

        {/* Modal Window matching 'novo-item.jpeg' */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="relative z-10 w-full max-w-md bg-[#131315] border border-[#ffd56d]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
          id="new-item-modal-window"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Gold Accent Bar and Title */}
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full bg-[#E5B842] shrink-0" />
              <h2 className="font-serif font-bold text-xl text-white tracking-tight">
                {editingProduct ? 'Editar Item do Acervo' : 'Cadastrar Novo Item'}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-white/5 flex items-center justify-center text-[#8E8E93] hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 overflow-y-auto flex-1 scrollbar-none">
            {/* PRÉ-VISUALIZAÇÃO DO ACERVO Box */}
            <div className="bg-[#141416] border border-[#E5B842]/20 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0">
                <img
                  src={
                    imageUrl ||
                    'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80'
                  }
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  PRÉ-VISUALIZAÇÃO DO ACERVO
                </span>
                <p className="font-bold text-xs text-white truncate">
                  {name.trim() || 'Novo Item Não Nomeado'}
                </p>
                <p className="text-[10px] text-[#4ADE80] font-mono font-bold">
                  Lucro estimado: {calculateMargin()}
                </p>
              </div>
            </div>

            {/* Field: NOME DO ITEM * */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <label className="font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  NOME DO ITEM *
                </label>
                <span className="text-[#8E8E93]">Obrigatório</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ex: Rolex Submariner Date"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#141416] border border-white/10 rounded-xl px-3.5 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E5B842] pr-9"
                />
                <Watch className="absolute right-3 top-3.5 w-4 h-4 text-[#8E8E93]" />
              </div>
            </div>

            {/* Field: SKU (CÓDIGO ÚNICO) * */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <label className="font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  SKU (CÓDIGO ÚNICO) *
                </label>
                <span className="text-[#8E8E93] uppercase tracking-wider">GERADO PELO COFRE</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SK-819-RE"
                  className="flex-1 bg-[#141416] border border-white/10 rounded-xl px-3.5 py-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#E5B842]"
                />
                <button
                  type="button"
                  onClick={() => setSku(generateSku())}
                  className="w-11 h-11 rounded-xl bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-[#ffd56d] hover:bg-[#2A2A2C] transition cursor-pointer shrink-0"
                  title="Gerar novo código SKU"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Field: CATEGORIA * */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                CATEGORIA *
              </label>

              {isTypingNewCat ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Nome da categoria..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 bg-[#141416] border border-[#E5B842] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveCategory}
                    className="px-3 bg-[#E5B842] text-black text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTypingNewCat(false)}
                    className="px-3 bg-[#1C1C1E] text-gray-400 text-xs rounded-xl cursor-pointer"
                  >
                    X
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 bg-[#141416] border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#E5B842]"
                  >
                    {categories.map((cat, idx) => (
                      <option key={`cat-${cat}-${idx}`} value={cat} className="bg-[#141416] text-white">
                        {cat}
                      </option>
                    ))}
                    {categories.length === 0 && (
                      <option value="Geral" className="bg-[#141416] text-white">Geral</option>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsTypingNewCat(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#1C1C1E] border border-[#E5B842]/40 text-[#ffd56d] text-xs font-bold hover:bg-[#2A2A2C] transition cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova
                  </button>
                </div>
              )}
            </div>

            {/* Field: FORNECEDOR * */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                FORNECEDOR *
              </label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-[#141416] border border-white/10 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-[#E5B842]"
              >
                {suppliers.map((sup, idx) => (
                  <option key={`sup-${sup}-${idx}`} value={sup} className="bg-[#141416] text-white">
                    {sup}
                  </option>
                ))}
                {suppliers.length === 0 && (
                  <option value="Direto com Fabricante" className="bg-[#141416] text-white">
                    Direto com Fabricante
                  </option>
                )}
              </select>
            </div>

            {/* Row: VALOR GASTO (R$) | PREÇO VENDA (R$) * */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  VALOR GASTO (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice === 0 ? '' : costPrice}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full bg-[#141416] border border-white/10 rounded-xl px-3.5 py-3 text-xs font-serif font-bold text-white focus:outline-none focus:border-[#E5B842] text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  PREÇO VENDA (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price === 0 ? '' : price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full bg-[#141416] border border-[#E5B842]/50 rounded-xl px-3.5 py-3 text-xs font-serif font-bold text-[#ffd56d] focus:outline-none focus:border-[#E5B842] text-center"
                />
              </div>
            </div>

            {/* Row: QTD INICIAL | ESTOQUE MÍN * */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  QTD INICIAL
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#141416] border border-white/10 rounded-xl px-3.5 py-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#E5B842] text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  ESTOQUE MÍN *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={minStock}
                  onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#141416] border border-white/10 rounded-xl px-3.5 py-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#E5B842] text-center"
                />
              </div>
            </div>

            {/* Field: IMAGEM DO PRODUTO (ARQUIVO / LINK) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <label className="font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  IMAGEM DO PRODUTO (ARQUIVO / LINK)
                </label>
                <span className="text-[#8E8E93] uppercase tracking-wider">ALTA RESOLUÇÃO</span>
              </div>

              {/* Gallery button */}
              <label className="w-full py-3 px-4 bg-[#141416] border border-white/10 hover:border-[#E5B842]/40 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                <FolderOpen className="w-4 h-4 text-[#ffd56d]" />
                <span>Selecionar Foto da Galeria</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* URL input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ou cole o link da imagem (Unsplash)..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-[#141416] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E5B842]"
                />
                <LinkIcon className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8E8E93]" />
              </div>
            </div>

            {/* Field: DESCRIÇÃO DO PRODUTO */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <label className="font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  DESCRIÇÃO DO PRODUTO
                </label>
                <span className="text-[#8E8E93] uppercase tracking-wider">NOTAS DO CURADOR</span>
              </div>
              <textarea
                rows={3}
                placeholder="Incorpore detalhes como materiais nobres, acabamentos e diferenciais..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#141416] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E5B842] leading-relaxed resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Bottom Actions: Cancelar | Confirmar Cadastro */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3.5 rounded-2xl bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="flex-1 py-3.5 px-6 rounded-2xl bg-[#E5B842] hover:bg-[#ffd56d] text-[#121214] font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition cursor-pointer active:scale-98"
                id="btn-confirmar-cadastro"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                {editingProduct ? 'Salvar Alterações' : 'Confirmar Cadastro'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
