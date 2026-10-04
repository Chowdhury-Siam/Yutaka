import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const js = await readFile(new URL('../public/assets/main.js', import.meta.url), 'utf8');

test('top and bottom links only scroll; the download button opens the chooser, with Escape and outside dismissal', () => {
  const events = {}, callbacks = [], focused = [], scrolls = [], locations = [];
  let toggle;
  const summary = { focus: () => focused.push(true), addEventListener: (_name, callback) => { toggle = callback; } };
  const inside = { closest: () => null };
  const menu = {
    open: false,
    classList: { remove() {}, contains: () => false },
    querySelector: () => summary,
    contains: target => target === inside,
    scrollIntoView: options => scrolls.push(options),
  };
  const triggers = ['top', 'bottom'].map(() => ({ addEventListener: (_name, callback) => callbacks.push(callback) }));
  const document = {
    getElementById: id => id === 'platform-menu' ? menu : null,
    querySelectorAll: selector => selector === '[data-download-trigger]' ? triggers : [],
    addEventListener: (name, callback) => { events[name] = callback; },
  };
  const window = {
    location: { hash: '' },
    matchMedia: () => ({ matches: true }),
    history: { replaceState: (_state, _title, url) => locations.push(url) },
  };
  vm.runInNewContext(js, { document, window });
  let prevented = false;
  for (const click of callbacks) {
    click({ preventDefault: () => { prevented = true; } });
    assert.equal(menu.open, false, 'Navigation must not expand the chooser');
  }
  assert.ok(prevented);
  assert.equal(scrolls[0].behavior, 'auto', 'Reduced motion must be respected');
  assert.equal(locations[0], '#downloads');
  assert.equal(focused.length, 2);
  toggle({ preventDefault() {} });
  assert.ok(menu.open, 'Only the main download button expands the chooser');
  events.click({ target: inside });
  assert.ok(menu.open, 'Clicking the panel must keep it open');
  events.keydown({ key: 'Escape' });
  assert.equal(menu.open, false);
  assert.equal(focused.length, 3);
  toggle({ preventDefault() {} });
  events.click({ target: { closest: () => null } });
  assert.equal(menu.open, false);
  window.location.hash = '#downloads';
  menu.open = true;
  vm.runInNewContext(js, { document, window });
  assert.equal(menu.open, false, 'Loading or reloading #downloads keeps the chooser closed');
  toggle({ preventDefault() {} });
  assert.ok(menu.open, 'An explicit download click still opens the chooser');
});

test('public pages reference existing assets and local anchors', async () => {
  const { access } = await import('node:fs/promises');
  for (const name of ['index.html', 'privacy/index.html', '404.html']) {
    const html = await readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    for (const [, target] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
      if (target.startsWith('#')) assert.ok(ids.has(target.slice(1)), `${name}: ${target}`);
      if (target.startsWith('/assets/')) await access(new URL(`../public${target}`, import.meta.url));
    }
    assert.doesNotMatch(html, /sounddesigner|\/demo\/|<iframe|waitlist/i);
  }
});

