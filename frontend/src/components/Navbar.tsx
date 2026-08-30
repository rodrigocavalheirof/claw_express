import React from 'react';
import { ShoppingCart, Activity, ArrowLeft, Store } from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  currentView: 'catalog' | 'checkout' | 'tracking';
  onNavigateHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  currentView,
  onNavigateHome,
}) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="brand" onClick={onNavigateHome}>
          <div className="brand-icon">
            <Store size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-name">NovaTech Store</span>
              <span className="brand-badge">Loja Oficial</span>
            </div>
          </div>
        </div>

        <div className="nav-actions">
          {currentView !== 'catalog' && (
            <button
              className="nav-link"
              onClick={onNavigateHome}
              style={{ background: 'none', border: '1px solid transparent' }}
            >
              <ArrowLeft size={15} />
              Catálogo
            </button>
          )}

          <a
            href="http://localhost:3000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link nav-link-green"
            title="Monitorar Filas do Servidor (BullMQ)"
          >
            <Activity size={14} />
            Painel BullMQ
          </a>

          <button className="cart-btn" onClick={onOpenCart}>
            <ShoppingCart size={16} />
            Carrinho
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>
    </nav>
  );
};
