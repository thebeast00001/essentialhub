
const adjetives = [
    'Radiant', 'Silent', 'Swift', 'Global', 'Epic', 'Classic', 'Primal', 'Ultra',
    'Lunar', 'Solar', 'Void', 'Zenith', 'Nova', 'Cyber', 'Neon', 'Chrome',
    'Phantom', 'Shadow', 'Vector', 'Pixel', 'Binary', 'Digital', 'Atomic', 'Cosmic'
];

const nouns = [
    'Operator', 'Warrior', 'Agent', 'Runner', 'Pilot', 'Savant', 'Sage', 'Ghost',
    'Hunter', 'Alpha', 'Prime', 'Zero', 'One', 'Matrix', 'Nexus', 'Vertex',
    'Core', 'Synapse', 'Cortex', 'Circuit', 'Logic', 'Protocol', 'System', 'Net'
];

export function generateRandomUsername() {
    const adj = adjetives[Math.floor(Math.random() * adjetives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(1000 + Math.random() * 9000); // 4 digit number
    return `${adj}-${noun}-${num}`.toLowerCase();
}