test('platform drawer morphs with staggered entries, faster closing, and safe interrupted toggles', async () => {
  const events = {}, classes = new Set(), animations = [], tileAnimations = [];
  const cards = Array.from({length:4}, () => ({animate(frames,options) {
    const animation = {frames,options,cancelled:false,cancel(){this.cancelled=true;}};
    tileAnimations.push(animation); return animation;
  }}));
  let toggle;
  const summary = { focus() {}, addEventListener: (_name, callback) => { toggle = callback; }, getBoundingClientRect: () => ({ height:54 }) };
  const menu = {
    open:false, parentElement:{clientWidth:170}, querySelector:()=>summary,
    querySelectorAll:()=>cards,
    classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},
    getBoundingClientRect(){return this.open?{width:365,height:380}:{width:170,height:56};},
    animate(frames,options){
      let finish,reject;
      const animation={frames,options,finished:new Promise((resolve,fail)=>{finish=resolve;reject=fail;}),finish:()=>finish(),cancel:()=>reject(new Error('cancelled'))};
      animations.push(animation); return animation;
    }
  };
  vm.runInNewContext(js,{document:{getElementById:id=>id==='platform-menu'?menu:null,querySelectorAll:()=>[],addEventListener:(name,callback)=>{events[name]=callback;}},window:{matchMedia:()=>({matches:false}),location:{hash:''}}});
  toggle({preventDefault(){}});
  assert.equal(menu.open,true);
  assert.equal(animations[0].frames[0].width,'170px');
  assert.equal(animations[0].frames[1].width,'365px');
  assert.equal(animations[0].frames[1].borderRadius,'20px');
  assert.equal(animations[0].options.duration,400);
  assert.deepEqual(tileAnimations.map(animation=>animation.options.delay),[100,150,200,250]);
  animations[0].finish(); await Promise.resolve();
  assert.ok(tileAnimations.every(animation=>!animation.cancelled),'Staggered entries can finish after the shell grows');
  events.keydown({key:'Escape'});
  assert.equal(menu.open,true,'Native content stays available for the closing animation');
  assert.equal(animations[1].frames[1].height,'56px');
  assert.equal(animations[1].frames[1].borderRadius,'999px');
  assert.equal(animations[1].options.duration,280);
  assert.ok(tileAnimations.slice(0,4).every(animation=>animation.cancelled));
  animations[1].finish(); await Promise.resolve();
  assert.equal(menu.open,false);
  assert.equal(classes.has('is-closing'),false);
  toggle({preventDefault(){}});
  toggle({preventDefault(){}});
  toggle({preventDefault(){}});
  animations[4].finish(); await Promise.resolve();
  assert.equal(menu.open,true,'Rapid reopen cancels the pending close');
  assert.equal(classes.has('is-closing'),false);
});

test('FAQ opens and closes smoothly, reverses an interrupted close, and respects reduced motion', async () => {
  const classes = new Set(), animations = [];
  let toggle, reducedMotion = false;
  const summary = { addEventListener: (_name, callback) => { toggle = callback; }, getBoundingClientRect: () => ({height:76}) };
  const item = {
    open:false, querySelector:()=>summary,
    classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},
    getBoundingClientRect(){return {height:this.open?200:77};},
    animate(frames,options){
      let finish,reject;
      const animation={frames,options,finished:new Promise((resolve,fail)=>{finish=resolve;reject=fail;}),finish:()=>finish(),cancel:()=>reject(new Error('cancelled'))};
      animations.push(animation); return animation;
    },
  };
  vm.runInNewContext(js,{
    document:{getElementById:()=>null,querySelectorAll:selector=>selector==='.faq-list details'?[item]:[]},
    window:{matchMedia:()=>({matches:reducedMotion})},
  });
  toggle({preventDefault(){}});
  assert.equal(item.open,true);
  assert.equal(animations[0].frames[0].height,'77px');
  assert.equal(animations[0].frames[1].height,'200px');
  animations[0].finish(); await Promise.resolve();
  toggle({preventDefault(){}});
  assert.equal(item.open,true,'Answer stays mounted throughout collapse');
  assert.equal(animations[1].frames[1].height,'77px');
  assert.equal(classes.has('is-closing'),true);
  toggle({preventDefault(){}});
  animations[2].finish(); await Promise.resolve();
  assert.equal(item.open,true,'Reopening cancels the earlier close');
  assert.equal(classes.has('is-closing'),false);
  reducedMotion = true;
  toggle({preventDefault(){}});
  assert.equal(item.open,false);
  toggle({preventDefault(){}});
  assert.equal(item.open,true);
  assert.equal(animations.length,3,'Reduced motion uses native state without animation');
});

