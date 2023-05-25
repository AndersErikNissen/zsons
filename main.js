const template = document.createElement('template');

template.innerHTML = ``;

class Graph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.appendChild(this._template().content.cloneNode(true));
    this._addContent();
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
      <slot name="data"></slot>
      <div id="content"></div>
    `;

    return template;
  }

  _addContent() {
    // Good to know to use .shadowRoot, but it might make more sense to just add the content to the template itself ;) 
    var content = this.shadowRoot.querySelector('#content');
    console.log("Content",content)
    content.innerHTML = "<span>This is some NICE, content!</span>"
  }
}

customElements.define('aenother-graph', Graph);