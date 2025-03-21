// canvas related variables
var canvas=document.getElementById("canvas");
var ctx=canvas.getContext("2d");
var cw=canvas.width;
var ch=canvas.height;
    
function reOffset(){
var BB=canvas.getBoundingClientRect();
  offsetX=BB.left;
  offsetY=BB.top;        
}
var offsetX,offsetY;
reOffset();
window.onscroll=function(e){ reOffset(); }
window.onresize=function(e){ reOffset(); }
    
ctx.fillStyle='#fff';
    
// mouse related variables
var PI2=Math.PI*2;
var mouseRadius=50;   // this is the mouse's radius of influence
var mouseRadiusSquared=mouseRadius*mouseRadius;
var mouseIsDown=false;
var mx,my;
var ticktick=0;
        
// define a bunch of hex objects stored in an array
var hexRadius=0.6;
var hexPadding=35;
var hexes=[];
for(var y=hexRadius;y<ch;y+=hexRadius*2+hexPadding){
  for(var x=hexRadius;x<cw;x+=hexRadius*2+hexPadding){
    hexes.push({startingX:x,startingY:y,x:x,y:y});
  }
}
    
// start a continuously running ticker loop
requestAnimationFrame(tick);
    
// listen for mouse events
//$("#canvas").mousedown(function(e){handleMouseDown(e);});
//$("#canvas").mouseup(function(e){handleMouseUp(e);});
    
canvas.onmousemove = function(e){handleMouseDown(e);};
    
// draw every hex in its current position
function draw(){
  ctx.clearRect(0,0,cw,ch);
  ctx.beginPath();
  for(var i=0;i<hexes.length;i++){
    var h=hexes[i];
    ctx.moveTo(h.x,h.y);
    ctx.arc(h.x,h.y,hexRadius,0,PI2);
    ctx.closePath();
  }
  ctx.fill();
}
    
// create a continuously running ticker
function tick(time){
    
  // update each hex position based on its 
  // position relative to the mouse
  for(var i=0;i<hexes.length;i++){
    var h=hexes[i];
    // calculate if this hex is inside the mouse radius
    var dx=h.x-mx;
    var dy=h.y-my;
    if(mouseIsDown && dx*dx+dy*dy<mouseRadiusSquared){
      // hex is inside mouseRadius
      // so mouseDown repels hex
      h.x+=dx/2;
      h.y+=dy/2;
      ticktick++;
      console.log(ticktick);
      if (ticktick>20) mouseIsDown=false,ticktick=0;
    }
    else if(h.x==h.startingX && h.y==h.startingY){
      // hex is at startingX/Y & is not being repelled
      // so do nothing
    }
    else{
      // hex has moved off startingX/Y
      // but is no longer being repelled
      // so gravity attracts hex back to its startingX/Y
      dx=h.x-h.startingX;
      dy=h.y-h.startingY;
      h.x-=dx/75;
      h.y-=dy/75;            
    }
  }
    
  // redraw the hexes in their new positions
  draw();
    
  // request another tick
  requestAnimationFrame(tick);
}
    
    
// listen for mousedown events
function handleMouseDown(e){
    
  // tell the browser we're handling this event
  e.preventDefault();
  e.stopPropagation();
    
  // calculate the mouse position
  mx=parseInt(e.clientX-offsetX);
  my=parseInt(e.clientY-offsetY);
    
  // set the mousedown flag
  mouseIsDown=true;
  ticktick=0;
}
    
    
// listen for mouseup events
function handleMouseUp(e){
    
  // tell the browser we're handling this event
  e.preventDefault();
  e.stopPropagation();
    
  // clear the mousedown flag 
  mouseIsDown=false;
}