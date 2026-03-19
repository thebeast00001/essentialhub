
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read from .env.local manually
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data, error } = await supabase.from('habits').select('*').limit(1);
    if (error) {
        console.log('Error fetching habits:', error.message);
    } else if (data && data.length > 0) {
        console.log('Habit columns:', Object.keys(data[0]));
    } else {
        console.log('No habits found to check columns.');
    }
}
check();
