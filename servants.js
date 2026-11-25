let allServants = [];   // keeps the fetched data around so the popup can use it later

let sortMode = 0; //this will tell you that the sort mode should be 0, the default.

const sortModes = [
  { label: 'Default', compare: null }, // default order: no sorting function
  { label: 'A-Z', compare: (a, b) => a.servant_name.localeCompare(b.servant_name) }, // alphabetical by name
  { label: 'Z-A', compare: (a, b) => b.servant_name.localeCompare(a.servant_name) } // reverse alphabetical (a and b swapped)
]; // we create an array of objects. each object has a key value pair, for the sort label name. it has a compare key as well, and we pass a func into it
// arrow function taking two parameters, a and b. these will be two servant objects.
// localeCompare is a built in function that compares two strings and returns a positive number if the first argument belongs after the second argument alphabeticaly, negative if first argument goes first
// a, b argument is required to tell it to sort alphabetically

const allClasses = [
  "Saber", "Lancer", "Archer", "Rider", "Assassin", "Caster", "Berserker",
  "Ruler", "Avenger", "Foreigner", "Alter Ego", "Pretender", "Shielder",
  "Beast", "Moon Cancer"
]; // make a list of the existing classes in the game

const allPlaystyles = ["Bulwark", "Nuker", "Scammer", "Skirmisher", "Thrasher", "Wildcard"]; // make a list of existing playstyles

function buildCheckboxGroup(containerId, values, checkboxClass) { // creates one checkbox per value inside a container
  const group = document.getElementById(containerId); // the container to fill

  values.forEach((value) => { // loop over each option
    const label = document.createElement('label'); // label wraps the checkbox so clicking the text toggles it
    label.classList.add('filter-checkbox-label'); // class for CSS styling

    const checkbox = document.createElement('input'); // the checkbox itself
    checkbox.type = 'checkbox'; // make the input a checkbox
    checkbox.value = value; // store the option's value on it
    checkbox.classList.add(checkboxClass); // class used later to find all checkboxes of this group
    checkbox.addEventListener('change', applyFilters);   // instant filtering

    label.appendChild(checkbox); // put the checkbox in the label
    label.appendChild(document.createTextNode(value)); // add the visible text after it

    group.appendChild(label); // add the label to the container
  });
}

fetch('data/servants.json') // fetch the json file from the data folder
  .then(response => response.json()) // arrow function only fulfills after fetch is complete, converts raw data to json
  .then(data => {
    allServants = data.servants; //take all the servants from the json and store in all servants
    buildCheckboxGroup('classFilterGroup', allClasses, 'class-checkbox'); //running these functions, passing in the lists.
    buildCheckboxGroup('playstyleFilterGroup', allPlaystyles, 'playstyle-checkbox');
    buildCheckboxGroup('prosFilterGroup', data.traitsList.pros, 'pro-checkbox'); // these grab the pros lists from the json
    buildCheckboxGroup('consFilterGroup', data.traitsList.cons, 'con-checkbox');
    if (window.matchMedia('(max-width: 600px)').matches) { // on phone screens the Pros/Cons lists are very long...
      document.getElementById('prosSection').open = false; // ...so start them folded up
      document.getElementById('consSection').open = false; // (tap the heading to open them)
    }
    applyFilters(); // draw the grid (beta/custom servants are hidden until their checkbox is ticked)
    openServantFromUrl(); // this will read the current url and immediately load that servant modal data after the grid is rendered
  });


