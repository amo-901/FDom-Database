let allMasters = []; // empty list, we store the masters in here later

let sortMode = 0; // index into sortModes below; 0 is the default (unsorted) order

const sortModes = [
  { label: 'Default', compare: null }, // default order: no sorting function
  { label: 'A-Z', compare: (a, b) => a.master_name.localeCompare(b.master_name) }, // alphabetical by name
  { label: 'Z-A', compare: (a, b) => b.master_name.localeCompare(a.master_name) } // reverse alphabetical (a and b swapped)
]; // each object has a label for the menu and a compare function (or null) that sort() uses
// a and b are two master objects; localeCompare returns negative if a goes first, positive if b goes first

fetch('data/servants.json') // request the JSON data file
  .then(response => response.json()) // once the response arrives, parse its body as JSON
  .then(data => { // runs once the parsed data is ready
    allMasters = data.masters; // save the masters array so filtering can use it later
    buildCheckboxGroup('mechanicsFilterGroup', data.mechanicsList, 'mechanics-checkbox'); // create the mechanics filter checkboxes
    applyFilters(); // draw the grid (beta/custom masters are hidden until their checkbox is ticked)
    openMasterFromUrl(); // if the URL has ?master=slug, open that master's popup right away
  });

function renderGrid(masters) { // draws the grid of master cards for the given list
  const grid = document.getElementById('cardsGrid'); // the container that holds all cards
  grid.innerHTML = ''; // wipe out any cards that were there before

  masters.forEach((master) => { // loop over each master
    const slot = document.createElement('div'); // wrapper element for one card
    slot.classList.add('master-card-slot'); // class for CSS styling

    const img = document.createElement('img'); // the card image
    img.classList.add('master-card'); // class for CSS styling
    img.src = `images/Masters/${master.master_id}/Profile.webp`; // image path built from the master's id
    img.alt = master.master_name; // text shown if the image fails to load (also for screen readers)
    img.loading = 'lazy'; // for making it easier to load website

    const label = createOverlayLabel(master.is_custom_master, master.is_beta_master); // custom/beta masters get a "CUSTOM"/"BETA" overlay, others get null

    // tilt + lift
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
    // --- end new ---

    img.addEventListener('click', () => { // when the card is clicked
      openMasterModal(master); // open the popup with this master's details
    });

    slot.appendChild(img); // put the image inside its slot
    if (label) slot.appendChild(label); // put the CUSTOM/BETA label on top of the card
    grid.appendChild(slot); // put the slot into the grid
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

function openMasterModal(master) { // opens the popup AND updates the URL (used for user clicks)
  showMasterModal(master); // fill in and show the popup
  history.pushState({ slug: master.slug }, '', `?master=${master.slug}`); // add a history entry and change the URL to ?master=slug without reloading
}

function showMasterModal(master) { // fills in and shows the popup for one master (does not touch the URL)
  document.getElementById('modalPortrait').src =
    `images/Masters/${master.master_id}/Profile.webp`; // set the big portrait image
  document.getElementById('modalCustomText').classList.toggle('hidden', !master.is_custom_master); // show "CUSTOM" on the portrait only for custom masters
  document.getElementById('modalBetaText').classList.toggle('hidden', !master.is_beta_master); // show "BETA" on the portrait only for beta masters

  const abilityHeading = document.getElementById('ability-heading') // the "Abilities" heading
  const abilityContainer = document.getElementById('modalAbilities'); // the box that holds ability cards
  abilityContainer.innerHTML = '';   // clear any previous master's abilities first

  abilityHeading.classList.add('hidden') // hide the heading by default
  abilityContainer.classList.add('hidden') // hide the container by default

  const masterName = document.getElementById('master-name') // element showing the name
  masterName.textContent = ''; // clear the old name

  masterName.textContent = master.master_name; // show this master's name
  document.getElementById('master-description').textContent = master.description || 'No description available.'; // show the description, or a fallback if there isn't one

  const assetsHeading = document.getElementById('assets-heading'); // the "Assets" heading
  const assetContainer = document.getElementById('modalAssets'); // the box that holds asset cards
  assetsHeading.classList.add('hidden') // hide by default
  assetContainer.classList.add('hidden') // hide by default
  assetContainer.innerHTML = ''; // clear any previous assets

  if (master.has_abilities) { // only if this master has abilities
    abilityHeading.classList.remove('hidden'); // show the heading
    abilityContainer.classList.remove('hidden'); // show the container

    master.abilities.forEach((ability) => { // loop over each ability
    const img = document.createElement('img'); // create its image
    img.classList.add('ability-card'); // class for CSS styling
    img.src = getAbilityImagePath(master, ability); // build the image path
    img.alt = ability.card_name; // fallback text
    img.loading = 'lazy'; // load only when needed
    img.addEventListener('click', () => openImageLightbox(img.src, img.alt)); // clicking enlarges the image
    abilityContainer.appendChild(img); // add it to the container
    });
  } else { // no abilities
    abilityHeading.classList.add('hidden'); // keep heading hidden
    abilityContainer.classList.add('hidden'); // keep container hidden
  }

  const ascensionHeading = document.getElementById('ascension-heading'); // the "Ascension" heading
  const ascensionImage = document.getElementById('modalAscension'); // the ascension card image

  if (master.ascension) { // only if this master has an ascension card
    ascensionHeading.classList.remove('hidden'); // show the heading
    ascensionImage.classList.remove('hidden'); // show the image
    ascensionImage.src = getAscensionPath(master); // set the ascension image
    ascensionImage.alt = master.ascension.card_name; // set its alt text
  } else { // no ascension card
    ascensionHeading.classList.add('hidden'); // hide the heading
    ascensionImage.classList.add('hidden'); // hide the image
    ascensionImage.removeAttribute('src'); // clear the previous master's image so it can't linger
    ascensionImage.alt = ''; // clear its alt text too
  }

  if (master.has_assets) { // only if this master has assets
    assetsHeading.classList.remove('hidden'); // show the heading
    assetContainer.classList.remove('hidden'); // show the container

    master.assets.forEach((asset) => { // loop over each asset
    const img = document.createElement('img'); // create its image
    img.classList.add('asset-card'); // class for CSS styling
    img.src = getAssetPath(master, asset); // build the image path
    img.alt = asset.card_name; // fallback text
    img.loading = 'lazy'; // load only when needed
    img.addEventListener('click', () => openImageLightbox(img.src, img.alt)); // clicking enlarges the image
    assetContainer.appendChild(img); // add it to the container
    });
  } else { // no assets
    assetsHeading.classList.add('hidden'); // keep heading hidden
    assetContainer.classList.add('hidden'); // keep container hidden
  }

  document.getElementById('modalOverlay').classList.add('is-open'); // finally, show the popup
}

function getAbilityImagePath(master, ability) { // returns the image path for an ability card
    return `images/Masters/${master.master_id}/Abilities/Ability${ability.ability_order}.webp`; // uses the master id and the ability's order number
}

function getAssetPath(master, asset) { // returns the image path for an asset card
    return `images/Masters/${master.master_id}/Assets/Asset${asset.asset_order}.webp`; // uses the master id and the asset's order number
}

function getAscensionPath(master) { // returns the image path for the ascension card
  return `images/Masters/${master.master_id}/Ascension.webp` // uses the master id
}

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
    label.appendChild(document.createTextNode(' ' + value)); // add the visible text after it

    group.appendChild(label); // add the label to the container
  });
}

