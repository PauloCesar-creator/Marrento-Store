import React, { useState } from 'react';
import { Camera, Check, Upload, ArrowUpRight, Shield, AlertCircle, Sparkles } from 'lucide-react';
import { Product, CategoryName, Transaction } from '../types';

interface EntryFormViewProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'salesCount' | 'createdAt'>) => void;
  onRecordTransaction: (
    productId: string,
    type: 'entrada' | 'saida',
    quantity: number,
    price: number
  ) => void;
  transactions: Transaction[];
  suppliers: string[];
  onAddSupplier: (name: string) => void;
  categories: string[];
  onAddCategory: (name: string) => void;
}

export default function EntryFormView({
  products,
  onAddProduct,
  onRecordTransaction,
  transactions,
  suppliers,
  onAddSupplier,
  categories,
  onAddCategory,
}: EntryFormViewProps) {
  // Form states
  const [supplier, setSupplier] = useState('');
  const [category, setCategory] = useState<CategoryName>(categories[0] || '');
  const [quantity, setQuantity] = useState<number>(0);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isTypingNewCat, setIsTypingNewCat] = useState(false);
  const [newCustomCategoryName, setNewCustomCategoryName] = useState('');
  const [isTypingNewSup, setIsTypingNewSup] = useState(false);
  const [newCustomSupplierName, setNewCustomSupplierName] = useState('');

  // Handle local file uploads (converts file to Base64)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Keep category in sync when categories list loads or updates
  React.useEffect(() => {
    if (!category && categories.length > 0) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  // Built-in presets for luxury item photos to choose from instantly
  const presetImages = {
    'Relógios': 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80',
    'Pulseiras': 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80',
    'Joias': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80',
    'Perfumes': 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=600&q=80',
    'Carteiras': 'https://images.unsplash.com/photo-1627124118317-4e359f4bc53c?auto=format&fit=crop&w=600&q=80',
    'Acessórios': 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80'
  };

  const getPresetPhoto = (catName: string) => {
    const key = catName as keyof typeof presetImages;
    return presetImages[key] || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80';
  };

  const handlePresetPhoto = () => {
    setImageUrl(getPresetPhoto(category));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplier) {
      setError('Selecione um fornecedor.');
      return;
    }
    if (!category) {
      setError('Selecione uma categoria.');
      return;
    }
    if (quantity <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }
    if (!name.trim()) {
      setError('Insira o nome do item.');
      return;
    }
    if (price <= 0) {
      setError('O valor unitário deve ser maior que zero.');
      return;
    }

    setError('');

    // Check if product with this exact name already exists
    const existingProduct = products.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    );

    let targetProductId = '';

    if (existingProduct) {
      // Record transaction on existing product
      onRecordTransaction(existingProduct.id, 'entrada', quantity, price);
      targetProductId = existingProduct.id;
    } else {
      // Auto-generate SKU
      const randomSku = `SK-${Math.floor(100 + Math.random() * 900)}-${category ? category.slice(0, 2).toUpperCase() : 'XX'}`;
      
      // Create new product in list
      const defaultImg = imageUrl.trim() || getPresetPhoto(category);
      
      onAddProduct({
        name: name.trim(),
        sku: randomSku,
        category,
        price,
        quantity, // will start with this quantity
        minStock: 5, // default
        supplier,
        description: `Produto importado por ${supplier} na categoria ${category}.`,
        imageUrl: defaultImg,
      });
    }

    setSuccessMsg('Entrada registrada com sucesso! Estoque atualizado.');
    
    // Clear form
    setQuantity(0);
    setName('');
    setPrice(0);
    setImageUrl('');

    // Clear success message after 4 seconds
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Filter out recent inputs/entries
  const entriesHistory = transactions.filter((tx) => tx.type === 'entrada');

  // Format currencies nicely
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  return (
    <div className="space-y-6 pb-24" id="entry-form-root">
      
      {/* Page headers */}
      <div className="space-y-1" id="entry-form-title-group">
        <h2 className="font-serif font-semibold text-2xl text-brand-neutral tracking-tight">
          Entrada de Itens
        </h2>
        <p className="text-xs text-gray-500 font-sans">
          Registre novos produtos ou reponha o acervo de luxo.
        </p>
      </div>

      {/* Main Entry Panel Layout (Form and Image side by side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="entry-form-grid-layout">
        
        {/* Form area */}
        <div className="lg:col-span-8 bg-brand-secondary p-5 rounded-2xl border border-brand-tertiary shadow-xl" id="entry-form-box">
          
          <form onSubmit={handleSubmit} className="space-y-4" id="entry-actual-form">
            
            {/* Dotted camera upload preview area exactly as in image 2 */}
            <div
              className="group relative h-40 border-2 border-dashed border-brand-tertiary rounded-xl flex flex-col items-center justify-center bg-brand-bg/40 overflow-hidden"
              id="entry-photo-area"
            >
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt="Produto Preview"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                    id="entry-photo-preview"
                  />
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-2" id="entry-photo-hover-overlay">
                    <label className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary text-black font-bold text-[10px] rounded-lg cursor-pointer hover:bg-brand-primary/95 transition">
                      <Upload className="w-3.5 h-3.5" />
                      Alterar Arquivo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handlePresetPhoto}
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-secondary text-white border border-brand-tertiary font-bold text-[10px] rounded-lg cursor-pointer hover:bg-brand-secondary/80 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                      Foto Exemplo
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4" id="entry-photo-placeholder">
                  <div className="w-10 h-10 rounded-full bg-brand-tertiary flex items-center justify-center mx-auto mb-2 text-brand-primary" id="entry-photo-cam-circle">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="block text-xs font-semibold text-brand-primary mb-2" id="entry-photo-upload-lbl">
                    Adicionar Foto do Produto
                  </span>
                  <div className="flex justify-center gap-2">
                    <label className="flex items-center gap-1 px-3 py-2 bg-brand-primary text-black font-sans font-bold text-[10px] rounded-xl cursor-pointer hover:bg-brand-primary/90 transition shadow-md">
                      <Upload className="w-3.5 h-3.5" />
                      Escolher da Galeria
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handlePresetPhoto}
                      className="flex items-center gap-1 px-3 py-2 bg-brand-secondary text-white border border-brand-tertiary font-sans font-bold text-[10px] rounded-xl cursor-pointer hover:bg-brand-tertiary transition shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                      Foto Exemplo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Form row 1: Supplier */}
            <div id="entry-form-sup-group">
              <label className="block text-[11px] uppercase tracking-wider font-bold text-brand-primary mb-1.5" id="entry-form-lbl-sup">
                Fornecedor
              </label>
              {isTypingNewSup ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCustomSupplierName}
                    onChange={(e) => setNewCustomSupplierName(e.target.value)}
                    placeholder="Novo fornecedor..."
                    className="flex-1 bg-brand-bg border border-brand-primary rounded-xl px-3 py-2.5 text-xs text-brand-neutral focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newCustomSupplierName.trim();
                      if (trimmed) {
                        onAddSupplier(trimmed);
                        setSupplier(trimmed);
                        setNewCustomSupplierName('');
                        setIsTypingNewSup(false);
                      }
                    }}
                    className="px-4 bg-brand-primary text-black rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTypingNewSup(false);
                      setNewCustomSupplierName('');
                    }}
                    className="px-4 bg-brand-tertiary text-gray-400 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    X
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="flex-1 bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2.5 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary"
                    id="entry-form-select-sup"
                    required
                  >
                    <option value="" disabled>Selecione o Fornecedor...</option>
                    {suppliers.map((sup) => (
                      <option key={sup} value={sup}>{sup}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsTypingNewSup(true)}
                    className="px-3 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/25 text-brand-primary rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                    title="Criar novo fornecedor instantaneamente"
                    id="entry-form-quick-add-sup"
                  >
                    + Novo
                  </button>
                </div>
              )}
            </div>

            {/* Form row 2: Category & Quantity */}
            <div className="grid grid-cols-2 gap-4" id="entry-form-cat-qty-row">
              <div id="entry-form-cat-group">
                <label className="block text-[11px] uppercase tracking-wider font-bold text-brand-primary mb-1.5" id="entry-form-lbl-cat">
                  Categoria
                </label>
                <div className="flex flex-col gap-1.5" id="entry-form-cat-row">
                  {isTypingNewCat ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCustomCategoryName}
                        onChange={(e) => setNewCustomCategoryName(e.target.value)}
                        placeholder="Nova categoria..."
                        className="flex-1 bg-brand-bg border border-brand-primary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newCustomCategoryName.trim();
                          if (trimmed) {
                            onAddCategory(trimmed);
                            setCategory(trimmed);
                            setNewCustomCategoryName('');
                            setIsTypingNewCat(false);
                          }
                        }}
                        className="px-3 bg-brand-primary text-black rounded-xl text-xs font-bold transition"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsTypingNewCat(false);
                          setNewCustomCategoryName('');
                        }}
                        className="px-3 bg-brand-tertiary text-gray-400 rounded-xl text-xs font-bold transition"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="flex-1 bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2.5 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary"
                        id="entry-form-select-cat"
                        required
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        {categories.length === 0 && (
                          <option value="">-- Crie uma categoria --</option>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsTypingNewCat(true)}
                        className="px-3 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/25 text-brand-primary rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                        title="Criar nova categoria instantaneamente"
                        id="entry-form-quick-add-cat"
                      >
                        + Nova
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div id="entry-form-qty-group">
                <label className="block text-[11px] uppercase tracking-wider font-bold text-brand-primary mb-1.5" id="entry-form-lbl-qty">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity === 0 ? '' : quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary text-center"
                  id="entry-form-input-qty"
                />
              </div>
            </div>

            {/* Form row 3: Item Name */}
            <div id="entry-form-name-group">
              <label className="block text-[11px] uppercase tracking-wider font-bold text-brand-primary mb-1.5" id="entry-form-lbl-name">
                Nome do Item
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Relógio Oyster Perpetual Gold"
                className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2.5 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary placeholder-gray-600"
                id="entry-form-input-name"
              />
            </div>

            {/* Form row 4: Cost Price */}
            <div id="entry-form-price-group">
              <label className="block text-[11px] uppercase tracking-wider font-bold text-brand-primary mb-1.5" id="entry-form-lbl-price">
                Valor Unitário (Custo)
              </label>
              <div className="relative" id="entry-form-price-input-wrapper">
                <span className="absolute left-3.5 top-2 text-xs text-gray-500 font-medium" id="entry-form-currency-prefix">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price === 0 ? '' : price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full bg-brand-bg border border-brand-tertiary rounded-xl pl-9 pr-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary"
                  id="entry-form-input-price"
                />
              </div>
            </div>

            {/* Messages feedback */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-brand-red bg-brand-red/10 p-3 rounded-xl border border-brand-red/15" id="entry-form-error">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 text-xs text-brand-green bg-brand-green/10 p-3 rounded-xl border border-brand-green/15" id="entry-form-success">
                <Check className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit button exactly as shown in mockup */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/95 text-black font-sans font-bold text-xs py-3 rounded-xl transition duration-200 shadow-md cursor-pointer mt-2"
              id="entry-form-submit-btn"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Confirmar Entrada
            </button>

          </form>
        </div>

        {/* Informative block about Suppliers on desktop */}
        <div className="lg:col-span-4 space-y-4" id="entry-form-right-tips">
          <div className="p-4 rounded-2xl bg-brand-secondary border border-brand-tertiary/60 space-y-3" id="entry-tip-box">
            <h4 className="font-serif font-semibold text-xs text-brand-primary flex items-center gap-1.5" id="entry-tip-title">
              <Shield className="w-4 h-4" /> Diretrizes de Aquisição
            </h4>
            <ul className="space-y-2 text-[10px] text-gray-400 leading-relaxed" id="entry-tip-list">
              <li id="entry-tip-1">• Se o produto já existir no estoque, a quantidade informada será somada ao saldo e o preço atualizado.</li>
              <li id="entry-tip-2">• Novos produtos receberão SKUs sequenciais automáticos.</li>
              <li id="entry-tip-3">• Fotos de alta qualidade de canais de luxo são aplicadas caso você clique no painel de imagem acima.</li>
            </ul>
          </div>
        </div>

      </div>

      {/* 2. Histórico Recente exactly as in image 2 */}
      <div className="space-y-3 pt-4" id="entry-recent-container">
        <div className="flex items-center justify-between" id="entry-recent-header">
          <h3 className="font-serif font-semibold text-lg text-brand-neutral tracking-tight" id="entry-recent-title">
            Histórico Recente
          </h3>
          <span className="text-[10px] font-mono text-gray-500" id="entry-recent-count">
            {entriesHistory.length} entradas registradas
          </span>
        </div>

        {/* History list */}
        <div className="space-y-2.5" id="entry-recent-list">
          {entriesHistory.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 bg-brand-secondary rounded-xl border border-brand-tertiary/40 shadow-sm hover:border-brand-primary/10 transition"
              id={`entry-history-item-${entry.id}`}
            >
              <div className="flex items-center gap-3.5 min-w-0" id={`entry-history-left-${entry.id}`}>
                {/* Tiny product preview circle */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-brand-bg shrink-0 border border-brand-tertiary/40" id={`entry-history-avatar-box-${entry.id}`}>
                  {/* Find original product photo if exists */}
                  <img
                    src={products.find((p) => p.id === entry.productId)?.imageUrl || getPresetPhoto(entry.category)}
                    alt={entry.productName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    id={`entry-history-avatar-${entry.id}`}
                  />
                </div>

                <div className="min-w-0" id={`entry-history-details-${entry.id}`}>
                  <h4 className="text-xs font-bold text-brand-neutral truncate leading-snug" id={`entry-history-name-${entry.id}`}>
                    {entry.productName}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5" id={`entry-history-meta-${entry.id}`}>
                    {entry.category.toUpperCase()} • {entry.quantity} {entry.quantity === 1 ? 'UNIDADE' : 'UNIDADES'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 font-sans" id={`entry-history-right-${entry.id}`}>
                <span className="block text-xs font-bold text-brand-primary" id={`entry-history-val-${entry.id}`}>
                  {formatCurrency(entry.price * entry.quantity)}
                </span>
                <span className="block text-[9px] text-gray-500 mt-0.5" id={`entry-history-time-${entry.id}`}>
                  {entry.time}
                </span>
              </div>
            </div>
          ))}

          {entriesHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-brand-secondary/30 rounded-xl border border-dashed border-brand-tertiary/50" id="entry-history-empty">
              <p className="text-xs font-medium" id="entry-history-empty-text">Nenhuma entrada recente registrada.</p>
              <p className="text-[10px] text-gray-500 mt-0.5" id="entry-history-empty-hint">Use o formulário acima para registrar entradas no estoque.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
