import { environment } from '../environments/environment';

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  addDoc,
  setDoc,
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
  }

  private async initFirebase() {
    this.firebaseApp = initializeApp(environment.firebase);
    this.firebaseDB = getFirestore();

    try {
      const docRef = await addDoc(collection(this.firebaseDB, 'users'), {
        first: 'Alan',
        middle: 'Mathison',
        last: 'Turing',
        born: 1912,
      });

      console.log('Document written with ID: ', docRef.id);
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  }

  private initCanvas() {
    this.ctx = this.canvas.nativeElement.getContext('2d');
    console.log(this.ctx);
  }

  private async initState() {
    const { nX, nY } = this.resolveGridDimensions();
    // this.state = [...Array(nX)].map((_) => Array(nY).fill(0));
  }

  private async initStateValues() {
    const { nX, nY } = this.resolveGridDimensions();

    // state.forEach((_, y) =>
    //   state[y].forEach(
    //     (_, x) => (state[x][y] = 1 + Math.floor(Math.random() * images.length))
    //   )
    // );
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
}
