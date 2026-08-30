import React, { useEffect, useState } from 'react';
import { useOrderStatus } from '../useOrderStatus';
import { CheckCircle2, Clock, XCircle, ShieldCheck, ArrowLeft, RotateCcw, PackageCheck } from 'lucide-react';
import { Order } from '../types';

interface OrderTrackingViewProps {
  orderId: string;
  onBackToCatalog: () => void;
  onPaymentFinished?: () => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  orderId,
  onBackToCatalog,
  onPaymentFinished,
}) => {
  const { orderStatus, isConnected } = useOrderStatus(orderId);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);

  const fetchOrderDetails = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/orders/${orderId}`);
      if (res.ok) {
        const data: Order = await res.json();
        setOrderDetails(data);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes do pedido:', err);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
    if (orderStatus) {
      fetchOrderDetails();
      if (orderStatus.status === 'PAID' || orderStatus.status === 'PAYMENT_FAILED') {
        onPaymentFinished?.();
      }
    }
  }, [orderStatus]);

  const currentStatus = orderStatus?.status || orderDetails?.status || 'PENDING_PAYMENT';
  const isPaid = currentStatus === 'PAID';
  const isFailed = currentStatus === 'PAYMENT_FAILED';
  const isPending = currentStatus === 'PENDING_PAYMENT';

  return (
    <div className="tracking-container">
      <div style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={onBackToCatalog}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.875rem' }}
        >
          <ArrowLeft size={15} /> Voltar ao catálogo
        </button>
      </div>

      <div className="tracking-card">
        {/* Status principal */}
        <div style={{ marginBottom: '8px' }}>
          {isPending && (
            <>
              <div className="spinner" style={{ marginBottom: '20px' }}></div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '8px' }}>
                Confirmando pagamento...
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto' }}>
                Estamos processando sua transação com a instituição financeira em ambiente seguro. A página será atualizada automaticamente assim que concluído.
              </p>
            </>
          )}

          {isPaid && (
            <>
              <div style={{ display: 'inline-flex', background: 'var(--success-light)', padding: '14px', borderRadius: '50%', color: 'var(--success)', marginBottom: '16px', border: '1px solid var(--success-border)' }}>
                <CheckCircle2 size={40} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '8px' }}>
                Pagamento aprovado com sucesso!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Seu pedido foi confirmado e a nota fiscal já está em emissão.
              </p>
            </>
          )}

          {isFailed && (
            <>
              <div style={{ display: 'inline-flex', background: 'var(--danger-light)', padding: '14px', borderRadius: '50%', color: 'var(--danger)', marginBottom: '16px', border: '1px solid var(--danger-border)' }}>
                <XCircle size={40} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '8px' }}>
                Pagamento não aprovado
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto' }}>
                {orderStatus?.message || 'A operadora recusou a transação após retentativas. O estoque reservado foi liberado.'}
              </p>
            </>
          )}
        </div>

        {/* Timeline */}
        <div className="status-timeline">
          <div className="timeline-step completed">
            <div className="timeline-icon"><PackageCheck size={18} /></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pedido recebido</span>
          </div>

          <div className={`timeline-step ${isPending ? 'active' : isPaid || isFailed ? 'completed' : ''}`}>
            <div className="timeline-icon"><Clock size={18} /></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Processamento</span>
          </div>

          <div className={`timeline-step ${isPaid ? 'completed' : isFailed ? 'failed' : ''}`}>
            <div className="timeline-icon">
              {isPaid ? <CheckCircle2 size={18} /> : isFailed ? <XCircle size={18} /> : <ShieldCheck size={18} />}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {isPaid ? 'Aprovado' : isFailed ? 'Recusado' : 'Conclusão'}
            </span>
          </div>
        </div>

        {/* SSE Status */}
        <div style={{ marginBottom: '28px' }}>
          <div className="sse-badge">
            <div className="sse-dot" style={{ background: isConnected ? 'var(--success)' : 'var(--text-tertiary)' }}></div>
            {isConnected ? 'Atualizações em tempo real ativas (SSE)' : 'Processamento concluído'}
          </div>
        </div>

        {/* Detalhes do pedido */}
        {orderDetails && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              <span>Pedido <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>#{orderDetails.id.split('-')[0]}</strong></span>
              <span>Autenticação: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{orderDetails.idempotency_key.substring(0, 24)}…</strong></span>
            </div>

            {orderDetails.items?.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}× {item.product_name}</span>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>R$ {Number(item.unit_price).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>
              <span>Total</span>
              <span>R$ {Number(orderDetails.total_amount).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px' }}>
          <button
            type="button"
            onClick={onBackToCatalog}
            className="btn-proceed"
            style={{ width: 'auto', padding: '12px 24px', margin: '0 auto' }}
          >
            <RotateCcw size={15} /> Realizar nova compra
          </button>
        </div>
      </div>
    </div>
  );
};
