(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var P=window.PRICES;
var rub=function(n){return Math.round(n).toLocaleString('ru-RU')+' ₽'};

/* меню */
var burger=$('.burger'),nav=$('#nav');
if(burger){burger.addEventListener('click',function(){var o=nav.classList.toggle('open');burger.setAttribute('aria-expanded',o)});
$$('a',nav).forEach(function(a){a.addEventListener('click',function(){nav.classList.remove('open');burger.setAttribute('aria-expanded','false')})})}

/* видео в телевизоре */
var v=$('#promo'),pb=$('#tvpause');
if(v){
 var userPaused=false;
 var io='IntersectionObserver' in window&&new IntersectionObserver(function(e){e.forEach(function(x){if(!x.isIntersecting)v.pause();else if(!userPaused)v.play().catch(function(){})})},{threshold:.2});
 if(io)io.observe(v);
 if(pb)pb.addEventListener('click',function(){if(v.paused){userPaused=false;v.play().catch(function(){})}else{userPaused=true;v.pause()}pb.setAttribute('aria-label',v.paused?'Включить видео':'Поставить видео на паузу')});
 if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){v.removeAttribute('autoplay');v.pause();userPaused=true}
}

/* зоны: вкладки */
var tabs=$$('.ztab'),panes=$$('.zpanel');
function pick(i,focus){
 tabs.forEach(function(t,n){var on=n===i;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;panes[n].classList.toggle('on',on)});
 if(focus)tabs[i].focus();
 var t=tabs[i];if(t.scrollIntoView&&t.parentNode.scrollWidth>t.parentNode.clientWidth){t.parentNode.scrollTo({left:t.offsetLeft-20,behavior:'smooth'})}
}
tabs.forEach(function(t,i){
 t.addEventListener('click',function(){pick(i)});
 t.addEventListener('keydown',function(e){var n=tabs.length,k=e.key;
  if(k==='ArrowRight'||k==='ArrowDown'){e.preventDefault();pick((i+1)%n,1)}
  else if(k==='ArrowLeft'||k==='ArrowUp'){e.preventDefault();pick((i+n-1)%n,1)}
  else if(k==='Home'){e.preventDefault();pick(0,1)}else if(k==='End'){e.preventDefault();pick(n-1,1)}})});
var zp=$('.zpanels');
if(zp&&tabs.length){var zx=0,zy=0;
 zp.addEventListener('touchstart',function(e){zx=e.touches[0].clientX;zy=e.touches[0].clientY},{passive:true});
 zp.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-zx,dy=e.changedTouches[0].clientY-zy;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){var cur=tabs.findIndex(function(t){return t.getAttribute('aria-selected')==='true'});pick((cur+(dx<0?1:tabs.length-1))%tabs.length)}})}

/* галерея */
var dlg=$('#lb');
if(dlg&&dlg.showModal){
 var im=$('img',dlg),cap=$('.cap',dlg),cur=[],k=0;
 var show=function(i){k=(i+cur.length)%cur.length;var a=cur[k];im.src=a.href;im.alt=$('img',a).alt;cap.textContent=a.dataset.cap+' — фото '+(k+1)+' из '+cur.length};
 $$('.zpanel a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();cur=$$('a',a.closest('.zpanel'));show(cur.indexOf(a));dlg.showModal()})});
 $('.x',dlg).onclick=function(){dlg.close()};$('.pv',dlg).onclick=function(){show(k-1)};$('.nx',dlg).onclick=function(){show(k+1)};
 dlg.addEventListener('click',function(e){if(e.target===dlg||e.target.className==='in')dlg.close()});
 dlg.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')show(k-1);if(e.key==='ArrowRight')show(k+1)});
 var sx=0;dlg.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});
 dlg.addEventListener('touchend',function(e){var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>50)show(k+(d<0?1:-1))});
}

/* скидка работает до даты */
var promoOn=(function(){var end=new Date(P.discountUntil+'T23:59:59+03:00');return new Date()<=end})();
if(!promoOn){$$('[data-promo]').forEach(function(n){n.hidden=true})}

