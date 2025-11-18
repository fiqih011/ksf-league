// === Supabase Client V2 ===
const SUPABASE_URL = "https://tjvafqosfkeqybhutbaq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFmcW9zZmtlcXliaHV0YmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTM5MTcsImV4cCI6MjA3OTAyOTkxN30.ple-BDYuGR585VVgT5uGjYteW9CJkTOaTeVl40gf1jc";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// supaya script.js bisa akses
window.supabase = supabase;