function getCheckedValues(checkboxClass) { // returns the values of all ticked checkboxes of one group
  const checked = document.querySelectorAll(`.${checkboxClass}:checked`); // find the ticked ones by class
  return Array.from(checked).map((checkbox) => checkbox.value); // convert to an array and keep only their values
}

function applyFilters() { // re-filters the masters based on the search box and checkboxes
  const searchText = document.getElementById('sidebarSearch').value.toLowerCase(); // search text, lowercased for case-insensitive matching
  const selectedMechanics = getCheckedValues('mechanics-checkbox'); // ticked mechanics
  const showOfficial = document.getElementById('showOfficial').checked; // is the "Official" checkbox ticked?
  const showBeta = document.getElementById('showBeta').checked; // is the "Beta" checkbox ticked?
  const showCustom = document.getElementById('showCustom').checked; // is the "Custom" checkbox ticked?

  const filteredMasters = allMasters.filter((master) => { // keep only masters that pass every check
    const matchesSearch = master.master_name.toLowerCase().includes(searchText); // name contains the search text
    const matchesMechanics = selectedMechanics.length === 0 || selectedMechanics.includes(master.mechanic); // nothing ticked means "allow all"; otherwise the master's mechanic must be ticked
    const isOfficial = !master.is_beta_master && !master.is_custom_master; // official = neither beta nor custom
    const passesOfficial = !isOfficial || showOfficial; // official masters only show when "Official" is ticked
    const passesBeta = !master.is_beta_master || showBeta; // beta masters only show when "Beta" is ticked
    const passesCustom = !master.is_custom_master || showCustom; // custom masters only show when "Custom" is ticked
    return matchesSearch && matchesMechanics && passesOfficial && passesBeta && passesCustom; // must pass every check
  });

  const compare = sortModes[sortMode].compare; // get the compare function for the current sort mode
  if (compare) { // if there is one (Default has none)
    filteredMasters.sort(compare); // sort the filtered list in place
  }

  renderGrid(filteredMasters); // redraw the grid with the filtered list
}