function renderGrid(servants) { // draws the grid of servant cards for the given list
  const grid = document.getElementById('cardsGrid'); // the container that holds all cards
  grid.innerHTML = ''; //grid starts off empty

  servants.forEach((servant) => { // for each servant in the array of servants provided, forEach loops through array items
    const slot = document.createElement('div'); // create a div element called slot, as in the card slot
    slot.classList.add('servant-card-slot'); // make the slot part of this class, for the sake of CSS

    const img = document.createElement('img'); // create an img element
    img.classList.add('servant-card'); // give the img element the servant-card class
    img.src = `images/Servants/${servant.servant_id}/Archetype.webp`; // image comes from this path, passing in the servant id
    img.alt = servant.servant_name; // if the image doesnt load, just display the name of the servant
    img.loading = 'lazy'; // for making it easier to load website
    img.fetchPriority = 'low'; // low image fetch priority

    const label = createOverlayLabel(servant.is_custom_servant, servant.is_beta_servant); // custom/beta servants get a "CUSTOM"/"BETA" overlay, others get null

    img.addEventListener('mouseenter', () => { // when the mouse enters the card
      img.classList.add('is-hovering'); // add hover styling class
      img.style.transition = 'none'; // turn off transition so the tilt follows the mouse instantly
      copyTilt(img, label); // make the overlay label (if any) do the same
    });

    img.addEventListener('mousemove', (event) => { // whenever the mouse moves over the card
      const rect = img.getBoundingClientRect(); // card's position and size on screen
      const x = event.clientX - rect.left; // mouse x position inside the card
      const y = event.clientY - rect.top; // mouse y position inside the card
      const percentX = (x / rect.width - 0.5) * 2; // horizontal position as -1 (left edge) to +1 (right edge)
      const percentY = (y / rect.height - 0.5) * 2; // vertical position as -1 (top edge) to +1 (bottom edge)

      const rotateY = percentX * 16; // turn left/right up to 16 degrees
      const rotateX = percentY * -16; // tilt up/down up to 16 degrees (negative so the card tilts toward the mouse)

      img.style.transform = `
        translateY(-20px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        scale(1.06)
      `; // lift the card 20px, apply the tilt, and enlarge it slightly
      copyTilt(img, label); // tilt the overlay label (if any) with the card
    });

    img.addEventListener('mouseleave', () => { // when the mouse leaves the card
      img.classList.remove('is-hovering'); // remove hover styling
      img.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease'; // re-enable a smooth transition
      img.style.transform = 'translateY(0) rotateX(0deg) rotateY(0deg) scale(1)'; // return to the resting position
      copyTilt(img, label); // return the overlay label (if any) too
    });

    img.addEventListener('click', () => { // when the card is clicked
      openServantModal(servant); // open the popup for this servant
    });

    slot.appendChild(img); // append the image to the slot
    if (label) slot.appendChild(label); // put the CUSTOM/BETA label on top of the card
    grid.appendChild(slot); //append the slot to the grid, this is what finally adds the servant to the grid
  });
}

function createOverlayLabel(isCustom, isBeta) { // makes the "CUSTOM" / "BETA" text that sits on top of a grid card
  if (!isCustom && !isBeta) return null; // normal card: no label at all

  const label = document.createElement('span'); // container that covers the card's artwork
  label.classList.add('overlay-label', 'card-overlay-label'); // shared label style + grid-card size

  if (isCustom) { // flagged as custom in the json
    const word = document.createElement('span'); // one word
    word.classList.add('overlay-custom'); // white, 50% opacity
    word.textContent = 'CUSTOM';
    label.appendChild(word);
  }

  if (isBeta) { // flagged as beta in the json
    const word = document.createElement('span'); // one word
    word.classList.add('overlay-beta'); // gold, 60% opacity
    word.textContent = 'BETA';
    label.appendChild(word);
  }

  return label; // hand it back so renderGrid can add it to the slot
}

function copyTilt(img, label) { // copies the card's current tilt/lift onto its overlay label so they move together
  if (!label) return; // card has no label, nothing to do
  label.style.transition = img.style.transition; // same animation speed
  label.style.transform = img.style.transform; // same tilt, lift and scale
}

function openServantModal(servant) { // opens the popup AND updates the URL (used for user clicks)
  showServantModal(servant); // fill in and show the popup
  history.pushState({ slug: servant.slug }, '', `?servant=${servant.slug}`); // add a history entry and change the URL to ?servant=slug without reloading
}

