import{n as D,s as se,S as fe,i as de,e as d,a as V,b as u,c as x,d as c,u as Pe,f as I,t as R,l as C,g as Re,h as ie,j as We,k as re,m as pe,r as be,o as ge,p as Je,q as he,v as Ne,w as Ke,x as ee,y as K,z as ke,A as U,B as ve,C as Ge,D as ae,E as ce,F as Oe,G as ue,H as Xe,I as Ue,J as ye,K as qe,L as Ye}from"./DarkMode-c0a89b8c.js";const Me="/assets/fire-cb6a32ef.svg",ne=[];function Qe(l,t=D){let e;const n=new Set;function s(a){if(se(l,a)&&(l=a,e)){const p=!ne.length;for(const r of n)r[1](),ne.push(r,l);if(p){for(let r=0;r<ne.length;r+=2)ne[r][0](ne[r+1]);ne.length=0}}}function o(a){s(a(l))}function i(a,p=D){const r=[a,p];return n.add(r),n.size===1&&(e=t(s)||D),a(l),()=>{n.delete(r),n.size===0&&(e(),e=null)}}return{set:s,update:o,subscribe:i}}const oe="/api/",ze=Qe(-1),me=Qe(!1);function Te(l,t,e){const n=l.slice();return n[3]=t[e],n}function Ze(l){let t,e;return{c(){t=d("img"),ie(t.src,e=l[3].svg)||u(t,"src",e),u(t,"alt",l[3].text),u(t,"class","dark:text-white w-6 h-6")},m(n,s){x(n,t,s)},p:D,d(n){n&&I(t)}}}function Se(l,t){let e,n,s,o,i,a=t[3].text+"",p,r,b,k,_=t[3].svg&&Ze(t);return{key:l,first:null,c(){e=d("li"),n=d("button"),s=d("span"),_&&_.c(),o=V(),i=d("span"),p=R(a),r=V(),u(i,"class","pl-2"),u(s,"class","capitalize flex items-center"),u(n,"class","w-full pl-8 py-2"),u(e,"class","font-semibold text-gray-700 dark:text-white hover:bg-pink-200 hover:dark:text-gray-700 mb-2 transition duration-500"),this.first=e},m(M,j){x(M,e,j),c(e,n),c(n,s),_&&_.m(s,null),c(s,o),c(s,i),c(i,p),c(e,r),b||(k=C(n,"click",t[3].func),b=!0)},p(M,j){t=M,t[3].svg&&_.p(t,j)},d(M){M&&I(e),_&&_.d(),b=!1,k()}}}function $e(l){let t,e,n,s,o=[],i=new Map,a=l[0];const p=r=>r[3].id;for(let r=0;r<a.length;r+=1){let b=Te(l,a,r),k=p(b);i.set(k,o[r]=Se(k,b))}return{c(){t=d("nav"),e=d("div"),e.innerHTML=`<a class="flex md:flex-col items-center" href="https:ramanlabs.in"><svg class="h-20 w-40 m-4 md:mt-10" viewBox="0 0 110 110"><circle class="fill-[#00f] opacity-[.24797] dark:fill-pink-100 dark:opacity-100" cx="55" cy="55" r="55" style="stroke-width:3.1181"></circle><path style="fill-opacity:.62308;fill:#1a1a1a;stroke-width:4;stroke:#000" d="M41.451 49.81h26.458v26.458H41.451z"></path><g style="fill:none;stroke-width:4;stroke:#000"><path d="M46.743 76.27v11.906M62.618 76.27v11.906M54.68 76.27v6.615M67.909 63.04h6.615M41.451 63.04h-6.615M54.68 76.27v5.292M54.68 49.81v-6.615M41.451 55.1H30.868M41.451 70.98H21.607L11.024 88.178M67.909 70.98h19.844l10.583 17.198M67.909 55.1h10.583M46.743 49.81V8.8l-6.615-6.615M62.618 49.81V8.8l6.615-6.615"></path></g><circle cx="46.743" cy="55.1" r=".671" style="fill-opacity:.62308;fill:#1a1a1a;stroke-width:2;stroke:#000"></circle></svg> 
      
      <svg class="h-8 w-40 m-4" viewBox="0 0 57.975 8.308"><g style="stroke-width:.26458"><path d="M.519 4.65q0-.635.307-1.132.317-.508.847-.805.529-.296 1.164-.296t.942.212q.317.2.243.486-.032.149-.127.233-.085.074-.201.095-.116.022-.254-.01-.677-.138-1.217-.021-.54.116-.857.434-.307.317-.307.804zm.01 3.62q-.253 0-.391-.128Q0 8.005 0 7.74V3.01q0-.254.138-.392T.53 2.48q.264 0 .391.138.138.127.138.392v4.73q0 .254-.138.392-.127.137-.391.137zM7.133 8.31q-.773 0-1.386-.381-.614-.392-.974-1.048-.35-.667-.35-1.503 0-.836.382-1.502.391-.667 1.047-1.048.667-.392 1.493-.392.825 0 1.481.392.656.38 1.037 1.048.392.666.392 1.502h-.413q0 .836-.36 1.503-.349.656-.963 1.048-.613.381-1.386.381zm.212-.952q.54 0 .963-.254.423-.265.666-.71.244-.455.244-1.016 0-.571-.244-1.016-.243-.455-.666-.709-.424-.264-.963-.264-.53 0-.963.264-.424.254-.678.71-.243.444-.243 1.015 0 .561.243 1.016.254.445.678.71.434.254.963.254zm2.37.92q-.232 0-.391-.148-.148-.159-.148-.391v-1.62l.2-1.121.88.38v2.36q0 .233-.16.392-.148.148-.38.148zM19.463 8.28q-.233 0-.392-.148-.148-.159-.148-.392V4.713q0-.666-.328-.984-.328-.328-.857-.328-.55 0-.91.381-.35.381-.35.974H15.6q0-.688.296-1.207.297-.529.826-.825.54-.297 1.228-.297.603 0 1.069.265.465.265.72.783.264.508.264 1.238V7.74q0 .233-.148.392-.149.148-.392.148zm-7.06 0q-.232 0-.39-.148-.149-.159-.149-.392V3.03q0-.243.148-.39.16-.15.392-.15.243 0 .391.15t.149.39v4.71q0 .233-.149.392-.148.148-.391.148zm3.536 0q-.233 0-.392-.148-.148-.159-.148-.392V4.713q0-.666-.328-.984-.328-.328-.857-.328-.55 0-.91.381t-.36.974h-.667q0-.688.275-1.207.275-.529.762-.825.487-.297 1.111-.297.603 0 1.07.265.465.265.719.783.264.508.264 1.238V7.74q0 .233-.148.392-.148.148-.391.148zM24.204 8.31q-.773 0-1.386-.381-.614-.392-.974-1.048-.35-.667-.35-1.503 0-.836.382-1.502.391-.667 1.047-1.048.667-.392 1.493-.392.825 0 1.481.392.656.38 1.037 1.048.392.666.392 1.502h-.413q0 .836-.36 1.503-.349.656-.963 1.048-.613.381-1.386.381zm.212-.952q.54 0 .963-.254.423-.265.666-.71.244-.455.244-1.016 0-.571-.244-1.016-.243-.455-.666-.709-.424-.264-.963-.264-.53 0-.963.264-.424.254-.678.71-.243.444-.243 1.015 0 .561.243 1.016.254.445.678.71.434.254.963.254zm2.37.92q-.232 0-.391-.148-.148-.159-.148-.391v-1.62l.2-1.121.88.38v2.36q0 .233-.16.392-.148.148-.38.148zM33.824 8.28q-.233 0-.392-.148-.148-.159-.148-.392V5.137q0-.603-.222-.984t-.603-.561q-.37-.19-.858-.19-.444 0-.804.179-.36.18-.571.487-.212.296-.212.688h-.667q0-.667.318-1.186.328-.529.889-.836t1.26-.307q.73 0 1.3.318.583.307.911.91.339.603.339 1.482V7.74q0 .233-.16.392-.147.148-.38.148zm-4.35 0q-.233 0-.391-.148-.148-.159-.148-.392V3.02q0-.243.148-.392.158-.148.391-.148.244 0 .392.148.148.149.148.392v4.72q0 .233-.148.392-.148.148-.392.148z"></path><path class="fill-[#007af3] dark:fill-pink-100" transform="translate(-27.111 -146.27)" d="M64.639 154.54q-.466 0-.826-.254t-.56-.688q-.202-.444-.202-1.016v-5.778q0-.233.149-.381.148-.149.38-.149.233 0 .382.149.148.148.148.38v5.78q0 .39.148.645.148.254.381.254h.265q.211 0 .338.148.138.148.138.38t-.201.382q-.201.148-.519.148zM68.534 154.58q-.773 0-1.386-.381-.614-.392-.974-1.048-.35-.667-.35-1.503 0-.836.382-1.502.391-.667 1.047-1.048.667-.392 1.493-.392.825 0 1.481.392.656.38 1.037 1.048.392.666.392 1.502h-.413q0 .836-.36 1.503-.349.656-.963 1.048-.613.381-1.386.381zm.212-.953q.54 0 .963-.253.423-.265.667-.71.243-.455.243-1.016 0-.571-.243-1.016-.244-.455-.667-.709-.424-.264-.963-.264-.53 0-.963.264-.424.254-.678.71-.243.444-.243 1.015 0 .561.243 1.016.254.445.678.71.434.254.963.254zm2.37.921q-.232 0-.391-.148-.148-.159-.148-.391v-1.62l.2-1.121.88.38v2.36q0 .233-.16.392-.148.148-.38.148zM76.175 154.58q-.826 0-1.482-.381-.656-.392-1.037-1.058-.38-.667-.391-1.503v-4.826q0-.244.148-.392.158-.148.391-.148.244 0 .392.148.148.148.148.392v2.857q.37-.444.889-.698.53-.265 1.154-.265.772 0 1.386.392.614.38.963 1.048.36.656.36 1.492t-.392 1.503q-.38.666-1.037 1.058-.656.381-1.492.381zm0-.953q.54 0 .963-.253.423-.265.667-.72.254-.455.254-1.016 0-.572-.254-1.016-.244-.445-.667-.699-.423-.264-.963-.264-.53 0-.963.264-.423.254-.667.699-.243.444-.243 1.016 0 .56.243 1.016.244.455.667.72.434.254.963.254zM82.811 154.58q-.74 0-1.376-.222-.624-.233-.973-.582-.16-.17-.138-.381.032-.223.212-.36.211-.17.412-.138.212.021.36.18.18.201.572.381.402.17.889.17.614 0 .931-.202.328-.2.339-.518.01-.318-.307-.55-.307-.233-1.133-.381-1.069-.212-1.555-.635-.477-.424-.477-1.038 0-.54.318-.889.317-.36.815-.529.497-.18 1.037-.18.699 0 1.238.222t.858.614q.148.17.137.36-.01.18-.18.307-.17.116-.402.074-.233-.042-.392-.19-.264-.254-.571-.35-.307-.095-.71-.095-.465 0-.793.159-.317.159-.317.466 0 .19.095.349.106.148.402.275.296.116.868.233.794.159 1.249.402.465.243.666.571.201.318.201.741 0 .487-.264.879-.254.391-.762.624-.498.233-1.249.233z"></path></g></svg></a>`,n=V(),s=d("ul");for(let r=0;r<o.length;r+=1)o[r].c();u(s,"class",""),u(t,"class","md:w-56 max-md:flex max-md:flex-col bg-gray-100 dark:bg-gray-500 md:overflow-y-auto py-4")},m(r,b){x(r,t,b),c(t,e),c(t,n),c(t,s);for(let k=0;k<o.length;k+=1)o[k].m(s,null)},p(r,[b]){b&1&&(a=r[0],o=Pe(o,b,p,1,r,a,i,s,Re,Se,null,Te))},i:D,o:D,d(r){r&&I(t);for(let b=0;b<o.length;b+=1)o[b].d()}}}function et(){window.location.href="/video_search.html"}function tt(){window.location.href="/search.html"}function lt(l,t,e){let{dirname:n=""}=t;const s=[{id:2,func:et,text:"Video Search",svg:Me},{id:3,func:tt,text:"Image Search",svg:Me}];return l.$$set=o=>{"dirname"in o&&e(1,n=o.dirname)},[s,n]}class nt extends fe{constructor(t){super(),de(this,t,lt,$e,se,{dirname:1})}}function Ve(l,t,e){const n=l.slice();return n[35]=t[e],n[37]=e,n}function xe(l,t,e){const n=l.slice();return n[38]=t[e],n}function Ie(l){let t,e=l[10],n=[];for(let s=0;s<e.length;s+=1)n[s]=je(xe(l,e,s));return{c(){for(let s=0;s<n.length;s+=1)n[s].c();t=he()},m(s,o){for(let i=0;i<n.length;i+=1)n[i].m(s,o);x(s,t,o)},p(s,o){if(o[0]&1536){e=s[10];let i;for(i=0;i<e.length;i+=1){const a=xe(s,e,i);n[i]?n[i].p(a,o):(n[i]=je(a),n[i].c(),n[i].m(t.parentNode,t))}for(;i<n.length;i+=1)n[i].d(1);n.length=e.length}},d(s){Ne(n,s),s&&I(t)}}}function je(l){let t;return{c(){t=d("div"),u(t,"class","absolute bg-blue-900 top-0 w-[4px] h-full max-w-full"),re(t,"left",l[38]/l[9]*100+"%")},m(e,n){x(e,t,n)},p(e,n){n[0]&1536&&re(t,"left",e[38]/e[9]*100+"%")},d(e){e&&I(t)}}}function Ce(l){let t,e=l[11].data,n=[];for(let s=0;s<e.length;s+=1)n[s]=Ee(Ve(l,e,s));return{c(){t=d("div");for(let s=0;s<n.length;s+=1)n[s].c();u(t,"class","absolute bottom-0 left-0 h-32 flex flex-nowrap overflow-x-auto bg-transparent"),re(t,"scrollbar-color","red gray")},m(s,o){x(s,t,o);for(let i=0;i<n.length;i+=1)n[i].m(t,null);l[31](t)},p(s,o){if(o[0]&68608){e=s[11].data;let i;for(i=0;i<e.length;i+=1){const a=Ve(s,e,i);n[i]?n[i].p(a,o):(n[i]=Ee(a),n[i].c(),n[i].m(t,null))}for(;i<n.length;i+=1)n[i].d(1);n.length=e.length}},d(s){s&&I(t),Ne(n,s),l[31](null)}}}function Ee(l){let t,e,n,s;function o(){return l[30](l[37])}return{c(){t=d("img"),u(t,"class","h-full mr-2 hover:border-4 border-red-400"),ie(t.src,e="data:image/jpg;base64, "+l[35])||u(t,"src",e),u(t,"alt","video frames from search query")},m(i,a){x(i,t,a),n||(s=C(t,"click",o),n=!0)},p(i,a){l=i,a[0]&2048&&!ie(t.src,e="data:image/jpg;base64, "+l[35])&&u(t,"src",e)},d(i){i&&I(t),n=!1,s()}}}function it(l){let t,e,n,s,o=l[0].video_title+"",i,a,p,r,b,k,_,M,j,h,f,w,m,v,L,E,y,g,q,H,O,G,F,T,S,A,$=!1,te,Y=!0,_e,Q,le,z,W,J,Z;function we(){cancelAnimationFrame(te),T.paused||(te=Ke(we),$=!0),l[25].call(T)}let P=l[10]&&Ie(l),N=l[10]&&Ce(l);return{c(){t=d("div"),e=d("div"),n=d("div"),s=d("h3"),i=R(o),a=V(),p=d("button"),p.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg> 
        <span class="font-light">esc</span>`,r=V(),b=d("fieldset"),k=d("div"),_=d("legend"),_.textContent="Augmented Prompts",M=V(),j=d("label"),h=d("input"),f=R(`\r
          true`),w=V(),m=d("label"),v=d("input"),L=R(`\r
          false`),E=V(),y=d("div"),g=d("div"),q=d("button"),q.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="dark:text-black w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path></svg>',H=V(),O=d("input"),G=V(),F=d("div"),T=d("video"),S=d("track"),_e=V(),Q=d("div"),le=d("div"),z=V(),P&&P.c(),W=V(),N&&N.c(),u(s,"class","text-2xl mx-2 mt-2"),u(p,"class","absolute top-0 right-0 hover:text-pink-500 p-2"),u(h,"type","radio"),u(h,"name","prompts"),h.__value="true",h.value=h.__value,l[21][0].push(h),u(v,"type","radio"),u(v,"name","prompts"),v.__value="false",v.value=v.__value,l[21][0].push(v),u(b,"class","flex flex-row place-content-center mt-3"),u(q,"class","hover:text-pink-500 cursor-pointer px-2"),u(O,"class","focus:outline-none dark:text-black"),u(O,"type","text"),u(O,"placeholder","Search query"),u(g,"class","flex border rounded-full p-2 bg-white"),u(y,"class","flex place-content-center my-5"),u(S,"kind","captions"),u(T,"class","bg-black w-full h-full"),ie(T.src,A=l[18]+"#t="+st)||u(T,"src",A),T.autoplay=!0,l[9]===void 0&&We(()=>l[27].call(T)),u(le,"class","h-full bg-red-400"),re(le,"width",(l[7]/l[9]*100||0)+"%"),u(Q,"class","relative w-full h-[10px] hover:h-[20px] bg-red-200"),u(F,"class","relative w-full min-h-[400px] h-[40vh] break-all"),u(e,"class","relative max-w-[1080px] w-full pb-[10px] bg-gray-300 dark:bg-gray-700 dark:text-white"),u(t,"class","transform z-[9999] col-span-full w-full flex justify-center pb-[20px]")},m(B,X){x(B,t,X),c(t,e),c(e,n),c(n,s),c(s,i),c(n,a),c(n,p),c(e,r),c(e,b),c(b,k),c(k,_),c(k,M),c(k,j),c(j,h),h.checked=h.__value===l[4],c(j,f),c(k,w),c(k,m),c(m,v),v.checked=v.__value===l[4],c(m,L),c(e,E),c(e,y),c(y,g),c(g,q),c(g,H),c(g,O),l[23](O),c(e,G),c(e,F),c(F,T),c(T,S),l[24](T),c(F,_e),c(F,Q),c(Q,le),c(Q,z),P&&P.m(Q,null),c(F,W),N&&N.m(F,null),l[32](t),J||(Z=[C(p,"click",l[2]),C(h,"change",l[20]),C(v,"change",l[22]),C(q,"click",l[1]),C(O,"keyup",l[15]),C(T,"timeupdate",we),C(T,"play",l[26]),C(T,"pause",l[26]),C(T,"durationchange",l[27]),C(T,"click",l[28]),C(T,"click",l[29]),C(T,"mousemove",l[13]),C(Q,"mousemove",l[17]),C(Q,"mousemove",l[13]),C(Q,"mousedown",l[14])],J=!0)},p(B,X){X[0]&1&&o!==(o=B[0].video_title+"")&&pe(i,o),X[0]&16&&(h.checked=h.__value===B[4]),X[0]&16&&(v.checked=v.__value===B[4]),!$&&X[0]&128&&!isNaN(B[7])&&(T.currentTime=B[7]),$=!1,X[0]&256&&Y!==(Y=B[8])&&T[Y?"pause":"play"](),X[0]&640&&re(le,"width",(B[7]/B[9]*100||0)+"%"),B[10]?P?P.p(B,X):(P=Ie(B),P.c(),P.m(Q,null)):P&&(P.d(1),P=null),B[10]?N?N.p(B,X):(N=Ce(B),N.c(),N.m(F,null)):N&&(N.d(1),N=null)},i:D,o:D,d(B){B&&I(t),l[21][0].splice(l[21][0].indexOf(h),1),l[21][0].splice(l[21][0].indexOf(v),1),l[23](null),l[24](null),P&&P.d(),N&&N.d(),l[32](null),J=!1,be(Z)}}}const st=0;function ot(l){const t=l.getBoundingClientRect();return t.top>=0&&t.left>=0&&t.bottom<=(window.innerHeight||document.documentElement.clientHeight)&&t.right<=(window.innerWidth||document.documentElement.clientWidth)}function rt(l,t,e){ge(()=>{k(),ot(i)||i.scrollIntoView({block:"end",inline:"nearest"}),me.set(!0),n.index_available==!1&&(a.setAttribute("disabled",""),a.setAttribute("placeholder","Gen index to query"))}),Je(()=>{_(),me.set(!1)});let{f:n}=t,{show_modal:s}=t,o,i,a,p,r,b;r=!0;function k(){a.focus()}function _(){o.pause(),o.removeAttribute("src"),o.load(),e(19,s=!1)}document.addEventListener("keydown",function(z){z.key==="Escape"&&_()});function M(z,W){if(!b||W.buttons!=1)return;const{left:J,right:Z}=z.getBoundingClientRect();e(5,o.currentTime=b*(W.clientX-J)/(Z-J),o)}function j(z){M(this,z)}function h(z){M(this,z)}let f;var w;let m="true";function v(z){if(!z)return;const W=oe+"queryVideo";console.log(W),console.log("query text: ",z);let J=new FormData;J.append("video_hash",n.video_hash),J.append("query_text",z),J.append("aug_prompt",m),console.log("prompt_type: ",m),fetch(W,{method:"POST",mode:"cors",body:J}).then(Z=>Z.json()).then(Z=>{e(11,w=Z.meta_data),e(10,f=Z.meta_data.playback_pos)})}function L(z){if(z.key==="Enter"){const W=this.value;v(W)}}function E(z){o.pause(),e(5,o.currentTime=z,o)}let y;function g(){e(12,y.style.display="flex",y)}let q="video/"+n.video_title+"?video_directory="+n.video_directory;const H=[[]];function O(){m=this.__value,e(4,m),e(3,a)}function G(){m=this.__value,e(4,m),e(3,a)}function F(z){ee[z?"unshift":"push"](()=>{a=z,e(3,a)})}function T(z){ee[z?"unshift":"push"](()=>{o=z,e(5,o)})}function S(){p=this.currentTime,e(7,p)}function A(){r=this.paused,e(8,r)}function $(){b=this.duration,e(9,b)}const te=()=>e(8,r=!r),Y=()=>e(12,y.style.display="none",y),_e=z=>E(f[z]);function Q(z){ee[z?"unshift":"push"](()=>{y=z,e(12,y)})}function le(z){ee[z?"unshift":"push"](()=>{i=z,e(6,i)})}return l.$$set=z=>{"f"in z&&e(0,n=z.f),"show_modal"in z&&e(19,s=z.show_modal)},l.$$.update=()=>{l.$$.dirty[0]&24&&a&&(e(4,m),e(3,a),v(a.value))},[n,k,_,a,m,o,i,p,r,b,f,w,y,j,h,L,E,g,q,s,O,H,G,F,T,S,A,$,te,Y,_e,Q,le]}class at extends fe{constructor(t){super(),de(this,t,rt,it,se,{f:0,show_modal:19,searchInputFocus:1,closeVideoModal:2},null,[-1,-1])}get searchInputFocus(){return this.$$.ctx[1]}get closeVideoModal(){return this.$$.ctx[2]}}function He(l){let t,e,n,s,o,i,a;return{c(){t=d("div"),e=d("progress"),s=V(),o=d("span"),i=R("ETA: "),a=R(l[3]),u(e,"class","bg-gray-400 dark:bg-gray-200 h-3 mt-2 w-full"),u(e,"data-hash",n=l[0].video_hash),e.value=l[2],u(e,"max","1")},m(p,r){x(p,t,r),c(t,e),c(t,s),c(t,o),c(o,i),c(o,a)},p(p,r){r&1&&n!==(n=p[0].video_hash)&&u(e,"data-hash",n),r&4&&(e.value=p[2]),r&8&&pe(a,p[3])},d(p){p&&I(t)}}}function ct(l){let t,e,n;return{c(){t=d("button"),t.innerHTML="<span>Gen Index</span>",u(t,"class","items-center focus:outline-none rounded-lg py-2 px-6 leading-none bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 dark:hover:bg-blue-800 disabled:bg-slate-100 dark:text-white")},m(s,o){x(s,t,o),l[9](t),e||(n=C(t,"click",l[6]),e=!0)},p:D,d(s){s&&I(t),l[9](null),e=!1,n()}}}function ut(l){let t;return{c(){t=d("p"),t.textContent="Already Indexed",u(t,"class","dark:text-white")},m(e,n){x(e,t,n)},p:D,d(e){e&&I(t)}}}function Le(l){let t,e,n;function s(i){l[10](i)}let o={f:l[0]};return l[5]!==void 0&&(o.show_modal=l[5]),t=new at({props:o}),ee.push(()=>Ge(t,"show_modal",s)),{c(){ae(t.$$.fragment)},m(i,a){ce(t,i,a),n=!0},p(i,a){const p={};a&1&&(p.f=i[0]),!e&&a&32&&(e=!0,p.show_modal=i[5],Oe(()=>e=!1)),t.$set(p)},i(i){n||(K(t.$$.fragment,i),n=!0)},o(i){U(t.$$.fragment,i),n=!1},d(i){ue(t,i)}}}function ft(l){let t,e,n,s,o=l[0].video_title+"",i,a,p,r,b,k,_,M,j,h,f,w,m,v=l[4]&&He(l);function L(q,H){return q[0].index_available===!0?ut:ct}let E=L(l),y=E(l),g=l[5]&&Le(l);return{c(){t=d("div"),e=d("div"),n=d("div"),s=d("label"),i=R(o),a=V(),p=d("button"),r=d("img"),k=V(),v&&v.c(),_=V(),M=d("div"),y.c(),j=V(),g&&g.c(),h=he(),u(s,"for",""),u(s,"class","mb-2 text-blue-500 dark:text-white h-auto w-full"),u(r,"class","h-auto w-full rounded-lg"),ie(r.src,b="/api/videoPoster/"+l[0].video_hash+".jpg")||u(r,"src",b),u(r,"alt","videos from selected directory"),u(p,"class","h-auto w-full shadow-xl"),u(n,"class","break-all"),u(M,"class","mx-auto mt-2"),u(e,"class","flex flex-col"),u(t,"class","mb-4 dark:text-white")},m(q,H){x(q,t,H),c(t,e),c(e,n),c(n,s),c(s,i),c(n,a),c(n,p),c(p,r),c(n,k),v&&v.m(n,null),c(e,_),c(e,M),y.m(M,null),x(q,j,H),g&&g.m(q,H),x(q,h,H),f=!0,w||(m=C(p,"click",l[7]),w=!0)},p(q,[H]){(!f||H&1)&&o!==(o=q[0].video_title+"")&&pe(i,o),(!f||H&1&&!ie(r.src,b="/api/videoPoster/"+q[0].video_hash+".jpg"))&&u(r,"src",b),q[4]?v?v.p(q,H):(v=He(q),v.c(),v.m(n,null)):v&&(v.d(1),v=null),E===(E=L(q))&&y?y.p(q,H):(y.d(1),y=E(q),y&&(y.c(),y.m(M,null))),q[5]?g?(g.p(q,H),H&32&&K(g,1)):(g=Le(q),g.c(),K(g,1),g.m(h.parentNode,h)):g&&(ke(),U(g,1,1,()=>{g=null}),ve())},i(q){f||(K(g),f=!0)},o(q){U(g),f=!1},d(q){q&&I(t),v&&v.d(),y.d(),q&&I(j),g&&g.d(q),q&&I(h),w=!1,m()}}}function dt(l,t,e){let{f:n=""}=t,{i:s=-1}=t;ge(()=>{let f=oe+"indexStatus/"+n.video_hash;console.log("making request to : ",f),fetch(f,{method:"GET"}).then(w=>w.json()).then(w=>{var m=w.active;m==!0&&b(f)})});let o;var i="0",a="unknown",p=!1;let r;function b(f){e(0,n.index_available=!1,n),e(4,p=!0),o&&(e(1,o.disabled=!0,o),e(1,o.innerHTML="indexing in progress",o)),fetch(f,{method:"GET"}).then(w=>w.json()).then(w=>{e(3,a=w.eta),e(2,i=w.progress),a=="0"?(o&&e(1,o.disabled=!0,o),e(0,n.index_available=!0,n),e(4,p=!1)):(r&&clearTimeout(r),r=setTimeout(function(){b(f)},1e3))})}function k(){const f=oe+"videoIndex";let w=new FormData;w.append("video_absolute_path",n.video_absolute_path),fetch(f,{method:"POST",body:w}).then(m=>m.json()).then(m=>{let v=oe+"indexStatus/"+m.statusEndpoint;b(v)})}let _=!1;function M(){_?e(5,_=!1):(e(5,_=!0),ze.update(f=>s))}ze.subscribe(f=>{s!=f&&e(5,_=!1)});function j(f){ee[f?"unshift":"push"](()=>{o=f,e(1,o)})}function h(f){_=f,e(5,_)}return l.$$set=f=>{"f"in f&&e(0,n=f.f),"i"in f&&e(8,s=f.i)},[n,o,i,a,p,_,k,M,s,j,h]}class pt extends fe{constructor(t){super(),de(this,t,dt,ft,se,{f:0,i:8})}}function Be(l){let t;return{c(){t=d("div"),u(t,"class","absolute right-10 z-50 h-[40vh] bg-pink-200")},m(e,n){x(e,t,n)},d(e){e&&I(t)}}}function ht(l){let t,e,n,s,o,i,a,p,r,b,k,_,M,j,h,f,w,m,v,L,E;M=new Xe({props:{darkMode:_t}});let y=l[2]&&Be();return{c(){t=d("div"),e=d("span"),n=R("Total videos: "),s=d("strong"),o=R(l[0]),i=V(),a=d("div"),p=d("button"),p.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="dark:text-white w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path></svg>',r=V(),b=d("input"),k=V(),_=d("div"),ae(M.$$.fragment),j=V(),h=d("div"),f=d("button"),f.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',w=V(),y&&y.c(),m=he(),u(e,"class","text-sm"),u(p,"class","hover:text-pink-500 cursor-pointer mr-3"),u(b,"class","bg-transparent focus:outline-none"),u(b,"placeholder","Search list"),u(a,"class","flex items-center select-none hover:border-b border-black dark:border-white"),u(f,"class","ml-3 rounded-full p-2 focus:outline-none hover:bg-blue-300 transition duration-500"),u(h,"class","flex items-center select-none"),u(_,"class","flex items-center select-none"),u(t,"class","mt-1 mb-4 flex items-center justify-between dark:text-white")},m(g,q){x(g,t,q),c(t,e),c(e,n),c(e,s),c(s,o),c(t,i),c(t,a),c(a,p),c(a,r),c(a,b),l[5](b),c(t,k),c(t,_),ce(M,_,null),c(_,j),c(_,h),c(h,f),x(g,w,q),y&&y.m(g,q),x(g,m,q),v=!0,L||(E=[C(p,"click",l[4]),C(b,"keyup",l[3]),C(f,"click",l[6])],L=!0)},p(g,[q]){(!v||q&1)&&pe(o,g[0]),g[2]?y||(y=Be(),y.c(),y.m(m.parentNode,m)):y&&(y.d(1),y=null)},i(g){v||(K(M.$$.fragment,g),v=!0)},o(g){U(M.$$.fragment,g),v=!1},d(g){g&&I(t),l[5](null),ue(M),g&&I(w),y&&y.d(g),g&&I(m),L=!1,be(E)}}}let _t=!1;function mt(l,t,e){let{items:n=0}=t,s,o=!1;const i=Ue();function a(){i("message",{text:this.value})}const p=()=>s.focus();function r(k){ee[k?"unshift":"push"](()=>{s=k,e(1,s)})}const b=()=>e(2,o=!o);return l.$$set=k=>{"items"in k&&e(0,n=k.items)},[n,s,o,a,p,r,b]}class bt extends fe{constructor(t){super(),de(this,t,mt,ht,se,{items:0})}}function Ae(l,t,e){const n=l.slice();return n[15]=t[e],n[17]=e,n}function gt(l){let t,e,n,s,o,i,a,p,r=[],b=new Map,k,_={ctx:l,current:null,token:null,hasCatch:!1,pending:yt,then:wt,catch:vt};qe(i=l[2],_);let M=l[1];const j=h=>h[15];for(let h=0;h<M.length;h+=1){let f=Ae(l,M,h),w=j(f);b.set(w,r[h]=De(w,f))}return{c(){t=d("p"),e=R("Current selected directory: "),n=d("span"),s=R(l[0]),o=V(),_.block.c(),a=V(),p=d("div");for(let h=0;h<r.length;h+=1)r[h].c();u(n,"class","font-bold"),u(t,"class","dark:text-white"),u(p,"class","relative grid sm:grid-cols-3 2xl:grid-cols-5 min-[2400px]:grid-cols-9 gap-8 mt-6 grid-flow-row-dense")},m(h,f){x(h,t,f),c(t,e),c(t,n),c(n,s),x(h,o,f),_.block.m(h,_.anchor=f),_.mount=()=>a.parentNode,_.anchor=a,x(h,a,f),x(h,p,f);for(let w=0;w<r.length;w+=1)r[w].m(p,null);k=!0},p(h,f){l=h,(!k||f&1)&&pe(s,l[0]),_.ctx=l,f&4&&i!==(i=l[2])&&qe(i,_),f&2&&(M=l[1],ke(),r=Pe(r,f,j,1,l,M,b,p,Ye,De,null,Ae),ve())},i(h){if(!k){for(let f=0;f<M.length;f+=1)K(r[f]);k=!0}},o(h){for(let f=0;f<r.length;f+=1)U(r[f]);k=!1},d(h){h&&I(t),h&&I(o),_.block.d(h),_.token=null,_=null,h&&I(a),h&&I(p);for(let f=0;f<r.length;f+=1)r[f].d()}}}function kt(l){let t;return{c(){t=d("p"),t.textContent="Select a directory.",u(t,"class","dark:text-white text-2xl")},m(e,n){x(e,t,n)},p:D,i:D,o:D,d(e){e&&I(t)}}}function vt(l){return{c:D,m:D,d:D}}function wt(l){let t;return{c(){t=d("p"),u(t,"class","dark:text-white")},m(e,n){x(e,t,n)},d(e){e&&I(t)}}}function yt(l){let t;return{c(){t=d("p"),t.textContent="Fetching data....",u(t,"class","dark:text-white")},m(e,n){x(e,t,n)},d(e){e&&I(t)}}}function De(l,t){let e,n,s;return n=new pt({props:{f:t[15],i:t[17]}}),{key:l,first:null,c(){e=he(),ae(n.$$.fragment),this.first=e},m(o,i){x(o,e,i),ce(n,o,i),s=!0},p(o,i){t=o;const a={};i&2&&(a.f=t[15]),i&2&&(a.i=t[17]),n.$set(a)},i(o){s||(K(n.$$.fragment,o),s=!0)},o(o){U(n.$$.fragment,o),s=!1},d(o){o&&I(e),ue(n,o)}}}function Fe(l){let t;return{c(){t=d("div"),t.innerHTML='<div class="absolute inset-0 bg-gray-900 opacity-75"></div>',u(t,"class","fixed inset-0 transition-opacity")},m(e,n){x(e,t,n)},d(e){e&&I(t)}}}function qt(l){let t,e,n,s,o,i,a,p,r,b,k,_,M,j,h,f,w,m,v,L,E,y,g;function q(S){l[11](S)}let H={};l[0]!==void 0&&(H.dirname=l[0]),e=new nt({props:H}),ee.push(()=>Ge(e,"dirname",q)),a=new bt({props:{items:l[1].length}}),a.$on("message",l[6]);const O=[kt,gt],G=[];function F(S,A){return S[0]?1:0}w=F(l),m=G[w]=O[w](l);let T=l[4]&&Fe();return{c(){t=d("div"),ae(e.$$.fragment),s=V(),o=d("main"),i=d("div"),ae(a.$$.fragment),p=V(),r=d("input"),b=V(),k=d("label"),_=d("input"),M=R(`\r
        Include Subdirectories`),j=V(),h=d("button"),h.innerHTML="<span>Select video directory</span>",f=V(),m.c(),v=V(),T&&T.c(),L=he(),u(r,"type","text"),u(r,"class","dark:text-white w-96 bg-transparent focus:outline-none border-b border-black dark:border-white"),u(r,"placeholder","Provide absolute path to video directory."),u(_,"type","checkbox"),u(k,"class","dark:text-white w-96 bg-transparent"),u(h,"class","items-center focus:outline-none rounded-lg my-3 py-2 px-6 mb-4 leading-none bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 hover:dark:bg-blue-800 dark:text-white disabled:bg-slate-100"),u(i,"class","sm:px-12 max-sm:px-4 py-12 text-gray-700"),u(o,"class","max-md:flex flex-1 bg-gray-300 dark:bg-gray-600 overflow-y-auto"),u(t,"class","min-h-screen md:flex")},m(S,A){x(S,t,A),ce(e,t,null),c(t,s),c(t,o),c(o,i),ce(a,i,null),c(i,p),c(i,r),ye(r,l[5]),c(i,b),c(i,k),c(k,_),_.checked=l[3],c(k,M),c(i,j),c(i,h),c(i,f),G[w].m(i,null),x(S,v,A),T&&T.m(S,A),x(S,L,A),E=!0,y||(g=[C(r,"keydown",l[8]),C(r,"input",l[12]),C(_,"change",l[13]),C(h,"click",l[7])],y=!0)},p(S,[A]){const $={};!n&&A&1&&(n=!0,$.dirname=S[0],Oe(()=>n=!1)),e.$set($);const te={};A&2&&(te.items=S[1].length),a.$set(te),A&32&&r.value!==S[5]&&ye(r,S[5]),A&8&&(_.checked=S[3]);let Y=w;w=F(S),w===Y?G[w].p(S,A):(ke(),U(G[Y],1,1,()=>{G[Y]=null}),ve(),m=G[w],m?m.p(S,A):(m=G[w]=O[w](S),m.c()),K(m,1),m.m(i,null)),S[4]?T||(T=Fe(),T.c(),T.m(L.parentNode,L)):T&&(T.d(1),T=null)},i(S){E||(K(e.$$.fragment,S),K(a.$$.fragment,S),K(m),E=!0)},o(S){U(e.$$.fragment,S),U(a.$$.fragment,S),U(m),E=!1},d(S){S&&I(t),ue(e),ue(a),G[w].d(),S&&I(v),T&&T.d(S),S&&I(L),y=!1,be(g)}}}function Mt(l,t,e){ge(()=>{let m=localStorage.getItem("dirname");m&&(e(0,n=m),console.log(n))}),me.set(!1);let n="",s=[],o=[],i="",a,p=!1;async function r(m="xxxxxx",v=!1){v==!1&&e(9,s=[]);const L=oe+"/videos";let E=new FormData;E.append("video_directory",n),E.append("include_subdirectories",p.toString()),v&&E.append("data_generation_id",m);const y=await fetch(L,{method:"POST",body:E});if(y.ok){let g=await y.json(),q=g.data_generation_id;g.flag==!0&&(s.push(g),e(9,s),await r(q,v=!0));return}else throw new Error(y)}function b(m){e(10,i=m.detail.text.toLowerCase())}var k=!1;me.subscribe(m=>{e(4,k=m),console.log("dark bg value:",m)});let _;function M(){_&&(e(0,n=_),localStorage.setItem("dirname",n))}function j(m){m.key==="Enter"&&M()}function h(m){n=m,e(0,n)}function f(){_=this.value,e(5,_)}function w(){p=this.checked,e(3,p)}return l.$$.update=()=>{l.$$.dirty&1536&&s&&e(1,o=s.filter(m=>m.video_title.toLowerCase().search(i)!=-1)),l.$$.dirty&1&&n&&e(2,a=r())},[n,o,a,p,k,_,b,M,j,s,i,h,f,w]}class zt extends fe{constructor(t){super(),de(this,t,Mt,qt,se,{})}}new zt({target:document.getElementById("app")});