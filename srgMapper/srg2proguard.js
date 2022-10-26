const fs = require('fs');
const path = require('path');

module.exports = class SRG2ProGuard {
    // https://raw.githubusercontent.com/MinecraftForge/MCPConfig/master/versions/release/1.19.2/joined.tsrg
    srgMaps = fs.readFileSync('./data/joined.tsrg').toString();

    fieldRegex = /f_\d+_/;
    methodRegex = /m_\d+_/;
    classRegex = /(\w+(\/)?)+\/C_\d+_/;

    /**
     * @type {Map<string, { className: string, obfName: string, obfData?: string }>}
     */
    mappings = new Map();

    async map() {
        const split = this.srgMaps.split('\n');

        const started = new Date().getTime();
        console.log(`Mapping SRG maps to ProGuard obfuscation maps...`);

        let className = '';
        for (const line of split) {
            const trim = line.trim();

            const parts = trim.split(' ');

            //console.log(parts)
            if (!!parts[1] && parts[1].includes('C') && !parts[1].includes('(') && parts[1].includes('/') && this.classRegex.test(parts[1])) {
                className = parts[0];
                //console.log(`Mapping class ${className}...`);
            } else if (!!parts[1] && parts[1].startsWith('f')) {
                if (!this.fieldRegex.test(parts[1]))
                    continue;

                const obfName = parts[0];
                this.mappings.set(parts[1], {
                    className,
                    obfName,
                    obfData: null
                });
            } else if (!!parts[2] && parts[2].startsWith('m')) {
                if (!this.methodRegex.test(parts[2]))
                    continue;

                const obfName = parts[0];
                this.mappings.set(parts[2], {
                    className,
                    obfName,
                    obfData: parts[1]
                });
            }
        }

        console.log(`Successfully mapped SRG to ProGuard! (took ${Date.now() - started}ms)`);
    }
}