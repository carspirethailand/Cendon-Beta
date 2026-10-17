/* One button: empty = call, text/attachment = send. Read state at the actual tap. */
(() => {
  'use strict';
  function bind({input,button,form=null,onCall,onSend,hasAttachment=()=>false,language='th'}){
    const en=language!=='th';let composing=false;
    const mode=()=>input.value.trim()||hasAttachment()?'send':'call';
    function sync(){const next=mode();button.disabled=false;button.dataset.mode=next;button.setAttribute('aria-label',next==='call'?(en?'Call Cendon':'โทรคุยกับ Cendon'):(en?'Send':'ส่ง'));const icon=button.querySelector('i');if(icon)icon.className='ti '+(next==='call'?'cd-wv':'ti-arrow-up');const label=button.querySelector('span');if(label)label.textContent=next==='call'?(en?'Call':'โทร'):(en?'Send':'ส่ง');}
    function go(e){e?.preventDefault();if(composing)return;sync();if(mode()==='call')onCall();else onSend(input.value.trim());}
    function key(e){if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!composing){e.preventDefault();if(mode()==='send')go();}}
    function begin(){composing=true;}function finish(){composing=false;sync();}
    input.addEventListener('input',sync);input.addEventListener('compositionstart',begin);input.addEventListener('compositionend',finish);input.addEventListener('keydown',key);button.onclick=go;if(form)form.onsubmit=go;sync();
    return Object.freeze({sync,dispose(){input.removeEventListener('input',sync);input.removeEventListener('compositionstart',begin);input.removeEventListener('compositionend',finish);input.removeEventListener('keydown',key);if(button.onclick===go)button.onclick=null;if(form?.onsubmit===go)form.onsubmit=null;}});
  }
  window.CendonCallComposer=Object.freeze({bind});
})();
