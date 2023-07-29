// Create data from <form>
var formNode = this.shadowRoot.querySelector('#form').assignedNodes()[0];
if (formNode && formNode.tagName !== 'FORM') formNode = false;

// If we have a <form> and no data have been added to our data-variable.
if (formNode && data.length === 0) {
    var validForm = new FormData(formNode).entries();
    
    for (const [name, value] of validForm) {
      var i = data.findIndex( existingObject => existingObject.name === name);
      
      // If the object doesn't exists then add it.
      var obj = i === -1 
      ? {
        name: name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        values: []
      }
      : data[i];
      
      if(!isNaN(Number(value))) obj.values.push(Number(value));
      if (i === -1) data.push(obj);
    }
  }