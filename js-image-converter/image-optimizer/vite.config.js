import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Jimp from "jimp";
import { parse } from 'svelte-parse-markup';
import { asyncWalk } from 'estree-walker';
import MagicString from 'magic-string';

export default defineConfig({
	plugins: [imagePreprocessor(), sveltekit()]
});

async function convertToJpg(original_url, opts) {
	const newUrl = original_url.replace('.png', '.jpg');
	if (fs.existsSync(path.resolve(opts.vite_config.publicDir, newUrl))) {
		return newUrl;
	}
    Jimp.read(original_url)
		.then((img) => {
			return img
			.write(newUrl); 
		})
		.catch((err) => {
			console.error(err);
		});
    console.log(`\nConverted ${original_url} to ${newUrl}`);
	return newUrl;
}

function customPreprocessor(opts) {
	return {
		async markup({ content, filename }) {
            if (!content.includes('<img')) {
                return;
            }
            const ms = new MagicString(content);
            const ast = parse(content, { filename });
    
            var imgCount = 0;
            await asyncWalk(ast.html, {
                async enter(node) {
                    if (node.type === 'Element') {
                        if (node.name === 'img') {
                            const src = node.attributes.find((v) => v.type === 'Attribute' && v.name === 'src')?.value[0];
                            const url = src.raw.trim();
                            const resolved_image_path = (await opts.context.resolve(url, filename))?.id;
                            const newUrl = await convertToJpg(resolved_image_path, opts);
                            
                            const name = `test${++imgCount}`;
                            const import_text = `import ${name} from "${newUrl}"`;

                            if (ast.instance) {
								ms.appendLeft(ast.instance.content.start, import_text);
							} else {
								ms.append(`<script>${import_text}</script>`);
							}
                            ms.update(src.start - 1, src.end + 1, `{${name}}`);
                            return;
                        }
                    }
                }
            });
            return {
                code: ms.toString(),
                map: ms.generateMap()
            };
        }
    }    
}

function imagePreprocessor() {

	const opts = {
		context: undefined,
		vite_config: undefined
	};

	return {
		name: 'svelte-image-optimizer',
		api: {
			sveltePreprocess: customPreprocessor(opts)
		},
		configResolved(config) {
			opts.vite_config = config;
		},
		buildStart() {
			opts.context = this;
		}
	}
}