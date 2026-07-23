import { supabase } from './supabase';
import { Product, ProductVariant, Transaction } from '../types';

/**
 * DATABASE SERVICE FOR SUPABASE SYNCHRONIZATION
 * Persists and fetches products, categories, suppliers, and transactions.
 */

// ==========================================
// 1. CATEGORIES
// ==========================================
export async function dbFetchCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('categories').select('name');
    if (error) {
      console.warn('Supabase categories fetch info:', error.message);
      return [];
    }
    return data ? data.map((item) => item.name) : [];
  } catch (err) {
    console.error('Failed to fetch categories from Supabase:', err);
    return [];
  }
}

export async function dbAddCategory(name: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('categories').insert([{ name }]);
    if (error) {
      console.warn('Could not save category to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving category to Supabase:', err);
    return false;
  }
}

export async function dbDeleteCategory(name: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('categories').delete().eq('name', name);
    if (error) {
      console.warn('Could not delete category from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting category from Supabase:', err);
    return false;
  }
}

// ==========================================
// 2. SUPPLIERS
// ==========================================
export async function dbFetchSuppliers(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('suppliers').select('name');
    if (error) {
      console.warn('Supabase suppliers fetch info:', error.message);
      return [];
    }
    return data ? data.map((item) => item.name) : [];
  } catch (err) {
    console.error('Failed to fetch suppliers from Supabase:', err);
    return [];
  }
}

export async function dbAddSupplier(name: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('suppliers').insert([{ name }]);
    if (error) {
      console.warn('Could not save supplier to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving supplier to Supabase:', err);
    return false;
  }
}

export async function dbDeleteSupplier(name: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('suppliers').delete().eq('name', name);
    if (error) {
      console.warn('Could not delete supplier from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting supplier from Supabase:', err);
    return false;
  }
}

// ==========================================
// 3. PRODUCTS & VARIANTS
// ==========================================
export async function dbFetchProducts(): Promise<Product[]> {
  try {
    const { data: prods, error: prodErr } = await supabase.from('products').select('*');
    if (prodErr || !prods) {
      console.warn('Supabase products fetch info:', prodErr?.message);
      return [];
    }

    const { data: variantsData, error: varErr } = await supabase.from('product_variants').select('*');
    if (varErr) {
      console.warn('Supabase product variants fetch info:', varErr.message);
    }

    return prods.map((p) => {
      const pVariants: ProductVariant[] = (variantsData || [])
        .filter((v) => v.product_id === p.id)
        .map((v) => ({
          id: v.id,
          name: v.name,
          quantity: Number(v.quantity || 0),
          imageUrl: v.image_url || undefined,
          sku: v.sku || undefined,
        }));

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        supplier: p.supplier || 'Direto com Fabricante',
        price: Number(p.price || 0),
        quantity: Number(p.quantity || 0),
        minStock: Number(p.min_stock || 1),
        imageUrl: p.image_url || '',
        description: p.description || '',
        salesCount: Number(p.sales_count || 0),
        createdAt: p.created_at || new Date().toISOString(),
        variants: pVariants.length > 0 ? pVariants : undefined,
      };
    });
  } catch (err) {
    console.error('Failed to fetch products from Supabase:', err);
    return [];
  }
}

export async function dbSaveProduct(product: Product): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Upsert product row
    const { error: prodErr } = await supabase.from('products').upsert({
      id: product.id.startsWith('prod-') && product.id.length > 30 ? product.id : undefined,
      sku: product.sku,
      name: product.name,
      category: product.category,
      supplier: product.supplier,
      price: product.price,
      quantity: product.quantity,
      min_stock: product.minStock,
      image_url: product.imageUrl,
      updated_at: new Date().toISOString()
    });

    if (prodErr) {
      console.warn('Supabase product save warning:', prodErr.message);
      return { success: false, error: prodErr.message };
    }

    // 2. Sync variants if any
    if (product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        await supabase.from('product_variants').upsert({
          product_id: product.id,
          sku: v.sku || `${product.sku}-${v.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: v.name,
          quantity: v.quantity,
          image_url: v.imageUrl,
          updated_at: new Date().toISOString()
        });
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving product to Supabase:', err);
    return { success: false, error: err.message };
  }
}

export async function dbDeleteProduct(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.warn('Could not delete product from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting product from Supabase:', err);
    return false;
  }
}

// ==========================================
// 4. TRANSACTIONS
// ==========================================
export async function dbFetchTransactions(): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      console.warn('Supabase transactions fetch info:', error?.message);
      return [];
    }

    return data.map((t) => ({
      id: t.id,
      productId: t.product_id || '',
      productName: t.product_name,
      sku: t.sku,
      category: t.category,
      type: t.type as 'entrada' | 'saida',
      quantity: Number(t.quantity),
      price: Number(t.price),
      date: t.date,
      time: t.time,
      timestamp: new Date(t.created_at).getTime(),
    }));
  } catch (err) {
    console.error('Failed to fetch transactions from Supabase:', err);
    return [];
  }
}

export async function dbSaveTransaction(tx: Transaction): Promise<boolean> {
  try {
    const { error } = await supabase.from('transactions').insert([{
      product_id: tx.productId.length > 30 ? tx.productId : null,
      product_name: tx.productName,
      sku: tx.sku,
      type: tx.type,
      category: tx.category,
      quantity: tx.quantity,
      price: tx.price,
      date: tx.date,
      time: tx.time,
    }]);

    if (error) {
      console.warn('Could not save transaction to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving transaction to Supabase:', err);
    return false;
  }
}
