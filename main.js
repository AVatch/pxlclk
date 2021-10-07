/**
 * An interactive grid which cycles through an
 * array of images based off of clicks.
 *
 * The grid is "alive" in that anyone can modify it
 * to cycle through the images.
 *
 * This is not intended to be good code...
 *
 * Created by Adrian Vatchinsky on 10/9/21.
 */

let debug = true;

let canvas; // html ref
let context; // canvas context
let mouseCoords; // {x:number; y:number;}

let resolution = 64; // number (how many even squares to divide canvas into)
let state; // number[][]

/******************************************
 *
 * Init stuff
 *
 ******************************************/

const initCanvas = async () => {
  canvas = document.getElementById("clickme");

  if (!canvas?.getContext) {
    return false;
  }

  context = canvas.getContext("2d");

  return true;
};

const initState = async () => {
  const { width, height } = canvas;

  const dX = width / resolution;
  const dY = height / resolution;

  state = [...Array(dX)].map((_) => Array(dY).fill(0));

  return true;
};

const init = async () => {
  const didInitCanvas = await initCanvas();
  const didInitState = await initState();

  if (!didInitCanvas || !didInitState) {
    return;
  }

  window.addEventListener("mousemove", track, false);

  draw();
};

/******************************************
 *
 * Draw stuff
 *
 ******************************************/

const draw = () => {
  drawGrid();
  drawActiveGridItem();

  if (debug) {
    drawDebugGrid();
  }

  // loop
  // setTimeout(() => {
  //   draw();
  // }, 10000);
};

const drawGrid = () => {
  state.forEach((row, y) => {
    row.forEach((col, x) => {
      const el = state[x][y];

      console.log({ x, y, el });
    });
  });
};

const drawActiveGridItem = () => {};

const drawDebugGrid = () => {};

/******************************************
 *
 * Data Mappers and Transformers
 *
 ******************************************/

const mapCoordsToGridEl = (x, y) => {};

const mapGridElToCoordRange = (x, y) => {};

/**
 * Gets the mouse coordinates relative to the canvas.
 *
 * Returns undefined if out of bounds
 *
 * ref: https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
 */
const getMouseCoords = (evt) => {
  let rect = canvas.getBoundingClientRect(); // abs. size of element
  let scaleX = canvas.width / rect.width; // relationship bitmap vs. element for X
  let scaleY = canvas.height / rect.height; // relationship bitmap vs. element for Y

  let x = (evt.clientX - rect.left) * scaleX; // scale mouse coordinates after they have
  let y = (evt.clientY - rect.top) * scaleY; // been adjusted to be relative to element

  if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) {
    return undefined;
  }

  return {
    x,
    y,
  };
};

/******************************************
 *
 * Event Handlers
 *
 ******************************************/

const track = (evt) => {
  const coords = getMouseCoords(evt);

  // filter out bad coords
  if (!coords) {
    return;
  }

  mouseCoords = coords;
};

/******************************************
 *
 * Runner
 *
 ******************************************/

window.onload = async () => await init();
