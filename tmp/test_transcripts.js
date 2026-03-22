const { YoutubeTranscript } = require('youtube-transcript');

async function testVids() {
    const vids = ['dQw4w9WgXcQ', '8A97pI_0Nno', 'h6_R5Iu9uRE']; // Never Gonna Give You Up (captions usually on), Physics (Walter Lewin), Khan Academy
    for (const vid of vids) {
        try {
            console.log(`Testing ${vid}...`);
            const t = await YoutubeTranscript.fetchTranscript(vid);
            console.log(`Success! Length: ${t.length}`);
        } catch (err) {
            console.error(`Failed ${vid}: ${err.message}`);
        }
    }
}
testVids();
