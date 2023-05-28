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
    this.getData();
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

  getData() {
    var data = this.shadowRoot.querySelector('slot[name="data"]').assignedNodes()[0];
    var form = new FormData(data);
    console.log(new URLSearchParams(form).toString())

  }
}

customElements.define('aenother-graph', Graph);