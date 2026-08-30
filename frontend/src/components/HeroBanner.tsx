import React from 'react';
import { Tag, ShieldCheck, Truck, CreditCard } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  return (
    <div className="hero-banner">
      <div className="hero-content">
        <div className="hero-tag">
          <Tag size={12} /> Semana Tech &amp; Eletrônicos
        </div>
        <h2>Tecnologia de Ponta com Entrega Expressa</h2>
        <p>
          Aproveite descontos exclusivos nos melhores smartphones, fones de ouvido bluetooth e acessórios de alta performance. Pagamento rápido, seguro e garantia oficial de fábrica.
        </p>
        <div className="hero-pills">
          <div className="pill">
            <Truck size={12} /> Frete Grátis Brasil
          </div>
          <div className="pill">
            <ShieldCheck size={12} /> Compra 100% Segura
          </div>
          <div className="pill">
            <CreditCard size={12} /> Até 12x no Cartão
          </div>
        </div>
      </div>
    </div>
  );
};
