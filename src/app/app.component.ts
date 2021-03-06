import { environment } from '../environments/environment';

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  increment,
  writeBatch,
  getDoc,
} from 'firebase/firestore';

import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';

import { BehaviorSubject, combineLatest } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'pxlclk';

  list = [
    '/assets/test-01.png',
    '/assets/test-02.png',
    '/assets/test-03.png',
    '/assets/test-04.png',
  ];

  target = this.list[Math.floor(Math.random() * this.list.length)];

  private firebaseApp!: FirebaseApp;
  private firebaseDB!: Firestore;

  debug: boolean = false;
  didInitialDraw: boolean = false;
  padding: number = 1; // number (padding of grid items)
  resolution: number = 64; // number (how many even squares to divide canvas into)

  ctx!: CanvasRenderingContext2D;
  state$: BehaviorSubject<number[][]> = new BehaviorSubject<number[][]>([[]]);
  clicks$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  synced$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  success$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  @ViewChild('canvas') canvas!: ElementRef;
  @ViewChildren('img') imgs!: QueryList<ElementRef>;

  /******************************************
   *
   * Init stuff
   *
   ******************************************/

  constructor() {}

  ngOnInit() {
    this.initFirebase();
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.initState();

    this.subscribeToStateChanges();
  }

  private async initFirebase() {
    this.firebaseApp = initializeApp(environment.firebase);
    this.firebaseDB = getFirestore();
  }

  private initCanvas() {
    this.ctx = this.canvas.nativeElement.getContext('2d');
  }

  private async initState() {
    const { nX, nY } = this.resolveGridDimensions();

    const docRef = doc(this.firebaseDB, 'boards', `${nX}x${nY}`);

    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      await this.initStateValues();
    }

    onSnapshot(docRef, (doc) => {
      const payload = doc.data() as {
        nX: number;
        nY: number;
        clicks: number;
        synced: boolean;
        nImages: number;
        data: { [index: string]: { [index: string]: number } };
      };

      const { clicks, synced } = payload;

      const state = this.mapDataOntoState(payload);
      this.state$?.next(state);
      this.clicks$?.next(clicks);
      this.synced$?.next(synced);
    });
  }

  /******************************************
   *
   * State stuff
   *
   ******************************************/

  private subscribeToStateChanges() {
    combineLatest([this.state$, this.synced$]).subscribe(([state, synced]) => {
      const padding = synced ? 0 : this.padding;

      state.map((row, y) =>
        state[y].map(async (col, x) => {
          const coords = this.mapGridElToCoordRange(x, y);

          // add padding to the item
          const gridItem = {
            x: coords.x + padding,
            y: coords.y + padding,
            dX: coords.dX - 2 * padding,
            dY: coords.dY - 2 * padding,
          };

          //
          // Populate the box w the appropriate image
          // assumption: Images are the same dimensions as canvas (512x512)
          // ref: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
          //

          const image = this.mapGridElToImage(state, x, y);

          if (image !== undefined) {
            this.ctx.drawImage(
              image.nativeElement,
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
        })
      );
    });
  }

  private async initStateValues() {
    const { nX, nY } = this.resolveGridDimensions();

    const nImages = this.imgs.length;

    let state: number[][] = [...Array(nX)].map((_) => Array(nY).fill(0));
    state.forEach((_, y) =>
      state[y].forEach(
        (_, x) => (state[x][y] = 1 + Math.floor(Math.random() * nImages))
      )
    );

    const draft = {
      nX,
      nY,
      clicks: 0,
      synced: false,
      nImages,
      data: this.mapStateOntoData(state),
    };

    const boardsRef = collection(this.firebaseDB, 'boards');
    await setDoc(doc(boardsRef, `${nX}x${nY}`), draft);
  }

  private async updateStateForCoords(x: number, y: number) {
    if (await this.synced$.pipe(take(1)).toPromise()) {
      return;
    }

    const batch = writeBatch(this.firebaseDB);

    const { nX, nY } = this.resolveGridDimensions();
    const docRef = doc(this.firebaseDB, 'boards', `${nX}x${nY}`);

    batch.update(docRef, `data.${x}.${y}`, increment(1));
    batch.update(docRef, `clicks`, increment(1));

    const state = await this.state$.pipe(take(1)).toPromise();
    state[y][x] = state[y][x] + 1;

    if (this.isInSync(this.target, state)) {
      // await updateDoc(docRef, `synced`, true);
      batch.update(docRef, `synced`, true);
    }

    await batch.commit();
  }

  /******************************************
   *
   * Event Listeners
   *
   ******************************************/

  onCanvasClick(ev: MouseEvent) {
    const coords = this.getMouseCoords(ev);

    // filter out bad coords
    if (!coords) {
      return;
    }

    // determine which grid item is active
    const coordsOnGrid = this.mapCoordsToGridEl(coords.x, coords.y);

    this.updateStateForCoords(coordsOnGrid.x, coordsOnGrid.y);
  }

  /******************************************
   *
   * Utilities
   *
   ******************************************/

  /**
   * ref: https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
   */

  private getMouseCoords(ev: MouseEvent): { x: number; y: number } | undefined {
    let rect = this.canvas.nativeElement.getBoundingClientRect(); // abs. size of element
    let scaleX = this.canvas.nativeElement.width / rect.width; // relationship bitmap vs. element for X
    let scaleY = this.canvas.nativeElement.height / rect.height; // relationship bitmap vs. element for Y

    let x = (ev.clientX - rect.left) * scaleX; // scale mouse coordinates after they have
    let y = (ev.clientY - rect.top) * scaleY; // been adjusted to be relative to element

    if (
      x < 0 ||
      y < 0 ||
      x > this.canvas.nativeElement.width ||
      y > this.canvas.nativeElement.height
    ) {
      return undefined;
    }

    return {
      x,
      y,
    };
  }

  private resolveGridDimensions(): { nX: number; nY: number } {
    const { width, height } = this.canvas.nativeElement;

    const nX = width / this.resolution;
    const nY = height / this.resolution;

    return { nX, nY };
  }

  private mapDataOntoState(payload: {
    nX: number;
    nY: number;
    nImages: number;
    data: { [index: string]: { [index: string]: number } };
  }): number[][] {
    const data = payload?.data || {};

    return Object.keys(data).map((i) =>
      Object.keys(data[i])
        .map((j) => data[i][j])
        .map((val) => val)
    );
  }

  private mapStateOntoData(state: number[][]): {
    [index: string]: { [index: string]: number };
  } {
    return state.reduce(
      (acc, curr, i) => ({
        ...acc,
        [i]: curr.reduce((_acc, _curr, j) => ({ ..._acc, [j]: curr[j] }), {}),
      }),
      {}
    );
  }

  private mapCoordsToGridEl(x: number, y: number): { x: number; y: number } {
    const { width, height } = this.canvas.nativeElement;

    const { nX, nY } = this.resolveGridDimensions();

    const dX = width / nX;
    const dY = height / nY;

    const gX = Math.floor(x / dX);
    const gY = Math.floor(y / dY);

    return { x: gX, y: gY };
  }

  private isInSync(target: string, state: number[][]): boolean {
    return state.every((row, y) =>
      state[y].every((col, x) => {
        const currImg =
          this.mapGridElToImage(state, x, y)?.nativeElement?.src || undefined;

        if (target === undefined) {
          target = currImg;
        } else if (!currImg.includes(target)) {
          return false;
        }

        return true;
      })
    );
  }

  private mapGridElToCoordRange(
    x: number,
    y: number
  ): { x: number; y: number; dX: number; dY: number } {
    const { width, height } = this.canvas.nativeElement;

    const { nX, nY } = this.resolveGridDimensions();

    const dX = width / nX;
    const dY = height / nY;

    const pX = dX * x;
    const pY = dY * y;

    return { x: pX, y: pY, dX, dY };
  }

  private mapGridElToImage(
    state: number[][],
    x: number,
    y: number
  ): ElementRef | undefined {
    const images = this.imgs.map((ref) => ref);
    const n = this.imgs.length;

    return state[x][y] ? images[state[x][y] % n] : undefined;
  }
}
