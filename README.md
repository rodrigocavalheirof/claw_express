# E-Commerce Resilient Checkout System

Sistema de checkout de alta resiliência e processamento assíncrono para e-commerce desenvolvido com **Node.js (NestJS)**, **React**, **PostgreSQL**, **Redis (BullMQ)** e **Server-Sent Events (SSE)**.

---

## 🎯 Visão Geral da Solução

O objetivo desta solução é resolver os gargalos reais de e-commerce durante grandes picos de vendas (ex: **Black Friday**), lidando com:
1. **Instabilidade e Latência de Pagamentos:** O gateway de pagamentos simulado possui latência de 2 a 10 segundos e falha em 20% das requisições. O usuário recebe confirmação imediata (`202 Accepted` em <100ms) enquanto o processamento ocorre em segundo plano.
2. **Atualização em Tempo Real (UX):** A interface web em React é notificada automaticamente via **Server-Sent Events (SSE)** quando o pagamento é concluído (`PAID` ou `PAYMENT_FAILED`) sem recarregar a página.
3. **Concorrência de Estoque (Race Condition):** Uso de **Lock Pessimista (`SELECT ... FOR UPDATE`)** no PostgreSQL para impedir que dois clientes comprem a mesma unidade do produto simultaneamente.
4. **Imutabilidade de Preços:** Snapshot do preço unitário na tabela `order_items` no instante do checkout, protegendo o histórico do pedido contra alterações no catálogo.
5. **Idempotência:** Controle atômico por `idempotency_key` no banco e na fila para impedir cobranças ou processamentos duplicados.

---

## 🏗️ Diagramas de Arquitetura

### 1. Diagrama de Sequência (Fluxo Completo de Checkout)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend React
    participant API as Node.js API (NestJS)
    participant DB as PostgreSQL DB
    participant Queue as Redis (BullMQ Queue)
    participant Worker as Payment Worker Node.js
    participant Gateway as Mock Payment Gateway
    participant SSE as Real-time SSE Stream

    Client->>API: POST /api/orders (Itens, Quantidade, Idempotency-Key)
    activate API
    API->>DB: "BEGIN; SELECT ... FOR UPDATE (Lock Pessimista no Estoque)"
    DB-->>API: Estoque validado e bloqueado
    API->>DB: "INSERT INTO orders (PENDING_PAYMENT) e Snapshot de Preco"
    API->>DB: "UPDATE products SET stock = stock - qty; COMMIT;"
    API->>Queue: Publica job 'process-payment' com idempotencyKey
    API-->>Client: "202 Accepted { orderId, status: PENDING_PAYMENT } (<100ms)"
    deactivate API

    Client->>SSE: Abre conexao SSE em GET /api/orders/:id/stream

    Queue->>Worker: Consome job 'process-payment'
    activate Worker
    Worker->>DB: Verifica Idempotencia na tabela 'payments'
    Worker->>Gateway: Invoca Payment Mock (2s a 10s latencia, 20% falha)
    
    alt Pagamento Aprovado
        Gateway-->>Worker: Sucesso 200 OK
        Worker->>DB: UPDATE orders SET status = 'PAID'
        Worker->>DB: INSERT INTO payments (status = 'APPROVED')
        Worker->>SSE: Emit Event { status: 'PAID' }
    else Pagamento Falhou (com Retentativas)
        Gateway-->>Worker: Erro 500 / Instabilidade
        alt Tentativas < 4
            Worker->>Queue: Re-agenda job com Backoff Exponencial (3s, 6s, 12s)
        else Tentativas Esgotadas (Falha Definitiva)
            Worker->>DB: UPDATE orders SET status = 'PAYMENT_FAILED'
            Worker->>DB: UPDATE products SET stock = stock + qty (Compensacao)
            Worker->>SSE: Emit Event { status: 'PAYMENT_FAILED' }
        end
    end
    deactivate Worker

    SSE-->>Client: EventSource empurra atualizacao de status para a UI em tempo real
