// Gestor de Carrito E-commerce en LocalStorage para Servitecnology
export interface CartItem {
	sku: string;
	titulo: string;
	precio_venta: number;
	cantidad: number;
	imagen: string;
	slug?: string;
	stock_disponible?: number;
}

export interface CartOperationResult {
	success: boolean;
	clamped?: boolean;
	newQty?: number;
	reason?: string;
}

const CART_STORAGE_KEY = 'st_ecommerce_cart';
let memoryCart: CartItem[] = [];

export function getCart(): CartItem[] {
	if (typeof window === 'undefined') {
		if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
			try {
				const raw = (globalThis as any).localStorage.getItem(CART_STORAGE_KEY);
				return raw ? JSON.parse(raw) : memoryCart;
			} catch {
				return memoryCart;
			}
		}
		return memoryCart;
	}
	try {
		const raw = localStorage.getItem(CART_STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch (e) {
		console.error('Error leyendo carrito:', e);
		return [];
	}
}

export function saveCart(cart: CartItem[]): void {
	if (typeof window === 'undefined') {
		memoryCart = cart;
		if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
			try {
				(globalThis as any).localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
			} catch {}
		}
		return;
	}
	try {
		localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
		window.dispatchEvent(new CustomEvent('st:cart:updated', { detail: { cart } }));
	} catch (e) {
		console.error('Error guardando carrito:', e);
	}
}

export function addToCart(item: CartItem): CartOperationResult {
	const cart = getCart();
	const existingIndex = cart.findIndex(i => i.sku === item.sku);
	const maxStock = item.stock_disponible !== undefined 
		? item.stock_disponible 
		: cart[existingIndex]?.stock_disponible;

	if (existingIndex > -1) {
		const currentQty = cart[existingIndex].cantidad || 1;
		const toAdd = item.cantidad || 1;
		const targetQty = currentQty + toAdd;

		if (maxStock !== undefined && targetQty > maxStock) {
			cart[existingIndex].cantidad = Math.max(1, maxStock);
			if (item.stock_disponible !== undefined) {
				cart[existingIndex].stock_disponible = maxStock;
			}
			saveCart(cart);
			return {
				success: false,
				clamped: true,
				newQty: cart[existingIndex].cantidad,
				reason: `Stock máximo alcanzado (${maxStock} unidad${maxStock > 1 ? 'es' : ''})`
			};
		}

		cart[existingIndex].cantidad = targetQty;
		if (item.stock_disponible !== undefined) {
			cart[existingIndex].stock_disponible = item.stock_disponible;
		}
	} else {
		const initialQty = item.cantidad || 1;
		const boundedQty = maxStock !== undefined ? Math.max(1, Math.min(initialQty, maxStock)) : initialQty;
		cart.push({
			...item,
			cantidad: boundedQty,
			stock_disponible: maxStock
		});
	}

	saveCart(cart);
	return { success: true };
}

export function removeFromCart(sku: string): void {
	const cart = getCart().filter(i => i.sku !== sku);
	saveCart(cart);
}

export function updateItemQuantity(sku: string, qty: number, maxStockLimit?: number): CartOperationResult {
	const cart = getCart();
	const item = cart.find(i => i.sku === sku);
	if (item) {
		if (qty <= 0) {
			removeFromCart(sku);
			return { success: true, clamped: false, newQty: 0 };
		} else {
			const limit = maxStockLimit !== undefined ? maxStockLimit : item.stock_disponible;
			const clamped = limit !== undefined && qty > limit;
			item.cantidad = (limit !== undefined && qty > limit) ? limit : qty;
			if (maxStockLimit !== undefined) {
				item.stock_disponible = maxStockLimit;
			}
			saveCart(cart);
			return {
				success: true,
				clamped,
				newQty: item.cantidad,
				reason: clamped ? `Stock máximo disponible alcanzado (${limit})` : undefined
			};
		}
	}
	return { success: false, clamped: false, newQty: 0 };
}

export function clearCart(): void {
	memoryCart = [];
	if (typeof window === 'undefined') {
		if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
			try {
				(globalThis as any).localStorage.removeItem(CART_STORAGE_KEY);
			} catch {}
		}
		return;
	}
	localStorage.removeItem(CART_STORAGE_KEY);
	window.dispatchEvent(new CustomEvent('st:cart:updated', { detail: { cart: [] } }));
}

export function getCartCount(): number {
	const cart = getCart();
	return cart.reduce((acc, it) => acc + (it.cantidad || 1), 0);
}
