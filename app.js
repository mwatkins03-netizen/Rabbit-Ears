(()=>{
  const $=selector=>document.querySelector(selector);
  const channels=[...(window.DEFAULT_CHANNELS||[])];
  const wallSize=7;
  const slots=[];
  let selectedSlot=0, filter='All', soundOn=false, digits='', digitTimer=null;

  const pad=n=>String(n).padStart(2,'0');
  const escapeHTML=(value='')=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const selected=()=>slots[selectedSlot];
  const selectedChannel=()=>channels[selected()?.channelIndex||0];
  const setStatus=(message,bad=false)=>{ $('#playerStatus').textContent=message; $('#playerStatus').style.color=bad?'var(--red)':''; };

  function tvMarkup(slotIndex){
    return `<article class="tv-set loading${slotIndex===0?' selected':''}" data-slot="${slotIndex}" role="button" tabindex="0" aria-label="Open television ${slotIndex+1} full screen">
      <span class="tv-antenna" aria-hidden="true"></span><span class="cabinet-ridge" aria-hidden="true"></span><div class="tv-screen"><video muted playsinline preload="metadata" controls></video><span class="tv-live">LIVE</span><span class="fullscreen-tag">FULL SCREEN ↗</span><div class="tv-error">SIGNAL LOST<br>Choose another channel below</div></div><span class="tv-label">TUNING…</span><span class="tv-controls" aria-hidden="true"><i class="knob"></i><i class="knob"></i></span><span class="tv-feet" aria-hidden="true"><i></i><i></i></span>
    </article>`;
  }

  function buildWall(){
    $('#wall').innerHTML=Array.from({length:wallSize},(_,i)=>tvMarkup(i)).join('');
    [...document.querySelectorAll('.tv-set')].forEach((element,i)=>{
      const video=element.querySelector('video');
      slots.push({element,video,hls:null,channelIndex:i});
      element.addEventListener('click',event=>{if(event.target.closest('video')&&document.fullscreenElement)return;openFullscreen(i)});
      element.addEventListener('keydown',event=>{ if(event.key==='Enter'){event.preventDefault();openFullscreen(i)} });
      video.addEventListener('playing',()=>{element.classList.remove('loading','offline');if(i===selectedSlot)setStatus(video.muted?'Playing · muted':'Playing · audio on')});
      video.addEventListener('waiting',()=>{if(i===selectedSlot)setStatus('Buffering…')});
      video.addEventListener('progress',()=>{if(i===selectedSlot)updateBuffer()});
      video.addEventListener('timeupdate',()=>{if(i===selectedSlot)updateBuffer()});
    });
  }

  function openFullscreen(index){
    selectSlot(index);soundOn=true;slots.forEach((slot,i)=>slot.video.muted=i!==index);updateSelectedPanel();
    const set=slots[index].element;
    if(!document.fullscreenElement&&set.requestFullscreen)set.requestFullscreen().catch(()=>setStatus('Full screen is unavailable in this browser',true));
  }

  function destroySlot(slot){
    if(slot.hls){slot.hls.destroy();slot.hls=null}
    slot.video.pause();slot.video.removeAttribute('src');slot.video.load();
  }

  function loadSlot(slotIndex,channelIndex,{autoplay=true}={}){
    const slot=slots[slotIndex];
    channelIndex=(channelIndex+channels.length)%channels.length;
    const channel=channels[channelIndex];
    destroySlot(slot);slot.channelIndex=channelIndex;
    slot.element.classList.remove('offline');slot.element.classList.add('loading');
    slot.element.querySelector('.tv-label').textContent=`CH ${pad(channel.preset)} · ${channel.name}`;
    slot.video.muted=slotIndex!==selectedSlot||!soundOn;
    if(slotIndex===selectedSlot){updateSelectedPanel();resetMetrics();setStatus('Connecting…')}

    const ready=()=>{
      slot.element.classList.remove('loading','offline');
      if(slotIndex===selectedSlot)setStatus('Ready');
      if(autoplay)slot.video.play().catch(()=>{if(slotIndex===selectedSlot)setStatus('Select the screen to play')});
    };
    const fail=()=>{
      slot.element.classList.remove('loading');slot.element.classList.add('offline');
      if(slotIndex===selectedSlot)setStatus('Feed unavailable',true);
    };
    const nativeHls=slot.video.canPlayType('application/vnd.apple.mpegurl');
    if(window.Hls&&Hls.isSupported()){
      const hls=new Hls({enableWorker:true,lowLatencyMode:true,backBufferLength:12,maxBufferLength:12,startLevel:-1});
      slot.hls=hls;hls.loadSource(channel.url);hls.attachMedia(slot.video);
      hls.on(Hls.Events.MANIFEST_PARSED,ready);
      hls.on(Hls.Events.LEVEL_SWITCHED,(_,data)=>{if(slotIndex!==selectedSlot)return;const level=hls.levels[data.level];$('#qualityMetric').textContent=level?.height?`${level.height}p`:'AUTO'});
      hls.on(Hls.Events.FRAG_LOADED,(_,data)=>{if(slotIndex!==selectedSlot||!data.frag?.stats)return;const stats=data.frag.stats,duration=Math.max(.2,(stats.loading.end-stats.loading.start)/1000),kbps=Math.round((stats.total*8/1000)/duration);$('#rateMetric').textContent=kbps>=1000?(kbps/1000).toFixed(1)+'M':kbps+'k'});
      hls.on(Hls.Events.ERROR,(_,data)=>{
        if(!data.fatal)return;
        if(data.type===Hls.ErrorTypes.MEDIA_ERROR)hls.recoverMediaError();else fail();
      });
    }else if(nativeHls){slot.video.src=channel.url;slot.video.addEventListener('loadedmetadata',ready,{once:true});slot.video.addEventListener('error',fail,{once:true})}
    else fail();
  }

  function selectSlot(index){
    const previous=selected();
    if(previous)previous.video.muted=true;
    selectedSlot=index;
    slots.forEach((slot,i)=>slot.element.classList.toggle('selected',i===index));
    selected().video.muted=!soundOn;
    selected().video.play().catch(()=>{});
    updateSelectedPanel();resetMetrics();renderGuide();
    setStatus(selected().element.classList.contains('offline')?'Feed unavailable':selected().video.paused?'Ready':selected().video.muted?'Playing · muted':'Playing · audio on',selected().element.classList.contains('offline'));
  }

  function updateSelectedPanel(){
    const channel=selectedChannel();
    $('#presetDisplay').textContent=pad(channel.preset);$('#stationName').textContent=channel.name;
    $('#stationMeta').textContent=`${channel.market} · ${channel.network}${channel.note?' · '+channel.note:''}`;
    $('#rawLink').href=channel.url;$('#soundBtn').textContent=soundOn?'Mute selected audio':'Turn on selected audio';
  }

  function toggleSound(){
    soundOn=!soundOn;slots.forEach((slot,i)=>slot.video.muted=i!==selectedSlot||!soundOn);
    selected().video.play().catch(()=>{});updateSelectedPanel();setStatus(soundOn?'Playing · audio on':'Playing · muted');
  }

  function resetMetrics(){$('#qualityMetric').textContent='—';$('#rateMetric').textContent='—';$('#bufferMetric').textContent='—'}
  function updateBuffer(){const video=selected().video;if(!video.buffered.length){$('#bufferMetric').textContent='0.0s';return}const end=video.buffered.end(video.buffered.length-1);$('#bufferMetric').textContent=Math.max(0,end-video.currentTime).toFixed(1)+'s'}
  function surf(delta){loadSlot(selectedSlot,selected().channelIndex+delta)}
  function tunePreset(number){const index=channels.findIndex(channel=>channel.preset===Number(number));if(index<0){setStatus(`Preset ${number} not found`,true);return}loadSlot(selectedSlot,index);renderGuide()}

  const categories=()=>['All','Memphis','PBS','FOX','NBC','Local News','Public','Imported'];
  function matchesFilter(channel){if(filter==='All')return true;if(filter==='Memphis')return /Memphis/i.test(channel.market);if(filter==='Imported')return !!channel.imported;return channel.network===filter||(filter==='PBS'&&/PBS/i.test(channel.sourceType+channel.network))}
  function renderFilters(){const box=$('#filters');box.innerHTML='';categories().forEach(name=>{const button=document.createElement('button');button.type='button';button.textContent=name;button.className=name===filter?'active':'';button.addEventListener('click',()=>{filter=name;renderFilters();renderGuide()});box.appendChild(button)})}
  function renderGuide(){
    const query=$('#searchInput').value.trim().toLowerCase();
    const visible=channels.filter(channel=>matchesFilter(channel)&&(!query||`${channel.name} ${channel.callSign} ${channel.market} ${channel.network}`.toLowerCase().includes(query)));
    $('#guideCount').textContent=`${visible.length} ${visible.length===1?'feed':'feeds'}`;
    const grid=$('#channelGrid');grid.innerHTML='';
    if(!visible.length){grid.innerHTML='<div class="empty">No channels match this filter.</div>';return}
    visible.forEach(channel=>{const button=document.createElement('button');button.type='button';button.className='channel-card'+(channel.id===selectedChannel().id?' active':'');button.innerHTML=`<span class="channel-num">${pad(channel.preset)}</span><span class="channel-details"><strong>${escapeHTML(channel.name)}</strong><span>${escapeHTML(channel.market)}</span></span><span class="network">${escapeHTML(channel.network)}</span>`;button.addEventListener('click',()=>{loadSlot(selectedSlot,channels.indexOf(channel));renderGuide();document.querySelector('.now-card').scrollIntoView({behavior:'smooth',block:'nearest'})});grid.appendChild(button)});
  }

  const sportsPicks=[
    {index:6,sport:'FOOTBALL',title:'Friday Night Lights',icon:'football',tone:'turquoise'},
    {index:9,sport:'BASKETBALL',title:'Courtside Chicago',icon:'basketball',tone:'yellow'},
    {index:10,sport:'BASEBALL',title:'The Home Stretch',icon:'baseball',tone:'coral'},
    {index:18,sport:'SOCCER',title:'West Coast Matchday',icon:'soccer',tone:'cream'},
    {index:21,sport:'COLLEGE',title:'Saturday Signal',icon:'pennant',tone:'brown'},
    {index:30,sport:'GAME DAY',title:'Bay Area Live',icon:'trophy',tone:'red'}
  ];
  function sportIcon(type){const shapes={football:'<path d="M18 52c10-25 28-36 48-34-1 22-14 41-39 47-8 2-12-5-9-13Z"/><path d="m38 36 12 11m-8-15-8 9m12-13-8 9m12-13-8 9"/>',basketball:'<circle cx="42" cy="42" r="27"/><path d="M22 23c20 14 28 28 39 39M17 43h50M42 16c-8 17-8 35 0 52"/>',baseball:'<circle cx="42" cy="42" r="27"/><path d="M26 21c5 8 7 13 7 21s-2 14-8 22m34-43c-5 8-7 13-7 21s2 14 8 22M30 31l-6-4m7 12-7-2m30-6 6-4m-7 12 7-2"/>',soccer:'<circle cx="42" cy="42" r="27"/><path d="m42 29 11 8-4 13H35l-4-13Zm-20-8 8 16-10 9m44-25-11 16 11 9M35 50l-8 14m22-14 8 14"/>',pennant:'<path d="M18 15v54m2-48h45L42 39l23 18H20Z"/>',trophy:'<path d="M29 17h26v14c0 15-7 22-13 22s-13-7-13-22Zm0 5H17v8c0 9 7 14 15 14m23-22h12v8c0 9-7 14-15 14M42 53v13m-12 0h24"/>'};return `<svg viewBox="0 0 84 84" aria-hidden="true">${shapes[type]}</svg>`}
  function renderSports(){const grid=$('#sportsGrid');grid.innerHTML='';sportsPicks.forEach(pick=>{const channel=channels[pick.index];if(!channel)return;const button=document.createElement('button');button.type='button';button.className=`sport-card ${pick.tone}`;button.innerHTML=`<span class="sport-icon">${sportIcon(pick.icon)}</span><span class="sport-copy"><small>${pick.sport} · CH ${pad(channel.preset)}</small><strong>${pick.title}</strong><em>${escapeHTML(channel.name)} · ${escapeHTML(channel.market)}</em></span><b>WATCH ↗</b>`;button.addEventListener('click',()=>{loadSlot(selectedSlot,pick.index);renderGuide();openFullscreen(selectedSlot)});grid.appendChild(button)})}

  function parseM3U(text){const lines=text.split(/\r?\n/),found=[];let meta='';for(const raw of lines){const line=raw.trim();if(line.startsWith('#EXTINF')){meta=line;continue}if(/^https?:\/\//i.test(line)&&meta){const name=(meta.split(',').slice(1).join(',')||'Imported channel').trim();const id=(meta.match(/tvg-id="([^"]+)"/)||[])[1]||`import-${Date.now()}-${found.length}`;found.push({id,callSign:name.split(' ')[0],name,market:'Imported M3U',network:'Imported',sourceType:'Imported',url:line,note:'',imported:true});meta=''}}return found}
  function addImported(found){if(!found.length){setStatus('No playable URLs found',true);return}let next=Math.max(...channels.map(channel=>channel.preset))+1;found.forEach(channel=>{channel.preset=next++;channels.push(channel)});filter='Imported';renderFilters();renderGuide();setStatus(`${found.length} channels imported`)}
  function addDigit(digit){digits=(digits+digit).slice(-3);$('#tuneInput').value=digits;clearTimeout(digitTimer);digitTimer=setTimeout(commitDigits,1100)}
  function commitDigits(){if(!digits)return;const number=digits;digits='';$('#tuneInput').value='';tunePreset(number)}

  $('#channelDown').addEventListener('click',()=>surf(-1));$('#channelUp').addEventListener('click',()=>surf(1));$('#soundBtn').addEventListener('click',toggleSound);$('#searchInput').addEventListener('input',renderGuide);
  $('#tuneForm').addEventListener('submit',event=>{event.preventDefault();const value=$('#tuneInput').value;if(value)tunePreset(value);$('#tuneInput').value=''});
  $('#importBtn').addEventListener('click',()=>$('#m3uFile').click());$('#m3uFile').addEventListener('change',async event=>{const file=event.target.files[0];if(file)addImported(parseM3U(await file.text()));event.target.value=''});
  $('#customBtn').addEventListener('click',()=>$('#customDialog').showModal());$('#customForm').addEventListener('submit',event=>{if(event.submitter?.value==='cancel')return;event.preventDefault();const url=$('#customUrl').value.trim();if(!/^https?:\/\//i.test(url))return;const channel={id:'custom-'+Date.now(),callSign:'CUSTOM',name:$('#customName').value.trim()||'Custom channel',market:'Custom URL',network:'Custom',sourceType:'Custom',url,note:'',imported:true,preset:Math.max(...channels.map(item=>item.preset))+1};channels.push(channel);$('#customDialog').close();loadSlot(selectedSlot,channels.length-1);renderFilters();renderGuide()});
  document.addEventListener('keydown',event=>{if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;if(/^\d$/.test(event.key)){addDigit(event.key);return}if(event.key==='ArrowUp'){event.preventDefault();surf(1)}else if(event.key==='ArrowDown'){event.preventDefault();surf(-1)}else if(event.key===' '){event.preventDefault();selected().video.paused?selected().video.play().catch(()=>{}):selected().video.pause()}else if(event.key.toLowerCase()==='m'){toggleSound()}else if(event.key==='/'){event.preventDefault();$('#searchInput').focus()}});
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){soundOn=false;slots.forEach(slot=>slot.video.muted=true);updateSelectedPanel();setStatus('Playing · muted')}});

  function updateClock(){$('#clock').textContent=new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
  buildWall();renderFilters();renderGuide();renderSports();updateClock();setInterval(updateClock,15000);
  slots.forEach((_,index)=>loadSlot(index,index,{autoplay:true}));selectSlot(0);
})();
