let allCards = []; // every searchable card, filled in once the JSON has loaded

// the generic deck cards aren't listed in the JSON, so we list the image files here
const genericCards = [
  "Strength_2", "Strength_3", "Strength_4", "Strength_5",
  "Agility_2", "Agility_3", "Agility_4", "Agility_5",
  "Magic_2", "Magic_3", "Magic_4", "Magic_5",
  "Berserker_Strength_7", "Berserker_Strength_9",
  "Berserker_Agility_7", "Berserker_Agility_9",
  "Berserker_Magic_7", "Berserker_Magic_9",
  "Luck", "Surveil", "Preparation",
  "Avenger_Class", "Foreigner_Class", "Moon_Cancer_Class"
]; // file names in images/Generic-Cards, without the .webp ending

fetch('data/servants.json') // fetch the json file from the data folder
  .then(response => response.json()) // convert the raw response into json
  .then(data => { // runs once the data is ready
    allCards = buildCardIndex(data); // turn servants and masters into one flat list of cards
  });

function buildCardIndex(data) { // returns an array of { name, src } objects, one per unique card image
  const cards = []; // the list we're building
  const seenPaths = new Set(); // image paths already added, so shared cards only appear once

  function addCard(name, src) { // helper: adds a card unless that image is already in the list
    if (seenPaths.has(src)) return; // already added (e.g. "Saber Class" is shared by many servants)
    seenPaths.add(src); // remember this path
    cards.push({ name: name, src: src }); // store the card
  }

  data.servants.forEach((servant) => { // loop over every servant
    const folder = `images/Servants/${servant.servant_id}`; // this servant's image folder

    servant.skills.forEach((skill) => { // each skill card
      if (skill.is_shared) { // shared class skills live in their own folder
        addCard(skill.skill_name, `images/Shared-Class-Skills/${skill.skill_name.replace(/ /g, '_')}.webp`); // spaces become _ in the file name
      } else { // servant-specific skill
        addCard(skill.skill_name, `${folder}/Skill${skill.skill_order}.webp`);
      }
    });

    servant.uniqueCards.forEach((card) => { // each unique deck card
      addCard(card.card_name, `${folder}/${card.card_slug}.webp`);
    });

    servant.miscCards.forEach((card) => { // each asset (misc) card
      if (card.is_shared_asset) { // shared assets live in the Shared-Assets folder
        addCard(card.card_name, `images/Shared-Assets/${card.card_slug}.webp`);
      } else { // servant-specific asset
        addCard(card.card_name, `${folder}/Assets/${card.card_slug}.webp`);
      }
    });
  });

  genericCards.forEach((file) => { // each generic deck card
    addCard(file.replace(/_/g, ' '), `images/Generic-Cards/${file}.webp`); // display name: "Strength_4" becomes "Strength 4"
  });

  data.masters.forEach((master) => { // loop over every master
    const folder = `images/Masters/${master.master_id}`; // this master's image folder

    master.abilities.forEach((ability) => { // each ability card
      addCard(ability.card_name, `${folder}/Abilities/Ability${ability.ability_order}.webp`);
    });

    master.assets.forEach((asset) => { // each asset card
      addCard(asset.card_name, `${folder}/Assets/Asset${asset.asset_order}.webp`);
    });

    if (master.ascension) { // the ascension card, if this master has one
      addCard(master.ascension.card_name, `${folder}/Ascension.webp`);
    }
  });

  (data.objectives || []).forEach((card) => { // each objective card (|| [] means a missing list is treated as empty)
    addCard(card.card_name, `images/Objectives/${card.card_slug}.webp`); // image lives in images/Objectives
  });

  (data.events || []).forEach((card) => { // each event card
    addCard(card.card_name, `images/Events/${card.card_slug}.webp`); // image lives in images/Events
  });

  return cards; // hand back the finished list
}

function runSearch() { // finds cards whose name contains the search text and draws them
  const searchText = document.getElementById('cardSearch').value.trim().toLowerCase(); // remove extra spaces and lowercase for case-insensitive matching

  if (searchText === '') { // nothing typed
    renderGrid([]); // show an empty grid
    return; // stop here
  }

  const matches = allCards.filter((card) => card.name.toLowerCase().includes(searchText)); // keep cards whose name contains the text
  renderGrid(matches); // draw them

  if (matches.length === 0) { // nothing matched
    const message = document.createElement('p'); // create a message element
    message.classList.add('no-results'); // style it
    message.textContent = 'No cards found.'; // message text
    document.getElementById('cardsGrid').appendChild(message); // show it in the grid
  }
}

function renderGrid(cards) { // draws the grid of card images for the given list
  const grid = document.getElementById('cardsGrid'); // the container that holds all cards
  grid.innerHTML = ''; // grid starts off empty

  cards.forEach((card) => { // loop over each card
    const slot = document.createElement('div'); // wrapper element for one card
    slot.classList.add('search-card-slot'); // class for CSS styling (gives the 3D perspective)

    const img = document.createElement('img'); // the card image
    img.classList.add('search-card'); // class for CSS styling
    img.src = card.src; // image path built in buildCardIndex
    img.alt = card.name; // if the image doesn't load, show the card name
    img.loading = 'lazy'; // only load images when they scroll into view

    img.addEventListener('mouseenter', () => { // when the mouse enters the card
      img.classList.add('is-hovering'); // add the green glow
      img.style.transition = 'none'; // turn off transition so the tilt follows the mouse instantly
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
    });

    img.addEventListener('mouseleave', () => { // when the mouse leaves the card
      img.classList.remove('is-hovering'); // remove the glow
      img.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease'; // re-enable a smooth transition
      img.style.transform = 'translateY(0) rotateX(0deg) rotateY(0deg) scale(1)'; // return to the resting position
    });

    img.addEventListener('click', () => openImageLightbox(img.src, img.alt)); // clicking shows the card enlarged

    slot.appendChild(img); // put the image inside its slot
    grid.appendChild(slot); // put the slot into the grid
  });
}

let searchDebounceTimer; // holds the pending timer for the search box

document.getElementById('cardSearch').addEventListener('input', () => { // whenever the user types in the search box
  clearTimeout(searchDebounceTimer); // cancel the previous timer
  searchDebounceTimer = setTimeout(runSearch, 300); // wait 300ms after the last keystroke, then search (debouncing)
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
  if (event.target.id === 'imageLightbox') { // only if the background itself was clicked, not the image
    closeImageLightbox(); // close it
  }
});
