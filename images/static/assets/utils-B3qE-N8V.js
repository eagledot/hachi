function f(i,...e){let n="";return i.forEach((o,r)=>{if(n+=o,r<e.length){const t=e[r];Array.isArray(t)?n+=t.join(""):n+=t}}),n}typeof window<"u"&&(window.html=f);export{f as h};
