import React from 'react';
import { CartItem } from '../types';
import { X, Trash2, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onGoToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onGoToCheckout,
}) => {
  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>
            <ShoppingBag size={17} />
            Carrinho de Compras
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
              <ShoppingBag size={40} style={{ opacity: 0.3, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Carrinho vazio</p>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Adicione produtos do catálogo.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="cart-item">
                <div className="cart-item-details">
                  <div className="cart-item-title">{item.product.name}</div>
                  <div className="cart-item-price">R$ {Number(item.product.price).toFixed(2)} / un</div>

                  <div className="qty-controls">
                    <button
                      className="qty-btn"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '18px', textAlign: 'center', color: 'var(--text)' }}>
                      {item.quantity}
                    </span>
                    <button
                      className="qty-btn"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock_quantity}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                    R$ {(Number(item.product.price) * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                    title="Remover"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-footer">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Frete</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Grátis</span>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>

            <button className="btn-proceed" onClick={onGoToCheckout}>
              <span>Ir para o Checkout</span>
              <ArrowRight size={16} />
            </button>

            <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <ShieldCheck size={12} color="var(--success)" />
              Preço congelado &amp; garantia de idempotência
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
