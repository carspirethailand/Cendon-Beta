// Test-only preload. Fresh browser profiles cannot contact the real backend or
// identity provider. Playwright route() fixtures are fulfilled before DNS.
import {pathToFileURL} from 'node:url';import {join} from 'node:path';
const pkg=process.env.CENDON_NODE_PACKAGES;if(!pkg)throw Error('Set CENDON_NODE_PACKAGES to the installed Playwright node_modules folder');
const {chromium}=await import(pathToFileURL(join(pkg,'playwright/index.mjs'))),launch=chromium.launch.bind(chromium);
chromium.launch=options=>launch({...options,args:[...(options?.args||[]),'--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost']});
