
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data, error } = await supabase.from('tasks').select('*').limit(1);
    if (error) {
        console.log('Error fetching tasks:', error.message);
    } else if (data && data.length > 0) {
        console.log('Task columns:', Object.keys(data[0]));
    } else {
        // If no tasks, we can try to get the column info from another query or just guess
        console.log('No tasks found to check columns. Fetching table info...');
        const { data: cols, error: colError } = await supabase.rpc('get_column_names', { table_name: 'tasks' });
        if (colError) {
             // Fallback: try an empty select
             const { data: emptyData, error: emptyError } = await supabase.from('tasks').select('*').limit(0);
             if (emptyError) {
                 console.log('Final error:', emptyError.message);
             } else {
                 console.log('Task columns (empty result):', Object.keys(emptyData[0] || {}));
             }
        } else {
            console.log('Cols:', cols);
        }
    }
}
check();