let searchDebounceTimer; // holds the pending timer for the search box

document.getElementById('sidebarSearch').addEventListener('input', () => { // whenever the user types in the search box
  clearTimeout(searchDebounceTimer); // cancel the previous timer
  searchDebounceTimer = setTimeout(applyFilters, 150); // wait 150ms after the last keystroke, then filter (debouncing)
});

document.getElementById('showOfficial').addEventListener('change', applyFilters); // ticking/unticking "Official" redraws the grid
document.getElementById('showBeta').addEventListener('change', applyFilters); // ticking/unticking "Beta" redraws the grid
document.getElementById('showCustom').addEventListener('change', applyFilters); // ticking/unticking "Custom" redraws the grid

document.getElementById('filterToggle').addEventListener('click', () => { // filter button clicked
  document.getElementById('filterSidebar').classList.toggle('is-open'); // open the sidebar if closed, close it if open
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

document.getElementById('modalClose').addEventListener('click', closeMasterModal); // close button closes the popup
document.getElementById('modalOverlay').addEventListener('click', (event) => { // clicks on the dark overlay
  if (event.target.id === 'modalOverlay') { // only if the overlay itself was clicked, not something inside the popup
    closeMasterModal(); // close the popup
  }
});

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

document.getElementById('modalAscension').addEventListener('click', () => { // clicking the ascension image in the popup
  const ascension = document.getElementById('modalAscension'); // get that image element
  openImageLightbox(ascension.src, ascension.alt); // show it enlarged
});

function closeMasterModal() { // hides the master popup and resets the URL
  document.getElementById('modalOverlay').classList.remove('is-open'); // remove the open class
  if (new URLSearchParams(window.location.search).has('master')) { // if the URL currently has ?master=...
    history.pushState({}, '', window.location.pathname); // back to plain masters.html
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

function getMasterSlugFromUrl() { // reads the master slug from the URL
  return new URLSearchParams(window.location.search).get('master'); // value of ?master=... (null if absent)
}

function openMasterFromUrl() { // opens the popup for the master named in the URL, if any
  const master = allMasters.find((m) => m.slug === getMasterSlugFromUrl()); // find the master whose slug matches
  if (master) showMasterModal(master); // no pushState: the URL is already right
}

// runs when the user presses the browser's Back/Forward buttons
window.addEventListener('popstate', () => { // fires on Back/Forward navigation
  const master = allMasters.find((m) => m.slug === getMasterSlugFromUrl()); // find the master matching the new URL
  if (master) { // URL points at a master
    showMasterModal(master); // show that master's popup
  } else { // URL has no master
    document.getElementById('modalOverlay').classList.remove('is-open'); // close the popup
  }
});

buildSortMenu(); // build the sort dropdown when the script loads
