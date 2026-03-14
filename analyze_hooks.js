
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Ansh Tyagi\\.gemini\\antigravity\\scratch\\zenith-productivity\\src\\app\\study\\page.tsx', 'utf8');

const effectRegex = /useEffect\s*\(\s*\(\)\s*=>\s*([\s\S]*?)\s*,\s*\[([\s\S]*?)\]\s*\)/g;
let match;
let count = 0;
while ((match = effectRegex.exec(content)) !== null) {
    count++;
    const deps = match[2].split(',').map(s => s.trim()).filter(s => s.length > 0);
    console.log(`Effect ${count} at index approx ${match.index}: ${deps.length} deps [${deps.join(', ')}]`);
}
