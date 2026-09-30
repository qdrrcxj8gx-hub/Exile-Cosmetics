'use strict';
const iconPaths = {arrow:'M5 19 19 5M5 5h14v14',plus:'M12 5v14M5 12h14',minus:'M5 12h14',check:'m5 12 4 4L19 6',menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M6 18 18 6',spark:'M12 2v20M2 12h20M5 5l14 14M5 19 19 5'};
const icon = name => `<svg class="icon icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${iconPaths[name]}"/></svg>`;
const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
const findProduct = id => products.find(product => product.id === id);
const plural = (n,one,few,many) => n % 100 >= 11 && n % 100 <= 14 ? many : n % 10 === 1 ? one : n % 10 >= 2 && n % 10 <= 4 ? few : many;
let cart = {};
try {
  const saved = JSON.parse(localStorage.getItem('exile-cart-v1') || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    for (const product of products) {
      const quantity = saved[product.id];
      if (Number.isInteger(quantity) && quantity > 0 && quantity <= 20) cart[product.id] = quantity;
    }
  }
} catch { /* A blocked storage area must not prevent shopping. */ }
const total = () => products.reduce((sum,product) => sum + product.price * (cart[product.id] || 0),0);
const count = () => Object.values(cart).reduce((sum,quantity) => sum + quantity,0);
let toastTimer;
function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message; element.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'),2600);
}
function setTheme(theme) { if (['blueberry','cherry','caramel'].includes(theme)) document.body.dataset.theme = theme; }
const visibleProducts = new Map();
const cardObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) visibleProducts.set(entry.target,entry.intersectionRatio); else visibleProducts.delete(entry.target); });
  if (document.querySelector('dialog[open]')) return;
  const candidates = [...visibleProducts].sort((a,b) => b[1]-a[1]);
  if (candidates.length) setTheme(candidates[0][0].dataset.theme);
},{threshold:[0,.25,.5,.75,1],rootMargin:'-15% 0px -20% 0px'});
const moods = {
  blueberry:{id:'moon',name:'MOON TRAVEL',type:'TRAVEL COLLECTION',image:'assets/enhanced/detail-488585561.webp',alt:'Космическая предметная съёмка набора Exile Moon'},
  cherry:{id:'cherry',name:'SUPREME CHERRY',type:'CHERRY COLLECTION',image:'assets/enhanced/campaign-2083-3.webp',alt:'Предметная фотосессия красных флаконов Exile Supreme Cherry'},
  caramel:{id:'black',name:'BLACK COLLECTION',type:'BLACK & WHITE COLLECTION',image:'assets/enhanced/campaign-2134-0.webp',alt:'Студийная фотография набора Exile Black Collection'}
};
let selectedMood = 'blueberry';
function selectMood(theme) {
  const mood = moods[theme]; if (!mood) return;
  selectedMood = theme; setTheme(theme);
  document.querySelector('#hero-product-image').src = mood.image;
  document.querySelector('#hero-product-image').alt = mood.alt;
  document.querySelector('#hero-feature-name').textContent = mood.name;
  document.querySelector('#hero-feature-type').textContent = mood.type;
  document.querySelector('#hero-feature-link').dataset.product = mood.id;
  document.querySelector('.hero-image-index').textContent = `EXILE / OBJECT ${String(Object.keys(moods).indexOf(theme)+1).padStart(2,'0')}`;
  document.querySelectorAll('[data-mood]').forEach(button => { const active = button.dataset.mood === theme; button.classList.toggle('selected',active); button.setAttribute('aria-pressed',String(active)); });
}
new IntersectionObserver(entries => { if (entries[0].isIntersecting && !document.querySelector('dialog[open]')) setTheme(selectedMood); },{threshold:.55}).observe(document.querySelector('.hero'));
function saveCart() {
  try { localStorage.setItem('exile-cart-v1',JSON.stringify(cart)); } catch { /* In-memory cart remains available. */ }
  document.querySelector('#cart-count').textContent = count();
  document.querySelector('.cart-toggle').setAttribute('aria-label',`Открыть корзину, товаров: ${count()}`);
  renderCart();
}
function addToCart(id) {
  if (!findProduct(id)) return false;
  if ((cart[id] || 0) >= 20) { toast('Максимум 20 одинаковых наборов'); return false; }
  cart[id] = (cart[id] || 0) + 1; saveCart();
  toast(`${findProduct(id).name} — добавлен в корзину`); return true;
}
let activeFilter = 'all';
function renderProducts() {
  const query = document.querySelector('#catalog-search').value.trim().toLocaleLowerCase('ru');
  const visible = products.filter(product => (activeFilter === 'all' || product.tags.includes(activeFilter)) && [product.name,product.subtitle,product.description,product.category,...product.contents.flat()].join(' ').toLocaleLowerCase('ru').includes(query));
  cardObserver.disconnect(); visibleProducts.clear();
  document.querySelector('#products').innerHTML = visible.map(product => `<article class="product-card" data-theme="${product.theme}">
    <button class="product-image-button" data-product="${product.id}" aria-label="Подробнее о ${product.name}"><img src="${product.image}" alt="Набор Exile ${product.name}: оригинальная упаковка и комплектация" loading="lazy" width="900" height="1200"></button>
    <div class="product-meta"><span>${product.category}</span><span>SET / ${product.number}</span></div>
    <button class="product-title" data-product="${product.id}">${product.name} ${icon('arrow')}</button>
    <p class="product-description">${product.subtitle}</p><div class="product-buy"><span class="product-price">${money(product.price)}</span><button class="add-button" data-add="${product.id}" aria-label="Добавить ${product.name} в корзину">В корзину <span>${icon('plus')}</span></button></div><p class="edition-label">${product.badge}</p>
  </article>`).join('');
  document.querySelector('#product-count').textContent = `${visible.length} ${plural(visible.length,'НАБОР','НАБОРА','НАБОРОВ')}`;
  document.querySelector('#catalog-empty').hidden = visible.length !== 0;
  document.querySelectorAll('.product-card').forEach(card => cardObserver.observe(card));
}
function openDialog(id) { const dialog = document.getElementById(id); if (!dialog.open) dialog.showModal(); }
let currentProductId = null;
let galleryIndex = 0;
function galleryMarkup(product) {
  return `<div class="product-gallery" aria-label="Фотографии ${product.name}"><div class="gallery-stage" tabindex="0" role="group" aria-label="Галерея: используй стрелки влево и вправо"><img id="gallery-main-image" class="detail-photo" src="${product.gallery[0].src}" alt="${product.gallery[0].alt}" draggable="false"><div class="gallery-arrows"><button type="button" data-gallery-step="-1" aria-label="Предыдущее фото">${icon('arrow')}</button><button type="button" data-gallery-step="1" aria-label="Следующее фото">${icon('arrow')}</button></div></div><div class="gallery-caption"><span id="gallery-label">${product.gallery[0].label}</span><span id="gallery-count" role="status" aria-live="polite">1 / ${product.gallery.length}</span></div><div class="gallery-thumbnails" role="group" aria-label="Выбрать фотографию">${product.gallery.map((photo,index) => `<button type="button" data-gallery-index="${index}" class="gallery-thumb ${index === 0 ? 'selected' : ''}" aria-pressed="${index === 0}" aria-label="${photo.label}: фото ${index+1}"><img src="${photo.src}" alt="" loading="lazy"><span>${photo.label}</span></button>`).join('')}</div></div>`;
}
function selectGallery(index) {
  const product = findProduct(currentProductId); if (!product) return;
  galleryIndex = (index + product.gallery.length) % product.gallery.length;
  const photo = product.gallery[galleryIndex];
  const image = document.querySelector('#gallery-main-image');
  image.src = photo.src; image.alt = photo.alt;
  document.querySelector('.gallery-stage').classList.toggle('is-portrait',Boolean(photo.portrait));
  document.querySelector('#gallery-label').textContent = photo.label;
  document.querySelector('#gallery-count').textContent = `${galleryIndex+1} / ${product.gallery.length}`;
  document.querySelectorAll('[data-gallery-index]').forEach(button => { const active = Number(button.dataset.galleryIndex) === galleryIndex; button.classList.toggle('selected',active); button.setAttribute('aria-pressed',String(active)); });
}
function showProduct(id) {
  const product = findProduct(id); if (!product) return;
  setTheme(product.theme); currentProductId = id; galleryIndex = 0;
  document.querySelector('#product-detail').innerHTML = `${galleryMarkup(product)}<div class="product-detail-copy"><p class="eyebrow">${product.badge} / ${product.number}</p><h2 id="product-title">${product.name}</h2><p>${product.description}</p><ul class="contents-list">${product.contents.map(item => `<li><strong>${item[0]}</strong>${item[1]}</li>`).join('')}</ul><p class="small muted">Производство: ${product.origin}${product.age ? ' · '+product.age : ''}<br>Состав INCI и способ применения — на упаковке.</p><b class="product-price">${money(product.price)}</b><button class="button button-lime" data-add="${product.id}">Добавить в корзину ${icon('plus')}</button><p class="price-note">Демонстрационная цена · ${product.availability}</p><button class="text-link product-cart-link" data-open-cart>Перейти в корзину ${icon('arrow')}</button></div>`;
  openDialog('product-dialog');
  document.querySelector('#product-dialog').scrollTop = 0;
}
function renderCart() {
  const container = document.querySelector('#cart-content');
  if (!count()) {
    container.innerHTML = `<div class="empty-cart"><span>${icon('spark')}</span><h3>Твой ритуал начинается здесь.</h3><p>Выбери набор, который подходит тебе.<br>Мы сохраним его в корзине.</p><button class="button button-lime" data-shop>К коллекции ${icon('arrow')}</button></div>`; return;
  }
  container.innerHTML = products.filter(product => cart[product.id]).map(product => `<div class="cart-line"><img src="${product.image}" alt="${product.name}"><div><h3>${product.name}</h3><p>${money(product.price * cart[product.id])}</p><div class="cart-line-controls"><div class="quantity"><button data-quantity="${product.id}" data-change="-1" aria-label="Уменьшить количество ${product.name}">${icon('minus')}</button><span aria-label="Количество">${cart[product.id]}</span><button data-quantity="${product.id}" data-change="1" ${cart[product.id] >= 20 ? 'disabled' : ''} aria-label="Увеличить количество ${product.name}">${icon('plus')}</button></div><button class="remove-button" data-remove="${product.id}" aria-label="Удалить ${product.name}">Удалить</button></div></div></div>`).join('') + `<div class="cart-footer"><div class="cart-total"><span>Итого</span><b>${money(total())}</b></div><p class="small muted">Демонстрационные цены. Доставка рассчитывается отдельно после подключения магазина.</p><button class="button button-lime" id="checkout-button">К оформлению ${icon('arrow')}</button><p class="small muted">Демо: без оплаты и отправки заказа.</p></div>`;
}
const addFeedback = new WeakMap();
document.addEventListener('click',event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.hasAttribute('data-add')) {
    const added = addToCart(button.dataset.add);
    const previous = addFeedback.get(button); const original = previous ? previous.original : button.innerHTML;
    if (previous) clearTimeout(previous.timer);
    button.innerHTML = added ? `Добавлено ${icon('check')}` : 'Максимум 20 наборов';
    const timer = setTimeout(() => { if (button.isConnected) button.innerHTML = original; addFeedback.delete(button); },1300);
    addFeedback.set(button,{original,timer});
  }
  if (button.hasAttribute('data-gallery-index')) selectGallery(Number(button.dataset.galleryIndex));
  if (button.hasAttribute('data-gallery-step')) selectGallery(galleryIndex + Number(button.dataset.galleryStep));
  if (button.hasAttribute('data-product')) showProduct(button.dataset.product);
  if (button.hasAttribute('data-mood')) selectMood(button.dataset.mood);
  if (button.hasAttribute('data-filter') || button.id === 'reset-filters') {
    activeFilter = button.dataset.filter || 'all';
    if (button.id === 'reset-filters') document.querySelector('#catalog-search').value = '';
    document.querySelectorAll('[data-filter]').forEach(item => { const active = item.dataset.filter === activeFilter; item.classList.toggle('active',active); item.setAttribute('aria-pressed',String(active)); });
    renderProducts();
  }
  if (button.hasAttribute('data-open-cart')) { button.closest('dialog').close(); openDialog('cart-dialog'); }
  if (button.hasAttribute('data-close')) button.closest('dialog').close();
  if (button.hasAttribute('data-quantity')) {
    const id = button.dataset.quantity; cart[id] = Math.max(0,Math.min(20,(cart[id] || 0)+Number(button.dataset.change)));
    if (!cart[id]) delete cart[id]; saveCart();
    const replacement = document.querySelector(`[data-quantity="${id}"][data-change="${button.dataset.change}"]:not(:disabled)`);
    (replacement || document.querySelector('#cart-dialog .close-button')).focus();
  }
  if (button.hasAttribute('data-remove')) { delete cart[button.dataset.remove]; saveCart(); document.querySelector('#cart-dialog .close-button').focus(); }
  if (button.hasAttribute('data-shop')) { button.closest('dialog').close(); document.querySelector('#catalog').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); }
  if (button.id === 'checkout-button' && count()) {
    document.querySelector('#cart-dialog').close(); document.querySelector('#checkout-form').hidden = false;
    document.querySelector('#checkout-success').hidden = true; document.querySelector('#checkout-total').textContent = money(total()); openDialog('checkout-dialog');
  }
});
document.querySelector('#catalog-search').addEventListener('input',renderProducts);
['pointerover','focusin'].forEach(type => document.querySelector('#products').addEventListener(type,event => { const card = event.target.closest('.product-card'); if (card && !card.contains(event.relatedTarget)) setTheme(card.dataset.theme); }));
document.querySelector('.cart-toggle').addEventListener('click',() => openDialog('cart-dialog'));
document.querySelector('#about-demo').addEventListener('click',() => openDialog('info-dialog'));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click',event => {
  if (event.target !== dialog) return; const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
}));
const menuButton = document.querySelector('.menu-toggle'); const menu = document.querySelector('#mobile-nav');
function setMenu(open) { menu.hidden = !open; menuButton.setAttribute('aria-expanded',String(open)); menuButton.setAttribute('aria-label',open ? 'Закрыть меню' : 'Открыть меню'); menuButton.innerHTML = icon(open ? 'close' : 'menu'); }
menuButton.addEventListener('click',() => setMenu(menu.hidden));
menu.addEventListener('click',event => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown',event => { if (event.key === 'Escape' && !menu.hidden) setMenu(false); });
matchMedia('(min-width:701px)').addEventListener('change',event => { if (event.matches) setMenu(false); });
document.querySelector('[name="delivery"]').addEventListener('change',event => { document.querySelector('#address-label span').textContent = event.target.value === 'pickup' ? 'Город и адрес пункта выдачи' : 'Город и адрес доставки'; });
document.querySelector('#checkout-form').addEventListener('submit',event => {
  event.preventDefault();
  if (!count()) { document.querySelector('#checkout-dialog').close(); openDialog('cart-dialog'); return; }
  event.currentTarget.hidden = true; document.querySelector('#checkout-success').hidden = false; event.currentTarget.reset();
  document.querySelector('#address-label span').textContent = 'Город и адрес пункта выдачи'; cart = {}; saveCart();
  document.querySelector('#checkout-success button').focus();
});
renderProducts(); saveCart();

document.querySelector('#product-detail').addEventListener('keydown',event => {
  if (!event.target.closest('.product-gallery')) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault(); selectGallery(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
let galleryTouchX = null;
document.querySelector('#product-detail').addEventListener('touchstart',event => {
  galleryTouchX = event.target.closest('.gallery-stage') && event.touches.length === 1 ? event.touches[0].clientX : null;
},{passive:true});
document.querySelector('#product-detail').addEventListener('touchend',event => {
  if (galleryTouchX === null) return;
  const delta = event.changedTouches[0].clientX - galleryTouchX;
  galleryTouchX = null;
  if (Math.abs(delta) > 55) selectGallery(galleryIndex + (delta < 0 ? 1 : -1));
},{passive:true});
for (const field of document.querySelectorAll('[name="name"], [name="address"]')) {
  field.addEventListener('input',() => field.setCustomValidity(field.value.trim().length < Number(field.minLength) ? 'Пожалуйста, заполни поле без лишних пробелов.' : ''));
}