function showServantModal(servant) { // fills in and shows the popup (does not touch the URL)
  document.getElementById('modalPortrait').src =
    `images/Servants/${servant.servant_id}/Archetype.webp`; // set the big portrait image
  document.getElementById('modalPortrait').fetchPriority = 'high' // load the portrait with high priority
  document.getElementById('modalCustomText').classList.toggle('hidden', !servant.is_custom_servant); // show "CUSTOM" on the portrait only for custom servants
  document.getElementById('modalBetaText').classList.toggle('hidden', !servant.is_beta_servant); // show "BETA" on the portrait only for beta servants

  const skillsContainer = document.getElementById('modalSkills'); // box that holds skill images
  skillsContainer.innerHTML = '';   // clear any previous servant's skills first

  const deckContainer = document.getElementById('modalDeck'); // box that holds deck card images
  deckContainer.innerHTML = ''; // clear the previous deck

  const servantName = document.getElementById('servant-name') // element showing the name
  servantName.textContent = ''; // clear the old name

  servantName.textContent = servant.servant_name; // show this servant's name
  document.getElementById('servant-description').textContent = servant.description || 'No description available.'; // show the description, or a fallback

  const assetsHeading = document.getElementById('assets-heading'); // the "Assets" heading
  const assetContainer = document.getElementById('modalAssets'); // box that holds asset images
  assetsHeading.classList.add('hidden') // hide by default
  assetContainer.classList.add('hidden') // hide by default
  assetContainer.innerHTML = ''; // clear previous assets

  servant.skills.forEach((skill) => { // loop over each skill
    const img = document.createElement('img'); // create its image
    img.src = getSkillImagePath(servant, skill); // build the image path
    img.alt = skill.skill_name; // fallback text
    img.fetchPriority = 'high'; // load with high priority
    img.addEventListener('click', () => openImageLightbox(img.src, img.alt));   // clicking enlarges the image
    skillsContainer.appendChild(img); // add it to the container
  });

  const deckPaths = getDeckCardPaths(servant);   // step 1: get the finished list of 12 paths

  deckPaths.forEach((path) => {                   // step 2: turn each path into a visible image
    const img = document.createElement('img'); // create the image
    img.classList.add('deck-card'); // class for CSS styling
    img.src = path; // use the path as the source
    img.fetchPriority = 'high'; // load with high priority
    img.addEventListener('click', () => openImageLightbox(img.src, img.alt));  // clicking enlarges the image
    deckContainer.appendChild(img); // add it to the deck container
  });

  if (servant.has_assets) { // only if this servant has asset cards
    assetsHeading.classList.remove('hidden'); // show the heading
    assetContainer.classList.remove('hidden'); // show the container
    const assetPaths = getAssetPaths(servant); // get the list of asset image paths

    assetPaths.forEach((path) => { // loop over each path
      const img = document.createElement('img'); // create the image
      img.classList.add('asset-card'); // class for CSS styling
      img.src = path; // use the path as the source
      img.fetchPriority = 'high'; // load with high priority
      img.addEventListener('click', () => openImageLightbox(img.src, img.alt)); // clicking enlarges the image
      assetContainer.appendChild(img); // add it to the container
    });
  } else { // no assets
    assetsHeading.classList.add('hidden'); // keep heading hidden
    assetContainer.classList.add('hidden'); // keep container hidden
  }

  document.getElementById('modalOverlay').classList.add('is-open'); // finally, show the popup
}

function getSkillImagePath(servant, skill) { // returns the image path for a skill
  if (skill.is_shared) { // shared class skills live in a common folder
    const filename = skill.skill_name.replace(/ /g, '_') + '.webp'; // replace every space in the name with _ and add the extension
    return `images/Shared-Class-Skills/${filename}`; // path in the shared folder
  } else { // servant-specific skill
    return `images/Servants/${servant.servant_id}/Skill${skill.skill_order}.webp`; // path in the servant's own folder
  }
}

