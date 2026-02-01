#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não configuradas');
  process.exit(1);
}

console.log('🔍 Testando conexão com Supabase...');
console.log(`📍 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

try {
  // Testar conexão
  const { data, error } = await supabase
    .from('users')
    .select('count(*)')
    .limit(1);

  if (error) {
    console.error('❌ Erro ao conectar:', error.message);
    process.exit(1);
  }

  console.log('✅ Conexão com Supabase estabelecida com sucesso!');
  console.log('📊 Tabela "users" acessível');
  process.exit(0);
} catch (error) {
  console.error('❌ Erro inesperado:', error.message);
  process.exit(1);
}
