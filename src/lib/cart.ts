// Gestor de Carrito E-commerce en LocalStorage para Servitecnology
export interface CartItem {
	sku: string;
	titulo: string;
	precio_venta: number;
	cantidad: number;
	imagen: string;
	slug?: string;
}

const CART_STORAGE_KEY = 'st_ecommerce_cart';

export function getCart(): CartItem[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(CART_STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch (e) {
		console.error('Error leyendo carrito:', e);
		return [];
	}
}

export function saveCart(cart: CartItem[]): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
		window.dispatchEvent(new CustomEvent('st:cart:updated', { detail: { cart } }));
	} catch (e) {
		console.error('Error guardando carrito:', e);
	}
}

export function addToCart(item: CartItem): void {
	const cart = getCart();
	const existingIndex = cart.findIndex(i => i.sku === item.sku);

	if (existingIndex > -1) {
		cart[existingIndex].cantidad += (item.cantidad || 1);
	} else {
		cart.push({ ...item, cantidad: item.cantidad || 1 });
	}

	saveCart(cart);
}

export function removeFromCart(sku: string): void {
	const cart = getCart().filter(i => i.sku !== sku);
	saveCart(cart);
}

export function updateItemQuantity(sku: string, qty: number): void {
	const cart = getCart();
	const item = cart.find(i => i.sku === sku);
	if (item) {
		if (qty <= 0) {
			removeFromCart(sku);
		} else {
			item.cantidad = qty;
			saveCart(cart);
		}
	}
}

export function clearCart(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(CART_STORAGE_KEY);
	window.dispatchEvent(new CustomEvent('st:cart:updated', { detail: { cart: [] } }));
}

export function getCartCount(): number {
	const cart = getCart();
	return cart.reduce((acc, it) => acc + (it.cantidad || 1), 0);
}
