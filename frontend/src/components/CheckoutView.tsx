import React, { useState } from 'react';
import { CartItem } from '../types';
import { CreditCard, QrCode, FileText, Lock, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface CheckoutViewProps {
  cart: CartItem[];
  onBackToCatalog: () => void;
  onSubmitCheckout: (customerName: string, customerEmail: string, idempotencyKey: string) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  onBackToCatalog,
  onSubmitCheckout,
  isSubmitting,
  errorMessage,
}) => {
  const [customerName, setCustomerName] = useState('Rodrigo Cavalheiro');
  const [customerEmail, setCustomerEmail] = useState('rodrigo@gmail.com');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'boleto'>('card');
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  const total = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitCheckout(customerName, customerEmail, idempotencyKey);
  };

  const handleRegenerateIdempotencyKey = () => {
    setIdempotencyKey(`key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <button
          type="button"
          onClick={onBackToCatalog}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Voltar ao catálogo
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          <Lock size={13} /> Checkout seguro
        </div>
      </div>

      <form onSubmit={handleSubmit} className="checkout-grid">
        <div className="checkout-card">
          <div className="step-indicator">
            <div className="step-number">1</div>
            <div className="step-title">Dados do cliente</div>
          </div>

          <div className="form-group">
            <label>Nome completo</label>
            <input
              type="text"
              className="form-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              className="form-input"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
            />
          </div>

          <div className="step-indicator" style={{ marginTop: '28px' }}>
            <div className="step-number">2</div>
            <div className="step-title">Forma de pagamento</div>
          </div>

          <div className="payment-options">
            {[
              { id: 'card', label: 'Cartão de Crédito', icon: <CreditCard size={20} /> },
              { id: 'pix', label: 'PIX', icon: <QrCode size={20} /> },
              { id: 'boleto', label: 'Boleto', icon: <FileText size={20} /> },
            ].map((m) => (
              <div
                key={m.id}
                className={`payment-option ${paymentMethod === m.id ? 'active' : ''}`}
                onClick={() => setPaymentMethod(m.id as any)}
              >
                <div style={{ marginBottom: '6px', color: paymentMethod === m.id ? 'var(--text)' : 'var(--text-tertiary)' }}>{m.icon}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: paymentMethod === m.id ? 'var(--text)' : 'var(--text-secondary)' }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div className="resilience-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)', marginBottom: '8px' }}>
              <ShieldCheck size={14} color="var(--success)" />
              Chave de idempotência
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', wordBreak: 'break-all', marginBottom: '8px' }}>
              {idempotencyKey}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              <span>Garante que cobranças duplicadas sejam bloqueadas.</span>
              <button
                type="button"
                onClick={handleRegenerateIdempotencyKey}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font)' }}
              >
                Nova chave
              </button>
            </div>
          </div>
        </div>

        <div style={{ height: 'fit-content' }}>
          <div className="checkout-card">
            <div className="step-title" style={{ marginBottom: '20px' }}>Resumo do pedido</div>

            {cart.map((item) => (
              <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.87rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}× {item.product.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>R$ {(Number(item.product.price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '8px' }}>
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
            </div>

            {errorMessage && (
              <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginTop: '14px', fontSize: '0.82rem' }}>
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="btn-proceed"
              disabled={isSubmitting || cart.length === 0}
              style={{ marginTop: '20px' }}
            >
              {isSubmitting ? (
                <span>Processando...</span>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Confirmar — R$ {total.toFixed(2)}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
