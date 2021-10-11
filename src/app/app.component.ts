import { environment } from '../environments/environment';

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  addDoc,
  onSnapshot,
  setDoc,
  doc,
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

import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'pxlclk';

  private firebaseApp!: FirebaseApp;
  private firebaseDB!: Firestore;

  debug: boolean = false;
  padding: number = 1; // number (padding of grid items)
  resolution: number = 64; // number (how many even squares to divide canvas into)

  ctx?: CanvasRenderingContext2D;
  state$?: Observable<number[][]>;

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
    // this.imgs.forEach((div: ElementRef) => console.log(div.nativeElement));

    this.initCanvas();
    this.initState();
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
      console.log('changes registered', doc.data());
    });
  }

  private async initStateValues() {
    const { nX, nY } = this.resolveGridDimensions();

    const nImages = this.imgs.length;

    let data: number[][] = [...Array(nX)].map((_) => Array(nY).fill(0));
    data.forEach((_, y) =>
      data[y].forEach(
        (_, x) => (data[x][y] = 1 + Math.floor(Math.random() * nImages))
      )
    );

    const draft = {
      nX,
      nY,
      nImages,
      data: data.reduce((acc, curr, i) => ({ ...acc, [i]: curr }), {}),
    };

    const boardsRef = collection(this.firebaseDB, 'boards');
    await setDoc(doc(boardsRef, `${nX}x${nY}`), draft);
  }

  /******************************************
   *
   * State stuff
   *
   ******************************************/

  /******************************************
   *
   * Draw stuff
   *
   ******************************************/

  /******************************************
   *
   * Utilities
   *
   ******************************************/

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
    data: { [index: string]: number[] };
  }): number[][] {
    return Object.keys(payload.data).map((key) => payload.data[key]);
  }
}
