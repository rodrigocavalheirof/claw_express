import React, { useEffect, useState } from 'react';
import './App.css';
import { Product, CartItem } from './types';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { CatalogView } from './components/CatalogView';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutView } from './components/CheckoutView';
import { OrderTrackingView } from './components/OrderTrackingView';

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'catalog' | 'checkout' | 'tracking'>('catalog');
  
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/products`);
      if (res.ok) {
        const data: Product[] = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Erro ao buscar catálogo de produtos:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stock_quantity);
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prevCart, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const handleGoToCheckout = () => {
    setIsCartOpen(false);
    setCurrentView('checkout');
  };

  const handleNavigateHome = () => {
    setCurrentView('catalog');
    fetchProducts(); // sempre recarrega o estoque ao voltar ao catálogo
  };

  // Chamado pelo OrderTrackingView via SSE assim que o pagamento finaliza (PAID ou PAYMENT_FAILED)
  // Garante que o catálogo mostre o estoque atualizado sem precisar apertar F5
  const handlePaymentFinished = () => {
    fetchProducts();
  };

  const handleCheckoutSubmit = async (
    customerName: string,
    customerEmail: string,
    idempotencyKey: string
  ) => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          idempotencyKey,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao processar checkout.');
      }

      // Resposta Imediata (<100ms): Limpa carrinho e navega para o Acompanhamento do Pedido via SSE
      console.log('Pedido aceito pelo backend em <100ms:', data);
      setCart([]);
      setActiveOrderId(data.orderId);
      setCurrentView('tracking');

    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao processar o checkout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        currentView={currentView}
        onNavigateHome={handleNavigateHome}
      />

      <main className="main-container">
        {currentView === 'catalog' && (
          <>
            <HeroBanner />
            <CatalogView
              products={products}
              onAddToCart={handleAddToCart}
              isLoading={isLoadingProducts}
              onRefreshProducts={fetchProducts}
            />
          </>
        )}

        {currentView === 'checkout' && (
          <CheckoutView
            cart={cart}
            onBackToCatalog={handleNavigateHome}
            onSubmitCheckout={handleCheckoutSubmit}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
          />
        )}

        {currentView === 'tracking' && activeOrderId && (
          <OrderTrackingView
            orderId={activeOrderId}
            onBackToCatalog={handleNavigateHome}
            onPaymentFinished={handlePaymentFinished}
          />
        )}
      </main>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onGoToCheckout={handleGoToCheckout}
      />
    </div>
  );
}

export default App;
