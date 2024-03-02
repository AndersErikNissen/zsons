/**
 * From - idle or no puck
 * To - puck follows the cursor
 */

/**
 * Are we on a desktop? - else return
 * Is the navigation being hovered? - else return
  * 
  * Is there an active NI (A:NI)?
  * - remove active class from A:NI and place puck instead
  * > move to other NI if A:NI is not first item to be hovered
  * else place puck on NI
  *
  * On mouse move: is a new NI being hovered? - else return
  * - move puck to new NI
  * > get the position and width of NI
  * > replace puck width and transform amount
  * 
  * On exit: 
  * - is there an A:NI? - move puck to A:NI
  * - else hide puck
 *  */



// class navigationItem {
//   constructor(node) {
//     this.node = node;

//     this.eventBinder();
//   }

//   eventBinder() {
//     let hoverEvent = new CustomEvent('navigation:hover', {
//       bubbles: true,
//       detail: {
//         width: this.node.offsetWidth,
//         widthRect: this.node.getBoundingClientRect().width,
//         offsetLeft: this.node.offsetLeft,
//         right: this.node.getBoundingClientRect().right,
//       },
//     });

//     this.node.addEventListener('mouseover', function() { this.dispatchEvent(hoverEvent) })
//   }
// }

// class navigationGroup {
//   constructor(node) {
//     this.node = node;
//     this.puck = node.querySelector('.puck');
//     this.lastPuckLocation = 0;

//     this.events();
//     console.log(this.rect)
//   }

//   get rect() {
//     return {
//       width: this.node.getBoundingClientRect().width,
//       offsetWidth: this.node.offsetWidth,
//       offsetLeft: this.node.offsetLeft,
//       x: this.node.getBoundingClientRect().x,
//     }
//   }

//   get items() {
//     let itemsObjects = [];
  
//     this.node.querySelectorAll('[class^="navigation-item"]').forEach(item => {
//       itemsObjects.push(new navigationItem(item));
//     });

//     return itemsObjects;
//   }
  
//   handlePuck(e) {
//     console.log(e.detail)
//     this.puck.style.transform = `translateX(${e.detail.offsetLeft}px)`;
//     this.puck.style.width = `${e.detail.width}px`;
//   }

//   events() {
//     this.node.addEventListener('navigation:hover', this.handlePuck.bind(this));
//   }
// }

// var _1 = new navigationGroup(this.document.querySelector('.navigation-group'));

// _1.items.forEach(item => console.log(item));



(function() {
  const puck = document.querySelector('.puck');
  const navigationGroup = document.querySelector('.navigation-group');
  const navigationItems = document.querySelectorAll('[class^="navigation-item"]');

  navigationItems.forEach((item, index) => item.addEventListener('mouseover', () => {
    item.dispatchEvent(new CustomEvent('navigation-item:hover', {
      bubbles: true,
      detail: {
        item: item,
        index: index,
        width: item.offsetWidth,
        left: item.offsetLeft,
      }
    }));
  }));

  navigationGroup.addEventListener('navigation-item:hover', (e, host) => {
    puck.style.transform = `translateX(${e.detail.left}px)`;
    puck.style.width = `${e.detail.width}px`;
    navigationGroup.dataset.activeItem = e.detail.index + 1;
  })
})()