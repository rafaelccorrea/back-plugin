# 🚀 Guia de Integração: Webhook Universal ChatLead Pro

Este documento detalha como integrar fontes externas de leads (Instagram, Facebook Ads, Landing Pages, Zapier, Make, etc.) com o **ChatLead Pro**.

## 📍 Endpoint de Integração

O sistema utiliza um endpoint tRPC acessível via POST.

- **URL:** `https://nonmetallic-belinda-thankless.ngrok-free.dev/api/webhooks.externalLead`
- **Método:** `POST`
- **Headers Obrigatórios:**
  - `Content-Type: application/json`
  - `x-trpc-source: react` (Obrigatório para o roteamento do servidor)

---

## 🔑 Autenticação

Todas as requisições devem incluir a sua **API Key** no corpo do JSON. Você pode encontrar sua chave na página de **Automações** do dashboard.

---

## 📥 Estrutura do JSON (Payload)

O webhook aceita os seguintes campos:

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `apiKey` | `string` | **Sim** | Sua chave de API única encontrada no dashboard. |
| `name` | `string` | Não | Nome completo do lead. |
| `phone` | `string` | Não | Telefone com DDD (apenas números recomendados). |
| `email` | `string` | Não | E-mail de contato do lead. |
| `source` | `string` | Não | Origem do lead (Ex: `facebook_ads`, `site_oficial`). Padrão: `external_webhook`. |
| `notes` | `string` | Não | Notas ou observações iniciais sobre o lead. |
| `conversation` | `string` | Não | **Destaque:** Envie o histórico de conversa aqui para que nossa **IA analise e qualifique o lead automaticamente**. |

---

## 🤖 Análise Inteligente via IA

Se você enviar o campo `conversation`, o ChatLead Pro irá:
1.  **Extrair automaticamente** Nome, Telefone e E-mail se não forem fornecidos.
2.  **Identificar o perfil:** Tipo de imóvel, bairro de interesse e orçamento.
3.  **Qualificar a temperatura:** Classifica como Frio, Morno ou Quente.
4.  **Gerar Checklist:** Preenche automaticamente os itens de qualificação no CRM.

---

## 📝 Exemplo de Requisição (JSON)

```json
{
  "apiKey": "SUA_CHAVE_AQUI",
  "name": "João Silva",
  "phone": "11999999999",
  "email": "joao.silva@email.com",
  "source": "facebook_ads",
  "conversation": "Lead: Olá, vi o anúncio do apartamento no Morumbi. Gostaria de saber o valor do condomínio e se aceita financiamento. Corretor: Olá João, aceita sim! O condomínio está em R$ 800."
}
```

## 🛠️ Exemplo de Implementação (cURL)

```bash
curl -X POST https://nonmetallic-belinda-thankless.ngrok-free.dev/api/webhooks.externalLead \
  -H "Content-Type: application/json" \
  -H "x-trpc-source: react" \
  -d '{
    "apiKey": "SUA_CHAVE_AQUI",
    "name": "João Silva",
    "phone": "11999999999",
    "source": "landing_page_vendas"
  }'
```

---

## ✅ Respostas da API

### Sucesso (200 OK)
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "Lead captured successfully",
      "leadId": 123
    }
  }
}
```

### Erro de Autenticação (401 Unauthorized)
```json
{
  "error": {
    "message": "Invalid API Key",
    "code": -32001,
    "data": { "code": "UNAUTHORIZED" }
  }
}
```

---
*Documentação gerada para o ChatLead Pro - CRM Imobiliário Inteligente.*
