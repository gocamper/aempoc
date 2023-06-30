/* eslint-disable no-unused-expressions */
/* global describe it before beforeEach */
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { loadPage } from '../../../scripts/scripts.js';
const bodyHTML = `
<header></header>
<main></main>
<footer></footer>
`;
const testContent = ` <h4>Test Title</h4>
<p><strong>Bold Text</strong></p>
<ul>
  <li>Example LI</li>
  <li>Example LI</li>
  <li>Example LI</li>
</ul>
<div class="columns">
  <div>
    <div>
      <p>Columns block</p>
      <p><a href="/">Live</a></p>
    </div>
    <div>
    </div>
  </div>
  <div>
    <div>
    </div>
    <div>
      <p>Or you can just view the preview</p>
      <p><em><a href="/">Preview</a></em></p>
    </div>
  </div>
</div>
<p><strong>Visit <a href="https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program">www.fda.gov/medwatch</a> or call 1-800-FDA-1088.</strong></p>
`;
const sourceBlock = `
<div>
  <h1>Test header</h1>
  ${testContent}
 </div>
`;
const sourceBlock2 = `
<div>
  <h1>Test header</h1>
  <div></div>
 </div>
`;
function createFakeFetch(response) {
  const fake = sinon.fake((url) => {
    if (url.includes('isi.plain.html')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(response),
      });
    }
    return Promise.resolve({ ok: false });
  });
  return fake;
}
const sleep = async (time = 1000) => new Promise((resolve) => {
  setTimeout(() => {
    resolve(true);
  }, time);
});
async function loadIsiBlock(source) {
  document.body.innerHTML = bodyHTML;
  document.body.style.display = 'block';
  const fetch = createFakeFetch(source);
  sinon.replace(window, 'fetch', fetch);
  await loadPage(document.querySelector('main'));
  await sleep(500);
  sinon.restore();
}
describe('persistent isi block', () => {
  describe('persistent isi block initialization', async () => {
    before(async () => loadIsiBlock(sourceBlock));
    it('should be created', () => {
      expect(document.querySelector('aside.isi-block-container')).not.to.eq(null);
    });
    it('should read the heading set up in the source document', () => {
      expect(document.querySelector('.isi-header').childNodes[0].textContent.trim()).eq('Test header');
    });
    it('should read the content set up in the source document', () => {
      expect(document.querySelector('.isi-content h4').textContent).eq('Test Title');
    });
    it("should add the source fragment's bloks", () => {
      expect(document.querySelector('.isi-content .block.columns.columns-2-cols')).not.to.eq(null);
    });
  });
  describe('should pin/unpin the isi container', () => {
    beforeEach(async () => {
      await loadIsiBlock(sourceBlock2);
      window.scrollY = 0;
      // isi-container header / content height
      const isiContainer = document.querySelector('.isi-container');
      isiContainer.querySelector('.isi-header').style.height = '50px';
      isiContainer.querySelector('.isi-content').style.height = '450px';
      // add a div above the isi container to the document
      const topDiv = document.createElement('div');
      topDiv.id = 'topDiv';
      const main = document.querySelector('main');
      main.insertBefore(topDiv, isiContainer);
    });
    it("should not pin the isi when its top's distance from the viewport bottom is more than its height", async () => {
      const isiContainer = document.querySelector('.persistent-isi-container');
      const collapsedPerc = parseInt(getComputedStyle(isiContainer).getPropertyValue('--isi-collapsed-height-current'), 10);
      const distanceFromTop = `${(window.innerHeight * (100 - collapsedPerc)) / 100 - 15}px`;
      document.querySelector('#topDiv').style.height = distanceFromTop;
      await sleep(100);
      window.dispatchEvent(new Event('resize'));
      await sleep(400);
      expect(isiContainer.classList.contains('is-pinned')).eq(false);
    });
    it("should pin the isi when it's top's distance from the viewport bottom is less than it's height", async () => {
      const isiContainer = document.querySelector('.persistent-isi-container');
      const collapsedPerc = parseInt(getComputedStyle(isiContainer).getPropertyValue('--isi-collapsed-height'), 10);
      const distanceFromTop = `${(window.innerHeight * (100 - collapsedPerc)) / 100 + 15}px`;
      document.querySelector('#topDiv').style.height = distanceFromTop;
      await sleep(100);
      window.dispatchEvent(new Event('resize'));
      await sleep(400);
      expect(isiContainer.classList.contains('is-pinned')).eq(true);
    });
    it('should unpin the pinned isi when the page is scrolled up and pin the unpinned isi when the page is scrolled up, ', async () => {
      const isiContainer = document.querySelector('.persistent-isi-container');
      const collapsedPerc = parseInt(getComputedStyle(isiContainer).getPropertyValue('--isi-collapsed-height'), 10);
      const distanceFromTop = `${(window.innerHeight * (100 - collapsedPerc)) / 100 + 10}px`;
      document.querySelector('#topDiv').style.height = distanceFromTop;
      await sleep(100);
      window.scrollTo({ top: 25 });
      await sleep(400);
      expect(isiContainer.classList.contains('is-pinned')).eq(false);
      window.scrollTo({ top: 0 });
      await sleep(400);
      expect(isiContainer.classList.contains('is-pinned')).eq(true);
    });
  });
  describe('expand / collapse isi', async () => {
    before(async () => {
      await loadIsiBlock(sourceBlock2);
      const topDiv = document.createElement('div');
      topDiv.id = 'topDiv';
      const main = document.querySelector('main');
      const isiContainer = document.querySelector('.isi-container');
      main.insertBefore(topDiv, isiContainer);
    });
    it('should expand the isi when the expand button is clicked', async () => {
      const isiContainer = document.querySelector('.persistent-isi-container');
      const collapsedPerc = parseInt(getComputedStyle(isiContainer).getPropertyValue('--isi-collapsed-height'), 10);
      const distanceFromTop = `${(window.innerHeight * (100 - collapsedPerc)) / 100 + 10}px`;
      document.querySelector('#topDiv').style.height = distanceFromTop;
      await sleep(100);
      window.dispatchEvent(new Event('resize')); // pin isi to make the expand button visible
      await sleep(400);
      const expandBtn = isiContainer.querySelector('#toggleIsi');
      expandBtn.click();
      await sleep(100);
      expect(isiContainer.classList.contains('is-expanded')).eq(true);
    });
    it('should collapse the isi when ESC is pressed', async () => {
      const isiContainer = document.querySelector('.persistent-isi-container');
      const collapsedPerc = parseInt(getComputedStyle(isiContainer).getPropertyValue('--isi-collapsed-height'), 10);
      const distanceFromTop = `${(window.innerHeight * (100 - collapsedPerc)) / 100 + 10}px`;
      document.querySelector('#topDiv').style.height = distanceFromTop;
      await sleep(100);
      window.dispatchEvent(new Event('resize')); // pin isi to make the expand button visible
      await sleep(400);
      const expandBtn = isiContainer.querySelector('#toggleIsi');
      expandBtn.click();
      await sleep(100);
      expect(isiContainer.classList.contains('is-expanded')).eq(true);
      const event = new KeyboardEvent('keydown', {
        code: 'Escape',
      });
      window.dispatchEvent(event);
      await sleep(100);
      expect(isiContainer.classList.contains('is-expanded')).eq(false);
    });
  });
});