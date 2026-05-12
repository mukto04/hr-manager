
import fs from 'fs';

const content = fs.readFileSync('src/app/super-admin/landing-controller/page.tsx', 'utf8');
let open = 0;
let lineNum = 1;
const lines = content.split('\n');

for (const line of lines) {
    const openTags = (line.match(/<div/g) || []).length;
    const closeTags = (line.match(/<\/div/g) || []).length;
    const selfClosing = (line.match(/<div[^>]*\/>/g) || []).length;
    open += openTags - closeTags - selfClosing;
    if (line.includes('activeTab ===')) {
        console.log(`Line ${lineNum} (Tab Start): ${open}`);
    }
    if (line.includes(')}')) {
        console.log(`Line ${lineNum} (Tab End): ${open}`);
    }
    lineNum++;
}
console.log(`Final count: ${open}`);
