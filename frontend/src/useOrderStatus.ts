import { useEffect, useState } from 'react';

export interface OrderStatusData {
  status: 'PENDING_PAYMENT' | 'PAID' | 'PAYMENT_FAILED';
  message?: string;
  updatedAt?: string;
}

export function useOrderStatus(orderId: string | null) {
  const [orderStatus, setOrderStatus] = useState<OrderStatusData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!orderId) {
      setOrderStatus(null);
      setIsConnected(false);
      return;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const sseUrl = `${backendUrl}/api/orders/${orderId}/stream`;

    console.log(`[SSE] Conectando ao stream em tempo real: ${sseUrl}`);
    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      console.log('[SSE] Conexão Server-Sent Events estabelecida.');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: OrderStatusData = JSON.parse(event.data);
        console.log('[SSE] Evento recebido em tempo real:', data);
        setOrderStatus(data);

        // Se atingiu o estado final (PAID ou PAYMENT_FAILED), fecha o streaming
        if (data.status === 'PAID' || data.status === 'PAYMENT_FAILED') {
          console.log('[SSE] Estado final do pedido atingido. Encerrando stream.');
          eventSource.close();
          setIsConnected(false);
        }
      } catch (err) {
        console.error('[SSE] Erro ao parsear mensagem SSE:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Erro ou reconexão na conexão SSE:', err);
      setIsConnected(false);
    };

    return () => {
      console.log('[SSE] Limpando conexão EventSource ao desmontar componente.');
      eventSource.close();
      setIsConnected(false);
    };
  }, [orderId]);

  return { orderStatus, isConnected };
}
