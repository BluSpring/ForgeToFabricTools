const fs = require('fs');

module.exports = class ProGuard2MojMap {
    // https://minecraft.fandom.com/wiki/Java_Edition_1.19.2
    mojMaps = fs.readFileSync('./data/1.19.2.txt').toString();

    /**
     * @type {Map<string, {
     *  className: string;
     *  fields: Map<string, string>,
     *  methods: {
     *      obfName: string
     *      mapName: string,
     *      obfData: string
     *  }[]
     * }>}
     */
    mappings = new Map();
    classMappings = new Map();

    async map() {
        const split = this.mojMaps.split('\n');

        const started = new Date().getTime();
        console.log(`Mapping ProGuard obfuscation mappings to official Mojang mappings...`);

        let currentClassName = '';

        /**
         * @type {{
         *  className: string;
         *  fields: Map<string, string>,
         *  methods: Map<string, string>
         * }}
         */
        let currentClass = null;
        for (const line of split) {
            const trimmed = line.trim();

            if (trimmed.startsWith('#'))
                continue;

            const parts = trimmed.replace(/-> /g, '').split(' ');

            if (parts[parts.length - 1].endsWith(':')) { // Class
                if (currentClass) // Lazy add
                    this.mappings.set(currentClassName, currentClass);

                currentClassName = parts[1].replace(':', '');
                currentClass = {
                    className: parts[0],
                    fields: new Map(),
                    methods: []
                };
                this.classMappings.set(currentClassName, currentClass.className);

                //console.log(`Mapping ${currentClassName}...`);
            } else if (parts.length == 3) {
                if (parts[1].includes('(') && parts[1].endsWith(')')) { // Very likely to be a method
                    // Replace the params with nothing, it's not required.

                    const obfData = parts[1].replace(/\w+\(/, '');

                    currentClass.methods.push({
                        obfName: parts[2],
                        mapName: parts[1].replace(/\((\w|\W|\d|\D)+?\)/g, '').replace(/\(\)/g, '').replace(/(lambda\$|\$\d+)/g, ''),
                        obfData: obfData.substring(0, obfData.length - 1)
                    });
                } else {
                    currentClass.fields.set(parts[2], parts[1]);
                }
            }
        }

        console.log(`Successfully mapped ProGuard to official Mojang mappings! (took ${Date.now() - started}ms)`);
    }
}