function getDeckCardPaths(servant) { // builds the list of image paths for a servant's whole deck
  const deckPaths = []; // start with an empty list

  if (servant.deck_strength) { // if the servant has strength cards
    const strengthValues = servant.deck_strength.split(','); // split a string like "1,2,3" into an array
    strengthValues.forEach((power) => { // for each power value
      deckPaths.push(`images/Generic-Cards/Strength_${power}.webp`); // add that strength card's path
    });
  }

  if (servant.deck_agility) { // if the servant has agility cards
    const agilityValues = servant.deck_agility.split(','); // split the comma-separated string
    agilityValues.forEach((power) => { // for each power value
      deckPaths.push(`images/Generic-Cards/Agility_${power}.webp`); // add that agility card's path
    })
  }

  if (servant.deck_magic) { // if the servant has magic cards
    const magicValues = servant.deck_magic.split(','); // split the comma-separated string
    magicValues.forEach((power) => { // for each power value
      deckPaths.push(`images/Generic-Cards/Magic_${power}.webp`); // add that magic card's path
    })
  }

  if (servant.deck_special) { // if the servant has special generic cards
    const specialValues = servant.deck_special.split(','); // split the comma-separated string
    specialValues.forEach((card) => { // for each card name
      deckPaths.push(`images/Generic-Cards/${card}.webp`); // add that card's path
    })
  }

  if (servant.has_unique) { // if the servant has unique cards
    servant.uniqueCards.forEach((card) => { // loop over each unique card
      for (let i = 0; i < card.quantity; i++) { // repeat once per copy in the deck
        deckPaths.push(`images/Servants/${servant.servant_id}/${card.card_slug}.webp`); // add the card's path once per copy
      }
    });
  }
  return deckPaths; // hand back the full list
}

function getAssetPaths(servant) { // builds the list of image paths for a servant's asset cards
  const assetPaths = []; // start with an empty list

  if (servant.has_assets) { // only if the servant has assets
    servant.miscCards.forEach((card) => { // loop over each misc card
      const path = card.is_shared_asset // shared assets (e.g. Ruler Seal) live in one common folder
        ? `images/Shared-Assets/${card.card_slug}.webp` // shared: images/Shared-Assets
        : `images/Servants/${servant.servant_id}/Assets/${card.card_slug}.webp`; // not shared: the servant's own Assets folder
      for (let i = 0; i < card.quantity; i++) { // repeat once per copy
        assetPaths.push(path) // add the path once per copy
      }
    })
  }

  return assetPaths; // hand back the list (empty if no assets)
}

function getCheckedValues(checkboxClass) { // returns the values of all ticked checkboxes of one group
  const checked = document.querySelectorAll(`.${checkboxClass}:checked`); // find the ticked ones by class
  return Array.from(checked).map((checkbox) => checkbox.value); // convert to an array and keep only their values
}

