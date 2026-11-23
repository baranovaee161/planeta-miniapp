const CFG=window.CFG||{};
const TG=(window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initData)?Telegram.WebApp:null;
const MX=(!TG&&window.WebApp&&window.WebApp.initData)?window.WebApp:null;   // MAX только если реально внутри MAX (есть данные запуска)
const BB=(TG||MX)?(TG||MX).BackButton:null;
if(TG){try{TG.ready();TG.expand();TG.setHeaderColor('#fff8ef');TG.setBackgroundColor('#fff8ef')}catch(e){}}
function updateBack(){if(BB){try{page==='home'?BB.hide():BB.show()}catch(e){}}}
if(BB){try{BB.onClick(()=>back())}catch(e){}}
function openExt(url){if(TG){/^https:\/\/t\.me\//.test(url)?TG.openTelegramLink(url):TG.openLink(url)}else if(MX){/^https:\/\/max\.ru\//.test(url)?MX.openMaxLink(url):MX.openLink(url)}else window.open(url,'_blank','noopener')}
document.addEventListener('click',e=>{const l=e.target.closest('a[data-ext]');if(!l)return;
if(TG||MX){e.preventDefault();openExt(l.dataset.ext)}
else{l.href=l.dataset.ext;l.target='_blank';l.rel='noopener noreferrer'}});   // в обычном браузере открываем ссылку обычным способом
function contactBtn(kind,cls){return `<button class="${cls}" data-contact="${kind}">${kind==='pr'?'💬 Связаться с детским уголком':'💬 Связаться с администратором'}</button>`}
function showSheet(kind){const pr=kind==='pr';const phone=pr?CFG.playroomPhone:CFG.adminPhone;
const mx=pr?CFG.playroomMaxUrl:CFG.adminMaxUrl;const tg=pr?CFG.playroomTgUrl:'https://t.me/'+(CFG.adminTg||'Znany_planet');
closeSheet();const d=document.createElement('div');d.className='sheet-bg';d.id='sheet';
d.innerHTML=`<div class="sheet" role="dialog" aria-modal="true"><h2>${pr?'Связь с детским уголком':'Связь с администратором'}</h2>${pr?'<p class="centered">Детский уголок работает по записи: напишите, во сколько планируете прийти.</p>':'<p class="centered">Выберите, где вам удобнее написать.</p>'}
<a class="cta" href="#" data-ext="${mx}">💬 Написать в MAX</a><a class="cta tgb" href="#" data-ext="${tg}">✈️ Написать в Telegram</a><a class="soft" href="tel:${phone}">☎ ${phone}</a><button class="soft" id="sheetclose">Закрыть</button></div>`;
document.body.appendChild(d);d.onclick=e=>{if(e.target===d)closeSheet()};document.getElementById('sheetclose').onclick=closeSheet;
track(pr?'💬 Открыл(а) «Связаться с детским уголком»':'💬 Открыл(а) «Связаться с администратором»')}
function closeSheet(){const s=document.getElementById('sheet');if(s)s.remove()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-contact]');if(b){e.preventDefault();showSheet(b.dataset.contact)}});
function reviewBtn(){return `<a class="cta" href="#" data-ext="${CFG.yandexReviews.replace(/&/g,'&amp;')}">⭐ Оставить отзыв на Яндексе</a><p class="centered">Откроется страница «Планеты знаний» на Яндекс Картах.</p>`}
let DATA={items:[],ages:[]},page='home',history=[];
let _lt='',_ls=0;
const BK={y:0,m:0,date:'',time:'',name:'',phone:'',label:'',done:false,busy:false,err:''};
const MN=['','Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MG=['','января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const WDN=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
function bkInit(){const n=new Date();Object.assign(BK,{y:n.getFullYear(),m:n.getMonth()+1,date:'',time:'',label:'',done:false,busy:false,err:''})}
function bkSlots(){const[h,m]=(CFG.slotFrom||'08:00').split(':').map(Number),[h2,m2]=(CFG.slotTo||'19:30').split(':').map(Number);let c=h*60+m,e=h2*60+m2,o=[];while(c<=e){o.push(String(c/60|0).padStart(2,'0')+':'+String(c%60).padStart(2,'0'));c+=CFG.slotStep||30}return o}
function bkLabel(){const[y,m,d]=BK.date.split('-').map(Number);const w=WDN[(new Date(y,m-1,d).getDay()+6)%7].toLowerCase();return `${d} ${MG[m]} (${w}) в ${BK.time}`}
function bookHTML(){
if(BK.done)return head('Заявка отправлена','Островок')+`<div class="section"><div class="playroom-intro"><b>✅ Спасибо!</b> Мы получили вашу заявку на ${esc(BK.label)}. Администратор свяжется с вами для подтверждения.</div><button class="cta" data-page="home">На главную</button></div>`;
const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),cur={y:now.getFullYear(),m:now.getMonth()+1},nx=cur.m===12?{y:cur.y+1,m:1}:{y:cur.y,m:cur.m+1},isCur=BK.y===cur.y&&BK.m===cur.m;
let s=head('Запись в «Островок»','Выберите день и время')+'<div class="section"><div class="playroom-intro">Час отсчитывается от времени, когда вы пришли.</div>';
s+=`<div class="cal-head"><b>${MN[BK.m]} ${BK.y}</b><button class="soft" data-bk="mon" data-y="${isCur?nx.y:cur.y}" data-m="${isCur?nx.m:cur.m}">${isCur?MN[nx.m]+' ▶':'◀ '+MN[cur.m]}</button></div><div class="cal">`+WDN.map(w=>`<i class="wd">${w}</i>`).join('');
const first=(new Date(BK.y,BK.m-1,1).getDay()+6)%7,days=new Date(BK.y,BK.m,0).getDate();
for(let i=0;i<first;i++)s+='<i></i>';
for(let d=1;d<=days;d++){const iso=`${BK.y}-${String(BK.m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;s+=new Date(BK.y,BK.m-1,d)<today?`<i class="past">${d}</i>`:`<button class="day${BK.date===iso?' sel':''}" data-bk="day" data-d="${iso}">${d}</button>`}
s+='</div>';
if(BK.date){const isToday=BK.date===`${cur.y}-${String(cur.m).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,nm=now.getHours()*60+now.getMinutes();
const sl=bkSlots().filter(t=>!isToday||(+t.slice(0,2)*60+ +t.slice(3))>nm);
s+='<h2 class="sec">Время</h2>'+(sl.length?`<div class="slots">${sl.map(t=>`<button class="slot${BK.time===t?' sel':''}" data-bk="time" data-t="${t}">${t}</button>`).join('')}</div>`:'<p class="centered">На сегодня время уже прошло. Выберите другой день.</p>')}
if(BK.date&&BK.time){BK.label=bkLabel();s+=`<div class="bk-form"><b>📅 ${esc(BK.label)}</b><input id="bkname" placeholder="Имя ребёнка и ваше имя" value="${esc(BK.name)}" autocomplete="name"><input id="bkphone" type="tel" placeholder="Телефон" value="${esc(BK.phone)}" autocomplete="tel">${BK.err?`<p class="err">${esc(BK.err)}</p>`:''}<p class="centered">Отправляя заявку, вы соглашаетесь на обработку персональных данных для связи с вами.</p><button class="cta" data-bk="send">${BK.busy?'Отправляем…':'Записаться'}</button></div>`}
return s+'</div>'}
async function sendBooking(){if(BK.busy)return;const dg=BK.phone.replace(/\D/g,'');if(BK.name.trim().length<2||dg.length<10){BK.err='Укажите имя и номер телефона.';render();return}
BK.busy=true;BK.err='';render();const A=TG||MX,pl=A&&A.initData?(TG?'tg':'mx'):'web';
try{const r=await fetch(CFG.bookUrl||'/api/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p:pl,d:pl==='web'?'':A.initData,v:vid(),name:BK.name.trim(),phone:BK.phone.trim(),date:BK.date,time:BK.time,label:BK.label})});if(!r.ok)throw 0;BK.done=true}catch(e){BK.err='Не получилось отправить. Позвоните нам: '+CFG.playroomPhone}
BK.busy=false;render()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-bk]');if(!b)return;const k=b.dataset.bk;
if(k==='mon'){BK.y=+b.dataset.y;BK.m=+b.dataset.m;BK.date='';BK.time=''}
else if(k==='day'){BK.date=b.dataset.d;BK.time='';track('📅 Островок: выбрал(а) дату '+BK.date)}
else if(k==='time'){BK.time=b.dataset.t;track('📅 Островок: выбрал(а) время '+BK.time+' ('+BK.date+')')}
else if(k==='send'){sendBooking();return}
render();const t=document.querySelector(k==='time'?'.bk-form':k==='day'?'.slots':null);if(t)t.scrollIntoView({behavior:'smooth',block:'center'})});
document.addEventListener('input',e=>{if(e.target.id==='bkname')BK.name=e.target.value;if(e.target.id==='bkphone')BK.phone=e.target.value});
function vid(){try{let v=localStorage.getItem('pz_vid');if(!v){v=Math.random().toString(36).slice(2,8);localStorage.setItem('pz_vid',v)}return v}catch(e){return 'anon'}}
function track(t){try{const A=TG||MX;const n=Date.now();if(t===_lt&&n-_ls<1500)return;_lt=t;_ls=n;
const body=A&&A.initData?{p:TG?'tg':'mx',d:A.initData,t}:{p:'web',v:vid(),t};
fetch(CFG.trackUrl||'/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{})}catch(e){}}
const PN={book:'Запись в «Островок»',home:'Главная',ages:'Подбор по возрасту',catalog:'Все направления',creative:'Творчество',specialists:'Специалисты',events:'Праздники и мастер-классы',playroom:'Детский уголок «Островок»','playroom-gallery':'Фото «Островка»',schedule:'Расписание',reviews:'Отзывы',contacts:'Адрес и контакты'};
function trackPage(p){let t=PN[p];if(!t&&p.startsWith('age:')){const a=DATA.ages[+p.split(':')[1]];t=a?'Подбор по возрасту → '+a.label:'Подбор по возрасту'}
if(!t&&p.startsWith('item:')){const x=DATA.items.find(x=>x.id===+p.split(':')[1]);t=x?'Направление: '+x.title:'Направление'}if(t)track('Открыл(а): '+t)}
document.addEventListener('click',e=>{const l=e.target.closest('a');if(!l)return;const h=l.getAttribute('href')||'';
if(h.startsWith('tel:'))track('📞 Нажал(а) «Позвонить» '+h.slice(4));else if(l.dataset.ext){const u=l.dataset.ext;const who=(u===CFG.playroomMaxUrl||u===CFG.playroomTgUrl)?'детскому уголку':'администратору';
track(/yandex\./.test(u)?'⭐ Нажал(а) «Оставить отзыв на Яндексе»':/start=reviews/.test(u)?'⭐ Нажал(а) «Оставить отзыв»':(/max\.ru/.test(u)?'💬 Выбрал(а) «Написать в MAX» ':'✈️ Выбрал(а) «Написать в Telegram» ')+(/start=reviews/.test(u)||/yandex\./.test(u)?'':who))}});
const main=document.getElementById('main');
const palette=['yellow','green','blue','pink','lilac','mint'];
const illustrations={'Читательский клуб':'📚','Вместе с мамой':'👩‍👧','ГКП':'🧒','Непоседы':'🏃','Осьминожки':'🐙','Умный карандаш':'✏️','Перед школой':'🎒','Продлённого дня':'🧑‍🤝‍🧑','Английский язык':'🗣️','Студия вокала':'🎤','Театральная студия':'🎭','Нейрокаллиграфия':'✍️','Олимпиадная математика':'🧮','Русский язык':'🔤','Островок':'🧸','Осознанное поколение':'🌱','Логопед':'💬','Психолог':'🌼','Нейропсихолог':'🧩','Мастер-классы':'🎨','День рождения':'🎂','Аренда костюмов':'🎭'};
const artFiles={'Вместе с мамой':'with_mom','ГКП':'gkp','Непоседы':'neposedy','Осьминожки':'octopus','Умный карандаш':'pencil','Перед школой':'before_school','Английский язык':'english','Театральная студия':'theater','Логопед':'logoped'};
const ageFiles=['age_1','age_2','age_3','age_4','age_5','age_6',null,null,null];
function cardArt(x){if(x.title==='Островок')return '<img src="assets/ostrovok_avatar.webp" alt="">';let f=artFiles[x.title];return f?`<img src="assets/${f}.webp" alt="">`:`<span aria-hidden="true">${illustrations[x.title]||'🌟'}</span>`}
const ageFaces=['👶','👶🏻','🧒','👧','👧🏻','🧑','👦','👧🏽','🧑🏻'];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function go(p){if(p==='book'&&page!=='book')bkInit();if(page!==p)history.push(page);page=p;render();window.scrollTo(0,0);trackPage(p)}
function back(){if(history.length){page=history.pop();render();trackPage(page)}else go('home')}
function head(t,sub=''){return `<div class="cloud"><h1>${esc(t)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div>`}
function tile(t,em,c,p){return `<button class="tile ${c}" data-page="${p}"><span class="tile-art" aria-hidden="true">${em}</span><span class="tile-label">${esc(t)}</span></button>`}
function itemCard(x,i=0){let art=cardArt(x);return `<button class="illustrated-card ${palette[i%6]}" data-item="${x.id}"><span class="illustrated-art">${art}</span><span class="illustrated-copy"><strong>${esc(x.title)}</strong><small>${esc(x.age||'Подробности внутри')}</small></span></button>`}
function cards(arr){return arr.length?`<div class="visual-list">${arr.map(itemCard).join('')}</div>`:'<div class="notice">Подходящие направления уточните у администратора.</div>'}
function contactButtons(){return `${contactBtn('adm','cta')}<a class="soft" href="tel:${CFG.adminPhone}">☎ ${CFG.adminPhone}</a>`}
function matchesAge(a){return DATA.items.filter(x=>x.group==='programs'&&(x.ages||[]).includes(a.k))}
function extractSchedule(x){let d=x.detail||'';let match=d.match(/Расписание и формат:\s*([\s\S]*?)(?=\nСтоимость:|$)/i);return match?match[1].trim().replace(/\n+/g,' '):'Уточняется у администратора'}
function scheduleTable(){let arr=DATA.items.filter(x=>x.group==='programs');return `<div class="schedule-wrap"><table class="schedule-table"><thead><tr><th>Направление</th><th>Возраст</th><th>Дни и время</th></tr></thead><tbody>${arr.map(x=>`<tr><td><button class="table-link" data-item="${x.id}">${esc(x.title)}</button></td><td>${esc(x.age||'Уточняется')}</td><td>${esc(extractSchedule(x))}</td></tr>`).join('')}</tbody></table></div><div class="notice">Расписание приведено по базе центра. Актуальность и наличие мест уточняйте у администратора.</div>`}
function render(){updateBack();document.querySelectorAll('.bottom button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));let s='';
if(page==='home'){s=`<div class="hero"><img class="heroimg" src="assets/hero.webp" alt="Планета знаний — иллюстрация"></div>${head('Добро пожаловать на Планету знаний!','Место, где интересно расти')}<button class="ostrovok-feature" data-page="playroom"><img src="assets/ostrovok_avatar.webp" alt="Аватарка Островка"><span><strong>Детский уголок</strong><small>Пространство для свободных игр и общения</small></span></button><div class="grid">${tile('Подобрать по возрасту','👧','yellow','ages')}${tile('Все направления','🧩','green','catalog')}${tile('Творчество и развитие','🎨','blue','creative')}${tile('Наши специалисты','💬','pink','specialists')}${tile('Праздники и мастер-классы','🎉','lilac','events')}${tile('Отзывы','💛','mint','reviews')}${tile('Расписание','🗓️','yellow','schedule')}${tile('Адрес и контакты','📍','green','contacts')}</div>`}
else if(page==='ages'){let ages=DATA.ages.filter(a=>/\d|старше/i.test(a.label)&&!/адрес|администратор|уголок/i.test(a.label));s=head('Подобрать по возрасту','Выберите возраст ребёнка')+`<div class="age-grid">${ages.map((a,i)=>`<button class="age-tile ${palette[i%6]}" data-page="age:${DATA.ages.indexOf(a)}"><span class="age-face" aria-hidden="true">${ageFiles[i]?`<img src="assets/${ageFiles[i]}.webp" alt="">`:ageFaces[i%ageFaces.length]}</span><strong>${esc(a.label)}</strong></button>`).join('')}</div>`}
else if(page.startsWith('age:')){let a=DATA.ages[+page.split(':')[1]];s=head(a.label,'Направления для этого возраста')+`<div class="section">${cards(matchesAge(a))}</div>`}
else if(page==='catalog'||page==='creative'){let arr=DATA.items.filter(x=>x.group==='programs');if(page==='creative')arr=arr.filter(x=>/вокал|театр|каллиграф|осьминож|непосед|мамой|карандаш/i.test(x.title));s=head(page==='creative'?'Творчество и развитие':'Все направления','Выберите интересующее направление')+`<div class="section"><input class="search" id="search" placeholder="Найти направление…" aria-label="Поиск направлений"><div id="catalog-items">${cards(arr)}</div></div>`}
else if(page==='specialists'||page==='events'){let arr=DATA.items.filter(x=>x.group===(page==='specialists'?'specialists':'events'));s=head(page==='specialists'?'Наши специалисты':'Праздники и мастер-классы',page==='specialists'?'Логопед, психолог, нейропсихолог':'Выберите интересующий формат')+`<div class="section">${cards(arr)}</div>`}
else if(page==='playroom'){s=head('Детский уголок','Пространство для свободной игры и общения')+`<div class="section"><img class="avatar" src="assets/ostrovok_avatar.webp" alt="Аватарка Островка"><div class="playroom-intro">Детский уголок для свободной игры и общения. Комфортное пространство, где малышам и дошкольникам интересно и спокойно.</div><img class="photo" src="assets/playroom.webp" alt="Настоящая фотография комнаты Островок"><div class="playroom-intro"><b>📅 Детский уголок работает по записи.</b> Выберите дату и время, во сколько планируете прийти: час отсчитывается от времени прихода.</div><button class="cta" data-page="book">📅 Записаться</button>${contactBtn('pr','soft')}<a class="soft" href="tel:${CFG.playroomPhone}">☎ Островок: ${CFG.playroomPhone}</a>${contactBtn('adm','soft')}<a class="soft" href="tel:${CFG.adminPhone}">☎ Администратор: ${CFG.adminPhone}</a><button class="gallery-button" data-page="playroom-gallery">Посмотреть фотографии</button></div>`}
else if(page==='book'){if(!BK.y)bkInit();s=bookHTML()}
else if(page==='playroom-gallery'){s=head('Фотографии','Детский уголок')+`<div class="section"><img class="photo" src="assets/playroom.webp" alt="Фотография комнаты Островок"><p class="gallery-note">Здесь появятся новые фотографии уголка.</p></div>`}
else if(page==='schedule'){s=head('Расписание','Наглядно по всем направлениям')+`<div class="section">${scheduleTable()}</div>`}
else if(page==='reviews'){s=head('Отзывы','Поделитесь впечатлениями')+`<div class="section"><div class="review-visual" aria-hidden="true">💬 🌟 💛</div><p class="centered">Ваше мнение помогает нам становиться лучше!</p>${reviewBtn()}</div>`}
else if(page==='contacts'){s=head('Адрес и контакты','Мы рядом')+`<div class="section"><div class="address-card"><h2>📍 Основной центр</h2><p>с. Домодедово, ЖК «Домодедово Парк», бульвар Строителей, дом 5</p></div><div class="address-card"><h2>📍 Второй адрес</h2><p>ул. Современников, дом 6</p></div>${contactButtons()}${contactBtn('pr','soft')}<a class="soft" href="tel:${CFG.playroomPhone}">☎ Островок: ${CFG.playroomPhone}</a></div>`}
else if(page.startsWith('item:')){let x=DATA.items.find(x=>x.id===+page.split(':')[1]);if(x){let txt=esc(x.detail).replace(/\n/g,'<br>');s=head(x.title,x.age)+`<div class="section"><div class="detail-hero ${palette[x.id%6]}">${x.title==='Островок'?'<img src="assets/ostrovok_avatar.webp" alt="Аватарка Островка">':cardArt(x)}</div>${x.title==='Островок'?'<img class="photo" src="assets/playroom.webp" alt="Фотография Островка">':''}<div class="detail">${txt}</div>${x.title==='Островок'?'<button class="cta" data-page="book">📅 Записаться</button>'+contactBtn('pr','soft')+`<a class="soft" href="tel:${CFG.playroomPhone}">☎ ${CFG.playroomPhone}</a>`:contactButtons()}</div>`}}
main.innerHTML=s;main.querySelectorAll('img').forEach(img=>{img.onerror=()=>{img.style.display='none';};});main.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));main.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>go('item:'+b.dataset.item));let search=main.querySelector('#search');if(search)search.oninput=()=>{let q=search.value.toLowerCase();let arr=DATA.items.filter(x=>x.group==='programs'&&x.title.toLowerCase().includes(q));document.querySelector('#catalog-items').innerHTML=cards(arr);main.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>go('item:'+b.dataset.item))}}
document.getElementById('back').onclick=back;document.getElementById('home').onclick=()=>go('home');document.querySelectorAll('.bottom button').forEach(b=>b.onclick=()=>go(b.dataset.page));fetch('data.json').then(r=>r.json()).then(d=>{DATA=d;render();track('🚀 Открыл(а) мини-приложение')}).catch(()=>{main.innerHTML='<div class="section"><h2>Не удалось загрузить данные приложения</h2></div>'});
