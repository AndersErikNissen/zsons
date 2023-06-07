"use strict";
/*
  Layouts
  - Graph
  - Bar chart
    - Stacked on top of each other
    - Stacked beside each other, grouped for each number (So "events", would all be beside each other, then "meetings" and so on)
  - Backlog: Pie chart
  - Difference between two array (Like LoL gold difference)

  The data comes from and array of inputs [[name,value]...]

  We want to end up with
    An array of objects with:
    - Name
    - All the values

    Global data:
    - The highest number and the ones in between

  Check for changes to current inputs or new ones with "slotchanged".
*/

class Infograph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this._template().content.cloneNode(true));
  }
  
  connectedCallback() {
    this.dataFromForm = this.shadowRoot.querySelector('slot[name="data"]').assignedNodes()[0];
    this.coreData = this.data;
    this.upgradeData();

    this._addContent();

    this.buildWavy();
    console.log("Data", this.data)
    console.log("Core", this.core)
    console.log(this.layout)
  }

  _style() {
    return `
      #content {
        background-color: purple;
      }
    `;
  }

  _template() {
    const template = document.createElement('template');

    template.innerHTML = `
      <style>${this._style()}</style>
      <div class="hidden">
        <slot name="data" />
      </div>
      <div id="content"></div>
    `;

    return template;
  }

  _addContent() {
    // Good to know to use .shadowRoot, but it might make more sense to just add the content to the template itself ;) 
    var content = this.shadowRoot.querySelector('#content');

    content.innerHTML = "<span>This is some NICE, content!</span>"
  }

  get aspect() {
    var aspect = Number(this.getAttribute('aspect'));
    if (aspect === 0) return 1;
    return isNaN(aspect) ? 1 : aspect;
  }

  get layout() {
    var layoutTypes = ['wavy','buddy','towery'];
    var attributeLayout = this.getAttribute('layout');
    var check = layoutTypes.find(layout => layout === attributeLayout) ;

    return check ? check : 'towery';
  }

  /**
   * @param {array} array - Array of data to compare, to set the core values 
   */
  set coreData(array) {
    var maxValueFromArray = Math.max.apply(null, array.map( obj => { 
      var combinedValues = 0;
      obj.values.forEach( value => combinedValues += value);
      return combinedValues;
    }));

    if(isNaN(maxValueFromArray)) return;

    const getMaxNumber = nr => {
      var length = String(nr).length;
      if (nr < 0) length--;

      var base = 10 ** length;
      var max = base;
      var minus = base / 10;

      while(nr % max === nr) {
        max = max - minus;
      }

      if (nr < 0) max * -1;

      return max * 2;
    };

    var max = getMaxNumber(maxValueFromArray);
    var half = max / 2;
    
    this.setAttribute('max', max);
    this.setAttribute('half', half);

    this.core = {
      max: max,
      half: half,
      svg_width: max * this.aspect,
      min: 0
    };
  }

  /**
   * @param {node} form - Proviode a <form> node, to set the data that needs to be handled by the CE.
   */
  set dataFromForm(form) {
    var 
      formattedArray = [],
      data = form.tagName === 'FORM' 
        ? new FormData(form).entries() 
        : false;

    if (!data) return;

    for (const [name, value] of data) {
      var i = formattedArray.findIndex( existingObject => existingObject.name === name);
      var obj = i === -1 
        ? {
            name: name,
            label: name.charAt(0).toUpperCase() + name.slice(1),
            values: []
          }
        : formattedArray[i];
  
      if(!isNaN(Number(value))) obj.values.push(Number(value));
      if (i === -1) formattedArray.push(obj);
    }

    this.data = formattedArray;
  }
  
  upgradeData() {
    this.data.forEach( obj => {
      var combinedValues = 0;
      obj.sub_percentages = [];
      obj.max_percentages = [];
      obj.values.forEach(nr => combinedValues += nr);
      obj.values.forEach(nr => {
        var percentages = [(nr / combinedValues) * 100, (nr / this.core.max) * 100];

        // Help from: https://stackoverflow.com/questions/11832914/how-to-round-to-at-most-2-decimal-places-if-necessary/18358056#18358056
        var rounded = percentages.map( perNr => +(Math.round(perNr + "e+2") + "e-2"));

        obj.sub_percentages.push(rounded[0] + "%");
        obj.max_percentages.push(rounded[1] + "%");
      });

      obj.percentage = ((combinedValues / this.core.max) * 100) + "%";
    });
  }

  buildWavy() {
    var graphSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var width = this.core.svg_width;
    var height = this.core.max;

    graphSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    graphSvg.setAttribute('width', width);
    graphSvg.setAttribute('height', height);

    /**
     * Goal: Line for each input name
     * 
     * Before this
     *  Find the input with the most values
     *  Divide with the SVG width, to get each X
     *    First should be X = 0 and last X = width
     *    In betweens should be even since we are making a path
     * 
     * For each input
     *  Create a path
     *  Move To should be 0 and Y from input[0]
     *  Add the X that matches the index from above
     *  Take the input value as Y (might need to reverse it if 0,0 is the top-left corner)
     *  Last should be X = width and should value from last input
     *    If input amount is less than max amount, just have Y be the same as the last input (So i will create a line along the horizontal axis)
     *  Add attributes like (Stroke, stroke-width)
     *  Append path to SVG
     *  
     * Optional: Create path for the gradient/full background color
     *  Keep path from the waves, and then around the border below
     *    First draw another wave, then go from ("svg width" "value from last input", "svg width" "svg height", 0 "svg height", 0 input[0]) 
     *    Fill the bg-path with a color if wanted
     * 
     */


    /**
     * 
     * ADD PATH to each data or create them via this function via the data instead? Might be the best way to do it.
     */

    console.log("Wavy", graphSvg)
  }

}

customElements.define('aenother-infograph', Infograph);