/* калькулятор */
var st={cams:3,hours:2,reels:0,montage:false,mcams:3,live:false,first:false};
var out={list:$('#r-list'),tot:$('#r-total'),date:$('#r-date')};
function camName(n){return n===1?'1 камера':n+(n<5?' камеры':' камер')}
function calc(){
 var rate=P.cams[st.cams],h=st.hours,x=P.oneHourExtra;
 var rows=[],sub=0;
 var base=(rate+x)*h;
 rows.push([(st.cams===0?'Студия и свет, без камер':'Студия, '+camName(st.cams))+' × '+h+' ч',base]);sub+=base;
 if(h>=2){rows.push(['Чем дольше в гостях: −'+rub(x)+' × '+h+' ч',-x*h,'dis']);sub-=x*h}
 if(st.reels){var r=st.reels*P.reel;rows.push(['Рилсы × '+st.reels,r]);sub+=r}
 if(st.montage){var m=P.montage[st.mcams];rows.push(['Монтаж, '+camName(st.mcams),m]);sub+=m}
 if(st.live){var l=P.live*h;rows.push(['Прямой эфир × '+h+' ч',l]);sub+=l}
 var disc=0;
 if(promoOn&&st.first){disc=Math.round(sub*P.discount);rows.push(['Скидка на первую съёмку −'+Math.round(P.discount*100)+'%',-disc,'dis'])}
 var total=sub-disc;
 return {rows:rows,total:total,text:rows.map(function(r){return r[0]+': '+(r[1]<0?'−':'')+rub(Math.abs(r[1]))}).join('; ')+'. Итого: '+rub(total)}
}
function render(){
 var c=calc();
 out.list.textContent='';
 c.rows.forEach(function(r){var li=document.createElement('li');if(r[2])li.className=r[2];var a=document.createElement('span'),b=document.createElement('span');a.textContent=r[0];b.textContent=(r[1]<0?'−':'')+rub(Math.abs(r[1]));li.appendChild(a);li.appendChild(b);out.list.appendChild(li)});
 out.tot.textContent=rub(c.total);
 $('#h-out').textContent=st.hours+' '+(st.hours===1?'час':(st.hours<5?'часа':'часов'));
 $('#re-out').textContent=st.reels;
 var lh=$('#long-hint');if(lh)lh.textContent=st.hours>=2?'Скидка '+rub(P.oneHourExtra)+' за каждый час уже учтена в чеке.':'Со 2-го часа каждый час дешевле на '+rub(P.oneHourExtra)+': скидка посчитается сама.';
 var s=$('#sum');if(s&&$('#intent').value==='shoot'){s.hidden=false;s.textContent='Ваш расчёт: '+c.text}
 $('#calc').value=c.text;
}
$$('input[name=cams]').forEach(function(i){i.addEventListener('change',function(){st.cams=+i.value;
 if(st.cams>0){st.mcams=st.cams;var r=$('input[name=mcams][value="'+st.cams+'"]');if(r)r.checked=true}
 render()})});
$$('input[name=mcams]').forEach(function(i){i.addEventListener('change',function(){st.mcams=+i.value;render()})});
var bump=function(btn,key,min,max,d){$(btn).addEventListener('click',function(){st[key]=Math.max(min,Math.min(max,st[key]+d));render()})};
bump('#h-m','hours',1,8,-1);bump('#h-p','hours',1,8,1);bump('#re-m','reels',0,30,-1);bump('#re-p','reels',0,30,1);
$('#montage').addEventListener('change',function(e){st.montage=e.target.checked;$('#mwrap').hidden=!st.montage;render()});
$('#live').addEventListener('change',function(e){st.live=e.target.checked;render()});
$('#first').addEventListener('change',function(e){st.first=e.target.checked;render()});
if(out.date){out.date.textContent=new Date().toLocaleDateString('ru-RU')}


/* цели Яндекс Метрики */
var done={};
function goal(n,once){try{if(once&&done[n])return;done[n]=1;if(window.ym)ym(113790318,'reachGoal',n)}catch(e){}}
document.addEventListener('click',function(e){if(e.defaultPrevented)return;var a=e.target.closest&&e.target.closest('a,button');if(!a)return;var h=a.getAttribute('href')||'';
 if(h.indexOf('tel:')===0)goal('click_phone');
 else if(h.indexOf('t.me/')>-1)goal('click_telegram');
 else if(h.indexOf('wa.me/')>-1)goal('click_whatsapp');
 else if(h.indexOf('max.ru/')>-1)goal('click_max');
 else if(h.indexOf('vk.ru/')>-1||h.indexOf('vk.com/')>-1)goal('click_vk');
 else if(h.indexOf('yandex.ru/maps')>-1)goal('click_route');
 else if(a.dataset&&a.dataset.intent==='testdrive')goal('click_testdrive');
 else if(a.id==='from-calc')goal('calc_to_form');
 if(a.closest&&a.closest('.zpanel')&&a.tagName==='A')goal('zone_photo_open',1)});
$$('#calc input,#calc button,input[name=cams],#h-m,#h-p,#re-m,#re-p,#montage,#live,#first').forEach(function(n){n.addEventListener('change',function(){goal('calc_use',1)});n.addEventListener('click',function(){goal('calc_use',1)})});
$$('.ztab').forEach(function(t){t.addEventListener('click',function(){goal('zone_tab',1)})});
if(v)v.addEventListener('play',function(){goal('video_play',1)});


