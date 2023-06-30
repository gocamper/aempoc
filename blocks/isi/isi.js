import { loadBlocks } from '../../scripts/lib-franklin.js';
import { decorateMain } from '../../scripts/scripts.js';
// heading fallback title
const isiFallbackTitle = 'Important Safety Information';
// collapse / expand button text, icon
const isiCollapse = 'Collapse';
const isiExpand = 'Expand';
const isiExpandIconUrl = '/icons/down-arrow.svg';
// aria attribute texts for accessibility
const isiPartial = 'Partially Expanded';
const isiExpanded = 'Fully Expanded';
const isiCollapsed = 'Collapsed';
const isiTemplate = ({
  title, content, icon, expand, collapse,
}) => `
<div class="isi-content">
  <aside class="isi-block-container">
    <div class="isi-header-container">
      <div class="isi-header">
        ${title}
        <button id="toggleIsi">
          <span class="expand-text">${expand}</span>
          <span class="collapse-text">${collapse}</span>
          <span class="icon">
            ${icon}
          </span>
        </button>
      </div>
    </div>
    <div class="isi-content-container">
      <div class="isi-content">
        ${content}
      </div>
    </div>
  </aside>
</div>
`;
/**
 * Throttles the function passed to it
 */
function throttle(fn, timeout) {
  let timeoutId = null;
  return () => {
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        timeoutId = null;
        fn();
      }, timeout);
    }
  };
}
/**
 * Calculates the height of the ISI container's content
 */
function getIsiContentHeight(root = document) {
  return root.querySelector('.isi-content-container').scrollHeight + root.querySelector('.isi-header-container').offsetHeight;
}
/**
 * Toggles the expanded / collapsed state of the ISI container
 */
function toggleExpanded(expand, root) {
  const isiContainer = root.querySelector('.isi-content');
  isiContainer.classList.toggle('is-expanded', expand);
  if (isiContainer.classList.contains('was-expanded')) {
    isiContainer.style.setProperty('--isi-collapsed-height-current', `${root.querySelector('.isi-header-container').offsetHeight}px`);
  }
  document.body.classList.toggle('disable-scroll', expand);
  const toggle = root.querySelector('#toggleIsi');
  toggle.toggleAttribute('aria-expanded', expand);
}
/**
 * Toggles the pinned / upinned state of the ISI container
 */
function togglePinned([e], root) {
  const isiContainer = root.querySelector('.isi-content');
  if (!isiContainer.classList.contains('is-expanded')) {
    isiContainer.classList.toggle('is-pinned', !e.isIntersecting && e.target.getBoundingClientRect().top > 0);
  }
  const isPinned = isiContainer.classList.contains('is-pinned');
  if (!isPinned && isiContainer.classList.contains('is-expanded')) {
    toggleExpanded(false);
  }
}
/**
 * Initializes the ISI block container
 */
function initializeIsi(root = document) {
  const isiContainer = root.querySelector('.isi-content');
  const height = `${getIsiContentHeight(root)}px`;
  isiContainer.style.marginBottom = height;
  isiContainer.querySelector('.isi-block-container').style.height = height;
}
/**
 * Set aria attributes
 */
function setAriaAttributes(root, title, isExpanded) {
  const toggle = root.querySelector('#toggleIsi');
  const aside = root.querySelector('.isi-block-container');
  const isiContainer = root.querySelector('.isi-content');
  let collapsedText = isiCollapsed;
  let toggleText = isExpanded ? isiCollapse : isiExpand;
  let expanded = isExpanded;
  const wasExpanded = isiContainer.classList.contains('was-expanded');
  if (!isExpanded && !wasExpanded) {
    expanded = true;
    collapsedText = isiPartial;
    toggleText = isiExpand;
  }
  aside.setAttribute('aria-expanded', expanded);
  aside.setAttribute('aria-label', `${title} - ${isExpanded ? isiExpanded : collapsedText}`);
  toggle.setAttribute('aria-controls', 'isi');
  toggle.setAttribute('aria-label', `${toggleText} ${title}`);
  toggle.toggleAttribute('disabled', !isiContainer.classList.contains('is-pinned'));
}
/**
 * Sets up event listeners
 */
function addEventListeners(root, title) {
  const toggle = root.querySelector('#toggleIsi');
  const isiContainer = root.querySelector('.isi-content');
  setAriaAttributes(root, title, false);
  toggle.addEventListener('click', () => {
    isiContainer.classList.add('was-expanded');
    const isExpanded = isiContainer.classList.contains('is-expanded');
    toggleExpanded(!isExpanded, root);
    setAriaAttributes(root, title, !isExpanded);
  });
  const intersectionTest = document.createElement('div');
  intersectionTest.classList.add('isi-intersection-test');
  isiContainer.append(intersectionTest);
  const observer = new IntersectionObserver(
    (e) => {
      togglePinned(e, root);
      setAriaAttributes(root, title, !isiContainer.classList.contains('is-pinned'));
    },
    {
      threshold: 1,
    },
  );
  observer.observe(intersectionTest);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && isiContainer.classList.contains('is-expanded')) {
      toggleExpanded(false, root);
    }
  });
  window.addEventListener(
    'resize',
    throttle(() => {
      toggleExpanded(false, root);
      setAriaAttributes(root, title, false);
    }, 100),
  );
}
async function fetchIcon(url) {
  let icon = '';
  const resp = await fetch(url);
  if (resp.ok) {
    icon = await resp.text();
  }
  return icon;
}
async function loadContent(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const resp = await fetch(`${path}.plain.html`);
  const html = await resp.text();
  const root = document.createElement('div');
  root.innerHTML = html;
  decorateMain(root, true);
  await loadBlocks(root);
  return root;
}
export default async function decorate(block) {
  const content = await loadContent(block);
  try {
    const heading = content.querySelector('h1, h2');
    if (heading) {
      heading.remove();
    }
    const icon = await fetchIcon(isiExpandIconUrl);
    const title = heading?.innerText || isiFallbackTitle;
    block.innerHTML = isiTemplate({
      title,
      content: content.innerHTML,
      icon,
      expand: isiExpand,
      collapse: isiCollapse,
    });
    setTimeout(() => { // wait for the block to be appended to the document
      initializeIsi(block);
      addEventListeners(block, title);
    }, 500);
  } catch (ex) {
    console.error('Failed to decorate ISI block.', ex);
  }
}
