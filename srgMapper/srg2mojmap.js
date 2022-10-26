const fs = require('fs');

module.exports = class SRG2MojMap {
    /**
     * @type {import('./srg2proguard')}
     */
    srg;
    /**
     * @type {import('./proguard2mojmap')}
     */
    mojmap;

    /**
     * @type {Map<string, string>}
     */
    mappings = new Map();

    constructor(srg, mojmap) {
        this.srg = srg;
        this.mojmap = mojmap;
    }

    async load() {
        if (fs.existsSync('./data/full_mappings.txt')) {
            const data = fs.readFileSync('./data/full_mappings.txt').toString();

            for (const line of data.split('\n')) {
                const split = line.split('=');
                this.mappings.set(split[0], split[1]);
            }

            return true;
        }

        return false;
    }

    async map() {
        const started = new Date().getTime();
        console.log(`Mapping SRG directly to official Mojang mappings using ProGuard...`);

        for (const [key, value] of this.srg.mappings.entries()) {
            const classMappings = this.mojmap.mappings.get(value.className);

            if (!classMappings)
                continue;

            if (key.startsWith('f')) {
                this.mappings.set(key, classMappings.fields.get(value.obfName));
            } else if (key.startsWith('m')) {
                const methods = classMappings.methods.filter(a => a.obfName == value.obfName);

                let methodMapping = '';

                const mojmapDescriptor = this.convertBytecodeDescriptor(value.obfData);
                for (const method of methods) {
                    if (method.obfData == mojmapDescriptor)
                        methodMapping = method.mapName;
                }

                if (methodMapping == '')
                    methodMapping = methods[0].mapName;
                
                this.mappings.set(key, methodMapping);
            } else {
                console.warn(`Discarded invalid key ${key}`);
            }
        }

        console.log(`Successfully mapped SRG to MojMaps! (took ${Date.now() - started}ms)`);

        fs.writeFileSync(`./data/full_mappings.txt`, [...this.mappings.entries()].map(a => `${a[0]}=${a[1]}`).join('\n'));
    }

    /**
     * 
     * @param {string} descriptor 
     * @returns {string}
     */
    convertBytecodeDescriptor(descriptor) {
        if (descriptor.startsWith('()'))
            return '';

        let inner = descriptor.match(/\(((\w|\W|\d|\D)+?)\)/g)[0];
        
        inner = inner.substring(1, inner.length - 1);

        const charArray = inner.split('');
        let mappings = [];
        let str = '';

        let inArray = false,
            inClass = false;
        for (let cursor = 0; cursor < charArray.length; cursor++) {
            const char = charArray[cursor]; 

            if (char == 'L' && !inClass) {
                inClass = true;
            } else if (inClass) {
                if (char == ';') {
                    const className = this.mojmap.classMappings.get(str);

                    const name = `${className ?? str}${inArray ? '[]' : ''}`;
                    mappings.push(name);

                    inClass = false;
                    inArray = false;
                    str = '';
                } else {
                    str += char;
                }
            } else if (char == '[' && !inArray) {
                inArray = true;
            } else {
                const name = `${(
                    char == 'B' ? 'byte' :
                    char == 'C' ? 'char' :
                    char == 'D' ? 'double' :
                    char == 'F' ? 'float' :
                    char == 'I' ? 'int' :
                    char == 'J' ? 'long' :
                    char == 'S' ? 'short' :
                    char == 'Z' ? 'boolean' :
                    ''
                )}${inArray ? '[]' : ''}`;

                mappings.push(name);
                inArray = false;
            }
        }

        return mappings.join(',');
    }
}