function applyFilters() { // re-filters and re-sorts the servants based on all controls
  const searchText = document.getElementById('sidebarSearch').value.toLowerCase(); // search text, lowercased for case-insensitive matching
  const selectedClasses = getCheckedValues('class-checkbox'); // ticked classes
  const selectedPlaystyles = getCheckedValues('playstyle-checkbox'); // ticked playstyles
  const selectedPros = getCheckedValues('pro-checkbox'); // ticked pros
  const selectedCons = getCheckedValues('con-checkbox'); // ticked cons
  const showOfficial = document.getElementById('showOfficial').checked; // is the "Official" checkbox ticked?
  const showBeta = document.getElementById('showBeta').checked; // is the "Beta" checkbox ticked?
  const showCustom = document.getElementById('showCustom').checked; // is the "Custom" checkbox ticked?

  const filteredServants = allServants.filter((servant) => { // keep only servants that pass every check
    const matchesSearch = servant.servant_name.toLowerCase().includes(searchText); // name contains the search text
    const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(servant.class); // nothing ticked = allow all; otherwise class must be ticked
    const matchesPlaystyle = selectedPlaystyles.length === 0 || selectedPlaystyles.includes(servant.playstyle); // same logic for playstyle
    const matchesPros = selectedPros.every((trait) => servant.traits.pros.includes(trait)); // servant must have ALL ticked pros
    const matchesCons = selectedCons.every((trait) => servant.traits.cons.includes(trait)); // servant must have ALL ticked cons
    const isOfficial = !servant.is_beta_servant && !servant.is_custom_servant; // official = neither beta nor custom
    const passesOfficial = !isOfficial || showOfficial; // official servants only show when "Official" is ticked
    const passesBeta = !servant.is_beta_servant || showBeta; // beta servants only show when "Beta" is ticked
    const passesCustom = !servant.is_custom_servant || showCustom; // custom servants only show when "Custom" is ticked
    return matchesSearch && matchesClass && matchesPlaystyle && matchesPros && matchesCons && passesOfficial && passesBeta && passesCustom; // must pass every check
  });

  const compare = sortModes[sortMode].compare;      // get the compare function for the current sort mode
  if (compare) {                                    // if there is one (Default has none)
    filteredServants.sort(compare);                 // sort the filtered list in place
  }

  renderGrid(filteredServants); // redraw the grid with the result
}

let searchDebounceTimer; // holds the pending timer for the search box

function openImageLightbox(imageSrc, imageAlt) { // shows an image enlarged
  document.getElementById('lightboxImage').src = imageSrc; // set the enlarged image source
  document.getElementById('lightboxImage').alt = imageAlt; // set its alt text
  document.getElementById('imageLightbox').classList.add('is-open'); // show the lightbox
}

function closeImageLightbox() { // hides the lightbox
  document.getElementById('imageLightbox').classList.remove('is-open'); // remove the open class
}

document.getElementById('lightboxClose').addEventListener('click', closeImageLightbox); // close button closes the lightbox
document.getElementById('imageLightbox').addEventListener('click', (event) => { // clicks on the lightbox background
  if (event.target.id === 'imageLightbox') { // only if the background itself was clicked
    closeImageLightbox(); // close it
  }
});

document.getElementById('modalPortrait').addEventListener('click', () => { // clicking the portrait image in the popup
  const portrait = document.getElementById('modalPortrait'); // get that image element
  openImageLightbox(portrait.src, portrait.alt); // show it enlarged
});

document.getElementById('sidebarSearch').addEventListener('input', () => { // whenever the user types in the search box
  clearTimeout(searchDebounceTimer); // cancel the previous timer
  searchDebounceTimer = setTimeout(applyFilters, 150); // wait 150ms after the last keystroke, then filter (debouncing)
});

document.getElementById('showOfficial').addEventListener('change', applyFilters); // ticking/unticking "Official" redraws the grid
document.getElementById('showBeta').addEventListener('change', applyFilters); // ticking/unticking "Beta" redraws the grid
document.getElementById('showCustom').addEventListener('change', applyFilters); // ticking/unticking "Custom" redraws the grid

document.getElementById('filterToggle').addEventListener('click', () => { // filter button clicked
  document.getElementById('filterSidebar').classList.toggle('is-open');   // open the sidebar if closed, close it if open
});

// clicking anywhere outside the sidebar closes it
document.addEventListener('click', (event) => { // listen for any click on the page
  const sidebar = document.getElementById('filterSidebar'); // the sidebar element
  const clickedInsideSidebar = event.target.closest('#filterSidebar'); // is the click inside the sidebar?
  const clickedFilterButton = event.target.closest('#filterToggle'); // is the click on the filter button?

  if (!clickedInsideSidebar && !clickedFilterButton) { // clicked somewhere else
    sidebar.classList.remove('is-open'); // close the sidebar
  }
});

