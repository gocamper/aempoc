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
<div class="persistent-isi-container">
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
  const isiContainer = root.querySelector('.persistent-isi-container');
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
  const isiContainer = root.querySelector('.persistent-isi-container');
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
  const isiContainer = root.querySelector('.persistent-isi-container');
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
  const isiContainer = root.querySelector('.persistent-isi-container');
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
  const isiContainer = root.querySelector('.persistent-isi-container');
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

blocks/isi/isi.css
body.disable-scroll {
  overflow: hidden;
}
.persistent-isi-container {
  --isi-expanded-height: 75vh;
  --isi-collapsed-height: 20vh;
  --isi-content-max-width: 1200px;
  --isi-content-horizontal-padding: 32px;
  --isi-content-horizontal-padding-mobile: 16px;
  --isi-content-horizontal-padding-current: var(--isi-content-horizontal-padding);
  --isi-collapsed-height-current: var(--isi-collapsed-height);
  padding: 0 var(--isi-content-horizontal-padding-current);
  position: relative;
  min-height: 1px;
}
.persistent-isi-container.is-pinned .isi-block-container {
  position: fixed;
  padding: 0 var(--isi-content-horizontal-padding-current);
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background-color: #fbfbfb;
  max-height: var(--isi-collapsed-height-current);
  transition: max-height 0.3s;
  z-index: 100;
}
.isi-container.section, .isi-container .section {
  padding: 0;
}
.isi-container.section .isi-wrapper {
  max-width: unset;
}
.persistent-isi-container:not(.is-pinned) {
  margin-bottom: 0 !important;
}
.persistent-isi-container:not(.is-pinned) .isi-block-container {
  height: auto !important;
}
.persistent-isi-container.is-expanded .isi-block-container {
  max-height: var(--isi-expanded-height);
}
.persistent-isi-container.is-expanded .isi-content-container {
  overflow-y: auto;
  margin: 10px auto;
}
.persistent-isi-container .isi-header-container {
  margin: 0 calc(var(--isi-content-horizontal-padding-current) * (-1));
  padding-top: 10px;
  padding-bottom: 10px;
  background-color: #777;
}
.persistent-isi-container .isi-header,
.persistent-isi-container .isi-content {
  max-width: var(--isi-content-max-width);
  margin: auto;
}
.persistent-isi-container.is-expanded .isi-content {
  padding-right: 10px;
  box-sizing: border-box;
}
.persistent-isi-container .isi-header {
  font: 600 21px var(--body-font-family);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--isi-content-horizontal-padding-current);
}
.persistent-isi-container .isi-header button {
  margin: 0 0 0 20px;
  padding: 0;
  flex: none;
  color: inherit;
  position: relative;
  overflow: visible;
  background: transparent;
  outline: none;
}
.persistent-isi-container:not(.is-pinned) .isi-header button {
  visibility: hidden;
}
.persistent-isi-container .isi-header button .expand-text,
.persistent-isi-container .isi-header button .collapse-text {
  font: 300 14px/20px var(--body-font-family);
  right: 30px;
  position: absolute;
  display: none;
}
.persistent-isi-container:not(.is-expanded) .isi-header button:hover .expand-text,
.persistent-isi-container.is-expanded .isi-header button:hover .collapse-text {
  display: flex;
}
.persistent-isi-container .isi-header button span.icon {
  transition: transform 0.3s;
  width: 20px;
  height: 20px;
}
.persistent-isi-container:not(.is-expanded) .isi-header button span.icon {
  transform: rotate(0.5turn);
}
.persistent-isi-container.is-expanded .isi-header button {
  transform: translate(5px);
}
.persistent-isi-container .isi-header button svg {
  fill: white;
}
.persistent-isi-container ::-webkit-scrollbar {
  width: 8px;
}
.persistent-isi-container ::-webkit-scrollbar-track {
  background: #efefef;
  border-radius: 5px;
}
.persistent-isi-container ::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 5px;
}
.persistent-isi-container .isi-intersection-test {
  height: 5px;
  width: 1px;
  position: absolute;
  top: var(--isi-collapsed-height-current);
}
@media (max-width: 600px) {
  .persistent-isi-container {
    --isi-content-horizontal-padding-current: var(--isi-content-horizontal-padding-mobile);
  }
  .persistent-isi-container .isi-header button:hover .expand-text,
  .persistent-isi-container .isi-header button:hover .collapse-text {
    display: none !important;
  }
}
/* Content styles */
/* stylelint-disable no-descending-specificity */
.persistent-isi-container .isi-content {
  font-size: 95%;
}
.persistent-isi-container .isi-content h4 {
  padding: 0;
  margin: 20px 0 10px;
  font-size: 24px;
}
.persistent-isi-container .isi-content ul {
  margin: 0;
  padding-left: 25px;
}