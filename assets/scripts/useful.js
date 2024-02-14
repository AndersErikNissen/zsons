let createTriangleD = (degs,height,x,y) => {
    let corner = Math.tan(degs * (Math.PI / 180)) * height;
    return `M ${x},${y} L ${x - corner},${y - height} L ${x + corner},${y - height} Z`;
};