/* на компьютере последние цифры номера скрыты до клика: считаем «показал номер» */
if(window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches){
 var masked=$$('a[data-mask]'),shown=false;
 masked.forEach(function(a){
  var w=document.createTreeWalker(a,NodeFilter.SHOW_TEXT),n,hit=null;
  while((n=w.nextNode())){if(/\d{2}-\d{2}\s*$/.test(n.nodeValue))hit=n}
  if(!hit)return;
  var m=hit.nodeValue.match(/^([\s\S]*\d{2}-)(\d{2})(\s*)$/);if(!m)return;
  var sp=document.createElement('span');sp.className='pm';sp.setAttribute('data-d',m[2]);sp.textContent='Посмотреть';
  var wr=document.createElement('span');wr.className='pn';hit.parentNode.insertBefore(wr,hit);hit.nodeValue=m[1];wr.appendChild(hit);wr.appendChild(sp);
  a.title='Нажмите, чтобы показать номер полностью';a.setAttribute('aria-label','Показать номер телефона полностью');
  a.addEventListener('click',function(e){if(shown)return;e.preventDefault();reveal()})});
 function reveal(){shown=true;$$('.pm').forEach(function(s){s.textContent=s.getAttribute('data-d');s.className='pm on'});
  masked.forEach(function(a){a.removeAttribute('title');a.removeAttribute('aria-label')});goal('phone_reveal')}
}

/* cookie: принять все / выбрать / отказаться; Метрика грузится только после согласия */
var ck=$('#ck'),ckset=$('#ckset'),ckstat=$('#ckstat');
function ckGet(){try{return localStorage.getItem('cks')}catch(e){return null}}
function ckSave(v){try{localStorage.setItem('cks',v)}catch(e){}
 ck.hidden=true;ckset.hidden=true;$('#cksel').textContent='Выберу сам';
 if(v==='all'||v==='stat'){if(window.loadMetrika)window.loadMetrika()}}
if(ck){
 if(!ckGet())ck.hidden=false;
 $('#ckall').addEventListener('click',function(){ckSave('all')});
 
 $('#cksel').addEventListener('click',function(){
  if(ckset.hidden){ckset.hidden=false;ckstat.checked=ckGet()==='all'||ckGet()==='stat';this.textContent='Беру выбранное'}
  else ckSave(ckstat.checked?'stat':'none')});
 var op=$('#ckopen');if(op)op.addEventListener('click',function(e){e.preventDefault();ck.hidden=false;ckset.hidden=false;ckstat.checked=ckGet()==='all'||ckGet()==='stat';$('#cksel').textContent='Беру выбранное'});
}

/* заявка */
var f=$('#lead'),status=$('#st'),intent=$('#intent'),sum=$('#sum');
$('#ts').value=Date.now();
f.addEventListener('focusin',function(){goal('form_start',1)});
function setIntent(v){intent.value=v;
 if(v==='testdrive'){sum.hidden=false;sum.textContent='Тест-драйв: 30 минут в студии бесплатно. Напишите удобную дату, договоримся о времени.'}
 else if(v==='shoot'){render()}
 else{sum.hidden=true}}
intent.addEventListener('change',function(){setIntent(intent.value)});
$$('[data-intent]').forEach(function(a){a.addEventListener('click',function(){setIntent(a.dataset.intent)})});
$('#from-calc').addEventListener('click',function(){setIntent('shoot')});
f.addEventListener('submit',function(e){
 e.preventDefault();var b=$('button[type=submit]',f);b.disabled=true;status.textContent='Отправляем…';
 fetch('send.php',{method:'POST',body:new FormData(f),headers:{Accept:'application/json'}}).then(function(r){return r.json()}).then(function(j){
  if(j.ok){goal('form_submit');if(intent.value==='testdrive')goal('form_testdrive');f.reset();$('#ts').value=Date.now();setIntent('shoot');status.textContent='';var o=$('#okmsg');o.hidden=false;f.hidden=true}
  else{status.textContent=j.error||'Не получилось отправить. Напишите нам в мессенджер или позвоните.'}b.disabled=false})
 .catch(function(){status.textContent='Не получилось отправить. Напишите нам в мессенджер или позвоните.';b.disabled=false})});
/* маска телефона */
var ph=$('#phone');
function fmt(v){var d=v.replace(/\D/g,'');if(d[0]==='7'||d[0]==='8')d=d.slice(1);d=d.slice(0,10);
 var r='+7 ';if(!d.length)return r;r+='('+d.slice(0,3);if(d.length>=3)r+=') ';if(d.length>3)r+=d.slice(3,6);if(d.length>=6)r+='-'+d.slice(6,8);if(d.length>=8)r+='-'+d.slice(8,10);return r}
if(ph){
 ph.addEventListener('input',function(){ph.value=fmt(ph.value)});
 ph.addEventListener('focus',function(){if(!ph.value)ph.value='+7 '});
 ph.addEventListener('keydown',function(e){if(e.key==='Backspace'&&ph.value.length<=3)e.preventDefault()});
 ph.addEventListener('paste',function(e){e.preventDefault();ph.value=fmt((e.clipboardData||window.clipboardData).getData('text'))});
}
setIntent('shoot');render();
})();
