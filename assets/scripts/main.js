(function() {

const puck = document.querySelector('.puck'),
  navigationGroup = document.querySelector('.navigation-group'),
  navigationItems = navigationGroup.querySelectorAll('[class^="navigation-item"]');

let hasBeenHovered = false,
  puckSpawned = false,
  activeItem = false;

  
navigationItems.forEach((item, index) => {
  // Check for active item
  if (item.classList.contains('navigation-item-active')) {
    activeItem = {
      node: item,
      index: index,
    };
  } 

  item.addEventListener('mouseover', () => {
    item.dispatchEvent(new CustomEvent('navigation-item:hover', {
      bubbles: true,
      detail: {
        item: {
          node: item,
          index: index,
        },
      }
    }));
  })
});

// Move puck
const movePuck = (item) => {
  if (puck.classList.contains('puck-active-spawn')) 
    puck.classList.replace('puck-active-spawn', 'puck-active');

  puck.style.width = `${item.node.offsetWidth}px`;
  puck.style.transform = `translateX(${item.node.offsetLeft}px)`;
  navigationGroup.dataset.activeItem = item.index + 1;
}

// Spawn puck
const spawnPuck = (item) => {
  movePuck(item);
  if (activeItem) puck.classList.add('puck-active-spawn');
  navigationGroup.getBoundingClientRect();
  if (!activeItem) puck.classList.add('puck-active');
}

const despawnPuck = () => {
  puck.classList.toggle('puck-active');
  navigationGroup.dataset.activeItem = "";
  puckSpawned = false;
}


// Handles the hover events
navigationGroup.addEventListener('navigation-item:hover', (e) => {

  // Has active item and need to "replace" it with the real puck
  if (activeItem && !hasBeenHovered) {
    spawnPuck(activeItem);   
    activeItem.node.classList.remove('navigation-item-active');
    
    puckSpawned = true;
    hasBeenHovered = true;
  }
  
  if (!puckSpawned) {
    spawnPuck(e.detail.item);   
    puckSpawned = true;
  } else {
    movePuck(e.detail.item);   
  }
});

navigationGroup.addEventListener('mouseleave', () => {
  if (activeItem) {
    movePuck(activeItem);
  }

  if (!activeItem) {
    despawnPuck();
  }
});
})();

(function() {
  // Mobile menu
  const btn = document.querySelector('.btn-mobile-menu');
  btn.addEventListener('click', () => document.body.classList.toggle('active-mobile-menu'));
})();


(function() {
  const windowCenter = window.innerWidth / 2;
  const queryInfoIcons = document.querySelectorAll('[data-info-trigger]');
  const iconTexts = {
    "Labels": "Set attribute to show labels, and set the value to vertival to display the labels that way.", 
    "Load effect": "If true, then the graph will animate when 100% is visible on the screen.",
    "Hover effect": "Will give the possibility to showcase extra information on hover (On mobile the use can click to show the information).",
  };

  
  let infoIconObjects = [];
  queryInfoIcons.forEach(icon => {
    let iconParent = icon.parentElement;

    infoIconObjects.push({
      node: icon,
      parent: iconParent,
      rect: {
        x: icon.getBoundingClientRect().x, 
        y: icon.getBoundingClientRect().y - window.scrollY,
      },
      text: iconTexts[iconParent.querySelector('.label-light').textContent],
    });
  });

  infoIconObjects.forEach(obj => {
    let span = document.createElement('span');
    span.classList.add('info-popup');
    span.textContent = obj.text;

    obj.parent.appendChild(span);
  });

  console.warn(infoIconObjects)

})();