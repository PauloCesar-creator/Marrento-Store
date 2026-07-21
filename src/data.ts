import { Product, Transaction, Supplier } from './types';

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'Geneva Watches S/A', contact: 'Marc Veu', email: 'geneva@luxurywatches.com' },
  { id: 'sup-2', name: 'Imperial Jewelry Group', contact: 'Sofia Alvarez', email: 'sofia@imperialjewelry.com' },
  { id: 'sup-3', name: 'Paris Fragrances Group', contact: 'Jean-Luc Godard', email: 'jeanluc@parisfragrances.com' },
  { id: 'sup-4', name: 'Aura Imports Ltda', contact: 'Robert Downey', email: 'robert@auradecora.com.br' },
  { id: 'sup-5', name: 'Luxo & Cia Distribuidora', contact: 'Marcia Mendes', email: 'mendes@luxoecia.com.br' }
];
