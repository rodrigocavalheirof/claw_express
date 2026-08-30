import React from 'react';
import { Product } from '../types';
import { ShoppingBag, Smartphone, Headphones, Gamepad, Monitor, RefreshCw } from 'lucide-react';

interface CatalogViewProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  isLoading: boolean;
  onRefreshProducts: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  products,
  onAddToCart,
  isLoading,
  onRefreshProducts,
}) => {
  const getProductIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('smartphone') || lower.includes('phone')) return <Smartphone className="product-image-icon" />;
    if (lower.includes('fone') || lower.includes('headphone')) return <Headphones className="product-image-icon" />;
    if (lower.includes('console') || lower.includes('gamer')) return <Gamepad className="product-image-icon" />;
    return <Monitor className="product-image-icon" />;
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Produtos em destaque</h2>
        <button className="btn-refresh" onClick={onRefreshProducts} disabled={isLoading}>
          <RefreshCw size={13} />
          {isLoading ? 'Atualizando...' : 'Atualizar estoque'}
        </button>
      </div>

      <div className="products-grid">
        {products.map((product) => {
          const isOut = product.stock_quantity <= 0;
          const isLow = product.stock_quantity > 0 && product.stock_quantity <= 3;

          return (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                {getProductIcon(product.name)}
                <span className={`stock-tag ${isOut ? 'stock-out' : isLow ? 'stock-low' : 'stock-available'}`}>
                  {isOut ? 'Esgotado' : isLow ? `${product.stock_quantity} restantes` : `${product.stock_quantity} em estoque`}
                </span>
              </div>

              <div className="product-body">
                <h3 className="product-title">{product.name}</h3>
                <p className="product-desc">{product.description}</p>

                <div className="product-footer">
                  <div className="product-price">R$ {Number(product.price).toFixed(2)}</div>
                  <button
                    className="btn-add-cart"
                    onClick={() => onAddToCart(product, 1)}
                    disabled={isOut}
                  >
                    <ShoppingBag size={14} />
                    {isOut ? 'Indisponível' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
