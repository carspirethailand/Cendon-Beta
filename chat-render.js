/* Patch only changed messages. Keep existing inputs, media and scroll anchors alive. */
(function(W,D){
'use strict';
const cache=new WeakMap();
function paint(host,messages,htmlOf,signature){
  const previous=cache.get(host)||[],next=[],wanted=[];
  const html=messages.map(htmlOf);html.push(signature||'');
  for(let i=0;i<html.length;i++){
    let part=previous[i];
    if(!part||part.html!==html[i]||part.nodes.some(n=>n.parentNode!==host)){
      const template=D.createElement('template');template.innerHTML=html[i];
      part={html:html[i],nodes:Array.from(template.content.childNodes)};
    }
    next.push(part);wanted.push(...part.nodes);
  }
  const keep=new Set(wanted);
  for(const node of Array.from(host.childNodes))if(!keep.has(node))host.removeChild(node);
  let cursor=host.firstChild;
  for(const node of wanted){if(node===cursor)cursor=cursor.nextSibling;else host.insertBefore(node,cursor)}
  cache.set(host,next);
}
W.CendonChatRender=Object.freeze({paint});
})(window,document);
