import { supabase } from './supabase';
import { Product, ProductVariant, Transaction } from '../types';

/**
 * DATABASE SERVICE FOR SUPABASE SYNCHRONIZATION
 * Persists and fetches products, categories, suppliers, and transactions.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function dbAddCategory(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: 'Nome inválido' };

    // 1. Check if already exists in Supabase
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      return { success: true };
    }

    // 2. Try simple insert
    const { error: insertErr } = await supabase
      .from('categories')
      .insert([{ name: cleanName }]);

    if (!insertErr) {
      return { success: true };
    }

    // 3. Fallback upsert
    const { error: upsertErr } = await supabase
      .from('categories')
      .upsert([{ name: cleanName }], { onConflict: 'name' });

    if (upsertErr) {
      console.warn('Could not save category to Supabase:', upsertErr.message);
      return { success: false, error: upsertErr.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error saving category to Supabase:', err);
    return { success: false, error: err.message || 'Erro ao conectar ao Supabase' };
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

export async function dbAddSupplier(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: 'Nome inválido' };

    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      return { success: true };
    }

    const { error: insertErr } = await supabase
      .from('suppliers')
      .insert([{ name: cleanName }]);

    if (!insertErr) {
      return { success: true };
    }

    const { error: upsertErr } = await supabase
      .from('suppliers')
      .upsert([{ name: cleanName }], { onConflict: 'name' });

    if (upsertErr) {
      console.warn('Could not save supplier to Supabase:', upsertErr.message);
      return { success: false, error: upsertErr.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error saving supplier to Supabase:', err);
    return { success: false, error: err.message || 'Erro ao conectar ao Supabase' };
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
        costPrice: Number(p.cost_price || 0),
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
    const isUuid = UUID_REGEX.test(product.id);
    let targetId: string | undefined = isUuid ? product.id : undefined;

    // Look up existing product by SKU if ID is not a valid UUID
    if (!targetId && product.sku) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('sku', product.sku)
        .maybeSingle();
      if (existing?.id) {
        targetId = existing.id;
      }
    }

    const payload: any = {
      sku: product.sku || `SKU-${Date.now()}`,
      name: product.name,
      category: product.category,
      supplier: product.supplier || 'Direto com Fabricante',
      price: Number(product.price || 0),
      cost_price: Number(product.costPrice || 0),
      quantity: Number(product.quantity || 0),
      min_stock: Number(product.minStock || 1),
      image_url: product.imageUrl || '',
      updated_at: new Date().toISOString()
    };

    if (targetId) {
      payload.id = targetId;
    }

    let savedData: any = null;
    let lastError: string | null = null;

    // Attempt 1: Standard upsert (uses PK id if present)
    if (payload.id) {
      const { data, error } = await supabase
        .from('products')
        .upsert(payload)
        .select()
        .maybeSingle();
      if (!error && data) {
        savedData = data;
      } else if (error) {
        lastError = error.message;
      }
    }

    // Attempt 2: Upsert with onConflict on 'sku'
    if (!savedData) {
      const { data, error } = await supabase
        .from('products')
        .upsert(payload, { onConflict: 'sku' })
        .select()
        .maybeSingle();
      if (!error && data) {
        savedData = data;
      } else if (error) {
        lastError = error.message;
      }
    }

    // Attempt 3: Direct check then update or insert
    if (!savedData) {
      const { data: checkExist } = await supabase
        .from('products')
        .select('id')
        .or(`sku.eq.${payload.sku}${payload.id ? `,id.eq.${payload.id}` : ''}`)
        .maybeSingle();

      if (checkExist?.id) {
        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', checkExist.id)
          .select()
          .maybeSingle();
        if (!error) savedData = data || checkExist;
        else lastError = error.message;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([payload])
          .select()
          .maybeSingle();
        if (!error) savedData = data;
        else lastError = error.message;
      }
    }

    if (!savedData && lastError) {
      console.warn('Supabase product save error after all attempts:', lastError);
      return { success: false, error: lastError };
    }

    const assignedProductId = savedData?.id || targetId;

    // Sync variants if any
    if (product.variants && product.variants.length > 0 && assignedProductId) {
      for (const v of product.variants) {
        const isVarUuid = UUID_REGEX.test(v.id);
        const varPayload: any = {
          product_id: assignedProductId,
          sku: v.sku || `${product.sku}-${v.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: v.name,
          quantity: Number(v.quantity || 0),
          image_url: v.imageUrl || '',
          updated_at: new Date().toISOString()
        };
        if (isVarUuid) {
          varPayload.id = v.id;
        }

        const { error: varErr } = await supabase
          .from('product_variants')
          .upsert(varPayload);

        if (varErr) {
          await supabase.from('product_variants').insert([varPayload]);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving product to Supabase:', err);
    return { success: false, error: err.message || 'Erro ao salvar no banco' };
  }
}

export async function dbDeleteProduct(id: string): Promise<boolean> {
  try {
    const isUuid = UUID_REGEX.test(id);
    let query = supabase.from('products').delete();
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      // Delete by ID or SKU matching ID
      query = query.or(`id.eq.${id},sku.eq.${id}`);
    }
    const { error } = await query;
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

export async function dbSaveTransaction(tx: Transaction): Promise<{ success: boolean; error?: string }> {
  try {
    const isProdUuid = UUID_REGEX.test(tx.productId);
    let targetProductId: string | null = isProdUuid ? tx.productId : null;

    if (!targetProductId && tx.sku) {
      const { data: p } = await supabase
        .from('products')
        .select('id')
        .eq('sku', tx.sku)
        .maybeSingle();
      if (p?.id) {
        targetProductId = p.id;
      }
    }

    const { error } = await supabase.from('transactions').insert([{
      product_id: targetProductId,
      product_name: tx.productName,
      sku: tx.sku,
      type: tx.type,
      category: tx.category,
      quantity: tx.quantity,
      price: tx.price,
      date: tx.date || new Date().toISOString().split('T')[0],
      time: tx.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);

    if (error) {
      console.warn('Could not save transaction to Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error saving transaction to Supabase:', err);
    return { success: false, error: err.message || 'Erro ao salvar movimentação no banco' };
  }
}