document.getElementById('sidebarClose').addEventListener('click', () => { // sidebar close button clicked
  document.getElementById('filterSidebar').classList.remove('is-open'); // slide the sidebar shut
});

document.getElementById('resetFilters').addEventListener('click', () => { // reset button clicked
  document.getElementById('sidebarSearch').value = ''; // clear the search box
  document.querySelectorAll('.filter-sidebar input[type="checkbox"]').forEach((checkbox) => { // every checkbox in the sidebar
    checkbox.checked = false; // untick it
  });
  applyFilters(); // redraw with no filters
});

// closing the modal: either button click, or clicking the dark overlay outside it
document.getElementById('modalClose').addEventListener('click', closeServantModal); // close button closes the popup
document.getElementById('modalOverlay').addEventListener('click', (event) => { // clicks on the dark overlay
  if (event.target.id === 'modalOverlay') { // only if the overlay itself was clicked, not the popup
    closeServantModal(); // close the popup
  }
});

function closeServantModal() { // hides the popup and resets the URL
  document.getElementById('modalOverlay').classList.remove('is-open'); // hide the popup
  if (new URLSearchParams(window.location.search).has('servant')) { // if the URL currently has ?servant=...
    history.pushState({}, '', window.location.pathname);   // back to plain servants.html
  }
}

function buildSortMenu() { // creates the entries of the sort dropdown
  const menu = document.getElementById('sortMenu'); // the dropdown list element

  sortModes.forEach((mode, index) => { // loop over each sort mode with its index
    const item = document.createElement('li'); // list item for this mode
    item.classList.add('sort-option'); // class for CSS styling
    item.textContent = mode.label; // visible text, e.g. "A-Z"
    item.addEventListener('click', () => chooseSort(index)); // clicking selects this mode
    menu.appendChild(item); // add to the menu
  });

  highlightActiveSort(); // mark the currently active option
}

function highlightActiveSort() { // marks the selected sort option visually
  document.querySelectorAll('.sort-option').forEach((item, index) => { // loop over all options
    item.classList.toggle('active', index === sortMode); // "active" class is on only for the selected one
  });
}

function chooseSort(index) { // called when the user picks a sort option
  sortMode = index; // remember the choice
  document.getElementById('sortToggle').textContent = 'Sort: ' + sortModes[index].label; // update the button text
  document.getElementById('sortMenu').classList.add('hidden'); // close the dropdown
  highlightActiveSort(); // update the highlight
  applyFilters(); // redraw using the new sort
}

document.getElementById('sortToggle').addEventListener('click', () => { // sort button clicked
  document.getElementById('sortMenu').classList.toggle('hidden'); // show/hide the dropdown
});

document.addEventListener('click', (event) => { // any click on the page
  if (!event.target.closest('.sort-dropdown')) { // if it was outside the sort dropdown
    document.getElementById('sortMenu').classList.add('hidden'); // close the dropdown
  }
});

function getSlugFromUrl() { // reads the servant slug from the URL
  return new URLSearchParams(window.location.search).get('servant'); // value of ?servant=... (null if absent)
}

function openServantFromUrl() { // opens the popup for the servant named in the URL, if any
  const servant = allServants.find((s) => s.slug === getSlugFromUrl()); // find the servant whose slug matches
  if (servant) showServantModal(servant);   // no pushState: the URL is already right
}

// runs when the user presses the browser's Back/Forward buttons
window.addEventListener('popstate', () => { // fires on Back/Forward navigation
  const servant = allServants.find((s) => s.slug === getSlugFromUrl()); // find the servant matching the new URL
  if (servant) { // URL points at a servant
    showServantModal(servant); // show that servant's popup
  } else { // URL has no servant
    document.getElementById('modalOverlay').classList.remove('is-open'); // close the popup
  }
});

buildSortMenu(); // build the sort dropdown when the script loads
