/* eslint-disable no-unused-expressions */
/* global describe before beforeEach it */
import { expect } from '@esm-bundle/chai';
import { readFile } from '@web/test-runner-commands';
import sinon from 'sinon';
import { loadPopup } from '../../../scripts/lib-franklin.js';
async function createFakeFetch() {
  const whiteListJson = await readFile({
    path: './external-link-whitelist.json',
  });
  const popupHtml = await readFile({ path: './external-link-popup.plain.html' });
  const responses = [
    {
      url: '/popups/external-link-popup.plain.html',
      response: popupHtml,
    },
    {
      url: '/popups/external-link-whitelist.json',
      response: whiteListJson,
    },
  ];
  const fake = sinon.fake((url) => {
    const resp = responses.find((r) => r.url === url);
    return Promise.resolve(
      resp
        ? {
          ok: true,
          text: () => Promise.resolve(resp.response),
        }
        : {
          ok: false,
        },
    );
  });
  return fake;
}
const fakeFetch = await createFakeFetch();
const loadPopupBlock = async () => {
  sinon.replace(window, 'fetch', fakeFetch);
  const parent = document.createElement('div');
  parent.id = 'popup-wrapper';
  document.body.append(parent);
  await loadPopup(parent);
  sinon.restore();
};
describe('popup', () => {
  describe('append the popup', () => {
    beforeEach(() => {
      document.querySelectorAll('a').forEach((link) => link.remove());
      document.querySelector('#popup-wrapper')?.remove();
    });
    it('should append the popup to the document', async () => {
      const linksDiv = document.createElement('div');
      linksDiv.innerHTML = '<a href="//external.com">extenal</a>';
      document.body.append(linksDiv);
      await loadPopupBlock();
      expect(document.querySelector('#popup-wrapper .modal-wrapper')).to.not.eq(
        null,
      );
    });
    it('should not append the popup when there no external links', async () => {
      const linksDiv = document.createElement('div');
      linksDiv.innerHTML = '<a href="/path/to">internal</a>';
      document.body.append(linksDiv);
      await loadPopupBlock();
      expect(document.querySelector('#popup-wrapper .modal-wrapper')).eq(null);
    });
  });
  describe('popup block', () => {
    before(async () => {
      document.querySelectorAll('a').forEach((link) => link.remove());
      document.querySelector('#popup-wrapper')?.remove();
      const links = `
    <!-- non whitelisted -->
    <a id="non-white-listed" href="http://non-white-listed.com">non-white-listed</a>
    <!-- whitelisted -->
    <a id="white-listed" href="//example.com">example</a>
    <!--link with child element-->
    <a id="link-with-child" href="http://non-white-listed.com"><span><strong>non-white-listed</strong></span></a>
  `;
      const linksDiv = document.createElement('div');
      linksDiv.innerHTML = links;
      document.body.append(linksDiv);
      await loadPopupBlock();
      // prevent navigation during the tests
      document.querySelectorAll('a').forEach((li) => li.setAttribute('href', '#'));
    });
    beforeEach(() => {
      document.body.classList.remove('modal-open');
    });
    it('should add the text values set up in the source document to popup', () => {
      // source document: ./popup.html
      expect(
        document.querySelector('#popup-wrapper .header').textContent.trim(),
      ).eq('You are now leaving example.com');
      expect(
        document.querySelector('#popup-wrapper .description').textContent.trim(),
      ).eq(
        'By clicking this link, you will be redirected to a website that is neither owned nor controlled by Pfizer. Pfizer is not responsible for the content or services of this website.',
      );
      expect(
        document.querySelector('#popup-wrapper .cancel-btn').textContent.trim(),
      ).eq('Cancel');
      expect(
        document
          .querySelector('#popup-wrapper .continue-btn')
          .textContent.trim(),
      ).eq('Continue');
    });
    it('should open the popup when a non whitelisted link is clicked', () => {
      document.querySelector('a#non-white-listed').click();
      expect(document.body.classList.contains('modal-open')).eq(true);
    });
    it('should not open the popup when a whitelisted link is clicked', () => {
      document.querySelector('a#white-listed').click();
      expect(document.body.classList.contains('modal-open')).eq(false);
    });
    it('should open the popup when a child element of the link is clicked', () => {
      document.querySelector('a#link-with-child strong').click();
      expect(document.body.classList.contains('modal-open')).eq(true);
    });
    it('should navigate to the link url when continue button is clicked', () => {
      const fakeOpen = sinon.fake();
      sinon.replace(window, 'open', fakeOpen);
      const url = 'https://example.com/path/to/page';
      const link = document.querySelector('a#non-white-listed');
      link.setAttribute('href', url);
      link.click();
      document.querySelector('.modal-wrapper .continue-btn').click();
      expect(fakeOpen.firstArg).eq(url);
      sinon.restore();
    });
    it('should not navigate when cancel button is clicked', () => {
      const fakeOpen = sinon.fake();
      sinon.replace(window, 'open', fakeOpen);
      const link = document.querySelector('a#non-white-listed');
      link.click();
      document.querySelector('.modal-wrapper .cancel-btn').click();
      expect(fakeOpen.callCount).eq(0);
      sinon.restore();
    });
  });
});