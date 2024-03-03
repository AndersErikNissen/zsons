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
/**
 * 
  * mouse leave (group)
  * place puck at active location  
  
  * 
  */

})()