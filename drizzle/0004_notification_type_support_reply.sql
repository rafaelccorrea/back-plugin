-- Adiciona o valor 'support_reply' ao enum notification_type (notificações de resposta no suporte)
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'support_reply';
