(function () { // immediately-invoked function: runs once and keeps its variables out of the global scope
  // aurora glow: three soft bands that drift and breathe
  const aurora = document.createElement('div'); // container element that will hold the aurora bands
  aurora.classList.add('aurora'); // give it the "aurora" CSS class for styling
  for (let i = 1; i <= 3; i++) { // loop three times, once per band
    const band = document.createElement('div'); // create one band element
    band.classList.add('aurora-band', 'aurora-band-' + i); // shared class plus a numbered class (aurora-band-1/2/3) so each can look different
    aurora.appendChild(band); // put the band inside the aurora container
  }
  document.body.appendChild(aurora); // add the whole aurora to the page

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // if the user asked their OS for less motion, stop here and skip the orbs

  // floating orbs
  const count = window.innerWidth < 700 ? 12 : 25; // fewer orbs on narrow (mobile) screens, more on desktop

  for (let i = 0; i < count; i++) { // create one orb per loop
    const orb = document.createElement('div'); // the orb element
    orb.classList.add('orb'); // style it with the "orb" CSS class

    const size = Math.random() * 12 + 6; // random diameter between 6 and 18 px
    const duration = Math.random() * 8 + 8; // random animation length between 8 and 16 seconds

    orb.style.width = size + 'px'; // set width
    orb.style.height = size + 'px'; // set height (same as width, so it's a circle)
    orb.style.left = Math.random() * 100 + 'vw'; // random horizontal start position across the viewport width
    orb.style.animationDuration = duration + 's'; // how long one float cycle takes
    orb.style.animationDelay = -(Math.random() * duration) + 's'; // negative delay starts each orb partway through its animation so they don't all begin together
    orb.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px'); // CSS variable: random sideways drift between -60 and +60 px, used by the CSS animation

    document.body.appendChild(orb); // add the orb to the page
  }
})(); // the trailing () is what actually calls the function
