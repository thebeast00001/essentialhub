
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    // Try to filter by metadata if it's a jsonb column
    const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('action_type', 'habit_completed')
        .limit(5);

    if (error) {
        console.log('Error querying activity_log:', error.message);
    } else {
        console.log('Sample habit logs:', data.map(d => ({ desc: d.description, meta: d.metadata })));
    }
}
check();
