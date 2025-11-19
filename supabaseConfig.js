// =============================================
// Supabase Client (V2) — KSF LEAGUE
// =============================================

// 1. URL & ANON KEY dari project kamu
const SUPABASE_URL = "https://tjvafqosfkeqybhutbaq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFmcW9zZmtlcXliaHV0YmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTM5MTcsImV4cCI6MjA3OTAyOTkxN30.ple-BDYuGR585VVgT5uGjYteW9CJkTOaTeVl40gf1jc";

// 2. Inisialisasi Supabase v2
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3. Supaya dapat dipakai oleh script.js
window.supabase = client;
