import { supabase } from './supabase';
import { Product, ProductVariant, Transaction, MonthlyClosing } from '../types';

/**
 * DATABASE SERVICE FOR SUPABASE SYNCHRONIZATION
 * Persists and fetches products, categories, suppliers, transactions and monthly closings.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ==========================================
// 1. CATEGORIES
// ==========================================
export async function dbFetchCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('categories').select('name');
    if (error) {
      console.warn('Supabase categories fetch warning:', error.message);
      return [];
    }
    return data ? data.map((item) => item.name).filter(Boolean) : [];
  } catch (err) {
    console.error('Failed to fetch categories from Supabase:', err);
    return [];
  }
}

export async function dbAddCategory(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: 'Nome inválido' };

    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      return { success: true };
    }

    const { error: insertErr } = await supabase
      .from('categories')
      .insert([{ name: cleanName }]);

    if (!insertErr) {
      return { success: true };
    }

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
      console.warn('Supabase suppliers fetch warning:', error.message);
      return [];
    }
    return data ? data.map((item) => item.name).filter(Boolean) : [];
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
    const { data: prods, error: prodErr } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (prodErr || !prods) {
      console.warn('Supabase products fetch warning:', prodErr?.message);
      return [];
    }

    const { data: variantsData, error: varErr } = await supabase.from('product_variants').select('*');
    if (varErr) {
      console.warn('Supabase product variants fetch warning:', varErr.message);
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
      description: product.description || '',
      sales_count: Number(product.salesCount || 0),
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
      console.warn('Supabase product save error:', lastError);
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
    const cleanId = id.trim();
    const isUuid = UUID_REGEX.test(cleanId);

    if (isUuid) {
      // 1. Cleanly delete child variants first
      await supabase.from('product_variants').delete().eq('product_id', cleanId);
      // 2. Unlink any transactions referencing this product
      await supabase.from('transactions').update({ product_id: null }).eq('product_id', cleanId);
      // 3. Delete the product by primary key UUID
      const { error: uuidErr } = await supabase.from('products').delete().eq('id', cleanId);
      if (!uuidErr) return true;
      console.warn('Could not delete product by id:', uuidErr.message);
    }

    // 4. Also delete any product by SKU match (safe for non-uuid strings)
    const { error: skuErr } = await supabase.from('products').delete().eq('sku', cleanId);
    if (skuErr && !isUuid) {
      console.warn('Could not delete product by sku:', skuErr.message);
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
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Supabase transactions fetch warning:', error?.message);
      return [];
    }

    return data.map((t) => {
      // Calculate robust deterministic timestamp (never Date.now() to prevent false post-reset resurgence)
      let timestamp = 0;
      if (t.created_at) {
        const parsed = new Date(t.created_at).getTime();
        if (!isNaN(parsed) && parsed > 0) timestamp = parsed;
      }
      if (!timestamp && t.date) {
        const dateParts = t.date.includes('-') ? t.date.split('-') : t.date.split('/');
        if (dateParts.length === 3) {
          const y = Number(dateParts[0].length === 4 ? dateParts[0] : dateParts[2]);
          const m = Number(dateParts[1]) - 1;
          const d = Number(dateParts[0].length === 4 ? dateParts[2] : dateParts[0]);
          let h = 12, min = 0;
          if (t.time && t.time.includes(':')) {
            const timeParts = t.time.split(':');
            h = Number(timeParts[0]) || 0;
            min = Number(timeParts[1]) || 0;
          }
          const dt = new Date(y, m, d, h, min);
          if (!isNaN(dt.getTime())) timestamp = dt.getTime();
        }
      }
      if (!timestamp) timestamp = 0;

      return {
        id: t.id,
        productId: t.product_id || '',
        productName: t.product_name,
        sku: t.sku,
        category: t.category,
        type: t.type as 'entrada' | 'saida',
        quantity: Number(t.quantity || 1),
        price: Number(t.price || 0),
        date: t.date,
        time: t.time,
        timestamp,
      };
    });
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

    const payload: any = {
      product_id: targetProductId,
      product_name: tx.productName,
      sku: tx.sku,
      type: tx.type,
      category: tx.category || 'Geral',
      quantity: tx.quantity,
      price: tx.price,
      date: tx.date || new Date().toISOString().split('T')[0],
      time: tx.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      created_at: new Date().toISOString(),
    };

    if (UUID_REGEX.test(tx.id)) {
      payload.id = tx.id;
    }

    // Attempt 1: Try standard insert
    let { error } = await supabase.from('transactions').insert([payload]);

    // Attempt 2: If failed because foreign key constraint violated (product_id doesn't exist in DB yet), retry with product_id: null
    if (error && (error.code === '23503' || error.message?.toLowerCase().includes('foreign key'))) {
      payload.product_id = null;
      const retryRes = await supabase.from('transactions').insert([payload]);
      error = retryRes.error;
    }

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

export async function dbClearTransactions(): Promise<boolean> {
  try {
    // 1. Direct blanket delete strategies for safety
    await supabase.from('transactions').delete().gte('quantity', 0);
    await supabase.from('transactions').delete().not('id', 'is', null);
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Fetch all transaction IDs to delete explicitly by array
    const { data: allTxs } = await supabase.from('transactions').select('id');
    if (allTxs && allTxs.length > 0) {
      const ids = allTxs.map((t) => t.id).filter(Boolean);
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        await supabase.from('transactions').delete().in('id', chunk);
      }
    }
    return true;
  } catch (err) {
    console.error('Error clearing transactions in Supabase:', err);
    return false;
  }
}

export async function dbResetProductsSalesCount(): Promise<boolean> {
  try {
    const { data: allProds } = await supabase.from('products').select('id');
    if (allProds && allProds.length > 0) {
      const ids = allProds.map((p) => p.id).filter(Boolean);
      for (let i = 0; i < ids.length; i += 80) {
        const chunk = ids.slice(i, i + 80);
        await supabase.from('products').update({ sales_count: 0 }).in('id', chunk);
      }
    }
    await supabase.from('products').update({ sales_count: 0 }).not('id', 'is', null);
    return true;
  } catch (err) {
    console.error('Error resetting sales_count in Supabase:', err);
    return false;
  }
}

// ==========================================
// 5. MONTHLY CLOSINGS
// ==========================================
export async function dbFetchMonthlyClosings(): Promise<MonthlyClosing[]> {
  try {
    const { data, error } = await supabase
      .from('monthly_closings')
      .select('*')
      .order('closed_at', { ascending: false });

    if (error || !data) {
      console.warn('Supabase monthly_closings fetch warning:', error?.message);
      return [];
    }

    return data.map((c) => ({
      id: c.id,
      monthKey: c.month || c.month_key || '',
      periodRef: c.period_ref || '',
      closingDay: Number(c.closing_day || 30),
      closedAt: c.closed_at || new Date().toISOString(),
      closedAtFormatted: c.closed_at_formatted || new Date(c.closed_at).toLocaleDateString('pt-BR'),
      totalRevenue: Number(c.total_revenue || 0),
      totalQuantitySold: Number(c.total_quantity_sold || 0),
      totalSalesCount: Number(c.total_sales_count || 0),
      totalEntriesCount: Number(c.total_entries_count || 0),
      topProducts: Array.isArray(c.top_products) ? c.top_products : [],
      categoryBreakdown: Array.isArray(c.category_breakdown) ? c.category_breakdown : [],
      isManual: Boolean(c.is_manual),
    }));
  } catch (err) {
    console.error('Failed to fetch monthly closings from Supabase:', err);
    return [];
  }
}

export async function dbSaveMonthlyClosing(closing: MonthlyClosing): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: closing.id,
      month: closing.monthKey,
      period_ref: closing.periodRef,
      total_revenue: closing.totalRevenue,
      total_cost: 0,
      net_profit: closing.totalRevenue,
      total_quantity_sold: closing.totalQuantitySold,
      top_products: closing.topProducts || [],
      category_breakdown: closing.categoryBreakdown || [],
      closed_at: closing.closedAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('monthly_closings').upsert(payload);
    if (error) {
      console.warn('Could not save monthly closing to Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error saving monthly closing to Supabase:', err);
    return { success: false, error: err.message };
  }
}

export async function dbDeleteMonthlyClosing(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('monthly_closings').delete().eq('id', id);
    if (error) {
      console.warn('Could not delete monthly closing from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting monthly closing in Supabase:', err);
    return false;
  }
}
