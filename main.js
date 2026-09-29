const entries = window.ATLAS || [];
let category = 'all';
let query = '';
const grid = document.querySelector('#results');
const count = document.querySelector('#count');
const empty = document.querySelector('#empty');
const tabs = document.querySelectorAll('[data-category]');
const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draw(){
  const visible = entries.filter(e => (category === 'all' || (category === 'live' ? e.live : e.category === category)) && `${e.name} ${e.kind} ${e.description} ${e.practice}`.toLowerCase().includes(query));
  grid.innerHTML = visible.map((e,i) => `<article class="card ${safe(e.category)}" style="--order:${i}">
    <a class="thumb" href="${safe(e.url)}" target="_blank" rel="noopener noreferrer" aria-label="${e.live ? 'Try' : 'Visit'} ${safe(e.name)}"><img src="previews/${safe(e.id)}.jpg" alt="Screenshot preview of ${safe(e.name)} ${safe(e.previewOf || 'website')}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="missing" hidden>Preview unavailable<br><small>Open the source ↗</small></span><span class="thumb-label">${safe((e.previewOf || 'Site preview').toUpperCase())} ↗</span></a>
    <div class="card-content"><div class="card-meta"><span class="category">${e.live ? 'LIVE EFFECT' : e.category === 'data' ? 'DATA & COMPUTATION' : e.category === 'gallery' ? 'GALLERY' : 'SKILL / TOOL'}</span><span>${safe(e.kind)}</span></div><h3>${safe(e.name)}</h3><p class="description">${safe(e.description)}</p><p class="practice"><strong>Try in class</strong>${safe(e.practice)}</p><div class="card-links"><a class="source-link" href="${safe(e.url)}" target="_blank" rel="noopener noreferrer">${e.live ? 'Try live demo' : 'Open resource'} <span aria-hidden="true">↗</span></a>${e.demoUrl ? `<a class="preview-link" href="${safe(e.demoUrl)}" target="_blank" rel="noopener noreferrer">Try a live effect ↗</a>` : ''}${e.previewUrl ? `<a class="preview-link" href="${safe(e.previewUrl)}" target="_blank" rel="noopener noreferrer">${safe(e.previewLabel || 'Preview source')} ↗</a>` : ''}</div></div>
  </article>`).join('');
  count.textContent = `${visible.length} of ${entries.length} resources`;
  empty.hidden = visible.length !== 0;
}
tabs.forEach(button => button.addEventListener('click', () => {
  category = button.dataset.category;
  tabs.forEach(t => {const selected = t === button;t.classList.toggle('is-active',selected);t.setAttribute('aria-pressed',String(selected));});
  draw();
}));
document.querySelector('#search').addEventListener('input', event => {query=event.target.value.trim().toLowerCase();draw();});
draw();
