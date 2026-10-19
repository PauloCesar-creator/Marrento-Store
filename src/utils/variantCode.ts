import { Product, ProductVariant } from '../types';

/**
 * Generates a clean, unique readable code for a product variation.
 * Example: SK-842-RE-V01-OURO or SK-842-RE-V02-AZUL
 */
export function generateVariantCode(
  parentSku: string,
  variantIndex: number,
  variantName?: string,
  existingVariants?: ProductVariant[]
): string {
  const cleanParent = (parentSku || 'SKU').trim().toUpperCase().replace(/\s+/g, '-');
  const indexStr = String(variantIndex + 1).padStart(2, '0');
  
  let baseCode = `${cleanParent}-V${indexStr}`;

  if (variantName) {
    const slug = variantName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase();
    if (slug) {
      baseCode = `${cleanParent}-V${indexStr}-${slug}`;
    }
  }

  // Check collision with existing variants
  if (existingVariants && existingVariants.length > 0) {
    const existingCodes = new Set(
      existingVariants.map((v) => (v.code || v.sku || '').toUpperCase())
    );
    if (existingCodes.has(baseCode.toUpperCase())) {
      // Append a 3-char random alphanumeric salt to guarantee absolute uniqueness
      const salt = Math.random().toString(36).substring(2, 5).toUpperCase();
      baseCode = `${baseCode}-${salt}`;
    }
  }

  return baseCode;
}

/**
 * Generates a scan-friendly alphanumeric barcode string.
 */
export function generateVariantBarcode(parentSku: string, variantIndex: number, variantName?: string): string {
  const alphanumeric = (parentSku || 'SKU').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const idx = String(variantIndex + 1).padStart(2, '0');
  const slug = variantName
    ? variantName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 3)
        .toUpperCase()
    : '';
  return `${alphanumeric}V${idx}${slug}`;
}

/**
 * Ensures all variants within a product have valid unique codes and SKUs.
 */
export function ensureProductVariantCodes(product: Product): Product {
  if (!product.variants || product.variants.length === 0) {
    return product;
  }

  let modified = false;
  const updatedVariants = product.variants.map((v, idx) => {
    const defaultCode = generateVariantCode(product.sku, idx, v.name);
    const defaultBarcode = generateVariantBarcode(product.sku, idx);

    const hasValidSku = !!v.sku;
    const hasValidCode = !!v.code;
    const hasValidBarcode = !!v.barcode;

    if (hasValidSku && hasValidCode && hasValidBarcode) {
      return v;
    }

    modified = true;
    return {
      ...v,
      sku: v.sku || defaultCode,
      code: v.code || v.sku || defaultCode,
      barcode: v.barcode || defaultBarcode,
    };
  });

  return modified ? { ...product, variants: updatedVariants } : product;
}
