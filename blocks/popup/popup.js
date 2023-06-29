/*var pop1 = document.querySelectorAll(".popup >div div");

pop1[0].classList.add("parent1");
pop1[1].classList.add("parent2");

pop1[0].addEventListener("click", function () {
  pop1[0].classList.add("popd1");
  pop1[1].classList.add("popd");
});

var x = document.querySelector(".popup .parent2 h2");
x.addEventListener("click", function () {
  pop1[0].classList.remove("popd1");
  pop1[1].classList.remove("popd");
});*/

/**
 * safe classnames
 */
const toSafeClassName = (str) => {
  const stringUpdated = str.replace(/[^\w-]/g, '').toLowerCase();
  return stringUpdated.replace(/\s+/g, '-');
};
/**
 * sanitize domain strings
 */
export const extractDomain = (url) => {
  const domainSanitized = url
    .toLocaleLowerCase()
    .trim()
    .replace(/^(https?:)?\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
  const domainRegex = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  if (!domainRegex.test(domainSanitized)) {
    console.error('Invalid domain');
    return false;
  }
  return domainSanitized;
};
/**
 * Remove Event Listeners to Modal Popup
 */
const removeEventModalListeners = () => {
  document.querySelector('#popup-wrapper .continue-btn').removeEventListener('click', () => {});
  document.querySelector('#popup-wrapper .cancel-btn').removeEventListener('click', () => {});
};
/**
 * Close Modal
 */
const closePopupModal = (event) => {
  event.preventDefault();
  document.body.classList.remove('modal-open');
  document.body.classList.remove('disable-scroll');
  delete window.external_link_url;
  removeEventModalListeners();
};
/**
 * Add Event Listeners to Modal Popup
 */
const addEventModalListeners = () => {
  document.querySelector('#popup-wrapper .continue-btn').addEventListener('click', (event) => {
    event.preventDefault();
    window.open(window.external_link_url, '_self');
  });
  const btnElement = document.querySelectorAll('#popup-wrapper .cancel-btn, #popup-wrapper .close-btn');
  btnElement.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      closePopupModal(event);
    });
  });
};
/**
 * Loaded Modal Popup markup
 */
const loadModalMarkup = async (block) => {
  block.innerHTML = '';
  const externalLinkPopup = '/global/popups/external-link-popup';
  const resp = await fetch(`${externalLinkPopup}.plain.html`);
  if (!resp.ok) {
    console.error('Failed to load external-link-popup.plain.html');
    return;
  }
  const html = await resp.text();
  const orginalMarkup = document.createElement('div');
  orginalMarkup.innerHTML = html;
  orginalMarkup.querySelectorAll('.modal-popup > div').forEach((el) => {
    if (el?.nodeName !== 'DIV' || el?.children?.length !== 2) return;
    const propertyName = toSafeClassName(el.children[0].textContent);
    el.children[1].classList.add(propertyName);
    el.children[0].remove();
  });
  const structuredMarkup = `<div>
  ${orginalMarkup.querySelector('.header').outerHTML}
  ${orginalMarkup.querySelector('.description').outerHTML}
    <div class="buttons">
      <a href="#" class="continue-btn primary">
      ${orginalMarkup.querySelector('.continue').textContent}
      </a>
      <a href="#" class="cancel-btn bare">
        ${orginalMarkup.querySelector('.cancel').textContent}
      </a>
    </div>
    <div class="close-btn"></div>
  </div>`;
  const popupMarkup = document.createElement('div');
  popupMarkup.classList.add('modal-wrapper');
  popupMarkup.innerHTML = structuredMarkup;
  block.append(popupMarkup);
};
/**
 * Open Modal Popup
 */
const openPopupModal = (event) => {
  if (!event?.currentTarget?.href) {
    return;
  }
  event.preventDefault();
  // add link to window
  window.external_link_url = event?.currentTarget?.href;
  document.body.classList.add('modal-open');
  document.body.classList.add('disable-scroll');
  addEventModalListeners();
};
/**
 * loads and decorates the popup
 * @param {Element} block The popup block element
 */
export default async function decorate(block) {
  block.innerHTML = '';
  const respWhite = await fetch('global/popups/external-link-whitelist.json');
  if (!respWhite.ok) {
    console.error('Failed to fetch external-link-whitelist.json');
    return;
  }
  const externalLinkWhiteList = await respWhite.text();
  const jsonLinkWhiteList = JSON.parse(externalLinkWhiteList);
  const availableDomainData = Boolean(jsonLinkWhiteList?.data?.length > 0);
  const whitelistLink = jsonLinkWhiteList.data.map((obj) => {
    const flatDomain = Object.values(obj).flat()[0];
    return extractDomain(flatDomain);
  });
  const availableWhiteListDomains = availableDomainData ? whitelistLink : [];
  const selector = document.querySelectorAll('body a[href*="//"]');
  const externalLinks = [...selector].filter((link) => {
    const filterCondition = link
      .getAttribute('href')
      .toLocaleLowerCase()
      .trim()
      .match(/^(https?:)?\/\//);
    return Boolean(filterCondition);
  });
  if (!externalLinks.length) return;
  externalLinks.forEach((link) => {
    // return if allowed whitelisted domain
    const domain = extractDomain(link.href);
    if (availableWhiteListDomains.includes(domain)) return;
    link.addEventListener('click', (event) => {
      openPopupModal(event);
    });
  });
  // load markup but is hidden
  loadModalMarkup(block);
}