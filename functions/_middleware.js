import {shouldShell,shellResponse} from '../lib/app-shell.mjs';
export function onRequest(context){return shouldShell(context.request)?shellResponse(context.request):context.next();}
