"use strict";

const template = document.createElement('template');

template.innerHTML = ``;

class Graph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this._template().content.cloneNode(true));
  }
  
  connectedCallback() {
    this._addContent();
    this._initData();
    this.getData();

    console.log(this.data)
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

  _initData() {
    var handleArray = (entry, arr) => {
      var name = entry[0];
      var value = entry[1];
      var i = arr.findIndex( entryObj => entryObj.name === name);
      var obj = i === -1 
      ? {
          name: name,
          label: name.charAt(0).toUpperCase() + name.slice(1),
          values: []
        }
      : arr[i];

      if(!isNaN(Number(value))) obj.values.push(Number(value));
      if (i === -1) arr.push(obj);
    }

    var arr = [];
    var form = this.shadowRoot.querySelector('slot[name="data"]').assignedNodes()[0];
    if (form.tagName !== 'FORM') return;
    form = new FormData(form);

    [...form.entries()].forEach(entry => handleArray(entry, arr));


    this.data = arr;
  }

  getData() {
    
    var form = new FormData();
    console.log(...form.entries())
    var obj = {};
    var arr = [];

    [...form.entries()].forEach( entry => obj[entry[0]] = entry[1]);

    //console.log(new URLSearchParams(form).toString())

  }
}

customElements.define('aenother-graph', Graph);