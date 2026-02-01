# Guia de Integração e Uso: Funcionalidades de IA (Premium)

Este guia explica como configurar e utilizar as novas funcionalidades de Inteligência Artificial implementadas no **ChatLead Pro**, exclusivas para os planos **Professional** e **Enterprise**.

---

## 1. Funcionalidades Implementadas

### 1.1 IA Copiloto (Assistente Inteligente)
Um chat interativo onde o corretor pode conversar com uma IA que entende o contexto do sistema.
- **Pensamento em Tempo Real:** Você vê o que a IA está "pensando" (raciocínio lógico) antes de ela responder ou agir.
- **Execução de Tarefas:** Peça para listar leads, ver agendamentos ou mudar status de leads via linguagem natural.
- **Localização:** Menu Lateral -> **IA Copiloto**.

### 1.2 Automações OpenClaw
Sistema de regras proativas que utilizam o motor do OpenClaw para executar ações automáticas.
- **Gatilhos Inteligentes:** Dispare ações baseadas em "Novo Lead" ou "Lead Qualificado".
- **Filtro por Score:** Execute ações apenas para leads com score de IA acima de um limite (ex: 0.80).
- **Ações Configuráveis:** Envio de e-mails, agendamentos e follow-ups automáticos.
- **Localização:** Menu Lateral -> **OpenClaw**.

### 1.3 Interface Visual (No-Code)
A interface de automação foi totalmente remodelada para ser amigável a corretores.
- **Sem JSON:** Todas as configurações são feitas através de menus suspensos, campos de texto e seletores visuais.
- **Agendamentos Inteligentes:** Configure automações para criar visitas ou reuniões automaticamente assim que um lead for capturado ou qualificado.
- **Controle de Autonomia:** Para cada automação, você pode escolher entre **"Automático"** (a IA executa a ação imediatamente) ou **"Aprovação Manual"** (a IA sugere a ação e você aprova antes da execução).

---

## 2. Configuração (Variáveis de Ambiente)

Para que a IA funcione corretamente, você deve garantir que as seguintes variáveis de ambiente estejam configuradas no seu servidor (`.env`):

```env
# Configuração de IA (OpenAI ou compatível)
OPENAI_API_KEY=sua_chave_aqui
# Opcional: se usar um proxy ou modelo específico
# OPENAI_MODEL_ID=gpt-4-turbo

# Banco de Dados (Necessário para as novas tabelas)
DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco
```

---

## 3. Banco de Dados (Novas Tabelas)

As novas funcionalidades exigem a tabela `openClawAutomations`. Se você estiver rodando localmente, execute:

```bash
# Sincronizar o schema do Drizzle com o banco
npx drizzle-kit push
```

Ou use o script manual fornecido:
```bash
node scripts/db-create-openclaw-automations.mjs
```

---

## 4. Como Usar (Exemplos)

### No IA Copiloto:
- *"Quais são meus leads mais recentes?"*
- *"Como eu mudo o status de um lead?"*
- *"Quais visitas eu tenho para hoje?"*

### No OpenClaw:
1. Vá em **Nova Automação**.
2. Defina o nome: *"Follow-up VIP"*.
3. Evento: `new_lead`.
4. Score Mínimo: `0.75`.
5. Ação: `send_email`.
6. **Modo de Execução:** Escolha `Aprovação Manual` (recomendado inicialmente).
7. **Configuração da Ação:** Preencha os campos visuais (ex: "Template de E-mail: Boas-vindas").

**Exemplo de Criação de Agendamento:**
1. Vá em **Nova Automação**.
2. Defina o nome: *"Agendar Visita Lead Quente"*.
3. Evento: `lead_qualified`.
4. Score Mínimo: `0.90`.
5. Ação: `create_appointment`.
6. **Modo de Execução:** Escolha `Aprovação Manual`.
7. **Configuração da Ação:**
   - Título do Agendamento: "Visita ao Imóvel - Lead Quente"
   - Tipo: "Visita ao Imóvel"
   - Agendar em (minutos): `60` (para agendar em 1 hora a partir da qualificação).

---

## 5. Segurança e Guardrails (Extremo)

O sistema de IA foi projetado com múltiplas camadas de proteção para evitar abusos de cibersegurança:

- **Input Filtering:** Bloqueio automático de mensagens contendo padrões de injeção de SQL, execução de comandos (RCE) ou scripts (XSS).
- **Output Sandboxing:** A IA é instruída a nunca fornecer informações sensíveis do sistema e suas respostas passam por um filtro de segurança antes de chegarem ao usuário.
- **Validação Estrita (Zod):** Todas as ferramentas (Tools) executadas pela IA possuem esquemas de validação rigorosos. A IA não pode acessar dados de outros usuários.
- **Auditoria:** Todas as execuções de ferramentas pela IA são logadas no servidor para monitoramento de comportamento anômalo.
- **AI Security Proxy (Menor Privilégio):** A IA não acessa o banco de dados diretamente. Ela utiliza uma camada de Proxy que restringe o acesso apenas a tabelas específicas (Leads e Agendamentos) e filtra automaticamente os dados pelo ID do usuário logado, impedindo vazamento de dados entre usuários ou acesso a tabelas sensíveis como `users` e `subscriptions`.

## 6. Notas de Desenvolvimento
As funcionalidades foram implementadas na branch `feature/openclaw-automation`. 
O frontend utiliza **Framer Motion** para as animações de pensamento e **Lucide React** para os ícones.
O backend utiliza **TRPC** para comunicação segura e tipada.
