const fs = require('fs');
const path = require('path');
const ProGuard2MojMap = require('./proguard2mojmap');
const SRG2MojMap = require('./srg2mojmap');
const SRG2ProGuard = require('./srg2proguard');

const { resolve } = path;
const { readdir } = fs.promises;

async function* getFiles(dir) {
    const dirents = await readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            yield* getFiles(res);
        } else {
            yield res;
        }
    }
}

/**
 * @type {string[]}
 */
let files = [];

(async () => {
    const main = path.join(__dirname, '../main');
    const copy = path.join(__dirname, '../main_copy');
    let copyFiles = true;

    if (fs.existsSync(copy)) {
        copyFiles = false;

        console.log(`Resetting files to restart progress.`);
        for await (const file of getFiles(copy)) {
            if (!fs.existsSync(path.join(copy, '../')))
                fs.mkdirSync(path.join(copy, '../'));

            fs.copyFileSync(file, path.join(main, file.replace(copy, '')));
        }
    }

    console.log(`Loading files...`);
    for await (const file of getFiles(main)) {
        if (copyFiles) {
            const copyPath = path.join(copy, file.replace(main, ''));

            if (!fs.existsSync(path.join(copyPath, '../')))
                fs.mkdirSync(path.join(copyPath, '../'), { recursive: true });
                
            fs.copyFileSync(file, copyPath);
        }

        files.push(file);
    }

    const srg = new SRG2ProGuard();
    const mojmap = new ProGuard2MojMap();

    const srg2mojmap = new SRG2MojMap(srg, mojmap);

    if (!(await srg2mojmap.load())) {
        await srg.map();
        await mojmap.map();

        await srg2mojmap.map();
    }

    const started = new Date().getTime();
    console.log(`Mapping all source files from SRG to official Mojang mappings...`);

    await (Promise.all(files.map(async file => { // This *might* help with speeding up mapping.
        if (!file.endsWith('.java') && !file.endsWith('.kt') && !file.endsWith('.groovy'))
            return;
            
        let data = (await fs.promises.readFile(file)).toString();

        console.log(`Mapping file ${file.replace(main, '')}`);

        for (const [srgName, mojmapName] of srg2mojmap.mappings.entries()) {
            data = data.replace(new RegExp(srgName, 'g'), mojmapName);
        }

        await fs.promises.writeFile(file, data);
    })));

    console.log(`Successfully mapped all source files from SRG official Mojang mappings! (took ${Date.now() - started}ms)`);
})();