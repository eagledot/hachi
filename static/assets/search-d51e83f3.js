import{S as yt,i as vt,s as Ct,H as It,e as _,a as I,D as Dt,b as n,k as Et,c as D,d as r,E as Lt,l as S,y as jt,A as St,f as E,G as Pt,v as ve,r as ie,J as x,t as Z,h as _e,m as fe,j as Tt,M as Le,N as je,n as Ft,x as V,O as Ut,P as Se}from"./DarkMode-9991abd2.js";function Pe(t,l,e){const i=t.slice();return i[85]=l[e],i[87]=e,i}function Te(t,l,e){const i=t.slice();return i[88]=l[e],i}function Fe(t,l,e){const i=t.slice();return i[91]=l[e],i[92]=l,i[87]=e,i}function Ue(t){let l,e,i,a,f,d,o,u,p,c;return{c(){l=_("div"),e=_("br"),i=I(),a=_("input"),f=I(),d=_("button"),d.textContent="Start Indexing",o=I(),u=_("button"),u.textContent="Cancel",n(a,"type","text"),n(a,"class","bg-transparent w-72 focus:outline-none dark:text-white border-b border-black dark:border-white"),n(a,"placeholder","Provide absolute path to image directory."),n(d,"class","bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 m-2 rounded-md"),n(u,"class","bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 m-2 rounded-md")},m(b,y){D(b,l,y),r(l,e),r(l,i),r(l,a),t[46](a),x(a,t[8]),r(l,f),r(l,d),r(l,o),r(l,u),p||(c=[S(a,"input",t[47]),S(d,"click",t[38]),S(u,"click",t[48])],p=!0)},p(b,y){y[0]&256&&a.value!==b[8]&&x(a,b[8])},d(b){b&&E(l),t[46](null),p=!1,ie(c)}}}function Be(t){let l,e,i,a,f,d,o;return{c(){l=_("p"),l.textContent="Indexing in progress...please wait for it to finish.",e=I(),i=_("progress"),a=I(),f=_("button"),f.textContent="Cancel",n(l,"class","dark:text-white"),n(i,"class","bg-gray-400 h-3 mt-2 w-full"),i.value=t[10],n(i,"max","1"),n(f,"class","bg-yellow-600 hover:bg-yellow-800 disabled:bg-yellow-400 text-white py-1 px-3 m-2 rounded-md")},m(u,p){D(u,l,p),D(u,e,p),D(u,i,p),D(u,a,p),D(u,f,p),d||(o=S(f,"click",t[37]),d=!0)},p(u,p){p[0]&1024&&(i.value=u[10])},d(u){u&&E(l),u&&E(e),u&&E(i),u&&E(a),u&&E(f),d=!1,o()}}}function qe(t){let l;return{c(){l=_("div"),n(l,"class","flex-grow h-px my-5 bg-gray-500 dark:bg-white")},m(e,i){D(e,l,i)},d(e){e&&E(l)}}}function Oe(t){let l,e,i,a,f,d,o,u,p,c,b=t[2],y=[];for(let k=0;k<b.length;k+=1)y[k]=Re(Fe(t,b,k));return{c(){l=_("div"),e=_("div");for(let k=0;k<y.length;k+=1)y[k].c();i=I(),a=_("button"),a.textContent="Upload",f=I(),d=_("button"),d.textContent="Cancel",o=I(),u=_("div"),n(a,"class","bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 m-2 rounded-md"),n(d,"class","bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 m-2 rounded-md"),n(e,"class","my-2"),n(l,"class","flex flex-row place-content-center mt-10 mb-10 select-none mx-2"),n(u,"class","flex-grow h-px my-5 bg-gray-500 dark:bg-white")},m(k,L){D(k,l,L),r(l,e);for(let m=0;m<y.length;m+=1)y[m].m(e,null);r(e,i),r(e,a),r(e,f),r(e,d),D(k,o,L),D(k,u,L),p||(c=[S(a,"click",t[40]),S(d,"click",t[51])],p=!0)},p(k,L){if(L[0]&12){b=k[2];let m;for(m=0;m<b.length;m+=1){const j=Fe(k,b,m);y[m]?y[m].p(j,L):(y[m]=Re(j),y[m].c(),y[m].m(e,i))}for(;m<y.length;m+=1)y[m].d(1);y.length=b.length}},d(k){k&&E(l),ve(y,k),k&&E(o),k&&E(u),p=!1,ie(c)}}}function Re(t){let l,e,i,a,f,d,o,u=t[91].name+"",p,c,b,y,k;function L(){t[50].call(a,t[87])}return{c(){l=_("img"),i=I(),a=_("input"),f=I(),d=_("span"),o=_("p"),p=Z(u),c=I(),b=_("br"),_e(l.src,e=URL.createObjectURL(t[91]))||n(l,"src",e),n(l,"class","max-w-[20rem] max-h-72"),n(l,"alt","selected face"),n(a,"type","text"),n(a,"class","my-2"),n(a,"placeholder","enter unique Id"),n(o,"class","dark:text-white")},m(m,j){D(m,l,j),D(m,i,j),D(m,a,j),x(a,t[3][t[87]]),D(m,f,j),D(m,d,j),r(d,o),r(o,p),D(m,c,j),D(m,b,j),y||(k=S(a,"input",L),y=!0)},p(m,j){t=m,j[0]&4&&!_e(l.src,e=URL.createObjectURL(t[91]))&&n(l,"src",e),j[0]&8&&a.value!==t[3][t[87]]&&x(a,t[3][t[87]]),j[0]&4&&u!==(u=t[91].name+"")&&fe(p,u)},d(m){m&&E(l),m&&E(i),m&&E(a),m&&E(f),m&&E(d),m&&E(c),m&&E(b),y=!1,k()}}}function Me(t){let l,e,i,a,f,d,o,u,p,c,b,y,k,L,m,j,z,A,F,O,K,J,W,ee,te,U,C=t[17]&&ze(t);return{c(){l=_("input"),e=I(),i=_("button"),i.textContent="Query All Images",a=I(),C&&C.c(),f=I(),d=_("p"),o=Z(t[11]),u=Z(" Images Indexed So far."),p=I(),c=_("div"),b=_("input"),y=I(),k=_("label"),L=Z("Displaying top "),m=Z(t[14]),j=Z(" images."),z=I(),A=_("div"),F=_("input"),O=I(),K=_("label"),J=Z("Score threshold: "),W=Z(t[13]),ee=Z("."),l.autofocus=!0,n(l,"class","bg-transparent focus:outline-none dark:text-white border-b border-black dark:border-white"),n(l,"placeholder","Search"),n(i,"class","bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 my-2 ml-2 rounded-md"),n(d,"class","dark:text-white"),n(b,"type","range"),n(b,"min","1"),n(b,"max","30"),n(b,"class","w-full"),n(k,"for","topk"),n(k,"class","dark:text-white"),n(c,"class","my-4"),n(F,"type","range"),n(F,"min","0"),n(F,"max","1.0"),n(F,"step","0.01"),n(F,"class","w-full"),n(K,"for","topk"),n(K,"class","dark:text-white"),n(A,"class","my-4")},m(h,v){D(h,l,v),t[52](l),x(l,t[6]),D(h,e,v),D(h,i,v),t[55](i),D(h,a,v),C&&C.m(h,v),D(h,f,v),D(h,d,v),r(d,o),r(d,u),D(h,p,v),D(h,c,v),r(c,b),t[58](b),x(b,t[14]),r(c,y),r(c,k),r(k,L),r(k,m),r(k,j),D(h,z,v),D(h,A,v),r(A,F),x(F,t[13]),r(A,O),r(A,K),r(K,J),r(K,W),r(K,ee),l.focus(),te||(U=[S(l,"keyup",t[30]),S(l,"keydown",t[33]),S(l,"input",t[53]),S(i,"click",t[54]),S(b,"change",t[31]),S(b,"change",t[59]),S(b,"input",t[59]),S(F,"change",t[32]),S(F,"change",t[60]),S(F,"input",t[60])],te=!0)},p(h,v){v[0]&64&&l.value!==h[6]&&x(l,h[6]),h[17]?C?C.p(h,v):(C=ze(h),C.c(),C.m(f.parentNode,f)):C&&(C.d(1),C=null),v[0]&2048&&fe(o,h[11]),v[0]&16384&&x(b,h[14]),v[0]&16384&&fe(m,h[14]),v[0]&8192&&x(F,h[13]),v[0]&8192&&fe(W,h[13])},d(h){h&&E(l),t[52](null),h&&E(e),h&&E(i),t[55](null),h&&E(a),C&&C.d(h),h&&E(f),h&&E(d),h&&E(p),h&&E(c),t[58](null),h&&E(z),h&&E(A),te=!1,ie(U)}}}function ze(t){let l,e,i,a,f,d=t[16],o=[];for(let u=0;u<d.length;u+=1)o[u]=Ae(Te(t,d,u));return{c(){l=_("div"),e=_("select");for(let u=0;u<o.length;u+=1)o[u].c();n(e,"size",i=t[16].length<10?t[16].length:10),t[18]===void 0&&Tt(()=>t[56].call(e))},m(u,p){D(u,l,p),r(l,e);for(let c=0;c<o.length;c+=1)o[c].m(e,null);Le(e,t[18]),t[57](e),a||(f=[S(e,"click",t[34]),S(e,"keyup",t[35]),S(e,"change",t[56])],a=!0)},p(u,p){if(p[0]&65536){d=u[16];let c;for(c=0;c<d.length;c+=1){const b=Te(u,d,c);o[c]?o[c].p(b,p):(o[c]=Ae(b),o[c].c(),o[c].m(e,null))}for(;c<o.length;c+=1)o[c].d(1);o.length=d.length}p[0]&65536&&i!==(i=u[16].length<10?u[16].length:10)&&n(e,"size",i),p[0]&262144&&Le(e,u[18])},d(u){u&&E(l),ve(o,u),t[57](null),a=!1,ie(f)}}}function Ae(t){let l,e=t[88]+"",i,a,f;return{c(){l=_("option"),i=Z(e),a=I(),l.__value=f=t[88],l.value=l.__value},m(d,o){D(d,l,o),r(l,i),r(l,a)},p(d,o){o[0]&65536&&e!==(e=d[88]+"")&&fe(i,e),o[0]&65536&&f!==(f=d[88])&&(l.__value=f,l.value=l.__value)},d(d){d&&E(l)}}}function Ke(t){let l,e,i,a,f,d,o,u,p,c,b,y,k,L,m,j,z;function A(){return t[61](t[87])}return{c(){l=_("div"),e=_("a"),i=_("img"),d=I(),o=_("button"),o.textContent="Tag Face",u=I(),p=_("button"),c=je("svg"),b=je("path"),k=I(),L=_("div"),m=I(),n(i,"class","sm:max-h-48 rounded-lg shadow-xl"),_e(i.src,a=t[85])||n(i,"src",a),n(i,"alt","image"),n(e,"href",f="/api/get_full_image/"+t[5][t[87]]),n(e,"target","_blank"),n(e,"rel","noreferrer"),n(e,"class","rounded text-grey-darkest no-underline shadow-md h-full max-w-fit"),n(o,"class","hidden group-hover:block absolute bottom-0 w-full p-1 bg-blue-500 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-b-lg"),n(b,"d","M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"),n(c,"xmlns","http://www.w3.org/2000/svg"),n(c,"viewBox","0 0 20 20"),n(c,"fill","currentColor"),n(c,"class","w-5 h-5"),n(p,"data-hash",y=t[5][t[87]]),n(p,"data-index",t[87]),n(p,"class","hidden group-hover:block absolute top-0 right-0 bg-slate-700 hover:bg-slate-500 text-white p-2 rounded-full"),n(L,"class","absolute left-0 top-0 w-4 h-4 rounded-full bg-green-500 addpatch-"+t[87]+" hidden"),n(l,"class","relative group")},m(F,O){D(F,l,O),r(l,e),r(e,i),r(l,d),r(l,o),r(l,u),r(l,p),r(p,c),r(c,b),r(l,k),r(l,L),r(l,m),j||(z=[S(o,"click",A),S(p,"click",Mt)],j=!0)},p(F,O){t=F,O[0]&16&&!_e(i.src,a=t[85])&&n(i,"src",a),O[0]&32&&f!==(f="/api/get_full_image/"+t[5][t[87]])&&n(e,"href",f),O[0]&32&&y!==(y=t[5][t[87]])&&n(p,"data-hash",y)},d(F){F&&E(l),j=!1,ie(z)}}}function Ne(t){let l,e,i,a,f,d,o,u,p;return{c(){l=_("div"),e=_("div"),i=_("canvas"),a=I(),f=_("input"),d=I(),o=_("button"),o.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>',n(i,"class","max-w-full max-h-screen"),n(f,"class","absolute"),n(f,"type","text"),f.hidden=!0,n(o,"class","absolute top-0 right-0 text-pink-300 bg-slate-700 hover:text-pink-500 hover:bg-slate-500 p-2 rounded-full"),n(e,"class","relative"),n(l,"class","absolute flex justify-center items-center w-full h-full px-4 py-8 sm:px-24")},m(c,b){D(c,l,b),r(l,e),r(e,i),t[63](i),r(e,a),r(e,f),t[64](f),r(e,d),r(e,o),t[65](l),u||(p=[S(i,"click",t[41]),S(f,"keyup",t[42]),S(o,"click",t[44])],u=!0)},p:Ft,d(c){c&&E(l),t[63](null),t[64](null),t[65](null),u=!1,ie(p)}}}function Bt(t){let l,e,i,a,f,d,o,u,p,c,b,y,k,L,m,j,z,A,F,O,K,J,W,ee,te;o=new It({});let U=t[9]&&Ue(t),C=t[1]&&Be(t),h=(t[9]||t[1])&&qe(),v=t[21]&&Oe(t),R=t[12]&&t[11]>0&&Me(t),Q=t[4],N=[];for(let g=0;g<Q.length;g+=1)N[g]=Ke(Pe(t,Q,g));let H=t[28]&&Ne(t);return{c(){l=_("div"),e=_("div"),i=_("button"),i.textContent="Add Image directory",a=I(),f=_("button"),f.textContent="Update Person Database",d=I(),Dt(o.$$.fragment),u=I(),p=_("div"),c=_("div"),U&&U.c(),b=I(),C&&C.c(),y=I(),h&&h.c(),k=I(),L=_("input"),m=I(),v&&v.c(),j=I(),z=_("div"),A=_("div"),R&&R.c(),F=I(),O=_("div");for(let g=0;g<N.length;g+=1)N[g].c();K=I(),J=_("div"),H&&H.c(),n(i,"class","bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 mx-2 rounded-md"),n(f,"class","bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 mx-2 rounded-md"),n(e,"class","flex flex-row mt-10 justify-center"),n(p,"class","flex flex-row place-content-center mb-10 select-none mx-2"),n(L,"type","file"),L.multiple=!0,Et(L,"display","none"),n(L,"accept","image/png, image/jpeg, image/jpg"),n(z,"class","flex flex-row place-content-center mb-10 select-none mx-2"),n(O,"class","flex flex-wrap gap-6 p-4 sm:p-12 px-auto justify-center"),n(l,"class","overflow-y-auto min-h-screen dark:bg-gray-600 p-2 relative"),n(J,"class","fixed z-90 w-0 h-0 opacity-0 bg-gray-900")},m(g,X){D(g,l,X),r(l,e),r(e,i),r(e,a),r(e,f),r(e,d),Lt(o,e,null),r(l,u),r(l,p),r(p,c),U&&U.m(c,null),r(c,b),C&&C.m(c,null),r(l,y),h&&h.m(l,null),r(l,k),r(l,L),t[49](L),r(l,m),v&&v.m(l,null),r(l,j),r(l,z),r(z,A),R&&R.m(A,null),r(l,F),r(l,O);for(let M=0;M<N.length;M+=1)N[M].m(O,null);t[62](l),D(g,K,X),D(g,J,X),H&&H.m(J,null),t[66](J),W=!0,ee||(te=[S(i,"click",t[36]),S(f,"click",t[45]),S(L,"change",t[39])],ee=!0)},p(g,X){if(g[9]?U?U.p(g,X):(U=Ue(g),U.c(),U.m(c,b)):U&&(U.d(1),U=null),g[1]?C?C.p(g,X):(C=Be(g),C.c(),C.m(c,null)):C&&(C.d(1),C=null),g[9]||g[1]?h||(h=qe(),h.c(),h.m(l,k)):h&&(h.d(1),h=null),g[21]?v?v.p(g,X):(v=Oe(g),v.c(),v.m(l,j)):v&&(v.d(1),v=null),g[12]&&g[11]>0?R?R.p(g,X):(R=Me(g),R.c(),R.m(A,null)):R&&(R.d(1),R=null),X[0]&48|X[1]&4096){Q=g[4];let M;for(M=0;M<Q.length;M+=1){const ae=Pe(g,Q,M);N[M]?N[M].p(ae,X):(N[M]=Ke(ae),N[M].c(),N[M].m(O,null))}for(;M<N.length;M+=1)N[M].d(1);N.length=Q.length}g[28]?H?H.p(g,X):(H=Ne(g),H.c(),H.m(J,null)):H&&(H.d(1),H=null)},i(g){W||(jt(o.$$.fragment,g),W=!0)},o(g){St(o.$$.fragment,g),W=!1},d(g){g&&E(l),Pt(o),U&&U.d(),C&&C.d(),h&&h.d(),t[49](null),v&&v.d(),R&&R.d(),ve(N,g),t[62](null),g&&E(K),g&&E(J),H&&H.d(),t[66](null),ee=!1,ie(te)}}}const qt="/api";async function Ot(t,l){let e="/api/imageBinaryData/"+t+"/"+l,a=await(await fetch(e)).blob();return await URL.createObjectURL(a)}async function Rt(t,l){let e=new FormData;e.append("mimetype",t.type),e.append("id",l),e.append("imagedata",t);const a=await fetch("/api/updateDatabase",{method:"POST",body:e});if(a.ok){const f=await a.json();alert(f.reason)}else throw new Error(a)}async function Mt(){const t=this.dataset.hash;let l=document.getElementsByClassName("addpatch-"+this.dataset.index)[0];l.classList.contains("bg-green-500")?(l.classList.remove("bg-green-500"),l.classList.add("bg-red-500")):(l.classList.remove("bg-red-500"),l.classList.add("bg-green-500"));let e="/api/get_full_path/"+t;const i=await fetch(e),a=await i.text();if(!i.ok)throw new Error(a);alert("Image full path:  "+a)}function zt(t,l,e){let i=[],a=[],f=[],d=[],o,u="",p,c,b,y=!1,k="0",L=!1,m=0,j=!0,z=0,A="";function F(){const s=f.map((w,T)=>({i:T,value:f[T]}));s.sort((w,T)=>w.value>T.value?-1:w.value<T.value?1:0),f=s.map(w=>w.value),e(4,a=s.map(w=>a[w.i])),e(5,d=s.map(w=>d[w.i]))}let O=3;async function K(s="xxxxxxx",w=!1){let T=O;if(p=new FormData,!u)return;p.append("text_query",u),p.append("topk",T.toString()),w&&p.append("data_generation_id",s),w==!1&&(e(4,a=[]),e(5,d=[]),f=[],e(13,z=0),p.append("query_start","true"),e(0,o.disabled=!0,o));const P=qt+"/search/image";let B=await fetch(P,{method:"POST",body:p});if(!B.ok)throw e(0,o.disabled=!1,o),new Error(B);let q=await B.json();if(q.query_completed==!0){e(0,o.disabled=!1,o),i=a;return}else{let oe=q.data_generation_id;for(let le=0;le<q.local_hashes.length;le++){d.push(q.local_hashes[le]),f.push(q.scores[le]);let ke=await Ot(q.local_hashes[le],oe);a.push(ke),F()}await K(oe,!0)}}function J(s){s.key==="Enter"&&o.disabled==!1&&K()}let W;function ee(){console.log("topk: ",O),K()}function te(){if(f.length>0){let s=f[0],w=f[f.length-1],T=f.map((P,B)=>(P-w)/(s-w+1e-5));e(4,a=i.filter((P,B)=>T[B]>=z))}}let U=[],C=!1,h,v=!1,R,Q;async function N(){let s=await fetch("/api/faceIds");if(s.ok){let w=await s.json();e(16,U=w.face_ids.sort())}else throw new Error(s)}async function H(s){s.key==="@"?(e(17,C=!0),v=!1,await N(),Q.focus(),e(18,h=U[0]),console.log("faces: ",U)):(s.key==="Enter"||s.key===" ")&&e(17,C=!1)}function g(){v||(e(6,u=u+h),v=!0),R.focus(),e(17,C=!1)}function X(s){s.key==="Enter"&&g(),(s.key==="Escape"||s.key==="Backspace")&&(e(17,C=!1),R.focus())}function M(){e(9,y=!0)}async function ae(){let s=await fetch("/api/getIndexCount/image");if(s.ok){let w=await s.json();e(11,m=w.index_count)}else throw new Error(s)}let be;async function Ce(s,w=0){w==0&&(e(1,L=!0),e(9,y=!1));let P=await(await fetch(s,{method:"GET"})).json();if(P.status_available==!0){if(P.done==!0){e(1,L=!1),await ae();let q=new FormData;q.append("ack","true"),(await fetch(s,{method:"POST",body:q})).ok===!1&&console.log("index updated succesfully, but server should have responded with 200 code"),alert("Index Updated Successfully.");return}e(10,k=P.progress),be&&clearTimeout(be),be=setTimeout(function(){Ce(s,w+1)},1e3)}}async function He(){let s=new FormData;s.append("cancel","true");let w=await fetch(A,{method:"POST",body:s});if(!w.ok)throw new Error(w);alert("Indexing Cancelled.")}async function Ge(){console.log("Adding image directory: "+b),o&&e(0,o.disabled=!0,o);let s=new FormData;s.append("image_directory_path",b);let P=await(await fetch("/api/indexImageDir",{method:"POST",body:s})).json();if(P.success){let q="/api/indexStatus/"+P.statusEndpoint;A=q,Ce(q)}else o&&e(0,o.disabled=!1,o)}ae();let ce=!1,de,$,se=[];function We(){e(2,$=[]),e(3,se=[]),e(2,$=this.files),console.log($.length,"Files Selected");for(let s=0;s<$.length;s++){let w=$[s];console.log("mimetype: ",w.type),se.push("")}e(21,ce=!0)}async function Xe(s){s.preventDefault();for(let w=0;w<$.length;w++){let T=se[w],P=$[w];if(T===""){alert("face ids cannot be empty");return}await Rt(P,T)}e(21,ce=!1)}let ne,Ie,me,ue,Y,ge,pe=[],G,we=!1,re="",he="";async function Ye(s){let w="/api/get_bboxes/"+s;const T=await fetch(w),P=await T.json();if(!T.ok)throw new Error(P);let B=P.bboxes;console.log("bboxes: ",B),Ve(B)}function Je(s){const w=Y.getContext("2d");console.log("bbpath[0]: ",pe);const T=Y.height/Y.clientHeight,P=Y.width/Y.clientWidth;console.log(Y);let B=!1;for(const q in pe)if(B=w.isPointInPath(pe[q],s.offsetX*P,s.offsetY*T),B==!0){re=q;break}B==!0?(e(27,G.hidden=!1,G),G.focus(),e(27,G.style.left=s.offsetX+"px",G),e(27,G.style.top=s.offsetY+"px",G)):(e(27,G.hidden=!0,G),re=""),console.log("isPoint in path: ",B,"id: ",re)}async function Qe(s){if(s.key==="Enter"&&G.value&&he&&re!==""){let w="/api/tag_face/"+he+"/"+re+"/"+G.value;const T=await fetch(w),P=await T.json();if(!T.ok)throw new Error(P);console.log("face tag result: ",T),e(27,G.hidden=!0,G),alert("Face updated successfully")}}function Ve(s){const w=ue.height,T=ue.width;e(25,Y.height=w,Y),e(25,Y.width=T,Y);const P=Y.getContext("2d");P.drawImage(ue,0,0),P.beginPath();let B=w*T/1e6;B=B<1?1:B>7?7:B,console.log("width multiplier: ",B),P.lineWidth=3*B,P.strokeStyle="red";for(const q in s){let oe=s[q][0],le=s[q][1],ke=s[q][2]-oe,kt=s[q][3]-le,ye=new Path2D;ye.rect(oe,le,ke,kt),P.stroke(ye),pe[q]=ye}P.stroke()}function De(s){e(28,we=!0),ne.classList.remove("w-0","h-0","opacity-0"),ne.classList.add("w-screen","h-screen","bg-opacity-95","inset-0"),Ie="/api/get_full_image/"+s,he=s,ue=new Image,ue.src=Ie,Ye(s)}function Ee(){e(28,we=!1),ne.classList.remove("w-screen","h-screen","bg-opacity-95","inset-0"),ne.classList.add("w-0","h-0","opacity-0"),he=""}document.addEventListener("keydown",function(s){s.key==="Escape"&&Ee()});let Ze;u="@brucelee";const xe=()=>{de.click()};function $e(s){V[s?"unshift":"push"](()=>{c=s,e(7,c)})}function et(){b=this.value,e(8,b)}const tt=()=>{e(9,y=!1)};function lt(s){V[s?"unshift":"push"](()=>{de=s,e(22,de)})}function st(s){se[s]=this.value,e(3,se)}const nt=()=>{e(21,ce=!1)};function it(s){V[s?"unshift":"push"](()=>{R=s,e(19,R)})}function ot(){u=this.value,e(6,u)}const at=async s=>{await K()};function ut(s){V[s?"unshift":"push"](()=>{o=s,e(0,o)})}function rt(){h=Ut(this),e(18,h)}function ft(s){V[s?"unshift":"push"](()=>{Q=s,e(20,Q),e(16,U)})}function ct(s){V[s?"unshift":"push"](()=>{W=s,e(15,W),e(0,o)})}function dt(){O=Se(this.value),e(14,O)}function pt(){z=Se(this.value),e(13,z)}const ht=s=>De(d[s]);function _t(s){V[s?"unshift":"push"](()=>{me=s,e(24,me)})}function bt(s){V[s?"unshift":"push"](()=>{Y=s,e(25,Y)})}function mt(s){V[s?"unshift":"push"](()=>{G=s,e(27,G)})}function gt(s){V[s?"unshift":"push"](()=>{ge=s,e(26,ge)})}function wt(s){V[s?"unshift":"push"](()=>{ne=s,e(23,ne)})}return t.$$.update=()=>{t.$$.dirty[0]&2&&e(12,j=!L),t.$$.dirty[0]&1&&o&&e(15,W.disabled=o.disabled,W),t.$$.dirty[0]&12&&(console.log($),console.log(se))},console.log("image selected: ",Ze),[o,L,$,se,a,d,u,c,b,y,k,m,j,z,O,W,U,C,h,R,Q,ce,de,ne,me,Y,ge,G,we,K,J,ee,te,H,g,X,M,He,Ge,We,Xe,Je,Qe,De,Ee,xe,$e,et,tt,lt,st,nt,it,ot,at,ut,rt,ft,ct,dt,pt,ht,_t,bt,mt,gt,wt]}class At extends yt{constructor(l){super(),vt(this,l,zt,Bt,Ct,{},null,[-1,-1,-1])}}new At({target:document.getElementById("app")});