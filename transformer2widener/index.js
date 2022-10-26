const fs = require('fs');

const accessTransformer = './META-INF/accesstransformer.cfg';
const modName = 'modid';

const data = fs.readFileSync(accessTransformer).toString();
let accessWidener = [];

accessWidener.push('accessWidener v1 named');

for (let line of data.replace(/\\r/g, '').split('\n')) {
    line = line.trim();

    if (line == '' || line.startsWith('#'))
        continue;

    const split = line.split(' ');

    let type = !split[0].endsWith('-f') ? 'extendable' : 'accessible';
    const className = split[1].replace(/\./g, '/');

    if (!split[2]) { // Class
        accessWidener.push(`${type} class ${className}`);
    } else if (split[2].includes('(')) { // Method
        const name = split[2].replace(/\([\w\W\d\D]+/, '');
        const descriptor = split[2].replace(name, '');

        let fullName = `${type} method ${className} `;
        if (!split[4]) { // Probably already named
            fullName += `${name} ${descriptor}`;
        } else {
            fullName += `${split[4]} ${descriptor}`;
        }

        fullName += ` # ${name}`;

        accessWidener.push(fullName);
    } else {
        if (type == 'extendable')
            type = 'mutable';

        let fullName = `${type} field ${className} `
        if (!split[4]) { // Probably already named
            fullName += `${split[2]} `;
        } else {
            fullName += `${split[4]} `;
        }

        fullName += `# ${split[2]}  ## THIS IS INCOMPLETE, PLEASE FIX!`;
        accessWidener.push(fullName);
    }
}   

fs.writeFileSync(`./${modName}.accesswidener`, accessWidener.join('\n'));