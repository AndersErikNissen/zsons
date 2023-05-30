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

class Graph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this._template().content.cloneNode(true));
  }
  
  connectedCallback() {
    this._addContent();
    this.dataFromForm = this.shadowRoot.querySelector('slot[name="data"]').assignedNodes()[0];
    this.coreData = this.data;

    console.log("Data", this.data)
    console.log("Core", this.core)
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
      min: 0
    };

    /**
     * Update data array
     */
    array.forEach( obj => {
      var combinedValues = 0;
      var totalSubPercentage = 0;
      var subPercentages = [];
      obj.values.forEach(nr => combinedValues += nr);
      obj.values.forEach(nr => {
        var percentage = Math.floor((nr / combinedValues) * 100);
        subPercentages.push(percentage);
        totalSubPercentage += percentage;
      });

      if (totalSubPercentage < 100) {
        var remainder = (100 - totalSubPercentage) / obj.values.length;
        subPercentages = subPercentages.map( per => (per + remainder));
      }

      subPercentages = subPercentages.map(per => per + "%");

      /**
       * 
       * 
       * 
       * 
       * 
       * GET PERCENTAGES FOR EACH SUB COMPARED TO MAX (SO THEY CAN BE USED FOR THE "BUDDY" LAYOUT)
       * 
       * 
       * 
       * 
       * 
       * 
       */

      obj.percentage = ((combinedValues / max) * 100) + "%";
      obj.sub_percentages = subPercentages;
    });
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
    this.coreData = formattedArray;
  }
}

customElements.define('aenother-graph', Graph);