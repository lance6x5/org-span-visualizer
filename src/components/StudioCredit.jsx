import React from 'react';
import { REPO_URL } from '../lib/feedback.js';

// Footer studio credit. The mark is a bundled local file (allowed by img-src 'self'),
// and both links are plain navigations, so no network request leaves the page.
const HOMEPAGE_URL = 'https://lance6x5.github.io/';

export default function StudioCredit() {
  return (
    <p className="studio-credit">
      <img src={`${import.meta.env.BASE_URL}silverlight-mark.svg`} alt="" width="16" height="16" />
      <span>A Silverlight DevTech project</span>
      <span aria-hidden="true">·</span>
      <span>© 2026 Silverlight DevTech</span>
      <span aria-hidden="true">·</span>
      <a href={`${REPO_URL}/blob/main/LICENSE.md`}>Noncommercial license</a>
      <span aria-hidden="true">·</span>
      <a href={HOMEPAGE_URL}>More apps</a>
    </p>
  );
}
