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

let debug = false;

let canvas; // html ref
let context; // canvas context

let clickCoords; // {x:number; y:number;}
let clickCoordsOnGrid; // {x:number; y:number;}
let mouseCoords; // {x:number; y:number;}
let mouseCoordsOnGrid; // {x:number; y:number;}

let padding = 1; // number (padding of grid items)

let resolution = 64; // number (how many even squares to divide canvas into)
let state; // number[][]

let didInitialDraw = false;

let images = [
  document.getElementById("img-1"),
  document.getElementById("img-2"),
  document.getElementById("img-3"),
  document.getElementById("img-4"),
];

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

  const initStateValues = true;
  if (initStateValues) {
    initStateValues();
  }

  console.log(state);

  return true;
};

const initStateValues = async () => {
  state.forEach((_, y) =>
    state[y].forEach(
      (_, x) => (state[x][y] = 1 + Math.floor(Math.random() * images.length))
    )
  );
};

const init = async () => {
  const didInitCanvas = await initCanvas();
  const didInitState = await initState();

  if (!didInitCanvas || !didInitState) {
    return;
  }

  window.addEventListener("click", click, false);
  window.addEventListener("mousemove", track, false);

  draw();
};

/******************************************
 *
 * State stuff
 *
 ******************************************/

const updateStateValueOnClick = async (x, y) => {
  state[x][y] = state[x][y] + 1;
  updateStateInStore();
};

const updateStateInStore = async () => {};

/******************************************
 *
 * Draw stuff
 *
 ******************************************/

const draw = () => {
  state.forEach((row, y) => {
    state[y].forEach((col, x) => {
      const coords = mapGridElToCoordRange(x, y);

      // add padding to the item
      const gridItem = {
        x: coords.x + padding,
        y: coords.y + padding,
        dX: coords.dX - 2 * padding,
        dY: coords.dY - 2 * padding,
      };

      //
      // TODO:
      // Highlight grid item that has mouse over it
      //

      // if (
      //   mouseCoords &&
      //   mouseCoordsOnGrid.x === x &&
      //   mouseCoordsOnGrid.y === y
      // ) {
      //   context.fillStyle = "rgba(0, 0, 0, 1)";
      //   context.fillRect(gridItem.x, gridItem.y, gridItem.dX, gridItem.dY);
      // } else {
      //   context.fillStyle = "rgba(255, 255, 255, 1)";
      //   context.fillRect(gridItem.x, gridItem.y, gridItem.dX, gridItem.dY);
      // }

      // ---------------------------------------------

      //
      // Populate the box w the appropriate image
      // assumption: Images are the same dimensions as canvas (512x512)
      // ref: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
      //

      const image = mapGridElToImage(x, y);

      if (image !== undefined) {
        context.drawImage(
          image,
          gridItem.x,
          gridItem.y,
          gridItem.dX,
          gridItem.dY,
          gridItem.x,
          gridItem.y,
          gridItem.dX,
          gridItem.dY
        );
      }

      // ---------------------------------------------

      if (debug) {
        if (!didInitialDraw) {
          //
          // Draw grid boxes for debugging
          //

          context.globalAlpha = 1;
          context.strokeStyle = "rgba(0, 0, 0, 1)";

          context.lineWidth = 0.25;
          context.strokeRect(coords.x, coords.y, coords.dX, coords.dY);

          // ---------------------------------------------
        }
      }
    });
  });

  if (!didInitialDraw) didInitialDraw = true;

  // do da loop-de-loop
  setTimeout(() => {
    draw();
  }, 200);
};

/******************************************
 *
 * Data Mappers and Transformers
 *
 ******************************************/

const mapCoordsToGridEl = (x, y) => {
  const nX = canvas.width / resolution;
  const nY = canvas.height / resolution;

  const dX = canvas.width / nX;
  const dY = canvas.height / nY;

  const gX = Math.floor(x / dX);
  const gY = Math.floor(y / dY);

  return { x: gX, y: gY };
};

const mapGridElToCoordRange = (x, y) => {
  const nX = canvas.width / resolution;
  const nY = canvas.height / resolution;

  const dX = canvas.width / nX;
  const dY = canvas.height / nY;

  const pX = dX * x;
  const pY = dY * y;

  return { x: pX, y: pY, dX, dY };
};

const mapGridElToImage = (x, y) => {
  return state[x][y] ? images[state[x][y] % images.length] : undefined;
};

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

const click = (evt) => {
  const coords = getMouseCoords(evt);

  // filter out bad coords
  if (!coords) {
    return;
  }

  clickCoords = coords;

  // determine which grid item is active
  clickCoordsOnGrid = mapCoordsToGridEl(clickCoords.x, clickCoords.y);

  updateStateValueOnClick(clickCoordsOnGrid.x, clickCoordsOnGrid.y);
};

const track = (evt) => {
  const coords = getMouseCoords(evt);

  // filter out bad coords
  if (!coords) {
    return;
  }

  mouseCoords = coords;

  // determine which grid item is active
  mouseCoordsOnGrid = mapCoordsToGridEl(mouseCoords.x, mouseCoords.y);
};

/******************************************
 *
 * Runner
 *
 ******************************************/

window.onload = async () => await init();
