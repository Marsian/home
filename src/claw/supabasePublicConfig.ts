/**
 * Supabase 公开配置（会打进前端 bundle）。
 * Publishable Key 可出现在前端，访问边界由 RLS 控制。
 * 本地可用 .env.local 中的 VITE_SUPABASE_* 覆盖（见 getSupabaseClient）。
 */
export const SUPABASE_URL = 'https://ooptugnfafllzgvqcdev.supabase.co'

export const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_YWxYHOKhbZfY9Sro2NASGg_Fs94XExT'
