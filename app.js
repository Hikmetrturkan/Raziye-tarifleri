const $ = sel => document.querySelector(sel);
const grid = $("#grid");
const count = $("#count");
const filters = $("#filters");
const searchInput = $("#search");

let state = { q: "", category: "Hepsi", recipes: [] };

function uniqueCategories(list){
  const set = new Set(list.flatMap(r => r.category));
  return ["Hepsi", ...Array.from(set)];
}

function renderFilters(){
  const cats = uniqueCategories(state.recipes);
  filters.innerHTML = cats.map(cat => `<button class="chip ${state.category===cat?"active":""}" data-cat="${cat}">${cat}</button>`).join("");
  filters.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.cat;
      filters.querySelectorAll(".chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderGrid();
    });
  });
}

function match(r, q){
  const hay = [r.title, r.description, r.ingredients.join(" "), r.category.join(" ")].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function filtered(){
  return state.recipes.filter(r => {
    const catOk = state.category === "Hepsi" || r.category.includes(state.category);
    const qOk = state.q.trim() === "" || match(r, state.q);
    return catOk && qOk;
  });
}

function recipeCard(r){
  const img = r.images?.[0] || "";
  return `
    <article class="card" aria-label="${r.title}">
      ${img ? `<img src="${img}" alt="${r.title} fotoğrafı" loading="lazy" />` : ""}
      <div class="card-body">
        <h3>${r.title}</h3>
        <p class="muted">${r.description || ""}</p>
        <div class="tags">${r.category.map(c => `<span class="tag">${c}</span>`).join("")}</div>
        <div class="toolbar">
          <button class="btn primary" data-open="${r.id}">Tarife Git</button>
          <span class="muted" style="font-size:12px">⏱ ${r.prepTime + r.cookTime} dk</span>
        </div>
      </div>
    </article>`;
}

function renderGrid(){
  const list = filtered();
  grid.innerHTML = list.map(recipeCard).join("");
  count.textContent = list.length;
  grid.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click", () => openRecipe(btn.dataset.open)));
}

function openRecipe(id){
  const r = state.recipes.find(x => x.id === id);
  if(!r) return;

  const imgs = r.images && r.images.length ? r.images : [];
  const firstImg = imgs[0] || "";
  const imagesHTML = imgs.length ? `
    <div class="carousel">
      <img id="heroImg" src="${firstImg}" alt="${r.title} ana görseli" />
      <div class="thumbs">
        ${imgs.map((src,i)=>`<img src="${src}" alt="${r.title} foto ${i+1}" class="${i===0?"active":""}" data-idx="${i}" />`).join("")}
      </div>
    </div>` : "<p class='muted'>Görsel yok</p>";

  const modal = $("#recipeModal");
  const content = $("#modalContent");

  content.innerHTML = `
    <section class="modal-left">
      <h2 itemprop="name" style="margin:8px 0 6px">${r.title}</h2>
      <p class="muted" itemprop="description">${r.description || ""}</p>
      <div class="meta">
        <span>Hazırlık: <time itemprop="prepTime" datetime="PT${r.prepTime}M">${r.prepTime} dk</time></span>
        <span>Pişirme: <time itemprop="cookTime" datetime="PT${r.cookTime}M">${r.cookTime} dk</time></span>
        <span>Kaç kişilik: <span itemprop="recipeYield">${r.servings}</span></span>
      </div>
      ${imagesHTML}
    </section>
    <section class="modal-right">
      <h3>Malzemeler</h3>
      <ul class="ingredients" itemprop="recipeIngredient">
        ${r.ingredients.map(x => `<li>${x}</li>`).join("")}
      </ul>
      <h3 style="margin-top:12px">Adımlar</h3>
      <ol class="steps" itemprop="recipeInstructions">
        ${r.steps.map(x => `<li>${x}</li>`).join("")}
      </ol>
      ${r.nutrition ? `
      <h3 style="margin-top:12px">Besin bilgisi</h3>
      <p itemprop="nutrition">Kalori ${r.nutrition.calories} kcal. Protein ${r.nutrition.protein} g. Yağ ${r.nutrition.fat} g. Karbonhidrat ${r.nutrition.carbs} g.</p>` : ""}
    </section>`;

  content.querySelectorAll('.thumbs img').forEach(img => {
    img.addEventListener('click', () => {
      content.querySelectorAll('.thumbs img').forEach(t => t.classList.remove('active'));
      img.classList.add('active');
      content.querySelector('#heroImg').src = img.src;
    });
  });

  $("#closeModal").onclick = () => $("#recipeModal").close();
  modal.showModal();
}

function loadJSON(){
  return fetch('tarifler.json', {cache: 'no-store'})
    .then(r => {
      if(!r.ok) throw new Error('tarifler.json yüklenemedi');
      return r.json();
    });
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(state.recipes, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tarifler.json'; a.click();
  URL.revokeObjectURL(url);
}

function init(){
  $("#year").textContent = new Date().getFullYear();
  searchInput.addEventListener("input", e => { state.q = e.target.value; renderGrid(); });
  $("#btnExport").addEventListener("click", exportJSON);
  $("#btnImport").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", async e => {
    const file = e.target.files[0];
    if(!file) return;
    try{
      const text = await file.text();
      const data = JSON.parse(text);
      if(Array.isArray(data)){
        state.recipes = data;
        renderFilters();
        renderGrid();
      } else alert('Geçersiz JSON formatı. Dizi bekleniyordu.');
    }catch(err){ alert('Dosya okunamadı: ' + err.message); }
    e.target.value = '';
  });

  loadJSON()
    .then(data => { state.recipes = data; renderFilters(); renderGrid(); })
    .catch(err => {
      console.error(err);
      state.recipes = [];
      renderFilters();
      renderGrid();
    });
}

document.addEventListener('DOMContentLoaded', init);
