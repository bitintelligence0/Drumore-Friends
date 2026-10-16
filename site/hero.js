// Explore's opening: the brand book cover (book marker "COVER") and the Gable Line story (book chapter 6, "6 WORDMARK").
import { media } from './lib.js';

export const MARK_FULL = '<path d="M1 46 H16 V32.2 L32 19.3 L48 32.2 V46 H63" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="miter"/><rect x="24.2" y="35" width="3.6" height="6.4" fill="currentColor"/><rect x="36.2" y="35" width="3.6" height="6.4" fill="currentColor"/>';

// The cover's lifeline strip: same seed and geometry as the book. The Lamp line runs on into the timeline.
// Strokes don't scale, so the knots stay round and the lines stay hairline at any width.
function lines() {
  let s = 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const ln = (x, y, w, color, sw, extra = '') => `<path d="M${x.toFixed(1)} ${y}h${w.toFixed(1)}" stroke="${color}" stroke-width="${sw}" vector-effect="non-scaling-stroke"${extra}/>`;
  let out = '';
  for (let i = 0; i < 13; i++) { const y = 8 + i * 8, a = r() * 900, w = 160 + r() * 420; out += ln(a, y, w, 'var(--mist)', 1.6, ' opacity=".75"'); }
  out += ln(140, 65.5, 1060, 'var(--lamp)', 3);
  [300, 520, 705, 930].forEach((x, i) => { out += ln(x, 65.5, 0, 'var(--shutter)', 12, ' stroke-linecap="round"'); if (i === 2) out += ln(x, 65.5, 0, 'var(--plaster)', 8, ' stroke-linecap="round"'); });
  return `<svg viewBox="0 0 1200 120" preserveAspectRatio="none" fill="none">${out}</svg>`;
}

export function heroHTML() {
  return `<header class="cover gut" aria-labelledby="coverTitle"><div class="cover-in wide">
    <div class="cover-main">
      <div>
        <svg class="mark-lg" viewBox="0 0 64 52" role="img" aria-label="The Gable Line mark">${MARK_FULL}</svg>
        <h1 id="coverTitle">Drumore<br>Friends</h1>
        <div class="descr">Meeting House · Drumore Township · Lancaster County, PA</div>
        <p class="intro">Beth’s stories of the Drumore Friends Meeting House: the people who met here, the families behind them, and the places they lived.</p>
      </div>
      <figure class="fig">
        <div class="mat"><img src="${media('P016-I01')}" alt="The white clapboard Drumore Friends Meeting House under a large tree, with flowering dogwood and green lawn." width="2048" height="1581"><div class="tab t"><i></i>Today <span>· 2025 photograph</span></div></div>
        <figcaption><b>The meeting house in spring.</b> Archive post P016. <button type="button" class="linkbtn" data-post="P016" data-image="P016-I01">See the post</button></figcaption>
      </figure>
    </div>
    <a class="cover-lines" href="#workbench" aria-label="Go to the timeline">${lines()}<span>Into the timeline ↓</span></a>
  </div></header>
  <section class="gable gut" aria-labelledby="gableTitle"><div class="wide gable-in">
    <figure class="fig">
      <div class="mat trace"><img src="${media('P014-I01')}" alt="Gable end of the meeting house with two green-shuttered windows and the sign reading Drumore Friends Meeting House, Established 1816." width="480" height="480">
        <svg viewBox="0 0 900 900" preserveAspectRatio="none" aria-hidden="true"><path d="M0 752 H248 V478 L555 222 L882 478 V752 H900" fill="none" stroke="var(--lamp)" stroke-width="7"/><rect x="410" y="530" width="72" height="132" fill="none" stroke="var(--lamp)" stroke-width="5"/><rect x="642" y="530" width="74" height="132" fill="none" stroke="var(--lamp)" stroke-width="5"/></svg>
        <div class="tab t"><i></i>Today <span>· profile photo, traced</span></div></div>
      <figcaption><b>How it was found.</b> The amber line traces the photograph: ground, walls, roof, the two shuttered windows. Archive post P014.</figcaption>
    </figure>
    <div class="gable-txt">
      <span class="eyebrow">The Gable Line</span>
      <h2 id="gableTitle">A building standing on a timeline</h2>
      <p class="lead">One line runs along the ground, rises into the meeting house roof and runs on. The two small windows are the gable-end shutters. It is traced from the building itself.</p>
      <div class="reasons">
        <div><h3>Why it works</h3><p>It’s literal without being a picture. Anyone who has stood at the gable end recognizes it; anyone who hasn’t still reads “a plain building on a line through time.”</p></div>
        <div><h3>Why the windows</h3><p>Two windows give the house a face. That is what makes it this meeting house rather than any house.</p></div>
        <div><h3>Why one line</h3><p>The ground line continues past the house on both sides. It is the same line as the timeline below.</p></div>
      </div>
    </div>
  </div></section>`;
}