test('hero keeps its motion with cached layout, scoped writes, and offscreen/hidden-tab suspension', () => {
  const events = {}, frames = new Map(), styles = [], classes = new Set(), observers = [];
  let reads = 0, height = 800, nextFrame = 0;
  const preference = { matches: false, addEventListener: (_name, callback) => { events.preference = callback; } };
  const stage = {
    style: { setProperty: (name, value) => styles.push({ name, value }) },
    classList: { toggle: (name, active) => active ? classes.add(name) : classes.delete(name) },
  };
  const hero = {
    querySelector: () => stage,
    getBoundingClientRect: () => { reads++; return { top: 100 - window.scrollY, height }; },
    style: { setProperty: () => assert.fail('Scroll styles must not invalidate the download UI') },
  };
  const document = {
    hidden: false, documentElement: { classList: { add() {} } },
    getElementById: id => id === 'top' ? hero : null, querySelectorAll: () => [],
    addEventListener: (name, callback) => { events[name] = callback; },
  };
  const window = {
    scrollY: 0, matchMedia: () => preference,
    addEventListener: (name, callback) => { events[name] = callback; },
    requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  let resize;
  class ResizeObserver { constructor(callback) { resize = callback; } observe(target) { assert.equal(target, hero); } }
  class IntersectionObserver { constructor(callback) { this.callback = callback; observers.push(this); } observe(target) { this.target = target; } }
  const flush = () => { for (const [id, callback] of frames) { frames.delete(id); callback(); } };
  vm.runInNewContext(js, { document, window, ResizeObserver, IntersectionObserver });
  const visibility = observers.find(observer => observer.target === hero);
  assert.equal(styles.at(-1).value, '0.0000');
  assert.ok(classes.has('hero-motion-active'));
  window.scrollY = 400; events.scroll(); events.scroll();
  assert.equal(frames.size, 1, 'Multiple scroll events share a frame');
  flush(); assert.equal(styles.at(-1).value, '0.5000');
  assert.equal(reads, 1, 'Ordinary scrolling must not read layout');
  for (let i = 0; i < 100; i++) { events.scroll(); flush(); }
  assert.equal(styles.length, 2, 'Unchanged progress must not rewrite inherited styles');
  assert.equal(reads, 1);
  window.scrollY = 2000; events.scroll(); flush();
  assert.equal(styles.at(-1).value, '1.0000');
  visibility.callback([{ isIntersecting: false }]);
  assert.equal(classes.has('hero-motion-active'), false, 'Offscreen artwork releases compositor hints');
  const writes = styles.length;
  for (let i = 0; i < 100; i++) { events.scroll(); }
  assert.equal(frames.size, 0, 'Offscreen scrolling schedules no hero frames');
  assert.equal(styles.length, writes);
  window.scrollY = 100; visibility.callback([{ isIntersecting: true }]); flush();
  assert.equal(styles.at(-1).value, '0.0000', 'Scrolling back restores the original pose');
  height = 1600; resize(); window.scrollY = 700; flush();
  assert.equal(styles.at(-1).value, '0.5000');
  assert.equal(reads, 2, 'A font/image resize refreshes cached geometry once');
  window.scrollY = 1000; events.scroll();
  document.hidden = true; events.visibilitychange();
  assert.equal(frames.size, 0, 'Hiding the tab cancels pending work');
  events.scroll(); assert.equal(frames.size, 0);
  assert.equal(classes.has('hero-motion-active'), false);
  document.hidden = false; events.visibilitychange(); flush();
  assert.equal(styles.at(-1).value, '0.7500');
  preference.matches = true; events.preference();
  assert.equal(styles.at(-1).value, '0.0000');
  assert.equal(classes.has('hero-motion-active'), false);
  events.scroll(); assert.equal(frames.size, 0, 'Reduced motion schedules no scroll animation');
  preference.matches = false; events.preference();
  assert.equal(styles.at(-1).value, '0.7500', 'Re-enabling motion restores the current scroll pose');
  assert.ok(classes.has('hero-motion-active'));
  window.scrollY = 1300; events.scroll(); events.resize(); flush();
  assert.equal(styles.at(-1).value, '1.0000');
  assert.equal(reads, 4, 'Resize refreshes geometry even with a pending scroll frame');
});

test('navigation contracts after scrolling and returns to its wide state at the top', () => {
  const states=[],events={};
  const nav={classList:{toggle:(name,value)=>states.push({name,value})}};
  const window={scrollY:0,addEventListener:(name,callback)=>{events[name]=callback;}};
  vm.runInNewContext(js,{window,document:{getElementById:id=>id==='nav-wrap'?nav:null,querySelectorAll:()=>[]}});
  assert.equal(states.at(-1).value,false);
  window.scrollY=25; events.scroll();
  assert.equal(states.at(-1).name,'scrolled');
  assert.equal(states.at(-1).value,true);
  events.scroll(); events.scroll();
  assert.equal(states.length,2,'Scrolling within one state must not mutate the navigation class');
  window.scrollY=0; events.scroll();
  assert.equal(states.at(-1).value,false);
});
