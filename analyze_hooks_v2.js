
const fs = require('fs');
const lines = fs.readFileSync('c:\\Users\\Ansh Tyagi\\.gemini\\antigravity\\scratch\\zenith-productivity\\src\\app\study\\page.tsx', 'utf8').split('\n');

lines.forEach((line, i) => {
    if (line.includes('useEffect')) {
        console.log(`L${i+1}: ${line.trim()}`);
    }
    if (line.includes('], [')) {
        console.log(`POSSIBLE ERROR L${i+1}: ${line.trim()}`);
    }
});
