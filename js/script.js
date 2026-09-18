let allRepos = [];

const form           = document.getElementById('search-form');
const usernameInput  = document.getElementById('username-input');
const validationMsg  = document.getElementById('validation-msg');
const userProfile    = document.getElementById('user-profile');
const repoGrid       = document.getElementById('repo-grid');
const loadingEl      = document.getElementById('loading');
const errorEl        = document.getElementById('error-msg');
const controls       = document.getElementById('controls');
const languageFilter = document.getElementById('language-filter');
const sortSelect     = document.getElementById('sort-select');

const navLinks      = document.querySelectorAll('.nav-link');
const sections      = document.querySelectorAll('.section');
const menuToggle    = document.querySelector('.menu-toggle');
const nav           = document.querySelector('nav');
const heroSearchBtn = document.getElementById('hero-search-btn');

function showSection(id) {
  sections.forEach(s => s.classList.toggle('active', s.id === id));
  navLinks.forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === '#' + id);
  });
  nav.classList.remove('open');
  menuToggle.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.getAttribute('href').slice(1);
    showSection(target);
  });
});

menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.classList.toggle('open', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

heroSearchBtn.addEventListener('click', () => showSection('search'));

const STORAGE_KEY = 'gh_explorer_last_user';

function saveUsername(name) {
  localStorage.setItem(STORAGE_KEY, name);
}

function loadSavedUsername() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) usernameInput.value = saved;
}

loadSavedUsername();

function validateInput() {
  const value = usernameInput.value.trim();
  if (!value) {
    setValidationError('Please enter a GitHub username.');
    return false;
  }
  const pattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  if (!pattern.test(value)) {
    setValidationError('Invalid username format. Use letters, numbers, and hyphens only.');
    return false;
  }
  clearValidationError();
  return true;
}

function setValidationError(msg) {
  validationMsg.textContent = msg;
  usernameInput.classList.add('invalid');
}

function clearValidationError() {
  validationMsg.textContent = '';
  usernameInput.classList.remove('invalid');
}

function showLoading() {
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  repoGrid.innerHTML = '';
  userProfile.classList.add('hidden');
  controls.classList.add('hidden');
}

function hideLoading() {
  loadingEl.classList.add('hidden');
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

function hideError() {
  errorEl.classList.add('hidden');
}

const langColors = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572a5',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  PHP: '#4F5D95', Ruby: '#701516', Go: '#00add8', Rust: '#dea584',
  Swift: '#f05138', Kotlin: '#a97bff', HTML: '#e34c26', CSS: '#563d7c',
  Shell: '#89e051', Dart: '#00b4ab', Scala: '#c22d40', R: '#198ce7',
};

function getLangColor(lang) {
  return langColors[lang] || '#8b949e';
}

function renderProfile(user) {
  userProfile.innerHTML = `
    <img src="${user.avatar_url}" alt="${user.login}'s avatar" loading="lazy" />
    <div class="user-info">
      <h2>${user.name || user.login}</h2>
      ${user.bio ? `<p style="color:var(--text-muted);font-size:.9rem">${user.bio}</p>` : ''}
      <div class="user-meta">
        <span>📦 ${user.public_repos} repos</span>
        ${user.followers != null ? `<span>👥 ${user.followers} followers</span>` : ''}
        <span><a href="${user.html_url}" target="_blank" rel="noopener">View on GitHub</a></span>
      </div>
    </div>
  `;
  userProfile.classList.remove('hidden');
}

function renderRepos(repos) {
  repoGrid.innerHTML = '';

  if (repos.length === 0) {
    repoGrid.innerHTML = '<p class="no-results">No repositories match the current filter.</p>';
    return;
  }

  repos.forEach(repo => {
    const card = document.createElement('article');
    card.className = 'repo-card';

    const langDot = repo.language
      ? `<span class="lang-dot" style="background:${getLangColor(repo.language)}"></span> ${repo.language}`
      : '';

    card.innerHTML = `
      <h3><a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a></h3>
      <p class="repo-desc">${repo.description || '<em style="color:var(--text-muted)">No description</em>'}</p>
      <div class="repo-meta">
        ${repo.language ? `<span>${langDot}</span>` : ''}
        <span><span class="star-icon">★</span> ${repo.stargazers_count.toLocaleString()}</span>
        ${repo.forks_count ? `<span>🍴 ${repo.forks_count.toLocaleString()}</span>` : ''}
      </div>
    `;

    repoGrid.appendChild(card);
  });
}

function buildLanguageFilter(repos) {
  const langs = [...new Set(repos.map(r => r.language).filter(Boolean))].sort();
  languageFilter.innerHTML = '<option value="all">All</option>';
  langs.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = lang;
    languageFilter.appendChild(opt);
  });
}

function getFilteredSorted() {
  const lang = languageFilter.value;
  const sort = sortSelect.value;

  let result = lang === 'all'
    ? [...allRepos]
    : allRepos.filter(r => r.language === lang);

  result.sort((a, b) => {
    switch (sort) {
      case 'name-asc':   return a.name.localeCompare(b.name);
      case 'name-desc':  return b.name.localeCompare(a.name);
      case 'stars-desc': return b.stargazers_count - a.stargazers_count;
      case 'stars-asc':  return a.stargazers_count - b.stargazers_count;
      default:           return 0;
    }
  });

  return result;
}

function applyFilterSort() {
  renderRepos(getFilteredSorted());
}

languageFilter.addEventListener('change', applyFilterSort);
sortSelect.addEventListener('change', applyFilterSort);

async function fetchUser(username) {
  const res = await fetch(`https://api.github.com/users/${username}`);
  if (res.status === 404) throw new Error('User not found. Check the username and try again.');
  if (res.status === 403) throw new Error('GitHub API rate limit exceeded. Please wait a moment and try again.');
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchRepos(username) {
  const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
  if (!res.ok) throw new Error(`Failed to fetch repositories: ${res.status} ${res.statusText}`);
  return res.json();
}

async function handleSearch(e) {
  e.preventDefault();
  hideError();

  if (!validateInput()) return;

  const username = usernameInput.value.trim();
  saveUsername(username);
  showLoading();

  try {
    const [user, repos] = await Promise.all([
      fetchUser(username),
      fetchRepos(username),
    ]);

    hideLoading();
    renderProfile(user);
    allRepos = repos;

    if (repos.length === 0) {
      showError('This user has no public repositories.');
      return;
    }

    buildLanguageFilter(repos);
    controls.classList.remove('hidden');
    applyFilterSort();

  } catch (err) {
    hideLoading();
    showError(err.message || 'Something went wrong. Please try again.');
  }
}

form.addEventListener('submit', handleSearch);

usernameInput.addEventListener('input', () => {
  if (usernameInput.classList.contains('invalid')) clearValidationError();
});