```

---

## 🏛️ Decisões Técnicas e Justificativas

| Componente | Escolha Técnica | Justificativa |
| :--- | :--- | :--- |
| **Framework Back-end** | **NestJS + Express/Fastify** | Arquitetura modular pronta para escala, injeção de dependências (DI) limpa, validações automáticas com DTOs e TypeScript nativo. |
| **Fila e Mensageria** | **Redis + BullMQ** | Nativo para Node.js, suporte nativo a retentativas com *Backoff Exponencial com Jitter*, agendamento de jobs e UI de monitoramento visual (`@bull-board`). |
| **Push em Tempo Real** | **Server-Sent Events (SSE)** | Unidirecional (Server ➔ Client). Extremamente mais leve que WebSockets, nativo em HTTP/1.1 e HTTP/2 com reconexão automática (`EventSource`) no navegador. |
| **Banco de Dados** | **PostgreSQL 15** | Banco relacional robusto com transações ACID completas e suporte a *Pessimistic Locking* (`SELECT FOR UPDATE`). |
| **Front-end Web** | **React + Vite** | Interface rápida e reativa com estado assíncrono controlado via Custom Hooks. |

---

## ⚙️ Como Executar a Aplicação

### Pré-requisitos
* **Docker** e **Docker Compose** instalados na máquina.

### Passo Único de Execução

No terminal, execute na raiz do projeto:

```bash
docker compose up --build -d
```

O Docker subirá automaticamente 4 serviços:
1. `checkout_postgres`: Banco de Dados PostgreSQL 15 com tabelas e seed inicial de produtos na porta `5432`.
2. `checkout_redis`: Cache e Broker de Mensageria na porta `6379`.
3. `checkout_backend`: API Node.js/NestJS na porta `3000`.
4. `checkout_frontend`: Interface React servida via Nginx na porta `8080`.

---

## 🌐 URLs de Acesso

* 💻 **Interface Web Checkout (React):** [http://localhost:8080](http://localhost:8080)
* 🚀 **API Back-end REST:** [http://localhost:3000/api/products](http://localhost:3000/api/products)
* 📊 **Dashboard Visual de Filas (Bull-Board):** [http://localhost:3000/admin/queues](http://localhost:3000/admin/queues)

---

## 🧪 Testes Automatizados

A suíte de testes valida as regras críticas de negócio (concorrência de estoque, idempotência, imutabilidade de preços e retentativas do worker).

Para rodar os testes unitários do back-end:

```bash
cd backend
npm test
```

---

## 🔍 Detalhamento das Regras de Negócio Implementadas

### 1. Concorrência de Estoque (Race Condition)
Implementado no arquivo `backend/src/orders/orders.service.ts` usando transações SQL:
```sql
BEGIN;
SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE;
UPDATE products SET stock_quantity = stock_quantity - $2 WHERE id = $1;
INSERT INTO orders (...);
COMMIT;
```
Garante que se 2 clientes comprarem a última unidade ao mesmo tempo, a segunda transação aguardará o término da primeira e receberá a exceção `400 Bad Request (Estoque Insuficiente)`.

### 2. Imutabilidade de Preços
No momento da compra, o valor unitário do catálogo é copiado para `order_items.unit_price`. Se o preço do produto no catálogo for alterado posteriormente, o valor cobrado no pedido permanece congelado e imutável.

### 3. Idempotência no Pagamento
Cada checkout gera/envia uma `idempotency_key` única. A tabela `orders` e `payments` contêm restrição `UNIQUE(idempotency_key)`. Requisições duplicadas não geram novas cobranças nem novos pedidos.

### 4. Compensação de Estoque em Falhas Definitivas
Se o gateway mockado falhar e esgotar todas as 4 retentativas configuradas no BullMQ, o worker atualiza o pedido para `PAYMENT_FAILED` e executa um script de compensação que devolve a quantidade reservada ao estoque (`UPDATE products SET stock_quantity = stock_quantity + qty`).
